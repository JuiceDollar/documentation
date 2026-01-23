# Stablecoin Bridges

**Simple contracts that allow swapping other Dollar stablecoins into JuiceDollar and back.**

The swap page allows you to swap other recognized Dollar stablecoins against JuiceDollars and back. Moving back into other stablecoins is only possible as long as there is some of the other stablecoin left in the bridge contract. Essentially, this pegs JuiceDollar 1:1 to other stablecoins and helps stabilizing its value. In order to protect JuiceDollar from a crash of the connected stablecoins, the bridge contract is limited in time and volume. After a year the latest, it needs to be replaced with a new contract.

System participants should closely watch the amount of other stablecoins flowing in and out. Having a lot of outflow could be an indication that it is too cheap to mint JuiceDollars, i.e. implied interest rates being too low. Having large inflows could be an indication that going into JuiceDollars is too attractive and interest rates too high.

The bridges can be viewed on the blockchain under the following links:

* StartUSD Bridge: [0x25F8599Be1D25501212b20bD72DF1caA97b496b1](https://explorer.testnet.citrea.xyz/address/0x25F8599Be1D25501212b20bD72DF1caA97b496b1)
