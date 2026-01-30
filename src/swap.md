# Stablecoin Bridges

**Simple contracts that allow swapping other Dollar stablecoins into JuiceDollar and back.**

## Overview

The swap page allows you to swap other recognized Dollar stablecoins against JuiceDollars and back. Moving back into other stablecoins is only possible as long as there is some of the other stablecoin left in the bridge contract. Essentially, this pegs JuiceDollar 1:1 to other stablecoins and helps stabilizing its value. In order to protect JuiceDollar from a crash of the connected stablecoins, the bridge contract is limited in time and volume. After a year the latest, it needs to be replaced with a new contract.

System participants should closely watch the amount of other stablecoins flowing in and out. Having a lot of outflow could be an indication that it is too cheap to mint JuiceDollars, i.e. implied interest rates being too low. Having large inflows could be an indication that going into JuiceDollars is too attractive and interest rates too high.

## How Bridges Work

Stablecoin bridges enable 1:1 conversion between trusted external stablecoins and JUSD:

```
Source Stablecoin (e.g., USDC) ←→ JuiceDollar (JUSD)
         1:1 exchange rate
```

### Minting JUSD

When you deposit a source stablecoin:

1. Your stablecoin is transferred to the bridge contract
2. An equal amount of JUSD is minted to your address
3. The bridge's `minted` counter increases

```solidity
// Mint to yourself
function mint(uint256 amount) external

// Mint to another address
function mintTo(address target, uint256 amount) external
```

### Burning JUSD

When you want your stablecoin back:

1. Your JUSD is burned
2. An equal amount of source stablecoin is sent to you
3. The bridge's `minted` counter decreases

```solidity
// Burn and receive to yourself
function burn(uint256 amount) external

// Burn and send to another address
function burnAndSend(address target, uint256 amount) external
```

## Bridge Limitations

Each bridge has built-in limitations to protect the JuiceDollar system:

### Volume Limit

```solidity
uint256 public immutable limit;
uint256 public minted;
```

The `limit` caps the maximum amount of JUSD that can be minted through this bridge. This prevents over-reliance on any single external stablecoin.

**Example:** A bridge with a 10M JUSD limit can never have more than 10M JUSD outstanding.

### Time Horizon

```solidity
uint256 public immutable horizon;
```

Every bridge has an expiration date (`horizon`). After this time:
- No new minting is allowed
- Users can still burn JUSD to retrieve their stablecoins
- A new bridge must be deployed to continue operations

**Typical duration:** 52 weeks (1 year)

**Why expire bridges?**
- Forces periodic review of connected stablecoins
- Allows governance to adjust limits based on market conditions
- Provides opportunity to switch to better alternatives

### Decimal Handling

Bridges automatically handle different decimal places between tokens:

```solidity
function _convertAmount(
    uint256 amount,
    uint8 fromDecimals,
    uint8 toDecimals
) internal pure returns (uint256)
```

**Example:** USDC (6 decimals) ↔ JUSD (18 decimals)
- Deposit 1,000,000 USDC (1 USDC) → Receive 1,000,000,000,000,000,000 JUSD (1 JUSD)

## Emergency Stop

Bridges include an emergency mechanism that allows qualified JUICE holders to permanently stop a bridge if the underlying stablecoin is compromised.

### How Emergency Stop Works

```solidity
function emergencyStop(
    address[] calldata _helpers,
    string calldata _message
) external
```

**Requirements:**
- Caller needs **10% of total voting power** (higher than normal 2% quorum)
- Helpers array must be sorted and valid
- Once stopped, the bridge cannot be reactivated

### When to Use Emergency Stop

- The source stablecoin loses its peg
- Security vulnerability discovered in source stablecoin
- Regulatory action against source stablecoin issuer
- Evidence of fractional reserve or fraud

### After Emergency Stop

```solidity
bool public stopped;
```

