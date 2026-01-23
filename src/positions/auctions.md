# Challenges and Auctions

**Challenges and the resulting auctions are a mechanism to ensure positions are backed by sound collateral.**

## Overview

The JuiceDollar system uses challenges instead of oracles to determine fair market prices. Anyone can challenge a position they believe is undercollateralized, triggering a Dutch auction that discovers the true market price.

## Auction Design

Challenging a position triggers an auction of the collateral. The auction serves two purposes: the determination of the market price and the liquidation of the collateral at that market price. The auction frees the system from the need of an external oracle. The difficulty lies in designing the auction such that it cannot be profitably manipulated.

Traditional auctions are prone to price manipulation by the owner of the auctioned assets. For example, if Alice minted 1000 JUSD against a collateral whose value has dropped to 950 JUSD, she might be tempted to bid 1001 JUSD for that collateral in an auction, thereby planting the false believe that the position is still well-collateralized. JuiceDollar prevents this by cleverly switching the collateral the bidders are bidding for at the critical price point. For bids below 1000 JUSD, the bidders will get Alice's collateral. When bidding above 1000 JUSD, the bidders will get the collateral asset from the challenger. Thanks to this approach, price manipulation becomes very expensive for Alice as the 1001 JUSD bid would not go to her own pockets, but the pockets of the challenger. In order to prevent her position from being liquidated, she would have to pay 1001 JUSD for an asset worth 950 JUSD as often as the challenger choses to repeat the challenge.

This example reveals one of the underlying assumptions of the system and a requirement for an asset to be acceptable as collateral. While it is not necessary that there is a liquid market, it is important that the potential challengers own enough of the collateral asset (or can acquire it somewhere) to repeatedly challenge Alice. Once Alice ends up owning 100% of the collateral asset in circulation, she cannot be challenged anymore and can start minting arbitrary amounts of JuiceDollars. That is also why the JuiceDollar auction system does not work with non-fungible tokens. It is important that no position is ever accepted that is based on collateral with too limited availability.

One good property about the auction design is that as long as someone is willing to bid the market price for a collateral asset, the maintenance of the position does not require any attention of the owner. Only when the market price is about to fall below the liquidation price, the owner should start thinking about repaying it or making it more sound again by providing more collateral and adjusting the liquidation price downwards.

In case the highest bid is below the liquidation price, the challenge is considered successful. After a successful challenge, the minter reserve associated with the position is dissolved and added to the proceeds from the auction. The total proceeds are then used to repay the position and to reward the challenger. If there are not enough funds to do that, equity holders have to jump in and suffer a loss. If there is something left, the remaining amount is sent to the equity holders as a profit. For example, if the minter reserve was 20% and the highest bid for Alice's collateral was 950 JUSD, the equity holders make a profit of 150 JUSD, minus the challenger reward. However, if the highest bid was below 800 JUSD, they will make a loss.

## Challenge Phases

A challenge proceeds through two distinct phases:

### Phase 1: Aversion Period

During this phase, the position owner can **avert** the challenge by buying back the challenger's collateral at the liquidation price.

| Aspect | Description |
|--------|-------------|
| **Duration** | Equal to the challenge period (set at position creation) |
| **Price** | Fixed at the position's liquidation price |
| **Who benefits** | Position owner can prevent liquidation |
| **What happens** | Owner pays challenger, challenge is cancelled |

**Example:** If the liquidation price is 20,000 JUSD/cBTC and 0.5 cBTC was challenged, the owner can pay 10,000 JUSD to avert the challenge.

### Phase 2: Dutch Auction

If Phase 1 passes without aversion, a Dutch auction begins where the price decreases linearly over time.

| Aspect | Description |
|--------|-------------|
| **Starting price** | The virtual price (higher of liquidation price or debt-based price) |
| **Ending price** | Zero |
| **Duration** | Equal to the challenge period |
| **Price decrease** | Linear from start to zero |

```
Price
  │
  │\
  │ \
  │  \
  │   \
  │    \
  │     \
  └──────────► Time
  Start    End
```

**Bidding:** Anyone can bid at the current price. The first valid bid wins that portion of the collateral.

## Starting a Challenge

### Requirements

To challenge a position, you need:
1. **Collateral:** Own enough of the same collateral asset
2. **Minimum size:** At least the position's minimum collateral amount
3. **Active position:** Position must not be expired

### How to Challenge

```solidity
function challenge(
    address _positionAddr,      // Position to challenge
    uint256 _collateralAmount,  // Amount of collateral to put up
    uint256 minimumPrice        // Front-running protection
) external payable returns (uint256 challengeNumber)
```

**For native coin positions (cBTC):** Send the collateral as `msg.value`.

**For ERC-20 positions:** Approve the MintingHub first, then call challenge.

### Challenge Reward

Successful challengers receive a **2% reward** (CHALLENGER_REWARD = 20,000 PPM) on the challenged amount. This incentivizes market participants to monitor positions and challenge undercollateralized ones.

## Bidding in Auctions

### During Phase 2

Once the Dutch auction begins, anyone can bid:

```solidity
function bid(
    uint32 _challengeNumber,
    uint256 size,                    // Max collateral to bid for
    bool postponeCollateralReturn    // Delay return (for blacklist scenarios)
) external

// With native coin return option
function bid(
    uint32 _challengeNumber,
    uint256 size,
    bool postponeCollateralReturn,
    bool returnCollateralAsNative    // Return as cBTC instead of WcBTC
) external
```

