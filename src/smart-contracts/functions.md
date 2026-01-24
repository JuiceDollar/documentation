# Smart Contract Functions Reference

**Complete reference of all public and external functions in the JuiceDollar protocol.**

This document provides a comprehensive listing of every callable function across all JuiceDollar smart contracts, organized by contract and categorized by function type.

---

## JuiceDollar (JUSD Token)

The main stablecoin token with minter management capabilities.

### Constants & Immutables

| Name | Type | Value | Description |
|------|------|-------|-------------|
| `MIN_FEE` | uint256 | 1,000 JUSD | Minimum fee for minter applications |
| `MIN_APPLICATION_PERIOD` | uint256 | 14 days | Minimum veto period for new minters |

### View Functions

```solidity
// Reserve and equity information
function reserve() external view returns (IReserve)
function minterReserve() external view returns (uint256)
function equity() external view returns (uint256)

// Minter registry
function minters(address minter) external view returns (uint256 validityStart)
function isMinter(address minter) external view returns (bool)

// Position registry
function positions(address position) external view returns (address registeringMinter)
function getPositionParent(address position) external view returns (address)

// Reserve calculations
function calculateAssignedReserve(uint256 mintedAmount, uint32 reservePPM) external view returns (uint256)
function calculateFreedAmount(uint256 amountExcludingReserve, uint32 reservePPM) external view returns (uint256)

// ERC-20 standard (inherited)
function balanceOf(address account) external view returns (uint256)
function totalSupply() external view returns (uint256)
function allowance(address owner, address spender) external view returns (uint256)
```

### State-Changing Functions

#### Minter Management

```solidity
// Propose a new minter (anyone can call, requires fee)
function suggestMinter(
    address _minter,           // Address to be approved as minter
    uint256 _applicationPeriod, // Veto period (>= MIN_APPLICATION_PERIOD)
    uint256 _applicationFee,    // Fee to pay (>= MIN_FEE, non-refundable)
    string calldata _message    // Description/link for the proposal
) external

// Veto a pending minter (requires 2% voting power)
function denyMinter(
    address minter,              // Minter to deny
    address[] calldata helpers,  // Addresses delegating votes to caller
    string calldata message      // Reason for denial
) external

// Register a position contract (minters only)
function registerPosition(address position) external
```

#### Minting & Burning (Minters Only)

```solidity
// Mint without reserve
function mint(address target, uint256 amount) external

// Mint with automatic reserve contribution
function mintWithReserve(
    address target,      // Recipient of minted tokens
    uint256 amount,      // Total amount to mint
    uint32 reservePPM    // Reserve ratio in parts per million
) external

// Burn tokens from caller's balance
function burn(uint256 amount) external

// Burn tokens from another address (requires allowance)
function burnFrom(address target, uint256 amount) external

// Burn and release reserve to equity (minters only)
function burnWithoutReserve(uint256 amount, uint32 reservePPM) external

// Burn with proportional reserve return
function burnFromWithReserve(
    address payer,
    uint256 targetTotalBurnAmount,
    uint32 reservePPM
) external returns (uint256 assignedReserve)
```

#### Reserve Operations (Minters Only)

```solidity
// Report a loss to be covered by reserves
function coverLoss(address source, uint256 amount) external

// Distribute profits from reserves (e.g., savings interest)
function distributeProfits(address recipient, uint256 amount) external

// Collect profits into reserves (e.g., fees)
function collectProfits(address source, uint256 amount) external
```

#### ERC-20 Standard Functions

```solidity
function transfer(address to, uint256 amount) external returns (bool)
function approve(address spender, uint256 amount) external returns (bool)
function transferFrom(address from, address to, uint256 amount) external returns (bool)
```

#### ERC-2612 Permit

```solidity
function permit(
    address owner,
    address spender,
    uint256 value,
    uint256 deadline,
    uint8 v, bytes32 r, bytes32 s
) external
```

#### ERC-3009 Transfer Authorization

