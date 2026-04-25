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
| **Bridges** | Stablecoin conversion |
| **Gateways** | Frontend rewards and enhanced functionality |

---

## Protocol Modules: V2 and V3

JuiceDollar contracts are immutable and cannot be replaced. Instead of upgrading via proxies, the protocol evolves by adding **new modules** through the standard `suggestMinter()` governance flow. As of March 2026 the protocol runs **two coexisting MintingHub and Savings modules** on Citrea Mainnet:

| Module | Status | Frontend Rewards | Notes |
|--------|--------|------------------|-------|
| **V2** | Active, permanent | Yes (via Gateways) | Original launch modules; positions and savings opened here remain fully usable. Cannot be deactivated. |
| **V3** | Active, permanent | No | Additional module set approved by JUICE governance on **2026-03-19**. Adds native cBTC support, a price reference system, and an updated savings/vault design. Routes do not pass through `FrontendGateway`. |

Both module sets share the same `JuiceDollar` (JUSD) token, the same `Equity` (JUICE) reserve pool, and the same Bridge contracts. New positions and savings deposits can be opened in either module; existing V2 positions are not migrated and continue to live under V2.

::: tip
V3 is **not a replacement** for V2. It is an additional, parallel set of minter contracts that JUICE holders approved through the standard 14-day application period. V2 remains the only home for positions and savings that were opened before V3 went live.
:::

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
| **Symbol** | JUSD |
| **Decimals** | 18 |
| **Min Application Period** | 14 days |
| **Min Application Fee** | 1,000 JUSD |

