# Position Roller

**Migrate your debt from one position to another using flash loans.**

The Position Roller is a helper contract that allows you to seamlessly move your debt from an old position to a new one. This is useful when you want to take advantage of better terms, extend your position's expiration, or switch to a different collateral type.

## Why Roll a Position?

Common reasons to roll a position:

| Scenario | Benefit |
|----------|---------|
| **Better interest rate** | New positions may have lower rates |
| **Extend expiration** | Avoid forced liquidation of expiring positions |
| **Higher price tolerance** | Clone a position with better liquidation price |
| **Different collateral** | Move to a more liquid or stable collateral |
| **Consolidation** | Merge multiple positions into one |

## How Rolling Works

The roller uses a **flash loan** mechanism to atomically:

1. Mint JUSD via flash loan
2. Repay your debt in the source position
3. Withdraw collateral from source
4. Deposit collateral into target position
5. Mint JUSD in target position
6. Repay the flash loan

All steps happen in a single transaction - either everything succeeds or nothing changes.

```
┌─────────────────────────────────────────────────────────────┐
│                    SINGLE TRANSACTION                        │
├─────────────────────────────────────────────────────────────┤
│  1. Flash Loan JUSD      ──►  Temporary JUSD               │
│  2. Repay Source         ──►  Debt cleared                  │
│  3. Withdraw Collateral  ──►  Collateral released           │
│  4. Deposit to Target    ──►  Collateral locked             │
│  5. Mint from Target     ──►  New debt created              │
│  6. Repay Flash Loan     ──►  Transaction complete          │
└─────────────────────────────────────────────────────────────┘
```

## Rolling Methods

### Automatic Rolling

The simplest way to roll - the contract calculates optimal parameters:

```solidity
// Roll everything automatically
function rollFully(IPosition source, IPosition target) external

// Roll with custom expiration
function rollFullyWithExpiration(
    IPosition source,
    IPosition target,
    uint40 expiration
) external
```

**What happens:**
- All collateral is moved
- Maximum possible amount is minted in the target
- If the target has less capacity, remaining debt is taken from your wallet

### Manual Rolling

For precise control over the roll parameters:

```solidity
function roll(
    IPosition source,        // Your current position
    uint256 repay,           // Amount to repay (principal + interest)
    uint256 collWithdraw,    // Collateral to withdraw from source
    IPosition target,        // Position to roll into
    uint256 mint,            // Amount to mint in target
    uint256 collDeposit,     // Collateral to deposit in target
    uint40 expiration        // Desired expiration for target
) external
```

### Native Coin Rolling (cBTC)

For positions using wrapped Bitcoin (WcBTC), special functions handle the wrapping/unwrapping:

```solidity
// Automatic roll for native positions
function rollFullyNative(IPosition source, IPosition target) external payable

// With custom expiration
function rollFullyNativeWithExpiration(
    IPosition source,
    IPosition target,
    uint40 expiration
) external payable

// Manual roll for native positions
function rollNative(
    IPosition source,
    uint256 repay,
    uint256 collWithdraw,
    IPosition target,
    uint256 mint,
    uint256 collDeposit,
    uint40 expiration
) external payable
```

**Benefits of native rolling:**
- No need to interact with WcBTC directly
- Collateral flows through the roller
- Excess is returned as native cBTC
- Can add extra collateral via `msg.value`

## Prerequisites

### For ERC-20 Collateral

Before rolling, you must approve the roller to spend your collateral:

```javascript
// Approve roller to move your collateral
await collateralToken.approve(
    ROLLER_ADDRESS,
    collateralBalance
);
```

### For Native Coin (cBTC)

No approval needed - just send cBTC with the transaction if adding collateral.

### Position Ownership

- You must own the **source** position
- The **target** can be any valid position
- If you don't own the target, a clone is created for you

## What Happens During a Roll

### Scenario 1: Rolling into Your Own Position

If you already own the target position and the expiration matches:

1. Collateral transferred directly to target
2. Mint called on existing target
3. No cloning occurs

### Scenario 2: Rolling into Someone Else's Position

If you don't own the target or want a different expiration:

1. Target position is **cloned** for you
2. You become owner of the new clone
3. Clone inherits the target's parameters
4. Your collateral goes into the clone