```solidity
function transferWithAuthorization(
    address from, address to, uint256 value,
    uint256 validAfter, uint256 validBefore,
    bytes32 nonce, uint8 v, bytes32 r, bytes32 s
) external

function receiveWithAuthorization(
    address from, address to, uint256 value,
    uint256 validAfter, uint256 validBefore,
    bytes32 nonce, uint8 v, bytes32 r, bytes32 s
) external

function cancelAuthorization(
    address authorizer, bytes32 nonce,
    uint8 v, bytes32 r, bytes32 s
) external
```

### Events

```solidity
event MinterApplied(address indexed minter, uint256 applicationPeriod, uint256 applicationFee, string message)
event MinterDenied(address indexed minter, string message)
event Loss(address indexed reportingMinter, uint256 amount)
event Profit(address indexed reportingMinter, uint256 amount)
event ProfitDistributed(address indexed recipient, uint256 amount)
```

---

## Equity (JUICE Token)

Reserve pool shares with time-weighted voting power.

### Constants

| Name | Type | Value | Description |
|------|------|-------|-------------|
| `VALUATION_FACTOR` | uint32 | 10 | Market cap = 10 * equity |
| `QUORUM` | uint32 | 200 | 2% (in basis points) |
| `MINIMUM_EQUITY` | uint256 | 1,000 JUSD | Minimum equity for operations |

### View Functions

```solidity
// Token information
function JUSD() external view returns (JuiceDollar)
function price() external view returns (uint256)

// Voting power
function votes(address holder) external view returns (uint256)
function relativeVotes(address holder) external view returns (uint256)
function totalVotes() external view returns (uint256)
function holdingDuration(address holder) external view returns (uint256)
function votesDelegated(address sender, address[] calldata helpers) external view returns (uint256)

// Delegation
function delegates(address owner) external view returns (address)

// Flash loan protection
function lastInboundBlock(address owner) external view returns (uint256)

// Investment calculations
function calculateShares(uint256 investment) external view returns (uint256)
function calculateProceeds(uint256 shares) external view returns (uint256)
```

### State-Changing Functions

#### Investment & Redemption

```solidity
// Mint JUICE by investing JUSD
function invest(
    uint256 amount,          // JUSD to invest
    uint256 expectedShares   // Minimum shares (slippage protection)
) external returns (uint256 shares)

// Mint JUICE for another address (minters only)
function investFor(
    address investor,
    uint256 amount,
    uint256 expectedShares
) external returns (uint256 shares)

// Burn JUICE to redeem JUSD
function redeem(
    address target,    // Recipient of JUSD
    uint256 shares     // JUICE to burn
) external returns (uint256 proceeds)

// Redeem with slippage protection
function redeemExpected(
    address target,
    uint256 shares,
    uint256 expectedProceeds  // Minimum JUSD to receive
) external returns (uint256 proceeds)

// Redeem using allowance
function redeemFrom(
    address owner,
    address target,
    uint256 shares,
    uint256 expectedProceeds
) external returns (uint256 proceeds)
```

#### Governance

```solidity
// Delegate voting power (does not remove your own votes)
function delegateVoteTo(address delegate) external

// Check if address has 2% voting power (reverts if not)
function checkQualified(
    address sender,
    address[] calldata helpers  // Sorted list of delegators
) external view

// Sacrifice own votes to destroy target's votes (emergency measure)
function kamikaze(
    address[] calldata targets,  // Addresses to remove votes from
    uint256 votesToDestroy       // Max votes caller sacrifices
) external

// Emergency: wipe JUICE balances when equity < 1000 JUSD
function restructureCapTable(
    address[] calldata helpers,
    address[] calldata addressesToWipe
) external
```

### Events

```solidity
event Delegation(address indexed from, address indexed to)
event Trade(address who, int256 amount, uint256 totPrice, uint256 newprice)
```

---

## Leadrate

Governance-controlled base interest rate for the system.

### View Functions

```solidity
function equity() external view returns (IReserve)
function currentRatePPM() external view returns (uint24)
function nextRatePPM() external view returns (uint24)
function nextChange() external view returns (uint40)
function currentTicks() external view returns (uint64)
function ticks(uint256 timestamp) external view returns (uint64)
```

