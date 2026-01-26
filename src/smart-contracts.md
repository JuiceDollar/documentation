# Smart Contracts

**A technical overview of all smart contracts powering the JuiceDollar protocol.**

The JuiceDollar protocol consists of multiple smart contracts that work together to create a trustless, oracle-free stablecoin system. All contracts are deployed on Citrea (Bitcoin L2) and are fully immutable - no admin keys, no upgrades, no central control.

## Contract Architecture

<figure style="text-align: center"><img src="/assets/contract-architecture.png" alt=""><figcaption><p>Smart Contract Architecture</p></figcaption></figure>

The contracts are organized into five main categories:

| Category | Purpose |
|----------|---------|
| **Core** | Token contracts and reserve management |
| **MintingHub** | Position management and collateralized minting |
| **Savings** | Interest-bearing savings functionality |
| **Bridges** | Stablecoin conversion and bootstrapping |
| **Gateways** | Frontend rewards and enhanced functionality |

---

## Core Contracts

### JuiceDollar (JUSD)

The main stablecoin token contract - an ERC-20 token designed to track the value of the US Dollar.

**Key Features:**
- Implements ERC-20, ERC-2612 (Permit), and ERC-3009 (Transfer with Authorization)
- Open to arbitrary minting plugins with veto-based governance
- Creates the Equity contract during deployment
- Manages the minter registry and position registry
- Handles reserve accounting and loss coverage

**Key Functions:**
- `suggestMinter()` - Propose a new minting contract (requires fee and application period)
- `denyMinter()` - Qualified shareholders can veto minting proposals
- `mintWithReserve()` - Mint JUSD with reserve contribution (minters only)
- `burnFromWithReserve()` - Burn JUSD and reclaim proportional reserve

