# Overview

**Introducing the two tokens and the overall structure of the system**

## Structure and Purpose

The purpose of this page is to provide potential users of the JuiceDollar system with everything they need to know to meaningfully interact with it. For actually interacting with the system, there is a standard [frontend](https://app.juicedollar.com/). The name JuiceDollar hints at its self-governing nature, but also the risks associated with releasing an artificial machinery into the wild. If you encounter errors or if things are not clear to you, you can [file a suggestion for improving this page on GitHub](https://github.com/JuiceDollar/smartContracts/issues).

## The Cypherpunk Heritage

JuiceDollar embodies the core principles of the cypherpunk movement that emerged in the late 1980s. As Eric Hughes wrote in "A Cypherpunk's Manifesto" (1993):

> "Privacy is necessary for an open society in the electronic age... We the Cypherpunks are dedicated to building anonymous systems."

### Core Principles Realized in JuiceDollar

| Cypherpunk Ideal | JuiceDollar Implementation |
|------------------|---------------------------|
| **Decentralization** | No admin keys, no upgradeable contracts, no central authority |
| **Trustlessness** | Oracle-free design - no reliance on external price feeds |
| **Permissionlessness** | Anyone can propose new collateral types or mint JUSD |
| **Self-Custody** | Users hold their own collateral in position contracts |
| **Code as Law** | Smart contracts enforce rules, not institutions |
| **Censorship Resistance** | No entity can block minting or freeze accounts |

JuiceDollar is a direct technological manifestation of Timothy C. May's vision of "crypto anarchy" - enabling financial sovereignty without permission from banks or governments.

## JuiceDollar (JUSD) and JuiceDollar Pool Shares (JUICE)

The JuiceDollar system comes with two ERC-20 tokens, a stablecoin called [JuiceDollar (JUSD)](https://explorer.testnet.citrea.xyz/address/0xFdB0a83d94CD65151148a131167Eb499Cb85d015) and a governance token called [JuiceDollar Pool Shares (JUICE)](https://explorer.testnet.citrea.xyz/address/0x7b2A560bf72B0Dd2EAbE3271F829C2597c8420d5). Unlike other collateralized stablecoins, JuiceDollar does not depend on external oracles, making it less susceptible to certain attacks and also more versatile with regards to the used collateral. The disadvantage of that approach is its speed, performing liquidations over the course of days whereas oracle-based systems might react within minutes.

JuiceDollar is a collateralized stablecoin that tracks the value of the US Dollar. There is no hard peg to the Dollar, but a set of economic constraints that incentivizes the market to softly push it towards parity from two sides. Most importantly, the system is [over-collateralized](positions/): for each JuiceDollar in circulation, there must be other tokens worth at least one JuiceDollar backing it. Furthermore, JUICE holders have a number of ways to influence the long term price of JuiceDollar by making it more or less expensive to mint JUSD, similarly to how a central bank keeps the exchange rate of its own currency in balance. The underlying assumption here is that the JUICE holders recognize that the system (and therefore also their tokens) is the most valuable when JuiceDollar tracks the Dollar as reliably as possible, and that they use their power to govern the system accordingly.

JuiceDollar Pool Shares (JUICE) are the [governance](governance.md) token of the system. Anyone can obtain newly minted JUICE by providing equity capital to the system (or later return them again to get their share of capital back). The JUICE holders benefit from the earned fees and liquidation profits, but they are also the ones that carry the residual risk of liquidations, similar to the shareholders of a bank. Therefore, JUICE holders have an incentive to grow the system and ensure its stability. The governance process is veto-based: anyone can propose new types of collateral or even completely new methods to bring JuiceDollar into circulation, but already 2% of the voting power suffices to veto such proposals.

## Use Cases

Like other stablecoins, JuiceDollar primarily serves three use-cases. The only use-case described extensively in this documentation is that of borrowing as it is embedded in the system. To fully leverage the other use-cases, further tools and services such as exchanges and wallets are necessary that are not described herein.

### Payments

JuiceDollar can be used to make payments in US Dollars. Please consult the [landing page](https://juicedollar.com/) for a list of apps and services that help in using JuiceDollar as a means of payment. Payments typically concern small amounts and therefore a layer two instance of the token might be preferred over the mainnet instance.

### Store of Wealth

The US Dollar has an excellent track record of stability relative to other fiat currencies and is often considered a safe haven when the world is in turmoil. So far, crypto investors on Citrea could not get significant Dollar exposure without going off-chain. For this use-case, it is important to be able to trade JuiceDollar in high volumes at narrow spreads.

### Borrowing / Seignorage

Anyone can mint new JuiceDollars against a collateral using the built-in borrowing mechanism. All borrowing is based on what we refer to as _positions_. In Liquity, these are called _troves_ and in the Maker system _vaults_. They all refer to the account of a user within the system that holds a positive balance of a collateral asset and a negative balance of JuiceDollars that must be repaid in order to get the collateral back. The JuiceDollar system charges a non-refundable interest rate up front when minting new JuiceDollars. Some of the minted JuiceDollars are also held back as a reserve in case the position has to be liquidated.

## Technical Architecture

The JuiceDollar system consists of a set of smart contracts on Citrea. The two token contracts serve as a foundation for everything else. JuiceDollar can have an arbitrary number of contracts that have the power to mint and burn JUSD. Anyone can propose new such contracts and once they passed the governance process, they can start minting and burning JuiceDollar. Today, there are two such contracts. One is a simple bridge to bootstrap JuiceDollar based on StartUSD. The other is a contract named minting hub that serves as the central point to manage all debt positions. The JUICE token has built-in governance features and holds the equity capital of the system.
<figure style="text-align: center"><img src="/assets/arch.jpeg" alt=""><figcaption><p>Technical Architecture</p></figcaption></figure>
