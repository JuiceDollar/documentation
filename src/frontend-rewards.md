# Frontend Rewards

**Earn rewards by building frontends and referring users to the JuiceDollar ecosystem.**

The JuiceDollar system includes a built-in reward mechanism for frontend operators and referrers. Anyone can register a frontend code and earn a share of the activity generated through their interface.

## How It Works

The Frontend Gateway tracks user activity and attributes rewards to registered frontend codes:

```
User Action → Frontend Code → Reward Accrued → Withdraw Anytime
```

### Reward Sources

Frontend operators earn rewards from three types of user activity:

| Activity | Reward Rate | Description |
|----------|-------------|-------------|
| **JUICE Investment/Redemption** | 1% of volume | When users buy or sell JUICE |
| **Savings Interest** | 5% of interest earned | When users earn interest on savings |
| **Position Interest** | 5% of interest paid | When borrowers pay interest |

### Example Earnings

**Scenario:** Your frontend facilitates:
- 100,000 JUSD invested in JUICE → 1,000 JUSD reward
- Users earn 5,000 JUSD in savings interest → 250 JUSD reward
- Borrowers pay 10,000 JUSD in position interest → 500 JUSD reward

**Total:** 1,750 JUSD in rewards

## Registering a Frontend Code

### Step 1: Choose Your Code

A frontend code is a `bytes32` identifier. You can create one from any string:

```javascript
// Example: Convert string to bytes32
const frontendCode = ethers.utils.formatBytes32String("myapp");
// Result: 0x6d79617070000000000000000000000000000000000000000000000000000000
```

**Requirements:**
- Must be unique (not already registered)
- Cannot be the zero bytes32
- First come, first served

### Step 2: Register On-Chain

Call the registration function:

```solidity
function registerFrontendCode(bytes32 frontendCode) external returns (bool)
```