### State-Changing Functions

```solidity
// Propose new rate (requires 2% voting power)
function proposeChange(
    uint24 newRatePPM_,          // New rate in PPM per year
    address[] calldata helpers   // Vote delegation helpers
) external

// Execute pending rate change (after 7 days)
function applyChange() external
```

### Events

```solidity
event RateProposed(address who, uint24 nextRate, uint40 nextChange)
event RateChanged(uint24 newRate)
```

---

## MintingHub / MintingHubGateway

Central hub for position management and liquidations.

### Constants

| Name | Type | Value | Description |
|------|------|-------|-------------|
| `OPENING_FEE` | uint256 | 1,000 JUSD | Fee to create new position |
| `CHALLENGER_REWARD` | uint256 | 20,000 (2%) | Reward for successful challenges |
| `EXPIRED_PRICE_FACTOR` | uint256 | 10 | Starting price multiplier for expired positions |

### View Functions

```solidity
function JUSD() external view returns (IJuiceDollar)
function RATE() external view returns (ILeadrate)
function ROLLER() external view returns (PositionRoller)
function WCBTC() external view returns (address)
function GATEWAY() external view returns (IFrontendGateway)  // Gateway only

// Challenge data
function challenges(uint256 index) external view returns (
    address challenger,
    uint40 start,
    IPosition position,
    uint256 size
)
function price(uint32 challengeNumber) external view returns (uint256)

// Expired position pricing
function expiredPurchasePrice(IPosition pos) external view returns (uint256)

// Postponed collateral returns
function pendingReturns(address collateral, address owner) external view returns (uint256)
```

### State-Changing Functions

#### Position Creation

```solidity
// Create new position (1000 JUSD fee)
function openPosition(
    address _collateralAddress,   // Collateral token
    uint256 _minCollateral,       // Minimum collateral (dust prevention)
    uint256 _initialCollateral,   // Initial deposit
    uint256 _mintingMaximum,      // Max JUSD this position can mint
    uint40 _initPeriodSeconds,    // Veto period (>= 14 days)
    uint40 _expirationSeconds,    // Position lifetime
    uint40 _challengeSeconds,     // Challenge period (>= 1 day)
    uint24 _riskPremium,          // Additional interest (PPM)
    uint256 _liqPrice,            // Liquidation price
    uint24 _reservePPM            // Reserve ratio (e.g., 200000 = 20%)
) external payable returns (address position)

// Gateway version with frontend code
function openPosition(
    ... // same params as above
    bytes32 _frontendCode         // Frontend referral code
) external payable returns (address position)

// Clone existing position
function clone(
    address owner,             // Owner of new position
    address parent,            // Position to clone from
    uint256 _initialCollateral,
    uint256 _initialMint,      // Amount to mint immediately
    uint40 expiration,         // New expiration
    uint256 _liqPrice          // New price (0 = inherit)
) external payable returns (address position)

// Gateway version with frontend code
function clone(
    ... // same params
    bytes32 frontendCode
) external payable returns (address position)
```

#### Challenge System

```solidity
// Start a challenge (Dutch auction)
function challenge(
    address _positionAddr,      // Position to challenge
    uint256 _collateralAmount,  // Collateral to put up
    uint256 minimumPrice        // Front-running protection
) external payable returns (uint256 challengeNumber)

// Bid in a challenge
function bid(
    uint32 _challengeNumber,
    uint256 size,                    // Max collateral to bid for
    bool postponeCollateralReturn    // Delay return if blacklisted
) external

// Bid with native coin return option
function bid(
    uint32 _challengeNumber,
    uint256 size,
    bool postponeCollateralReturn,
    bool returnCollateralAsNative    // Return as cBTC instead of WcBTC
) external

// Claim postponed collateral
function returnPostponedCollateral(
    address collateral,
    address target
) external

function returnPostponedCollateral(
    address collateral,
    address target,
    bool asNative
) external
```

