# Governance

**A guide for reserve pool share holders on how they should use their veto power.**

## Philosophy of Decentralized Governance

Traditional financial systems concentrate power in central authorities - regulators decide which collateral is acceptable, banks control money creation, and governments can freeze accounts at will.

JuiceDollar's governance embodies the cypherpunk principle of **"code as law"**: rules are enforced by immutable smart contracts, not by institutions that can change them arbitrarily.

**Key design choices:**
- **Veto-based, not approval-based**: Proposals pass by default unless actively rejected - maximizing permissionlessness
- **Minority protection**: Only 2% of voting power needed for a veto - preventing tyranny of the majority
- **Time-weighted voting**: Commitment over time matters more than capital alone
- **Kamikaze mechanism**: Democratic safeguard allowing users to sacrifice their own votes to counter bad actors

This mirrors the cypherpunk ethos: build systems that don't require trust in any single party.

## Governance Rules

The governance system is subject to the following rules:

1. Anyone can make proposals. Making a proposal costs a fee of at least 1000 JUSD. There might also be a higher soft limit by convention, which is not enforced in the smart contracts, but socially by vetoing proposals that paid a fee below what is generally considered appropriate.
2. Proposals for new minting modules pass after a minimum 14 days unless someone vetoes them. When proposing new types of collateral in the minting hub, that duration is at least 3 days. These are minimum durations. When making a proposal, it is recommended to give the system participants significantly more time to assess the proposal in order to avoid being vetoed immediately due to a lack of time for discussion.
3. Anyone with more than q = 2% of the total votes V has veto power, i.e. a user with v votes can veto if v > qV holds.
4. The number of votes of a user is calculated by multiplying their JUICE Pool Shares with the time they have held them. If shares are moved to a new address, their associated votes are reset to zero.
5. Users can delegate their votes to other users, who in turn can delegate them further. This allows minority shareholders to team up for a veto. For example, if Alice has 1% of the votes and delegates them to Bob, Bob himself has 1.5% and delegates them to Charles, then both Bob and Charles have the power to execute vetoes.
6. Users can cancel each others votes. For example, Alice can sacrifice 100 votes in order to also reduce Bob's number of votes by 100. This is done using the 'kamikaze' function, which is not yet exposed in the frontend.