When `stopped = true`:
- `mint()` and `mintTo()` are permanently disabled
- `burn()` and `burnAndSend()` still work
- Users can always retrieve their deposited stablecoins

### Emergency Stop Quorum

| Parameter | Value |
|-----------|-------|
| Required voting power | 10% of total votes |
| Effect | Permanent - cannot be reversed |
| Burn functionality | Still available |

The higher quorum (10% vs 2%) prevents abuse while still allowing rapid response to genuine emergencies.

## Bridge Monitoring

### Checking Bridge Status

```solidity
// Source stablecoin address
function usd() external view returns (IERC20)

// JUSD contract
function JUSD() external view returns (IJuiceDollar)

// Expiration timestamp
function horizon() external view returns (uint256)

// Maximum mintable amount
function limit() external view returns (uint256)

// Currently minted amount
function minted() external view returns (uint256)

// Whether bridge is stopped
function stopped() external view returns (bool)
```

### Health Indicators

| Metric | Healthy | Warning |
|--------|---------|---------|
| `minted / limit` | < 80% | > 90% |
| Time to horizon | > 30 days | < 7 days |
| stopped | false | true |

### Monitoring Flows

Watch the balance changes to understand market dynamics:

| Flow Direction | Interpretation |
|----------------|----------------|
| **Inflow** (minting) | JUSD is attractive, possibly interest rates too high |
| **Outflow** (burning) | JUSD is less attractive, possibly rates too low |
| **Balanced** | Market in equilibrium |

## StartUSD Bridge

The initial bootstrap bridge uses StartUSD, a simple ERC-20 token created specifically for JuiceDollar initialization.

### Important: Bootstrap Phase Transparency

::: warning BOOTSTRAP PHASE
**StartUSD (SUSD) has no intrinsic value.** It is a simple ERC-20 token that mints its entire supply to the deployer. During the bootstrap phase, JUSD minted via the StartUSD bridge is technically **not backed by real assets**.

This is a deliberate design choice with built-in safeguards explained below.
:::

### Purpose

StartUSD serves as the genesis mechanism to:
1. Create initial JUSD supply for system testing
2. Enable first JUICE minting and governance setup
3. Bootstrap the system in a controlled environment before connecting to established stablecoins

### The 6-Week Bootstrap Window

The StartUSD bridge has a **strict 6-week horizon**. This time-limited window is a critical security feature:

| Phase | Duration | What Happens |
|-------|----------|--------------|
| **Bootstrap Phase** | Weeks 1-6 | SUSD can be bridged to JUSD, system is initializing |
| **Post-Bootstrap** | After Week 6 | SUSD bridge expires, no new SUSD can enter the system |

**After the 6-week horizon:**
- No new StartUSD can be minted into JUSD
- The deployer's ability to add unbacked JUSD is permanently removed
- Only bridges to real, audited stablecoins (USDC, USDT, etc.) remain active
- The system transitions to being fully backed by real assets

### Why This Design?

The 6-week bootstrap phase provides:

1. **Controlled Launch:** Time to identify and fix critical bugs before real capital enters
2. **Emergency Shutdown Option:** If a severe vulnerability is discovered, the system can be safely wound down
3. **Gradual Ramp-Up:** Real stablecoin bridges can be added and tested alongside the bootstrap
4. **Transparent Risk Window:** Users know exactly when the bootstrap phase ends

### Risks During Bootstrap Phase

::: danger BOOTSTRAP RISKS
During the first 6 weeks, be aware:

- **No Real Backing:** JUSD minted via SUSD is not backed by real dollar assets
- **Deployer Trust:** The deployer team could theoretically harm the system during this window
- **Not for Production Use:** Do not treat JUSD as a stable store of value during bootstrap

**After the 6-week horizon expires, these risks are eliminated.**
:::

### StartUSD Properties

