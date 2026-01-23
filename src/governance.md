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
