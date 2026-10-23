---
sidebar_position: 2
title: Spokes
description: How spoke pools work and what a liquidity provider takes on
---

# Spokes

A spoke adds a stablecoin alongside the hub. Its liquidity providers hold that spoke's asset mix;
the spoke asset does not become part of the hub reserves represented by DLRS.

## What a spoke is

**One stablecoin paired with hub-side liquidity.**

Each spoke has its own pool, receipt shares and two reserve components. Using an illustrative USDT
spoke:

```text
Spoke reserve      USDT held for this pool
DLRS-side reserve  An internal allocation of hub liquidity
```

Both are accounted for at par in normalized 6-decimal units:
`poolValue = spokeReserve + dlrsReserve`.

The DLRS side is an accounting allocation, rather than DLRS tokens in an LP's wallet. It is paid out
from the hub's current basket, so it carries exposure to the hub assets as well as the spoke's own
token exposure on the other side.

## How swaps move a spoke

| Reserve-backed swap | Spoke reserve | DLRS-side reserve | Effect |
|---------------------|---------------|-------------------|--------|
| hub → spoke | down | up | The pool sells its spoke asset and takes in hub-side value |
| spoke → hub | up | down | The pool absorbs its spoke asset and pays out hub-side value |

The hub token received in a hub-to-spoke swap enters hub reserves, and the spoke's DLRS-side reserve
increases by the same normalized amount. No wallet DLRS is minted. The reverse consumes that
allocation and pays from hub reserves. Hub-to-hub swaps leave spokes unchanged; peer matching moves
escrow between users without touching reserves.

During ordinary operations, wallet DLRS supply **plus all spokes' DLRS-side reserves** equals total
hub reserves. A reserve write-down after an actual hub-token balance loss can break that equality.

## What a liquidity provider holds

An LP can supply either the spoke token or a hub token. Either way, the LP receives non-transferable
**receipt shares** representing a proportion of both reserve components. The caller names the owner
with `deposit(poolId, asset, amount, receiver, deadline)`; only that receiver can withdraw its shares.

The first deposit into a pool with no shares mints shares one for one with normalized value. Later
deposits mint proportionally to the pool's value before the deposit, rounding down. An outstanding
share balance can no longer be treated as a dollar amount after a reserve write-down. A pool with
outstanding shares but zero value rejects new deposits with `PoolFullyImpaired`; restarting the asset
uses a fresh pool.

### The position rotates

Shares represent a proportion of the **sum of both sides**, rather than the asset deposited. As swaps
flow, the mix underneath them changes:

```text
Illustrative spoke initially has 100,000 USDT supplied by another LP.
You supply 100,000 USDC to its DLRS side and own 50% of the pool.
Pool: 100,000 USDT + 100,000 hub-side units = 200,000 value.

Users sell 60,000 USDT into the spoke through reserve-backed swaps.
Pool: 160,000 USDT + 40,000 hub-side units = 200,000 value.
You still own 50%, now represented by more USDT and less hub-side value.
```

The stated pool value is unchanged by these swaps, but the token mix changes. LPs absorb the spoke
asset the market sells, at par, with no protocol fee paid to them. A market depeg changes what those
tokens are worth externally; it does not itself rewrite recorded reserves. If the contract actually
loses tokens, a governor `syncReserves` write-down can reduce the reserve value per share.

The spoke asset is not added to hub reserves, and reserve-backed spoke-to-hub swaps cannot spend
beyond that spoke's available DLRS-side reserve. The spoke's hub-side component still depends on the
hub assets and their transfer restrictions.

### Exiting

`withdraw(poolId, receiptAmount, minAmountsOut, deadline)` is the proportional exit for both pool types.
For a spoke, it burns your receipt shares and returns:

- Your proportional amount of the spoke token.
- Your proportional DLRS-side value, paid in the hub assets by current hub reserve weight.

There is no single-asset withdrawal selector or separate `redeemSpoke` endpoint. To end up in one
token, withdraw the basket and then swap. Burning the last shares drains both reserve components
when the exit can execute.