| Property | Value |
|----------|-------|
| Name | StartUSD |
| Symbol | SUSD |
| Decimals | 18 |
| Total Supply | 100,000,000 |
| Initial Holder | Deployer |
| **Intrinsic Value** | **None** (bootstrap token only) |

### Bridge Details

| Network | Address |
|---------|---------|
| **Mainnet** | [`0x51ff8141D731676Fb21aE1E5D5A88c04511994dD`](https://citreascan.com/address/0x51ff8141D731676Fb21aE1E5D5A88c04511994dD) |
| **Testnet** | [`0x9ba2264bE7695044f59B9ca863E69aC38B3c913d`](https://testnet.citreascan.com/address/0x9ba2264bE7695044f59B9ca863E69aC38B3c913d) |

| Property | Value |
|----------|-------|
| Source Token | StartUSD |
| Limit | Configured at deployment |
| **Horizon** | **6 weeks** (bootstrap period) |

## Adding New Bridges

New stablecoin bridges can be added through the governance process:

### Requirements for New Bridges

1. **Trusted stablecoin:** The source must be a reputable, audited stablecoin
2. **Sufficient liquidity:** Enough market depth for meaningful volume
3. **Governance approval:** Pass the 14-day minter application period without veto

### Deployment Process

1. Deploy `StablecoinBridge` contract with parameters:
   - Source stablecoin address
   - JUSD address
   - Volume limit
   - Duration in weeks

2. Propose as new minter via `suggestMinter()`

3. Wait for application period (minimum 14 days)

4. If no veto, bridge becomes active

### Example Bridge Deployment

```solidity
// Deploy new USDC bridge
StablecoinBridge usdcBridge = new StablecoinBridge(
    USDC_ADDRESS,           // Source stablecoin
    JUSD_ADDRESS,           // JUSD contract
    10_000_000 * 10**18,    // 10M JUSD limit
    52                       // 52 weeks duration
);

// Propose to governance
jusd.suggestMinter(
    address(usdcBridge),
    14 days,                 // Application period
    1000 * 10**18,          // 1000 JUSD fee
    "USDC Bridge - https://docs.example.com/usdc-bridge"
);
```

## Security Considerations

### Bridge Risks

| Risk | Mitigation |
|------|------------|
| Source stablecoin failure | Volume limits, emergency stop |
| Bridge contract exploit | Immutable code, audits |
| Governance attack | 10% quorum for emergency |
| Expiration oversight | Time limits force review |

### Best Practices for Users

1. **Check bridge status** before large transactions
2. **Monitor horizon** - don't deposit near expiration
3. **Verify addresses** - use only official bridge contracts
4. **Diversify** - don't rely on a single bridge for large amounts

## Events

```solidity
// Emitted when bridge is permanently stopped
event EmergencyStopped(address indexed caller, string message)
```

## Current Bridges

### Mainnet (Chain ID: 4114)

| Bridge | Source | Address | Status |
|--------|--------|---------|--------|
| StartUSD | SUSD | [`0x51ff...4dD`](https://citreascan.com/address/0x51ff8141D731676Fb21aE1E5D5A88c04511994dD) | Active |
| USDC | USDC | [`0x920D...20F`](https://citreascan.com/address/0x920DB0aDf6fEe2D69401e9f68D60319177dCa20F) | Active |
| USDT | USDT | [`0x5CC0...614`](https://citreascan.com/address/0x5CC0e668F8BA61E111B6168E19d17d3C65040614) | Active |
| CTUSD | CTUSD | [`0x8D11...0bd`](https://citreascan.com/address/0x8D11020286aF9ecf7E5D7bD79699c391b224a0bd) | Active |

### Testnet (Chain ID: 5115)

| Bridge | Source | Address | Status |
|--------|--------|---------|--------|
| StartUSD | SUSD | [`0x9ba2...3d`](https://testnet.citreascan.com/address/0x9ba2264bE7695044f59B9ca863E69aC38B3c913d) | Active |

*Additional bridges may be added through governance.*