#### Expired Position Handling

```solidity
// Buy collateral from expired position
function buyExpiredCollateral(
    IPosition pos,
    uint256 upToAmount
) external returns (uint256 actualAmount)

function buyExpiredCollateral(
    IPosition pos,
    uint256 upToAmount,
    bool receiveAsNative
) external returns (uint256 actualAmount)
```

#### Position Event Forwarding

```solidity
// Emit position update (positions only)
function emitPositionUpdate(
    uint256 collateral,
    uint256 price,
    uint256 principal
) external

// Emit denial event (positions only)
function emitPositionDenied(
    address denier,
    string calldata message
) external

// Notify interest paid (Gateway only, positions only)
function notifyInterestPaid(uint256 amount) external
```

### Events

```solidity
event PositionOpened(address indexed owner, address indexed position, address original, address collateral)
event ChallengeStarted(address indexed challenger, address indexed position, uint256 size, uint256 number)
event ChallengeAverted(address indexed position, uint256 number, uint256 size)
event ChallengeSucceeded(address indexed position, uint256 number, uint256 bid, uint256 acquiredCollateral, uint256 challengeSize)
event PostponedReturn(address collateral, address indexed beneficiary, uint256 amount)
event ForcedSale(address pos, uint256 amount, uint256 priceE36MinusDecimals)
event PositionUpdate(address indexed position, uint256 collateral, uint256 price, uint256 principal)
event PositionDeniedByGovernance(address indexed position, address indexed denier, string message)
```

---

## Position

Individual collateralized debt position contract.

### Immutable Properties

```solidity
function original() external view returns (address)
function hub() external view returns (address)
function jusd() external view returns (IJuiceDollar)
function collateral() external view returns (IERC20)
function minimumCollateral() external view returns (uint256)
function riskPremiumPPM() external view returns (uint24)
function reserveContribution() external view returns (uint24)
function challengePeriod() external view returns (uint40)
function start() external view returns (uint40)
function limit() external view returns (uint256)
```

### State View Functions

```solidity
// Position state
function price() external view returns (uint256)
function virtualPrice() external view returns (uint256)
function challengedAmount() external view returns (uint256)
function cooldown() external view returns (uint40)
function expiration() external view returns (uint40)
function isClosed() external view returns (bool)

// Debt information
function principal() external view returns (uint256)
function interest() external view returns (uint256)
function lastAccrual() external view returns (uint40)
function fixedAnnualRatePPM() external view returns (uint24)
function getDebt() external view returns (uint256)
function getInterest() external view returns (uint256)
function getCollateralRequirement() external view returns (uint256)

// Minting capacity
function availableForMinting() external view returns (uint256)
function availableForClones() external view returns (uint256)
function getUsableMint(uint256 totalMint) external view returns (uint256)
function getMintAmount(uint256 usableMint) external view returns (uint256)

// Challenge data
function challengeData() external view returns (uint256 liqPrice, uint40 phase)

// Price reference validation
function isValidPriceReference(
    address referencePosition,
    uint256 newPrice
) external view returns (bool)
```

### Owner Functions

```solidity
// Mint JUSD against collateral
function mint(address target, uint256 amount) external

// Repay debt (interest first, then principal)
function repay(uint256 amount) external returns (uint256 used)
function repayFull() external returns (uint256 used)

// Adjust position (all-in-one)
function adjust(
    uint256 newPrincipal,
    uint256 newCollateral,
    uint256 newPrice,
    bool withdrawAsNative
) external payable

function adjustWithReference(
    uint256 newPrincipal,
    uint256 newCollateral,
    uint256 newPrice,
    address referencePosition,  // Skip cooldown if valid reference
    bool withdrawAsNative
) external payable

// Adjust price only
function adjustPrice(uint256 newPrice) external
function adjustPriceWithReference(uint256 newPrice, address referencePosition) external

// Withdraw collateral
function withdrawCollateral(address target, uint256 amount) external
function withdrawCollateralAsNative(address target, uint256 amount) external

// Rescue accidentally sent tokens (not collateral)
function rescueToken(address token, address target, uint256 amount) external
```