In the ideal case, there is a broad consensus for what constitutes an acceptable proposal and no one ever makes a proposal that has to be vetoed. One place to help forming this consensus is the [JuiceDollar forum](https://github.com/orgs/JuiceDollar/discussions).

## Voting Power

### How Votes Are Calculated

Your voting power is based on two factors:

```
votes = JUICE balance × holding duration
```

| Factor | Effect |
|--------|--------|
| **Balance** | More JUICE = more votes |
| **Time** | Longer holding = more votes |

**Example:**
- Alice holds 1,000 JUICE for 1 year → 1,000 × 365 days = 365,000 vote-days
- Bob holds 10,000 JUICE for 1 month → 10,000 × 30 days = 300,000 vote-days
- Alice has more voting power despite holding fewer tokens

### Checking Your Voting Power

```solidity
// Your absolute votes
function votes(address holder) external view returns (uint256)

// Your votes as a fraction of total (in parts per billion)
function relativeVotes(address holder) external view returns (uint256)

// Total votes in the system
function totalVotes() external view returns (uint256)

// How long you've held your current balance
function holdingDuration(address holder) external view returns (uint256)
```

### Vote Reset

**Important:** When JUICE tokens are transferred, the recipient's holding duration resets to zero. This prevents:
- Vote buying attacks
- Flash loan voting manipulation
- Short-term speculators dominating governance

## Vote Delegation

Delegation allows smaller holders to combine their voting power without transferring tokens.

### How Delegation Works

```
Alice (1%) → delegates to → Bob (1.5%) → delegates to → Charles (2%)
```

In this scenario:
- Alice has 1% voting power
- Bob has 2.5% voting power (his 1.5% + Alice's 1%)
- Charles has 4.5% voting power (his 2% + Bob's 2.5%)
- Both Bob and Charles can execute vetoes (≥2%)

### Delegating Your Votes

```solidity
function delegateVoteTo(address delegate) external
```

**Key points:**
- You keep your own votes - delegation adds to the delegate's power
- Delegation is transitive - can chain through multiple addresses
- Only one delegate at a time per address
- Set delegate to `address(0)` to remove delegation

### Using Delegated Votes (Helper Arrays)

When executing governance actions, you must provide a **sorted array of helpers** (addresses that have delegated to you):

```solidity
function checkQualified(
    address sender,
    address[] calldata helpers  // Must be sorted ascending, no duplicates
) external view
```

**Requirements for helpers array:**
1. Sorted in ascending order by address
2. No duplicate addresses
3. All helpers must have delegated to sender
4. Sender must not be in the helpers list

**Example:**
```javascript
const helpers = [
    "0x1111...", // Alice - delegated to me
    "0x2222...", // Bob - delegated to me
    "0x3333..."  // Carol - delegated to me
].sort(); // Must be sorted!

await equity.checkQualified(myAddress, helpers);
```

### Calculating Delegated Votes

```solidity
function votesDelegated(
    address sender,
    address[] calldata helpers
) external view returns (uint256)
```

This returns the total votes including both the sender's own votes and all helpers' votes.

## The Kamikaze Mechanism

The kamikaze function is an emergency mechanism to counter malicious actors who accumulate too much voting power.

### How It Works

Any JUICE holder can sacrifice their own votes to reduce another user's votes by the same amount:

```solidity
function kamikaze(
    address[] calldata targets,  // Addresses to reduce votes from
    uint256 votesToDestroy       // Max votes caller will sacrifice
) external
```

**Mechanism:**
1. Your votes are reduced by `votesToDestroy`
2. Each target's votes are reduced proportionally
3. Total destruction is capped by the smaller of your votes and sum of target votes

### When to Use Kamikaze

- A malicious actor is about to veto a legitimate proposal
- Someone accumulated votes through manipulation
- Emergency defense against governance attacks

**Warning:** Kamikaze is irreversible. Your votes are permanently destroyed.

### Example

```javascript
// Alice has 100,000 votes
// Attacker has 50,000 votes
// Alice uses kamikaze to destroy attacker's votes

await equity.kamikaze(
    [attackerAddress],  // Target
    50000              // Sacrifice 50,000 votes
);

// Result:
// - Alice: 50,000 votes remaining
// - Attacker: 0 votes remaining
```

## Emergency: Restructure Cap Table

In extreme scenarios where equity drops below 1,000 JUSD, a special emergency function becomes available:

```solidity
function restructureCapTable(
    address[] calldata helpers,
    address[] calldata addressesToWipe
) external
```

This allows qualified voters to completely wipe JUICE balances from specified addresses. It's designed as a last-resort measure to restart the system after catastrophic losses.

**Requirements:**
- Caller must have ≥2% voting power
- Total equity must be below 1,000 JUSD
- Should only be used in genuine emergencies

## Flash Loan Protection

The Equity contract includes protection against flash loan attacks:

### Same-Block Redemption Prevention

```solidity
mapping(address => uint256) public lastInboundBlock;
```

When you receive JUICE (through transfer or investment), the block number is recorded. You cannot redeem JUICE in the same block you received it.

**Why this matters:**
- Prevents flash loan attacks on governance
- Ensures voters have genuine exposure to the system
- Blocks "governance-for-rent" attacks

### Checking Redemption Eligibility

```solidity
modifier notSameBlock(address owner) {
    require(lastInboundBlock[owner] < block.number);
    _;
}
```

## Investing in JUICE

### Direct Investment

```solidity
function invest(
    uint256 amount,         // JUSD to invest
    uint256 expectedShares  // Minimum shares (slippage protection)
) external returns (uint256 shares)
```

### Through FrontendGateway (with rewards)

```solidity
function invest(
    uint256 amount,
    uint256 expectedShares,
    bytes32 frontendCode    // Frontend referral code
) external returns (uint256 shares)
```

### Investment Pricing

The price of JUICE is determined by:

```solidity
VALUATION_FACTOR = 10

Market Cap = equity × VALUATION_FACTOR
Price per Share = Market Cap / Total JUICE Supply
```

**Note:** The protocol values itself at **10x equity**, not 5x as sometimes mentioned. This means:
- 1M JUSD equity → 10M JUSD market cap
- System targets ~10% reserve ratio in equilibrium

### Investment Fee

A **2% fee** is charged on both investment and redemption:
- Fee goes to existing JUICE holders
- Discourages short-term speculation
- Provides revenue for the reserve pool

## Redeeming JUICE

### Basic Redemption

```solidity
function redeem(
    address target,   // Where to send JUSD
    uint256 shares    // JUICE to burn
) external returns (uint256 proceeds)
```

### With Slippage Protection

```solidity
function redeemExpected(
    address target,
    uint256 shares,
    uint256 expectedProceeds  // Minimum JUSD to receive
) external returns (uint256 proceeds)
```

### Redemption Restrictions

1. **Same-block protection:** Cannot redeem in the same block you received JUICE
2. **Minimum equity:** System must maintain at least 1,000 JUSD equity
3. **Fee:** 2% redemption fee applies

## Proposing System Changes

### New Minting Modules

Anyone can propose a new minting module (a contract that can mint/burn JUSD):

```solidity
function suggestMinter(
    address _minter,           // Contract address
    uint256 _applicationPeriod, // Veto period (≥14 days)
    uint256 _applicationFee,    // Fee (≥1000 JUSD)
    string calldata _message    // Description/documentation
) external
```

### New Collateral Types

Via the MintingHub, propose new position types:
- Minimum 3-day initialization period
- 1,000 JUSD opening fee
- See [Opening New Positions](/positions/open) for details

### Interest Rate Changes

Qualified JUICE holders can propose Leadrate changes:

```solidity
function proposeChange(
    uint24 newRatePPM_,          // New rate in PPM
    address[] calldata helpers   // Vote delegation helpers
) external
```

- 7-day timelock before execution
- See [Savings & Interest](/savings) for details

## Vetoing Proposals

### Vetoing a Minter

```solidity
function denyMinter(
    address minter,              // Minter to deny
    address[] calldata helpers,  // Vote delegation helpers
    string calldata message      // Reason for denial
) external
```

### Vetoing a Position

```solidity
// On the Position contract, during initialization period
function deny(
    address[] calldata helpers,
    string calldata message
) external
```

### Veto Requirements

| Parameter | Value |
|-----------|-------|
| Required voting power | 2% of total votes |
| Timing | Before initialization period ends |
| Effect | Permanent denial |

## Governance Events

```solidity
// Vote delegation changed
event Delegation(address indexed from, address indexed to)

// JUICE bought or sold
event Trade(address who, int256 amount, uint256 totPrice, uint256 newprice)

// Minter proposed
event MinterApplied(address indexed minter, uint256 applicationPeriod, uint256 applicationFee, string message)

// Minter denied
event MinterDenied(address indexed minter, string message)

// Position denied
event PositionDenied(address indexed sender, string message)
```

## Governance Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `QUORUM` | 200 (2%) | Voting power needed for veto |
| `VALUATION_FACTOR` | 10 | Market cap = 10 × equity |
| `MIN_APPLICATION_PERIOD` | 14 days | Minimum for new minters |
| `MIN_FEE` | 1,000 JUSD | Minimum proposal fee |
| `MINIMUM_EQUITY` | 1,000 JUSD | Minimum for operations |

## Best Practices

### For JUICE Holders

1. **Hold long-term:** Voting power increases with time
2. **Stay informed:** Monitor proposals on the forum
3. **Delegate wisely:** Choose delegates who share your values
4. **Vote responsibly:** Your veto power protects the system

### For Proposal Makers

1. **Document thoroughly:** Provide clear explanations
2. **Allow time:** Use longer-than-minimum periods for complex proposals
3. **Engage community:** Discuss on the forum before proposing
4. **Be patient:** Good proposals will pass; rushed ones get vetoed
