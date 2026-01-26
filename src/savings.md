# Savings & Interest

**Earn interest on your JuiceDollars through the built-in savings module.**

The JuiceDollar system includes a native savings feature that allows JUSD holders to earn interest simply by depositing their tokens. The interest rate is governed by JUICE holders through the Leadrate mechanism.

## How Savings Work

When you deposit JUSD into the savings module, your tokens start earning interest immediately. The interest accrues continuously based on the current **Leadrate** (base interest rate) set by governance.

### Key Features

| Feature | Description |
|---------|-------------|
| **No lockup period** | Withdraw anytime without penalty |
| **Continuous interest** | Interest accrues every second |
| **Compound on refresh** | Claim interest to start earning interest on interest |
| **Governance-controlled rate** | JUICE holders vote on the interest rate |

## The Leadrate System

The **Leadrate** (from German "Leitzins" - base rate) is the system-wide interest rate that affects both savings yields and borrowing costs.

### How Rates Are Set

1. A qualified JUICE holder (with ≥2% voting power) proposes a new rate
2. The proposal enters a **7-day timelock**
3. After 7 days, anyone can execute the change
4. The new rate takes effect immediately

```
Current Rate → Proposal → 7 Day Wait → New Rate Active
```

### Rate Mechanics

The Leadrate uses a "ticks" system for precise interest calculation:

- **1 tick** = 1 PPM-second (parts per million per second)
- Interest accumulates as ticks over time
- When you refresh your balance, ticks are converted to JUSD

**Example:** At 5% annual rate (50,000 PPM):
- 1 day = 50,000 × 86,400 = 4,320,000,000 ticks
- On 10,000 JUSD = ~1.37 JUSD interest per day

## Using the Savings Module

### Depositing JUSD

To start earning interest:

1. Navigate to the Savings page on the [JuiceDollar app](https://app.juicedollar.com)
2. Enter the amount of JUSD you want to deposit
3. Approve the transaction
4. Your JUSD immediately starts earning interest

**Contract function:** `save(uint192 amount)`

### Checking Your Balance

Your savings balance consists of:
- **Principal:** The JUSD you deposited
- **Accrued Interest:** Interest earned since last refresh

To see your current balance including interest:

**Contract function:** `accruedInterest(address owner)` returns your pending interest

### Withdrawing JUSD

You can withdraw your JUSD plus earned interest at any time:

1. Go to the Savings page
2. Enter the amount to withdraw (or click "Max")
3. Confirm the transaction
4. Receive your JUSD plus interest

**Contract function:** `withdraw(address target, uint192 amount)`

### Refreshing Your Balance

To compound your interest (earn interest on interest):

1. Call the refresh function periodically
2. Your accrued interest is added to your principal
3. Future interest is calculated on the new, higher balance

**Contract function:** `refreshBalance(address owner)`

**Tip:** Refresh your balance periodically to maximize compound interest gains.

## Interest Source

The interest paid to savers comes from the **equity pool**. This means:

- Interest is only paid when there is sufficient equity
- The `equity()` function determines available funds
- If equity is depleted, interest payments are capped

This creates a natural balance: high savings rates attract deposits but reduce equity, while low rates preserve equity but may cause withdrawals.

## SavingsVaultJUSD (ERC-4626)

For DeFi integration, JuiceDollar provides an **ERC-4626 compatible vault** that wraps the savings module.

### What is ERC-4626?

ERC-4626 is the "Tokenized Vault Standard" - a standard interface for yield-bearing tokens. It allows:

- Easy integration with DeFi protocols
- Standardized deposit/withdraw functions
- Automatic share price calculation

### Vault Mechanics

| Concept | Description |
|---------|-------------|
| **Shares (svJUSD)** | Represent your proportional ownership of the vault |
| **Assets (JUSD)** | The underlying tokens in the vault |
| **Price per Share** | Increases over time as interest accrues |

**Example:**
1. You deposit 1,000 JUSD when price = 1.00 → receive 1,000 svJUSD
2. Interest accrues, price increases to 1.05
3. Your 1,000 svJUSD is now worth 1,050 JUSD

### Vault Functions

```solidity
// Deposit JUSD, receive shares
function deposit(uint256 assets, address receiver) returns (uint256 shares)

// Withdraw JUSD by specifying asset amount
function withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares)

// Redeem shares for JUSD
function redeem(uint256 shares, address receiver, address owner) returns (uint256 assets)

// Check current share price
function price() returns (uint256)

// Check total assets including accrued interest
function totalAssets() returns (uint256)
```

### Inflation Attack Protection

The vault uses OpenZeppelin's virtual shares pattern to prevent "inflation attacks" where a malicious first depositor could manipulate share prices. A small virtual offset is added to calculations for safety.

## Contract Addresses

| Contract | Address | Purpose |
|----------|---------|---------|
| SavingsGateway | [`0x54430781b33581CE2b0DBD837CA66113BeEEFD8e`](https://explorer.testnet.citrea.xyz/address/0x54430781b33581CE2b0DBD837CA66113BeEEFD8e) | Main savings with frontend rewards |
| SavingsVaultJUSD | [`0x802a29bD29f02c8C477Af5362f9ba88FAe39Cc7B`](https://explorer.testnet.citrea.xyz/address/0x802a29bD29f02c8C477Af5362f9ba88FAe39Cc7B) | ERC-4626 vault adapter |

## Interest Calculation Example

**Scenario:**
- Deposit: 10,000 JUSD
- Leadrate: 4% annual (40,000 PPM)
- Duration: 30 days

**Calculation:**
```
Daily interest = 10,000 × (40,000 / 1,000,000) / 365 = 1.096 JUSD
30-day interest = 1.096 × 30 = 32.88 JUSD
```

**With compounding (daily refresh):**
```
After 30 days ≈ 32.96 JUSD (slightly more due to compound effect)
```

## Savings vs. JUICE Investment

| Aspect | Savings (JUSD) | Pool Shares (JUICE) |
|--------|----------------|---------------------|
| **Risk** | Low - principal preserved | Higher - value fluctuates |
| **Return** | Fixed Leadrate | Variable (fees + liquidations) |
| **Governance** | None | Voting power |
| **Lockup** | None | None (same-block protection only) |
| **Best for** | Stable yield seekers | Active participants |

## Important Notes

1. **Module Disabled:** The savings module is disabled when the Leadrate is 0% or about to become 0% within 3 days. Deposits are blocked in this state.

2. **Interest Cap:** Interest payments are capped by available equity. In extreme scenarios, you may receive less than expected.

3. **No Insurance:** Unlike traditional bank deposits, there is no deposit insurance. The safety of your funds depends on the overall health of the JuiceDollar system.

4. **Gas Costs:** Consider gas costs when deciding how often to compound. For small balances, frequent refreshing may not be economical.