**Contract:** FrontendGateway ([Mainnet](https://citreascan.com/address/0x3090a89A1fF5DC99117BE655599e5491A0BaBB92) | [Testnet](https://testnet.citreascan.com/address/0xd824b7d36594Fc3088B1D91a79F34931AA2a15D0))

### Step 3: Integrate Into Your Frontend

Pass your frontend code when users interact with the protocol:

```javascript
// Investment with frontend code
await frontendGateway.invest(amount, expectedShares, frontendCode);

// Savings with frontend code
await savingsGateway.save(amount, frontendCode);

// Position opening with frontend code
await mintingHubGateway.openPosition(...params, frontendCode);
```

## Collecting Rewards

### Check Your Balance

View accumulated rewards:

```solidity
function frontendCodes(bytes32 code) external view returns (
    uint256 balance,  // Accumulated rewards
    address owner     // Code owner
)
```

### Withdraw Rewards

Claim your rewards at any time:

```solidity
// Withdraw to your own address
function withdrawRewards(bytes32 frontendCode) external returns (uint256)

// Withdraw to a different address
function withdrawRewardsTo(bytes32 frontendCode, address to) external returns (uint256)
```

**Important:** Rewards are paid from the equity pool. If equity is very low, withdrawals may be limited.

## Transferring Ownership

Frontend codes can be transferred to a new owner:

```solidity
function transferFrontendCode(bytes32 frontendCode, address to) external returns (bool)
```

This is useful for:
- Selling your frontend business
- Transferring to a multi-sig
- Changing operational wallets

## Gateway Contracts

The reward system uses specialized "Gateway" contracts that extend the base functionality:

| Base Contract | Gateway Version | Added Feature |
|---------------|-----------------|---------------|
| MintingHub | MintingHubGateway | Tracks position interest |
| Savings | SavingsGateway | Tracks savings interest |
| Equity | (via FrontendGateway) | Tracks investments |

### Why Gateways?

The gateway pattern allows:
- **Backwards compatibility:** Base contracts work without frontend codes
- **Optional participation:** Users can interact directly without rewards tracking
- **Upgradeable rewards:** Fee rates can be adjusted via governance

## Fee Rate Governance

The reward rates can be modified by qualified JUICE holders:

### Current Rates

| Parameter | Rate | PPM Value |
|-----------|------|-----------|
| Investment Fee | 1% | 10,000 |
| Savings Fee | 5% | 50,000 |
| Minting Fee | 5% | 50,000 |

### Proposing Changes

```solidity
function proposeChanges(
    uint24 newFeeRatePPM_,        // Investment fee (max 2%)
    uint24 newSavingsFeeRatePPM_, // Savings fee (max 100%)
    uint24 newMintingFeeRatePPM_, // Minting fee (max 100%)
    address[] calldata helpers    // Vote delegation helpers
) external
```

**Requirements:**
- Caller must have ≥2% voting power
- Investment fee capped at 2% (20,000 PPM)
- 7-day timelock before execution

### Executing Changes

After 7 days:

```solidity
function executeChanges() external
```

## Integration Guide

### For Web Frontends

```javascript
import { ethers } from 'ethers';

const FRONTEND_CODE = ethers.utils.formatBytes32String("myapp");

// Mainnet addresses
const FRONTEND_GATEWAY = "0x3090a89A1fF5DC99117BE655599e5491A0BaBB92";
const SAVINGS_GATEWAY = "0x22FE239892eBC8805DA8f05eD3bc6aF75332b60b";
const MINTING_HUB_GATEWAY = "0x1a20B160bf546774246C7920939E6e7Ac0f88b8e";

// Testnet addresses (for development)
// const FRONTEND_GATEWAY = "0xd824b7d36594Fc3088B1D91a79F34931AA2a15D0";
// const SAVINGS_GATEWAY = "0x54430781b33581CE2b0DBD837CA66113BeEEFD8e";
// const MINTING_HUB_GATEWAY = "0x5fC684074fBaAE37Eb68d3e48D85f485CE5060F8";

// Investment with rewards
async function investWithRewards(amount, expectedShares) {
    const gateway = new ethers.Contract(FRONTEND_GATEWAY, abi, signer);
    return gateway.invest(amount, expectedShares, FRONTEND_CODE);
}

// Savings with rewards
async function saveWithRewards(amount) {
    const savings = new ethers.Contract(SAVINGS_GATEWAY, abi, signer);
    return savings.save(amount, FRONTEND_CODE);
}

// Position opening with rewards
async function openPositionWithRewards(params) {
    const hub = new ethers.Contract(MINTING_HUB_GATEWAY, abi, signer);
    return hub.openPosition(...params, FRONTEND_CODE);
}
```

### Tracking User Activity

The `lastUsedFrontendCode` mapping tracks which frontend code a user last interacted with:

```solidity
function lastUsedFrontendCode(address user) external view returns (bytes32)
```

This enables:
- Persistent referral attribution
- User analytics
- Loyalty programs

## Contract Addresses

### Mainnet (Chain ID: 4114)

| Contract | Address | Purpose |
|----------|---------|---------|
| FrontendGateway | [`0x3090a89A1fF5DC99117BE655599e5491A0BaBB92`](https://citreascan.com/address/0x3090a89A1fF5DC99117BE655599e5491A0BaBB92) | Core reward tracking |
| MintingHubGateway | [`0x1a20B160bf546774246C7920939E6e7Ac0f88b8e`](https://citreascan.com/address/0x1a20B160bf546774246C7920939E6e7Ac0f88b8e) | Position rewards |
| SavingsGateway | [`0x22FE239892eBC8805DA8f05eD3bc6aF75332b60b`](https://citreascan.com/address/0x22FE239892eBC8805DA8f05eD3bc6aF75332b60b) | Savings rewards |

### Testnet (Chain ID: 5115)

| Contract | Address | Purpose |
|----------|---------|---------|
| FrontendGateway | [`0xd824b7d36594Fc3088B1D91a79F34931AA2a15D0`](https://testnet.citreascan.com/address/0xd824b7d36594Fc3088B1D91a79F34931AA2a15D0) | Core reward tracking |
| MintingHubGateway | [`0x5fC684074fBaAE37Eb68d3e48D85f485CE5060F8`](https://testnet.citreascan.com/address/0x5fC684074fBaAE37Eb68d3e48D85f485CE5060F8) | Position rewards |
| SavingsGateway | [`0x54430781b33581CE2b0DBD837CA66113BeEEFD8e`](https://testnet.citreascan.com/address/0x54430781b33581CE2b0DBD837CA66113BeEEFD8e) | Savings rewards |

## Events

Monitor reward activity through these events:

```solidity
// Frontend code registered
event FrontendCodeRegistered(address owner, bytes32 frontendCode);

// Code ownership transferred
event FrontendCodeTransferred(address from, address to, bytes32 frontendCode);

// Rewards withdrawn
event FrontendCodeRewardsWithdrawn(address to, uint256 amount, bytes32 frontendCode);

// Reward accrued from investment
event InvestRewardAdded(bytes32 frontendCode, address user, uint256 amount, uint256 reward);

// Reward accrued from redemption
event RedeemRewardAdded(bytes32 frontendCode, address user, uint256 amount, uint256 reward);

// Reward accrued from savings interest
event SavingsRewardAdded(bytes32 frontendCode, address saver, uint256 interest, uint256 reward);

// Reward accrued from position interest
event PositionRewardAdded(bytes32 frontendCode, address position, uint256 amount, uint256 reward);
```

## Best Practices

1. **Register Early:** Frontend codes are first-come-first-served. Register yours before someone else takes it.

2. **Use Meaningful Codes:** Choose a code that represents your brand (e.g., your app name).

3. **Monitor Rewards:** Set up event listeners to track reward accumulation in real-time.

4. **Secure Your Keys:** The owner address controls the frontend code. Use a secure wallet or multi-sig.

5. **Disclose to Users:** Be transparent with your users about the referral system.

## FAQ

### Can I use multiple frontend codes?

Yes, you can register and manage multiple codes. This is useful for:
- Different products/interfaces
- A/B testing
- Partner programs

### What if a user doesn't use a frontend code?

They can still interact with the base contracts directly. No rewards are tracked, and the protocol works normally.

### Can frontend codes be revoked?

No. Once registered, a frontend code exists permanently. Ownership can only be transferred, not revoked.

### Are rewards taxable?

Consult a tax professional in your jurisdiction. Frontend rewards may be considered income.
