# Opening New Positions

## Start on Lending

To open a new position as a borrower, start on [Lending](https://bapp.juicedollar.com/mint) in the app.

There you mint JUSD by cloning an existing cloneable position type. On [Lending](https://bapp.juicedollar.com/mint) the app pre-selects the best cloneable parent from the API.

<figure style="text-align: center"><img src="/assets/clone-position.png" alt=""><figcaption><p>Lending: cloneable positions and API-selected clone parent</p></figcaption></figure>

 If you open Position from Monitoring with Clone, that parent overrides the pre-selection. That lets you start without a custom proposal when a suitable cloneable type already exists. You select how much collateral to post, set liquidation price and expiration, and confirm when the amounts look right—one transaction creates your position and moves collateral.

For choosing a different listed parent from the ecosystem, open [Monitoring](https://bapp.juicedollar.com/monitoring) and Clone, as described in [Cloning existing positions](clone.md).

<figure style="text-align: center"><img src="/assets/clone-list.png" alt=""><figcaption><p>Open positions available for cloning</p></figcaption></figure>

## Proposing a new position type

Open [Propose position](https://bapp.juicedollar.com/mint/create) This URL is not linked from the main Lending screen; When you submit the form, use the Propose Position button at the bottom of the page.

<figure style="text-align: center"><img src="/assets/new-position-button.png" alt="" width="350"><figcaption><p>Propose position page</p></figcaption></figure>

On that page the form is grouped into four areas. Let's take a look at the box in the top left.

<figure style="text-align: center"><img src="/assets/proposal-process.png" alt=""><figcaption><p>Proposal process</p></figcaption></figure>

The proposal fee is fixed at 1,000 JUSD. This fee is not returned if the position is denied and goes to the equity holders. The price tag of 1,000 JUSD ensures that each proposal is well thought-out. Having a low fee would likely encourage the proposal of illiquid and/or otherwise unfit tokens. The initialization period has to be at least 14 days. This gives other system participants enough time to veto or to challenge the new position. A veto can only be cast by qualified pool share holders by calling the "deny" method on the position. If a position is denied, it cannot ever be used to mint JuiceDollar, but it can still be challenged. New positions can be challenged immediately using the normal challenge mechanism.

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

Once all parameters are set, confirm with Propose Position at the bottom of the page.

If there's no veto within the initialization process, you will have successfully opened a new position! After that, you can head over to the [My Positions page](https://bapp.juicedollar.com/mypositions) and mint your new JuiceDollar.