### Governance Functions

```solidity
// Deny position during init period (requires 2% votes)
function deny(
    address[] calldata helpers,
    string calldata message
) external
```

### Hub-Only Functions

```solidity
function initialize(address parent, uint40 _expiration) external
function forceSale(address buyer, uint256 colAmount, uint256 proceeds) external
function transferChallengedCollateral(address target, uint256 amount) external
function notifyChallengeStarted(uint256 size, uint256 _price) external
function notifyChallengeAverted(uint256 size) external
function notifyChallengeSucceeded(uint256 _size) external returns (
    address owner,
    uint256 effectiveSize,
    uint256 principalRepaid,
    uint256 interestPaid,
    uint32 reservePPM
)
```

### Internal Notification Functions

```solidity
// Called by sibling positions
function notifyMint(uint256 mint_) external
function notifyRepaid(uint256 repaid_) external
function assertCloneable() external view
```

### Events

```solidity
event MintingUpdate(uint256 collateral, uint256 price, uint256 principal)
event PositionDenied(address indexed sender, string message)
```

---

## PositionFactory

Factory for deploying Position contracts.

### Functions

```solidity
// Deploy new position (called by MintingHub)
function createNewPosition(
    address _owner,
    address _jusd,
    address _collateral,
    uint256 _minCollateral,
    uint256 _initialLimit,
    uint40 _initPeriod,
    uint40 _duration,
    uint40 _challengePeriod,
    uint24 _riskPremiumPPM,
    uint256 _liqPrice,
    uint24 _reserve
) external returns (address)

// Clone existing position (ERC-1167 minimal proxy)
function clonePosition(address _parent) external returns (address)
```

---

## PositionRoller

Helper for rolling debt between positions using flash loans.

### View Functions

```solidity
// (internal only - no public view functions)
```

### State-Changing Functions

```solidity
// Roll with explicit parameters
function roll(
    IPosition source,        // Position to close
    uint256 repay,           // Principal to repay
    uint256 collWithdraw,    // Collateral to withdraw
    IPosition target,        // Position to open/use
    uint256 mint,            // Amount to mint in target
    uint256 collDeposit,     // Collateral for target
    uint40 expiration        // Target expiration
) external

// Roll everything automatically
function rollFully(
    IPosition source,
    IPosition target
) external

function rollFullyWithExpiration(
    IPosition source,
    IPosition target,
    uint40 expiration
) external

// Native coin versions (cBTC)
function rollNative(...) external payable
function rollFullyNative(IPosition source, IPosition target) external payable
function rollFullyNativeWithExpiration(IPosition source, IPosition target, uint40 expiration) external payable
```

### Events

```solidity
event Roll(address source, uint256 collWithdraw, uint256 repay, address target, uint256 collDeposit, uint256 mint)
```

---

## Savings / SavingsGateway

Interest-bearing JUSD savings module.

### View Functions

```solidity
function jusd() external view returns (IERC20)
function GATEWAY() external view returns (IFrontendGateway)  // Gateway only

// Account information
function savings(address account) external view returns (
    uint192 saved,
    uint64 ticks
)

// Interest calculation
function accruedInterest(address accountOwner) external view returns (uint192)
function accruedInterest(address accountOwner, uint256 timestamp) external view returns (uint192)
function calculateInterest(Account memory account, uint64 ticks) external view returns (uint192)

// Leadrate functions (inherited)
function currentTicks() external view returns (uint64)
function currentRatePPM() external view returns (uint24)
```

### State-Changing Functions

```solidity
// Deposit JUSD
function save(uint192 amount) external
function save(address owner, uint192 amount) external

// Gateway versions with frontend code
function save(uint192 amount, bytes32 frontendCode) external
function save(address owner, uint192 amount, bytes32 frontendCode) external

// Withdraw JUSD + interest
function withdraw(address target, uint192 amount) external returns (uint256)
function withdraw(address target, uint192 amount, bytes32 frontendCode) external returns (uint256)

// Adjust to target balance
function adjust(uint192 targetAmount) external
function adjust(uint192 targetAmount, bytes32 frontendCode) external

// Refresh balance (claim interest)
function refreshMyBalance() external returns (uint192)
function refreshBalance(address owner) external returns (uint192)
```