### Scenario 3: Partial Roll

If the target doesn't have enough minting capacity:

1. As much as possible is minted in target
2. Remaining debt must be covered from your wallet
3. Excess JUSD from flash loan is returned to you

## Frontend Code Preservation

When rolling through the MintingHubGateway, your frontend code is preserved:

```solidity
// The roller checks for gateway support
if (supportsInterface(IMintingHubGateway)) {
    // Gets frontend code from source position
    bytes32 code = gateway.getPositionFrontendCode(source);
    // Applies same code to cloned target
    gateway.clone(..., code);
}
```

This ensures frontend operators continue receiving rewards after rolls.

## Gas Considerations

Rolling is a complex operation with multiple internal calls:

| Operation | Approximate Gas |
|-----------|-----------------|
| Simple roll (same collateral) | ~400,000 |
| Roll with clone | ~600,000 |
| Native coin roll | ~450,000 |
| Native roll with clone | ~650,000 |

**Tip:** Ensure sufficient gas limit for the transaction.

## Example: Rolling to Better Terms

**Current Position:**
- 10,000 JUSD debt
- 0.5 cBTC collateral
- 6% interest rate
- Expires in 30 days

**Target Position Found:**
- Same collateral (cBTC)
- 4% interest rate
- 12-month duration

**Roll Process:**

```javascript
const roller = new ethers.Contract(ROLLER_ADDRESS, abi, signer);

// Approve collateral spending
await wcbtc.approve(ROLLER_ADDRESS, ethers.constants.MaxUint256);

// Roll fully to the new position
await roller.rollFully(
    SOURCE_POSITION,
    TARGET_POSITION
);
```

**Result:**
- Old position closed (debt = 0)
- New position created with your collateral
- Lower interest rate locked in
- Extended expiration

## Error Handling

Common errors when rolling:

| Error | Cause | Solution |
|-------|-------|----------|
| `NotOwner` | You don't own the source position | Use your own position |
| `NotPosition` | Invalid position address | Verify position addresses |
| `NativeTransferFailed` | cBTC transfer failed | Check receiving address |
| Insufficient allowance | Collateral not approved | Approve roller first |

## Contract Address

| Network | Address |
|---------|---------|
| **Mainnet** | [`0xC1b97398c06B9C6a49Fd9dCFAC8907700301e9Ac`](https://citreascan.com/address/0xC1b97398c06B9C6a49Fd9dCFAC8907700301e9Ac) |
| **Testnet** | [`0x8A50329559Ae3F2BaA1fC8BC59Fcd52958c61caC`](https://testnet.citreascan.com/address/0x8A50329559Ae3F2BaA1fC8BC59Fcd52958c61caC) |

## Events

```solidity
event Roll(
    address source,        // Source position address
    uint256 collWithdraw,  // Collateral withdrawn
    uint256 repay,         // Debt repaid
    address target,        // Target position address
    uint256 collDeposit,   // Collateral deposited
    uint256 mint           // Amount minted
);
```

## Security Considerations

1. **Flash Loan Repayment:** The flash loan must be repaid in the same transaction. If minting in the target fails, the entire transaction reverts.

2. **Slippage:** If market conditions change between submission and execution, the roll may fail. Consider setting appropriate parameters.

3. **Position Validation:** The roller validates both positions are registered with the JUSD system before proceeding.

4. **Collateral Matching:** For `rollFully`, source and target must have the same collateral type.

## Advanced: Custom Roll Strategies

### Partial Debt Migration

Move only part of your debt:

```javascript
await roller.roll(
    source,
    5000e18,        // Repay only 5000 JUSD
    0.25e18,        // Withdraw only 0.25 cBTC
    target,
    5000e18,        // Mint 5000 in target
    0.25e18,        // Deposit 0.25 cBTC
    newExpiration
);
```

### Adding Collateral During Roll

For native coins, send extra cBTC:

```javascript
await roller.rollFullyNative(source, target, {
    value: ethers.utils.parseEther("0.1") // Add 0.1 cBTC
});
```

### Changing Collateral Type

Rolling between different collaterals requires manual handling:
1. Close source position normally
2. Swap collateral on DEX
3. Open new position with new collateral

The roller only handles same-collateral rolls.