Use `previewWithdraw` to get the ordered native payout amounts: spoke token first, then all hub
assets. Empty `minAmountsOut` accepts the calculated basket, or supply one native minimum per entry.
[Supply](/concepts/supply#previewing-and-setting-minimums) shows the flow.

Exits bypass pause and the spoke's minimum DLRS-side reserve. They still require successful token
transfers and sufficient hub reserves; even an asset paying zero is normally probed for issuer
restrictions unless governance has exempted it. A preview calculates amounts without running these
transfer checks.

## The brake: minDlrsReserve

`minDlrsReserve` limits reserve-backed spoke-to-hub swaps: only the DLRS side above the floor is
available to those swaps.

```text
dlrsReserve = 100,000, minDlrsReserve = 30,000
→ up to 70,000 units can be paid from the DLRS side to swappers
```

This limits how much additional spoke-token inventory the pool absorbs through reserve fills.
Exact-opposite peer matches use escrow instead of the pool's DLRS side. Governance sets the floor;
an LP exit can take the DLRS side below it, including to zero.

## Launch caps

Governance chooses the initial floor and launch cap together in
`createSpoke(asset, priceFeed, minDlrsReserve, launchCap)`. A cap of `0` means uncapped, so a new spoke
does not necessarily start with a positive cap.

A spoke's cap applies to **its spoke reserve plus its DLRS-side reserve**, and is checked on deposits.
Funding it with a hub token counts against that spoke cap, not the hub's cap. Queue escrow is excluded.
The governor can raise, lower or remove a cap; the guardian can only tighten it. See
[Security](/resources/security) for role and timelock configuration.

## Queues on a spoke

Queues are directed: `USDC → USDT` and `USDT → USDC` are different lines in this example. They also
belong to a specific pool generation, so relisting an asset never revives a retired pool's queues.

A spoke-token deposit can settle hub-to-spoke demand; a hub-token deposit into the spoke can settle
spoke-to-hub demand. Each visits up to eight positions **per affected line**, walking hub assets in
listing order. A hub deposit into pool `0` does not trigger this work.

Settlement skips lines whose offer asset fails its inflow checks, such as a paused asset or a stale
or off-peg price. A failed payout parks the affected position so later positions can proceed. See
[The queue](/concepts/queue).

## Lifecycle

| Status | Deposits | spoke → hub | hub → spoke | LP exits | Queue cancellations |
|--------|----------|-------------|-------------|----------|---------------------|
| **Active** | yes | yes | yes | yes | yes |
| **WindingDown** | no | no | yes | yes | yes |
| **Killed** | no | no | no | No remaining reserve value | yes |

The table describes lifecycle permissions; pauses, prices and token transfer restrictions still
apply to the relevant operation. Wind-down blocks new exposure while retaining risk-reducing swaps
and LP exits.

Governance can remove a spoke once its spoke reserve and DLRS-side reserve are both zero. Worthless
shares and unfilled queue positions do not block removal. The pool is paused, the asset is unlisted,
and its ID is retired permanently. Old queue positions can no longer fill, but their owners can
still cancel to recover surviving escrow, including parked positions when transfers can succeed.

An asset can later be listed in a fresh pool if its existing escrow is covered. That new pool has
separate shares and queues. An actual loss of escrow can be handled by the guardian's pro-rata
`haircutEscrow` operation while the asset's pool is paused, including after removal; see
[The queue](/concepts/queue#when-tokens-are-lost).

## Spoke to spoke

Use `swapSpokeToSpoke(offerAsset, wantAsset, via, amount, recipient, deadline)` to exchange two spoke
assets atomically. `via` is an ordered list of hub assets. The contract tries each two-leg route in
that order, carrying what both legs can fill before trying the next:

```text
offered spoke → selected hub asset → wanted spoke
```

The entire normalized input must fill or the call reverts. It never creates a queue position, pays
the chosen recipient, and returns native `(amountIn, amountOut)`. The ordinary `swapOrQueue` and
`swapExactInput` functions continue to reject a spoke-to-spoke pair.

Each leg respects existing queues and reserve limits. The offered token must pass its inflow check;
a `via` hub asset that fails its inflow check is skipped. List order can affect whether the full
order fills, because the legs share pool liquidity and earlier positions can consume it.

For one hub asset, chain `getSwapQuote` over the two legs to estimate liquidity. For a list, simulate
the full call with its actual caller and recipient. Quotes assume transfers succeed; a failed payout
to a queued owner can change the real fill. See [How swaps resolve](/concepts/resolution#spoke-to-spoke-flow).