### Events

```solidity
event Saved(address indexed account, uint192 amount)
event InterestCollected(address indexed account, uint256 interest)
event Withdrawn(address indexed account, uint192 amount)
```

---

## SavingsVaultJUSD

ERC-4626 vault adapter for Savings module.

### View Functions

```solidity
function SAVINGS() external view returns (ISavingsJUSD)
function totalClaimed() external view returns (uint256)
function info() external view returns (Account memory)
function price() external view returns (uint256)

// ERC-4626 standard
function asset() external view returns (address)
function totalAssets() external view returns (uint256)
function convertToShares(uint256 assets) external view returns (uint256)
function convertToAssets(uint256 shares) external view returns (uint256)
function maxDeposit(address) external view returns (uint256)
function maxMint(address) external view returns (uint256)
function maxWithdraw(address owner) external view returns (uint256)
function maxRedeem(address owner) external view returns (uint256)
function previewDeposit(uint256 assets) external view returns (uint256)
function previewMint(uint256 shares) external view returns (uint256)
function previewWithdraw(uint256 assets) external view returns (uint256)
function previewRedeem(uint256 shares) external view returns (uint256)
```

### State-Changing Functions (ERC-4626)

```solidity
function deposit(uint256 assets, address receiver) external returns (uint256 shares)
function mint(uint256 shares, address receiver) external returns (uint256 assets)
function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares)
function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets)
```

### Events

```solidity
event InterestClaimed(uint256 interest, uint256 totalClaimed)
event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares)
event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares)
```

---

## StablecoinBridge

1:1 conversion bridge between external stablecoins and JUSD.

### Constants

| Name | Type | Value | Description |
|------|------|-------|-------------|
| `EMERGENCY_QUORUM` | uint32 | 1000 (10%) | Required votes for emergency stop |

### View Functions

```solidity
function usd() external view returns (IERC20)
function JUSD() external view returns (IJuiceDollar)
function horizon() external view returns (uint256)
function limit() external view returns (uint256)
function minted() external view returns (uint256)
function stopped() external view returns (bool)
```

### State-Changing Functions

```solidity
// Convert stablecoin to JUSD
function mint(uint256 amount) external
function mintTo(address target, uint256 amount) external

// Convert JUSD back to stablecoin
function burn(uint256 amount) external
function burnAndSend(address target, uint256 amount) external

// Emergency stop (requires 10% voting power)
function emergencyStop(
    address[] calldata _helpers,
    string calldata _message
) external
```

### Events

```solidity
event EmergencyStopped(address indexed caller, string message)
```

---

## FrontendGateway

Frontend referral reward system.

### View Functions

```solidity
function JUSD() external view returns (IERC20)
function EQUITY() external view returns (Equity)
function MINTING_HUB() external view returns (IMintingHubGateway)
function SAVINGS() external view returns (SavingsGateway)

// Fee rates (PPM)
function feeRate() external view returns (uint24)
function savingsFeeRate() external view returns (uint24)
function mintingFeeRate() external view returns (uint24)
function nextFeeRate() external view returns (uint24)
function nextSavingsFeeRate() external view returns (uint24)
function nextMintingFeeRate() external view returns (uint24)
function changeTimeLock() external view returns (uint256)

// Frontend code data
function frontendCodes(bytes32 code) external view returns (uint256 balance, address owner)
function referredPositions(address position) external view returns (bytes32)
function lastUsedFrontendCode(address user) external view returns (bytes32)
function getPositionFrontendCode(address position) external view returns (bytes32)
```

### State-Changing Functions

#### User Functions