### Bid Outcomes

| Scenario | Who gets collateral | Who gets JUSD |
|----------|---------------------|---------------|
| Bid > liquidation price | Bidder gets **challenger's** collateral | Challenger gets JUSD |
| Bid ≤ liquidation price | Bidder gets **position owner's** collateral | Goes to repay debt |

### Postponed Collateral Returns

In some cases (e.g., if a bidder is blacklisted by the collateral token), collateral returns can be postponed:

```solidity
// Check pending returns
function pendingReturns(address collateral, address owner) external view returns (uint256)

// Claim postponed collateral
function returnPostponedCollateral(address collateral, address target) external
function returnPostponedCollateral(address collateral, address target, bool asNative) external
```

## Challenge Results

### Successful Challenge (Bid < Liquidation Price)

1. Position's challenged collateral is transferred to the bidder
2. Position's minter reserve is dissolved
3. Proceeds used to repay debt
4. Challenger receives 2% reward
5. Remaining profit/loss goes to equity

### Averted Challenge (Phase 1)

1. Position owner pays challenger at liquidation price
2. Challenger receives their collateral back plus profit
3. Position continues normally
4. 1-day cooldown before owner can mint again

### Challenge Timeout (No Bids)

If no one bids during Phase 2:
1. Challenge is considered successful at price = 0
2. Collateral goes to the last bidder (or challenger if no bids)
3. System suffers maximum loss

## Expired Positions

When a position expires, a special purchase mechanism becomes available:

### Buying Expired Collateral

```solidity
function buyExpiredCollateral(
    IPosition pos,
    uint256 upToAmount
) external returns (uint256 actualAmount)

// With native coin option
function buyExpiredCollateral(
    IPosition pos,
    uint256 upToAmount,
    bool receiveAsNative
) external returns (uint256 actualAmount)
```

### Expired Position Pricing

The price for expired positions uses a **Dutch auction** starting at 10x the virtual price:

```solidity
EXPIRED_PRICE_FACTOR = 10

Starting Price = virtualPrice × 10
End Price = 0 (after challenge period)
```

This ensures:
- Buyers don't get unfair deals on recently expired positions
- Price naturally decreases if no one is interested
- Position owners still get fair value if they're just late

### Important Notes on Expired Positions

1. **No challenges during forced sale:** While a forced sale is in progress, challenges are blocked
2. **Debt priority:** Proceeds first repay debt, remainder goes to owner
3. **Loss coverage:** If proceeds don't cover debt, equity absorbs the loss

## Virtual Price

The **virtual price** is the minimum price needed to cover debt with appropriate overcollateralization:

```solidity
virtualPrice = max(
    liquidationPrice,
    (principal + interest × overcollateralization) / collateralBalance
)
```

During active challenges, the virtual price equals the **challenged price** (price when challenge started).

## Cooldown Periods

After certain challenge events, minting is temporarily restricted:

| Event | Cooldown | Reason |
|-------|----------|--------|
| Challenge averted | 1 day | Allow repeat challenges |
| Challenge succeeded | 3 days | Time to stabilize position |
| Price increased | 3 days | Allow challenges at new price |

## Challenge Monitoring

### Events to Watch

```solidity
// New challenge started
event ChallengeStarted(
    address indexed challenger,
    address indexed position,
    uint256 size,
    uint256 number
)

// Challenge was averted by owner
event ChallengeAverted(
    address indexed position,
    uint256 number,
    uint256 size
)

// Challenge succeeded (liquidation)
event ChallengeSucceeded(
    address indexed position,
    uint256 number,
    uint256 bid,
    uint256 acquiredCollateral,
    uint256 challengeSize
)

// Expired position purchased
event ForcedSale(
    address pos,
    uint256 amount,
    uint256 priceE36MinusDecimals
)
```

### Checking Challenge Status

```solidity
// Get challenge details
function challenges(uint256 index) external view returns (
    address challenger,
    uint40 start,
    IPosition position,
    uint256 size
)

// Get current auction price
function price(uint32 challengeNumber) external view returns (uint256)
```

## Strategy Guide

### For Position Owners

1. **Monitor your positions** - Watch for challenges
2. **Avert if profitable** - If collateral is worth more than liquidation price, avert
3. **Maintain buffer** - Keep collateral value above liquidation price
4. **Add collateral** - If price drops, deposit more collateral

### For Challengers

1. **Look for undercollateralized positions** - Compare market price to liquidation price
2. **Have sufficient collateral** - You need to put up equal collateral
3. **Calculate profitability** - 2% reward minus gas costs
4. **Be prepared to repeat** - Owners may avert multiple times

### For Bidders

1. **Monitor active challenges** - Watch for Phase 2 starts
2. **Set price alerts** - Bid when price reaches your target
3. **Consider gas costs** - Factor into profitability calculation
4. **Use bots** - Automated bidding can capture better prices

## Contract Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `CHALLENGER_REWARD` | 20,000 (2%) | Reward for successful challenges |
| `EXPIRED_PRICE_FACTOR` | 10 | Starting price multiplier for expired positions |
| Minimum challenge period | 1 day | Set at position creation |