| Property | Value |
|----------|-------|
| **Address** | [`0x6a850a548fdd050e8961223ec8FfCDfacEa57E39`](https://explorer.testnet.citrea.xyz/address/0x6a850a548fdd050e8961223ec8FfCDfacEa57E39) |
| **Symbol** | JUSD |
| **Decimals** | 18 |
| **Min Application Period** | 14 days |
| **Min Application Fee** | 1,000 JUSD |

---

### Equity (JUICE)

The equity token representing shares in the JuiceDollar reserve pool. Holding JUICE is similar to being a shareholder of a bank.

**Key Features:**
- ERC-20 token with time-weighted voting power
- 2% quorum required for governance veto
- Price determined by proportional capital valuation (10x equity)
- 2% fee on minting and redemption
- Flash loan protection (same-block redemption blocked)

**Key Functions:**
- `invest()` - Mint JUICE by depositing JUSD into the reserve
- `redeem()` - Burn JUICE to withdraw JUSD from the reserve
- `checkQualified()` - Verify if an address has sufficient voting power (2%)
- `delegateVoteTo()` - Delegate voting power to another address
- `kamikaze()` - Sacrifice own votes to reduce malicious actor's votes

**Voting Mechanics:**
- Votes accumulate over time: `votes = balance * holdingDuration`
- Longer holding = more voting power
- Delegation adds to delegate's power without removing own votes

| Property | Value |
|----------|-------|
| **Address** | [`0x7fa131991c8A7d8C21b11391C977Fc7c4c8e0D5E`](https://explorer.testnet.citrea.xyz/address/0x7fa131991c8A7d8C21b11391C977Fc7c4c8e0D5E) |
| **Symbol** | JUICE |
| **Decimals** | 18 |
| **Valuation Factor** | 10x (market cap = 10 * equity) |
| **Quorum** | 2% |

---

### Leadrate

A governance-controlled interest rate module that provides the base interest rate for the entire system.

**Key Features:**
- Qualified JUICE holders can propose rate changes
- 7-day timelock on all rate changes
- Tracks accumulated "ticks" for interest calculations
- Used by both Savings and Position contracts

**Key Functions:**
- `proposeChange()` - Propose a new interest rate (requires 2% voting power)
- `applyChange()` - Execute a pending rate change after 7 days
- `currentTicks()` - Get accumulated interest ticks since deployment

| Property | Value |
|----------|-------|
| **Deployed With** | SavingsGateway |
| **Rate Format** | PPM (parts per million) per year |
| **Timelock** | 7 days |

---

## MintingHub Contracts

### MintingHub

The central hub for creating, cloning, and challenging collateralized JuiceDollar positions.

**Key Features:**
- Creates new position contracts via PositionFactory
- Manages Dutch auctions for liquidations
- Supports native coin (cBTC) positions
- Handles forced sales of expired positions

**Key Functions:**
- `openPosition()` - Create a new collateralized position (1,000 JUSD fee)
- `clone()` - Clone an existing position with new parameters
- `challenge()` - Start a Dutch auction to challenge undercollateralized positions
- `bid()` - Place a bid in an ongoing challenge auction
- `buyExpiredCollateral()` - Purchase collateral from expired positions

**Challenge Process:**
1. **Phase 1 (Aversion):** Position owner can avert by buying challenger's collateral at liquidation price
2. **Phase 2 (Auction):** Dutch auction where price decreases linearly to zero

| Property | Value |
|----------|-------|
| **Address** | [`0x5fC684074fBaAE37Eb68d3e48D85f485CE5060F8`](https://explorer.testnet.citrea.xyz/address/0x5fC684074fBaAE37Eb68d3e48D85f485CE5060F8) |
| **Opening Fee** | 1,000 JUSD |
| **Challenger Reward** | 2% |
| **Min Challenge Period** | 1 day |
| **Min Position Init Period** | 14 days |

---

### Position

Individual collateralized debt position contract. Each position is a separate contract holding the user's collateral.

**Key Features:**
- Immutable parameters set at creation (collateral type, reserve ratio, etc.)
- Continuous interest accrual based on Leadrate + risk premium
- Cooldown periods on price increases (3 days) for security
- Can be denied by governance during initialization period

**Key Functions:**
- `mint()` - Mint JUSD against deposited collateral
- `repay()` - Repay debt (interest first, then principal)
- `adjust()` - All-in-one function to modify position parameters
- `adjustPrice()` - Change the liquidation price
- `withdrawCollateral()` - Withdraw excess collateral
- `deny()` - Governance can deny positions during init period

**Interest Model:**
- Interest charged on usable mint amount (principal minus reserve)
- Rate = Leadrate + Risk Premium (set at position creation)
- Interest must be overcollateralized by the same ratio as principal

| Property | Value |
|----------|-------|
| **Deployment** | Via PositionFactory (ERC-1167 clones) |
| **Cooldown on Price Increase** | 3 days |
| **Minimum Collateral Value** | 100 JUSD |

---

### PositionFactory

Factory contract for deploying new Position contracts using the ERC-1167 minimal proxy pattern.

**Key Features:**
- Creates new positions with full parameter set
- Clones existing positions efficiently using minimal proxy
- Validates position parameters before cloning

**Key Functions:**
- `createNewPosition()` - Deploy a completely new position contract
- `clonePosition()` - Create a minimal proxy clone of an existing position

| Property | Value |
|----------|-------|
| **Address** | [`0x2990c3219ED2763685D4420f5513feEa8991a7ee`](https://explorer.testnet.citrea.xyz/address/0x2990c3219ED2763685D4420f5513feEa8991a7ee) |
| **Pattern** | ERC-1167 Minimal Proxy |

---

### PositionRoller

Helper contract for rolling over debt from one position to another using flash loans.

**Key Features:**
- Atomically moves debt and collateral between positions
- Supports both ERC-20 and native coin (cBTC) collateral
- Uses flash loans to avoid needing upfront capital
- Preserves frontend codes when rolling through gateways

**Key Functions:**
- `roll()` - Roll debt from source to target position with custom parameters
- `rollFully()` - Roll entire position automatically
- `rollNative()` - Roll native coin positions (cBTC)

| Property | Value |
|----------|-------|
| **Address** | [`0x8A50329559Ae3F2BaA1fC8BC59Fcd52958c61caC`](https://explorer.testnet.citrea.xyz/address/0x8A50329559Ae3F2BaA1fC8BC59Fcd52958c61caC) |

---

## Savings Contracts

### Savings

Base savings module that enables interest-bearing JUSD deposits based on the Leadrate.

**Key Features:**
- Interest accrues continuously based on Leadrate
- No lockup period - withdraw anytime
- Interest paid from system equity (profits)
- Disabled when interest rate is zero

**Key Functions:**
- `save()` - Deposit JUSD into savings
- `withdraw()` - Withdraw JUSD and accrued interest
- `refreshBalance()` - Collect accrued interest into balance
- `adjust()` - Adjust savings to target amount

---

### SavingsVaultJUSD

ERC-4626 compatible vault adapter for the Savings module.

**Key Features:**
- Standard vault interface for DeFi composability
- Automatic interest accrual on deposits/withdrawals
- Protected against inflation attacks via virtual shares
- Tracks total claimed interest

**Key Functions:**
- `deposit()` - Deposit JUSD and receive vault shares
- `withdraw()` - Burn shares and receive JUSD with interest
- `price()` - Current price per share
- `totalAssets()` - Total JUSD including accrued interest

| Property | Value |
|----------|-------|
| **Address** | [`0x802a29bD29f02c8C477Af5362f9ba88FAe39Cc7B`](https://explorer.testnet.citrea.xyz/address/0x802a29bD29f02c8C477Af5362f9ba88FAe39Cc7B) |
| **Symbol** | svJUSD |
| **Standard** | ERC-4626 |

---

## Bridge Contracts

### StablecoinBridge

Enables 1:1 conversion between trusted external stablecoins and JUSD.

**Key Features:**
- Mints JUSD by depositing source stablecoins
- Burns JUSD to retrieve source stablecoins
- Has maximum limit and expiration horizon
- Emergency stop available with 10% governance power

**Key Functions:**
- `mint()` - Convert source stablecoin to JUSD
- `burn()` - Convert JUSD back to source stablecoin
- `emergencyStop()` - Permanently stop bridge (requires 10% votes)

| Property | Value |
|----------|-------|
| **StartUSD Bridge** | [`0x9ba2264bE7695044f59B9ca863E69aC38B3c913d`](https://explorer.testnet.citrea.xyz/address/0x9ba2264bE7695044f59B9ca863E69aC38B3c913d) |
| **Emergency Quorum** | 10% |

---

### StartUSD

Genesis stablecoin used to bootstrap the JuiceDollar protocol.

**Key Features:**
- Simple ERC-20 token with fixed supply
- Mints 100,000,000 SUSD to deployer
- Used to initialize JUSD through the StablecoinBridge
- Creates initial JUICE token supply

| Property | Value |
|----------|-------|
| **Address** | [`0x8398Da4c32eaE51B9840DA230095BB29F4179590`](https://explorer.testnet.citrea.xyz/address/0x8398Da4c32eaE51B9840DA230095BB29F4179590) |
| **Symbol** | SUSD |
| **Total Supply** | 100,000,000 |

---

## Gateway Contracts

### FrontendGateway

Manages frontend referral codes and distributes rewards to frontend operators.

**Key Features:**
- Frontend operators register unique codes
- Rewards distributed based on user activity
- Covers investments, savings, and minting
- Governance-controlled fee rates with 7-day timelock

**Key Functions:**
- `registerFrontendCode()` - Register a new frontend code
- `invest()` - Invest in JUICE with frontend reward
- `redeem()` - Redeem JUICE with frontend reward
- `withdrawRewards()` - Claim accumulated frontend rewards
- `proposeChanges()` - Propose new fee rates (requires 2% votes)

**Fee Rates:**
| Activity | Rate |
|----------|------|
| Investment/Redemption | 1% |
| Savings Interest | 5% of interest |
| Minting Interest | 5% of interest |

| Property | Value |
|----------|-------|
| **Address** | [`0xd824b7d36594Fc3088B1D91a79F34931AA2a15D0`](https://explorer.testnet.citrea.xyz/address/0xd824b7d36594Fc3088B1D91a79F34931AA2a15D0) |

---

### MintingHubGateway

Extended MintingHub with frontend reward integration.

**Key Features:**
- All MintingHub functionality plus frontend tracking
- Associates positions with frontend codes
- Tracks and distributes interest-based rewards

**Key Functions:**
- `openPosition()` - Create position with frontend code
- `clone()` - Clone position with frontend code
- `notifyInterestPaid()` - Track interest for reward distribution

| Property | Value |
|----------|-------|
| **Address** | [`0x5fC684074fBaAE37Eb68d3e48D85f485CE5060F8`](https://explorer.testnet.citrea.xyz/address/0x5fC684074fBaAE37Eb68d3e48D85f485CE5060F8) |

---

### SavingsGateway

Extended Savings module with frontend reward integration.

**Key Features:**
- All Savings functionality plus frontend tracking
- Associates savers with frontend codes
- Distributes interest-based rewards to frontends

**Key Functions:**
- `save()` - Save with frontend code
- `withdraw()` - Withdraw with frontend code
- `adjust()` - Adjust savings with frontend code

| Property | Value |
|----------|-------|
| **Address** | [`0x54430781b33581CE2b0DBD837CA66113BeEEFD8e`](https://explorer.testnet.citrea.xyz/address/0x54430781b33581CE2b0DBD837CA66113BeEEFD8e) |

---

## Contract Summary

| Contract | Address | Purpose |
|----------|---------|---------|
| JuiceDollar | [`0x6a85...7E39`](https://explorer.testnet.citrea.xyz/address/0x6a850a548fdd050e8961223ec8FfCDfacEa57E39) | Main stablecoin token |
| Equity | [`0x7fa1...D5E`](https://explorer.testnet.citrea.xyz/address/0x7fa131991c8A7d8C21b11391C977Fc7c4c8e0D5E) | Reserve pool shares (JUICE) |
| MintingHubGateway | [`0x5fC6...0F8`](https://explorer.testnet.citrea.xyz/address/0x5fC684074fBaAE37Eb68d3e48D85f485CE5060F8) | Position management hub |
| PositionFactory | [`0x2990...7ee`](https://explorer.testnet.citrea.xyz/address/0x2990c3219ED2763685D4420f5513feEa8991a7ee) | Position deployment factory |
| PositionRoller | [`0x8A50...caC`](https://explorer.testnet.citrea.xyz/address/0x8A50329559Ae3F2BaA1fC8BC59Fcd52958c61caC) | Position rollover helper |
| SavingsGateway | [`0x5443...D8e`](https://explorer.testnet.citrea.xyz/address/0x54430781b33581CE2b0DBD837CA66113BeEEFD8e) | Savings with frontend rewards |
| SavingsVaultJUSD | [`0x802a...c7B`](https://explorer.testnet.citrea.xyz/address/0x802a29bD29f02c8C477Af5362f9ba88FAe39Cc7B) | ERC-4626 savings vault |
| FrontendGateway | [`0xd824...5D0`](https://explorer.testnet.citrea.xyz/address/0xd824b7d36594Fc3088B1D91a79F34931AA2a15D0) | Frontend reward system |
| StartUSD Bridge | [`0x9ba2...13d`](https://explorer.testnet.citrea.xyz/address/0x9ba2264bE7695044f59B9ca863E69aC38B3c913d) | Bootstrap stablecoin bridge |
| StartUSD | [`0x8398...590`](https://explorer.testnet.citrea.xyz/address/0x8398Da4c32eaE51B9840DA230095BB29F4179590) | Genesis stablecoin |

---

## Security Properties

The JuiceDollar smart contracts are designed with the following security properties:

| Property | Implementation |
|----------|---------------|
| **Immutability** | No admin keys, no proxy upgrades |
| **Oracle-free** | No reliance on external price feeds |
| **Flash loan protection** | Same-block redemption blocked |
| **Governance timelocks** | 7-14 day delays on critical changes |
| **Minority protection** | 2% veto threshold |
| **Emergency stops** | 10% quorum can halt bridges |
| **Inflation attack mitigation** | ERC-4626 virtual shares pattern |

---

## Source Code

All smart contract source code is available on GitHub:

**Repository:** [github.com/JuiceDollar/smartContracts](https://github.com/JuiceDollar/smartContracts)

**Network:** Citrea Testnet (Chain ID: 5115)

**Explorer:** [explorer.testnet.citrea.xyz](https://explorer.testnet.citrea.xyz)

---

## Complete Function Reference

For a comprehensive listing of every public function across all contracts, including full signatures, parameters, return values, and access control modifiers, see the **[Smart Contract Functions Reference](/smart-contracts/functions.md)**.

The function reference includes:
- **204 total functions** across all contracts
- **106 view/pure functions** for reading state
- **98 state-changing functions** for transactions
- Complete parameter documentation
- Event definitions for each contract