```solidity
// Invest with frontend reward
function invest(
    uint256 amount,
    uint256 expectedShares,
    bytes32 frontendCode
) external returns (uint256 shares)

// Redeem with frontend reward
function redeem(
    address target,
    uint256 shares,
    uint256 expectedProceeds,
    bytes32 frontendCode
) external returns (uint256 proceeds)
```

#### Frontend Operator Functions

```solidity
// Register new frontend code
function registerFrontendCode(bytes32 frontendCode) external returns (bool)

// Transfer ownership of frontend code
function transferFrontendCode(bytes32 frontendCode, address to) external returns (bool)

// Withdraw accumulated rewards
function withdrawRewards(bytes32 frontendCode) external returns (uint256)
function withdrawRewardsTo(bytes32 frontendCode, address to) external returns (uint256)
```

#### Governance Functions

```solidity
// Propose fee rate changes (requires 2% votes)
function proposeChanges(
    uint24 newFeeRatePPM_,
    uint24 newSavingsFeeRatePPM_,
    uint24 newMintingFeeRatePPM_,
    address[] calldata helpers
) external

// Execute pending changes (after 7 days)
function executeChanges() external
```

#### Internal Gateway Functions (Service Only)

```solidity
function updateSavingCode(address savingsOwner, bytes32 frontendCode) external
function updateSavingRewards(address saver, uint256 interest) external
function registerPosition(address position, bytes32 frontendCode) external
function updatePositionRewards(address position, uint256 amount) external
function init(address savings, address mintingHub) external  // One-time setup
```

### Events

```solidity
event FrontendCodeRegistered(address owner, bytes32 frontendCode)
event FrontendCodeTransferred(address from, address to, bytes32 frontendCode)
event FrontendCodeRewardsWithdrawn(address to, uint256 amount, bytes32 frontendCode)
event NewPositionRegistered(address position, bytes32 frontendCode)
event RateChangesProposed(address who, uint24 nextFeeRate, uint24 nextSavingsFeeRate, uint24 nextMintingFeeRate, uint256 nextChange)
event RateChangesExecuted(address who, uint24 nextFeeRate, uint24 nextSavingsFeeRate, uint24 nextMintingFeeRate)
event InvestRewardAdded(bytes32 frontendCode, address user, uint256 amount, uint256 reward)
event RedeemRewardAdded(bytes32 frontendCode, address user, uint256 amount, uint256 reward)
event SavingsRewardAdded(bytes32 frontendCode, address saver, uint256 interest, uint256 reward)
event PositionRewardAdded(bytes32 frontendCode, address position, uint256 amount, uint256 reward)
```

---

## StartUSD

Bootstrap stablecoin for protocol initialization.

### Functions

Standard ERC-20 only (no additional functions).

```solidity
// ERC-20 standard
function name() external view returns (string memory)        // "StartUSD"
function symbol() external view returns (string memory)      // "SUSD"
function decimals() external view returns (uint8)            // 18
function totalSupply() external view returns (uint256)       // 100,000,000 * 10^18
function balanceOf(address account) external view returns (uint256)
function transfer(address to, uint256 amount) external returns (bool)
function allowance(address owner, address spender) external view returns (uint256)
function approve(address spender, uint256 amount) external returns (bool)
function transferFrom(address from, address to, uint256 amount) external returns (bool)
```

---

## Function Count Summary

| Contract | View | State-Changing | Total |
|----------|------|----------------|-------|
| JuiceDollar | 10 | 15 | 25 |
| Equity | 12 | 8 | 20 |
| Leadrate | 6 | 2 | 8 |
| MintingHub(Gateway) | 8 | 14 | 22 |
| Position | 24 | 18 | 42 |
| PositionFactory | 0 | 2 | 2 |
| PositionRoller | 0 | 6 | 6 |
| Savings(Gateway) | 6 | 10 | 16 |
| SavingsVaultJUSD | 15 | 4 | 19 |
| StablecoinBridge | 6 | 5 | 11 |
| FrontendGateway | 13 | 11 | 24 |
| StartUSD | 6 | 3 | 9 |
| **Total** | **106** | **98** | **204** |