| Network | Address |
|---------|---------|
| **Mainnet** | [`0x0987D3720D38847ac6dBB9D025B9dE892a3CA35C`](https://citreascan.com/address/0x0987D3720D38847ac6dBB9D025B9dE892a3CA35C) |
| **Testnet** | [`0x6a850a548fdd050e8961223ec8FfCDfacEa57E39`](https://testnet.citreascan.com/address/0x6a850a548fdd050e8961223ec8FfCDfacEa57E39) |

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
| **Symbol** | JUICE |
| **Decimals** | 18 |
| **Valuation Factor** | 10x (market cap = 10 * equity) |
| **Quorum** | 2% |

| Network | Address |
|---------|---------|
| **Mainnet** | [`0x2A36f2b204B46Fd82653cd06d00c7fF757C99ae4`](https://citreascan.com/address/0x2A36f2b204B46Fd82653cd06d00c7fF757C99ae4) |
| **Testnet** | [`0x7fa131991c8A7d8C21b11391C977Fc7c4c8e0D5E`](https://testnet.citreascan.com/address/0x7fa131991c8A7d8C21b11391C977Fc7c4c8e0D5E) |

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
| **Opening Fee** | 1,000 JUSD |
| **Challenger Reward** | 2% |
| **Min Challenge Period** | 1 day |
| **Min Position Init Period** | 14 days |

The protocol exposes two MintingHub modules. V2 is wrapped by `MintingHubGateway` for frontend-code tracking; V3 routes directly through `MintingHub` and adds native cBTC handling plus a price reference system.

| Module | Network | Address |
|--------|---------|---------|
| **V2** (`MintingHubGateway`) | Mainnet | [`0x1a20B160bf546774246C7920939E6e7Ac0f88b8e`](https://citreascan.com/address/0x1a20B160bf546774246C7920939E6e7Ac0f88b8e) |
| **V2** (`MintingHubGateway`) | Testnet | [`0x5fC684074fBaAE37Eb68d3e48D85f485CE5060F8`](https://testnet.citreascan.com/address/0x5fC684074fBaAE37Eb68d3e48D85f485CE5060F8) |
| **V3** (`MintingHub`) | Mainnet | [`0x0f0164a5D9556C64bA879622C71732f3525C183A`](https://citreascan.com/address/0x0f0164a5D9556C64bA879622C71732f3525C183A) |
| **V3** (`MintingHub`) | Testnet | _not deployed_ |

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
| **Pattern** | ERC-1167 Minimal Proxy |

Each MintingHub module owns its own PositionFactory.

| Module | Network | Address |
|--------|---------|---------|
| **V2** | Mainnet | [`0x107eDf5f030d724bD0C73f88A300bEA09AE581e2`](https://citreascan.com/address/0x107eDf5f030d724bD0C73f88A300bEA09AE581e2) |
| **V2** | Testnet | [`0x2990c3219ED2763685D4420f5513feEa8991a7ee`](https://testnet.citreascan.com/address/0x2990c3219ED2763685D4420f5513feEa8991a7ee) |
| **V3** | Mainnet | [`0x37E45AceF1E1fEF03697440682329FFc84e9310E`](https://citreascan.com/address/0x37E45AceF1E1fEF03697440682329FFc84e9310E) |
| **V3** | Testnet | _not deployed_ |

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

A PositionRoller can only roll between positions inside the same MintingHub module.

| Module | Network | Address |
|--------|---------|---------|
| **V2** | Mainnet | [`0xC1b97398c06B9C6a49Fd9dCFAC8907700301e9Ac`](https://citreascan.com/address/0xC1b97398c06B9C6a49Fd9dCFAC8907700301e9Ac) |
| **V2** | Testnet | [`0x8A50329559Ae3F2BaA1fC8BC59Fcd52958c61caC`](https://testnet.citreascan.com/address/0x8A50329559Ae3F2BaA1fC8BC59Fcd52958c61caC) |
| **V3** | Mainnet | [`0x7E2Bc47C49E73340bB7d00bB1E972125cF76A54d`](https://citreascan.com/address/0x7E2Bc47C49E73340bB7d00bB1E972125cF76A54d) |
| **V3** | Testnet | _not deployed_ |

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

The protocol exposes two Savings modules. V2 is wrapped by `SavingsGateway` for frontend-code tracking; V3 routes directly through `Savings` and skips the FrontendGateway layer.

| Module | Network | Address |
|--------|---------|---------|
| **V2** (`SavingsGateway`) | Mainnet | [`0x22FE239892eBC8805DA8f05eD3bc6aF75332b60b`](https://citreascan.com/address/0x22FE239892eBC8805DA8f05eD3bc6aF75332b60b) |
| **V2** (`SavingsGateway`) | Testnet | [`0x54430781b33581CE2b0DBD837CA66113BeEEFD8e`](https://testnet.citreascan.com/address/0x54430781b33581CE2b0DBD837CA66113BeEEFD8e) |
| **V3** (`Savings`) | Mainnet | [`0x6347a7Ec9Cf3D04CD853425a9857513C600EaA94`](https://citreascan.com/address/0x6347a7Ec9Cf3D04CD853425a9857513C600EaA94) |
| **V3** (`Savings`) | Testnet | _not deployed_ |

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
| **Symbol** | svJUSD |
| **Standard** | ERC-4626 |

Each Savings module ships with its own SavingsVaultJUSD adapter.

| Module | Network | Address |
|--------|---------|---------|
| **V2** | Mainnet | [`0x1b70ae756b1089cc5948e4f8a2AD498DF30E897d`](https://citreascan.com/address/0x1b70ae756b1089cc5948e4f8a2AD498DF30E897d) |
| **V2** | Testnet | [`0x802a29bD29f02c8C477Af5362f9ba88FAe39Cc7B`](https://testnet.citreascan.com/address/0x802a29bD29f02c8C477Af5362f9ba88FAe39Cc7B) |
| **V3** | Mainnet | [`0xD6d874968882d01fff6712e639f3F7e19bDA6523`](https://citreascan.com/address/0xD6d874968882d01fff6712e639f3F7e19bDA6523) |
| **V3** | Testnet | _not deployed_ |

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
| **Emergency Quorum** | 10% |

**Mainnet Bridges:**

| Bridge | Address |
|--------|---------|
| **USDC Bridge** | [`0x920DB0aDf6fEe2D69401e9f68D60319177dCa20F`](https://citreascan.com/address/0x920DB0aDf6fEe2D69401e9f68D60319177dCa20F) |
| **USDT Bridge** | [`0x5CC0e668F8BA61E111B6168E19d17d3C65040614`](https://citreascan.com/address/0x5CC0e668F8BA61E111B6168E19d17d3C65040614) |
| **CTUSD Bridge** | [`0x8D11020286aF9ecf7E5D7bD79699c391b224a0bd`](https://citreascan.com/address/0x8D11020286aF9ecf7E5D7bD79699c391b224a0bd) |

---

### StartUSD (Historical)

StartUSD (SUSD) was a simple ERC-20 bootstrap token used to initialize the JuiceDollar system during a time-limited 6-week launch phase. The StartUSD bridge has since expired and SUSD is no longer part of the system.

| Network | Contract | Address |
|---------|----------|---------|
| **Mainnet** | Token | [`0xD41ab73aF9c7324b9c7c6e63dE1aeC666d98bc80`](https://citreascan.com/address/0xD41ab73aF9c7324b9c7c6e63dE1aeC666d98bc80) |
| **Mainnet** | Bridge (expired) | [`0x51ff8141D731676Fb21aE1E5D5A88c04511994dD`](https://citreascan.com/address/0x51ff8141D731676Fb21aE1E5D5A88c04511994dD) |
| **Testnet** | Token | [`0x8398Da4c32eaE51B9840DA230095BB29F4179590`](https://testnet.citreascan.com/address/0x8398Da4c32eaE51B9840DA230095BB29F4179590) |
| **Testnet** | Bridge (expired) | [`0x9ba2264bE7695044f59B9ca863E69aC38B3c913d`](https://testnet.citreascan.com/address/0x9ba2264bE7695044f59B9ca863E69aC38B3c913d) |

**Mainnet Stablecoins:**

| Token | Address |
|-------|---------|
| **USDC** | [`0xE045e6c36cF77FAA2CfB54466D71A3aEF7bbE839`](https://citreascan.com/address/0xE045e6c36cF77FAA2CfB54466D71A3aEF7bbE839) |
| **USDT** | [`0x9f3096Bac87e7F03DC09b0B416eB0DF837304dc4`](https://citreascan.com/address/0x9f3096Bac87e7F03DC09b0B416eB0DF837304dc4) |
| **CTUSD** | [`0x8D82c4E3c936C7B5724A382a9c5a4E6Eb7aB6d5D`](https://citreascan.com/address/0x8D82c4E3c936C7B5724A382a9c5a4E6Eb7aB6d5D) |

---

## Gateway Contracts

::: warning V2 ONLY
The Gateway layer only exists in V2. V3 modules (`MintingHub`, `Savings`) bypass the Gateway pattern entirely and do not emit frontend rewards. Frontend operators only earn rewards on V2 activity.
:::

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

| Network | Address |
|---------|---------|
| **Mainnet** | [`0x3090a89A1fF5DC99117BE655599e5491A0BaBB92`](https://citreascan.com/address/0x3090a89A1fF5DC99117BE655599e5491A0BaBB92) |
| **Testnet** | [`0xd824b7d36594Fc3088B1D91a79F34931AA2a15D0`](https://testnet.citreascan.com/address/0xd824b7d36594Fc3088B1D91a79F34931AA2a15D0) |

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

| Network | Address |
|---------|---------|
| **Mainnet** | [`0x1a20B160bf546774246C7920939E6e7Ac0f88b8e`](https://citreascan.com/address/0x1a20B160bf546774246C7920939E6e7Ac0f88b8e) |
| **Testnet** | [`0x5fC684074fBaAE37Eb68d3e48D85f485CE5060F8`](https://testnet.citreascan.com/address/0x5fC684074fBaAE37Eb68d3e48D85f485CE5060F8) |

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

| Network | Address |
|---------|---------|
| **Mainnet** | [`0x22FE239892eBC8805DA8f05eD3bc6aF75332b60b`](https://citreascan.com/address/0x22FE239892eBC8805DA8f05eD3bc6aF75332b60b) |
| **Testnet** | [`0x54430781b33581CE2b0DBD837CA66113BeEEFD8e`](https://testnet.citreascan.com/address/0x54430781b33581CE2b0DBD837CA66113BeEEFD8e) |

---

## Contract Summary

### Mainnet (Chain ID: 4114)

#### Shared

| Contract | Address | Purpose |
|----------|---------|---------|
| JuiceDollar | [`0x0987...35C`](https://citreascan.com/address/0x0987D3720D38847ac6dBB9D025B9dE892a3CA35C) | Main stablecoin token |
| Equity | [`0x2A36...ae4`](https://citreascan.com/address/0x2A36f2b204B46Fd82653cd06d00c7fF757C99ae4) | Reserve pool shares (JUICE) |
| USDC Bridge | [`0x920D...20F`](https://citreascan.com/address/0x920DB0aDf6fEe2D69401e9f68D60319177dCa20F) | USDC stablecoin bridge |
| USDT Bridge | [`0x5CC0...614`](https://citreascan.com/address/0x5CC0e668F8BA61E111B6168E19d17d3C65040614) | USDT stablecoin bridge |
| CTUSD Bridge | [`0x8D11...0bd`](https://citreascan.com/address/0x8D11020286aF9ecf7E5D7bD79699c391b224a0bd) | CTUSD stablecoin bridge |

#### V2 Module (active, with frontend rewards)

| Contract | Address | Purpose |
|----------|---------|---------|
| MintingHubGateway | [`0x1a20...b8e`](https://citreascan.com/address/0x1a20B160bf546774246C7920939E6e7Ac0f88b8e) | Position management hub (V2) |
| PositionFactory | [`0x107e...1e2`](https://citreascan.com/address/0x107eDf5f030d724bD0C73f88A300bEA09AE581e2) | Position deployment factory (V2) |
| PositionRoller | [`0xC1b9...9Ac`](https://citreascan.com/address/0xC1b97398c06B9C6a49Fd9dCFAC8907700301e9Ac) | Position rollover helper (V2) |
| SavingsGateway | [`0x22FE...60b`](https://citreascan.com/address/0x22FE239892eBC8805DA8f05eD3bc6aF75332b60b) | Savings with frontend rewards |
| SavingsVaultJUSD | [`0x1b70...97d`](https://citreascan.com/address/0x1b70ae756b1089cc5948e4f8a2AD498DF30E897d) | ERC-4626 savings vault (V2) |
| FrontendGateway | [`0x3090...B92`](https://citreascan.com/address/0x3090a89A1fF5DC99117BE655599e5491A0BaBB92) | Frontend reward system (V2 only) |

#### V3 Module (active, governance-approved 2026-03-19, no frontend rewards)

| Contract | Address | Purpose |
|----------|---------|---------|
| MintingHub | [`0x0f01...183A`](https://citreascan.com/address/0x0f0164a5D9556C64bA879622C71732f3525C183A) | Position management hub (V3) |
| PositionFactory | [`0x37E4...310E`](https://citreascan.com/address/0x37E45AceF1E1fEF03697440682329FFc84e9310E) | Position deployment factory (V3) |
| PositionRoller | [`0x7E2B...A54d`](https://citreascan.com/address/0x7E2Bc47C49E73340bB7d00bB1E972125cF76A54d) | Position rollover helper (V3) |
| Savings | [`0x6347...aA94`](https://citreascan.com/address/0x6347a7Ec9Cf3D04CD853425a9857513C600EaA94) | Savings module (V3) |
| SavingsVaultJUSD | [`0xD6d8...6523`](https://citreascan.com/address/0xD6d874968882d01fff6712e639f3F7e19bDA6523) | ERC-4626 savings vault (V3) |

### Testnet (Chain ID: 5115)

Only the V2 module is deployed on Testnet. V3 is currently Mainnet-only.

| Contract | Address | Purpose |
|----------|---------|---------|
| JuiceDollar | [`0x6a85...E39`](https://testnet.citreascan.com/address/0x6a850a548fdd050e8961223ec8FfCDfacEa57E39) | Main stablecoin token |
| Equity | [`0x7fa1...D5E`](https://testnet.citreascan.com/address/0x7fa131991c8A7d8C21b11391C977Fc7c4c8e0D5E) | Reserve pool shares (JUICE) |
| MintingHubGateway | [`0x5fC6...0F8`](https://testnet.citreascan.com/address/0x5fC684074fBaAE37Eb68d3e48D85f485CE5060F8) | Position management hub |
| PositionFactory | [`0x2990...7ee`](https://testnet.citreascan.com/address/0x2990c3219ED2763685D4420f5513feEa8991a7ee) | Position deployment factory |
| PositionRoller | [`0x8A50...caC`](https://testnet.citreascan.com/address/0x8A50329559Ae3F2BaA1fC8BC59Fcd52958c61caC) | Position rollover helper |
| SavingsGateway | [`0x5443...D8e`](https://testnet.citreascan.com/address/0x54430781b33581CE2b0DBD837CA66113BeEEFD8e) | Savings with frontend rewards |
| SavingsVaultJUSD | [`0x802a...c7B`](https://testnet.citreascan.com/address/0x802a29bD29f02c8C477Af5362f9ba88FAe39Cc7B) | ERC-4626 savings vault |
| FrontendGateway | [`0xd824...1D0`](https://testnet.citreascan.com/address/0xd824b7d36594Fc3088B1D91a79F34931AA2a15D0) | Frontend reward system |
| StartUSD Bridge (expired) | [`0x9ba2...3d`](https://testnet.citreascan.com/address/0x9ba2264bE7695044f59B9ca863E69aC38B3c913d) | Bootstrap stablecoin bridge (expired) |
| StartUSD | [`0x8398...590`](https://testnet.citreascan.com/address/0x8398Da4c32eaE51B9840DA230095BB29F4179590) | Bootstrap token (historical) |

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

| Network | Chain ID | Explorer |
|---------|----------|----------|
| **Mainnet** | 4114 | [citreascan.com](https://citreascan.com) |
| **Testnet** | 5115 | [testnet.citreascan.com](https://testnet.citreascan.com) |

---

## Complete Function Reference

For a comprehensive listing of every public function across all contracts, including full signatures, parameters, return values, and access control modifiers, see the **[Smart Contract Functions Reference](/smart-contracts/functions.md)**.

The function reference includes:
- **204 total functions** across all contracts
- **106 view/pure functions** for reading state
- **98 state-changing functions** for transactions
- Complete parameter documentation
- Event definitions for each contract
