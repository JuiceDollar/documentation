# Opening New Positions

You want to mint JuiceDollar, but your preferred type of collateral is not available yet? In that case, you can propose a new collateral type.

To do so, head over to the [Mint page](https://app.juicedollar.com/mint) and scroll to the bottom until you find the "Propose New Position or Collateral" button.

<figure style="text-align: center"><img src="/assets/new-position-button.png" alt="" width="350"><figcaption><p>Click this button to propose a new position type</p></figcaption></figure>

On the next page are four boxes. Let's take a look at the box in the top left.

<figure style="text-align: center"><img src="/assets/proposal-process.png" alt=""><figcaption><p>Proposal process</p></figcaption></figure>

The proposal fee is fixed at 1,000 JUSD. This fee is not returned if the position is denied and goes to the equity holders. The price tag of 1,000 JUSD ensures that each proposal is well thought-out. Having a low fee would likely encourage the proposal of illiquid and/or otherwise unfit tokens. The initialization period has to be at least 3 days. This gives other system participants enough time to veto or to challenge the new position. A veto can only be cast by qualified pool share holders by calling the "deny" method on the position. If a position is denied, it cannot ever be used to mint JuiceDollar, but it can still be challenged. New positions can be challenged immediately using the normal challenge mechanism.

Next, we can inspect the box on the bottom left.

<figure style="text-align: center"><img src="/assets/financial-terms.png" alt=""><figcaption><p>Financial terms</p></figcaption></figure>

The annual interest is charged upfront and can be set by the user. With a maturity of 12 months, this is the entire fee that is charged. Of course, if the maturity is set to 6 months for example, the final interest changes accordingly. The minting limit describes the maximum amount of JUSD that can be minted against this position and its clones. When the position is cloned, the remaining amount is split between the original and the clone. The purpose is to limit the exposure of the JuiceDollar system to a single collateral. JuiceDollar should be able to withstand the total failure of one or more related collaterals, even if all their positions are maximally minted.

Next, the box on the top right comes into play.

<figure style="text-align: center"><img src="/assets/collateral.png" alt=""><figcaption><p>Collateral</p></figcaption></figure>

First of all, the collateral token needs to be selected by pasting its contract address into the first field, and approve handling of the token. This can be done for example through MetaMask. The chosen collateral should be freely traded on the market and have a somewhat stable value. For criteria that collateral tokens should fulfil, have a look at the [Acceptable Collateral](https://github.com/orgs/JuiceDollar/discussions/categories/acceptable-collaterals) page. The minimum collateral section is the minimum acceptable amount of collateral and should be set to about 5,000 JUSD worth of collateral. It is not possible to decrease the collateral in a position below the minimum without closing it entirely.

The last section is the initial amount of collateral. This will be automatically transferred to the newly created position during the minting. The initial collateral must be equal to or larger than the minimum collateral.

The last remaining box is located on the bottom right. Here, the (potential) liquidation process is discussed.

The liquidation price can be set freely but must result in a position liquidation of at least 5,000 JUSD. With a minimum collateral liquidation value of 5,000 JUSD, the liquidation price must be set accordingly based on your chosen collateral amount.

<figure style="text-align: center"><img src="/assets/liquidation.png" alt=""><figcaption><p>Liquidation</p></figcaption></figure>

If an auction ends at a price below the liquidation price, the position is liquidated.

The "Retained Reserve" should be set to ensure a very high confidence that challenges do not end significantly below the liquidation price, assuming the market price has just fallen slightly below it at the start of the challenge. The more volatile the collateral and the longer the challenge period, the higher the reserve requirement needs to be to mitigate risks.

The last field, the "Auction Duration", describes how long an auction should be. For highly liquid collaterals such as cBTC, the challenge duration can be quite short, possibly ranging from hours to even minutes, especially with automated bidders in the market. For less liquid collaterals that are harder to evaluate, challenges might last up to two weeks to allow bidders to organize. The longer the challenge duration, the higher the required reserve should be to ensure the position remains economically sound.

Once all parameters are set, you can hit the "Propose Position" at the bottom of the page.

If there's no veto within the initialization process, you will have successfully opened a new position! After that, you can head over to the [My Positions page](https://app.juicedollar.com/mypositions) and mint your new JuiceDollar.
