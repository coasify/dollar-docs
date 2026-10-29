---
sidebar_position: 3
title: FAQ
description: Frequently asked questions
---

# FAQ

## General

### What is DollarStore?

DollarStore is open-source smart contract software for exchanging listed stablecoins at 1:1 in
normalized units, with no protocol fee or price curve. Available liquidity determines how much fills
immediately.

### What's the catch?

Time and liquidity. A swap can fill against opposite-side users and reserves, but a queued remainder
waits until liquidity arrives. Queueing is not a guarantee of a fill or a completion time. For a full
immediate fill or a revert, use an all-or-nothing endpoint.

### Why use this instead of Uniswap?

DollarStore may suit a stablecoin route where the fixed protocol rate matters more than immediate
execution. An AMM's price curve and fee schedule work differently. Compare actual fillability for
the assets, amount and deployment you intend to use.

### Which stablecoins are supported?

Governance selects the hub assets and spoke listings. Read `getPoolAssets(0)` for the hub and use
`poolCount`, `getPoolAssets(poolId)`, `isAssetListed` and `assetPoolId` to inspect other pools.
Token names in these docs are examples, rather than a fixed launch list.

### What are hub and spoke pools?

The **hub**, pool `0`, holds the hub stablecoins and issues DLRS to hub suppliers. Each **spoke**,
pool `1` or above, pairs one additional stablecoin with an internal DLRS-side allocation of hub
liquidity. Its LPs receive separate non-transferable receipt shares.

The ordinary swap endpoints support hub-to-hub, hub-to-spoke and spoke-to-hub routes. A dedicated
`swapSpokeToSpoke` endpoint combines two legs through an ordered list of hub assets in one
all-or-nothing transaction. See [Spokes](/concepts/spokes).

### Is there a token?

DLRS is the hub's non-transferable accounting receipt, minted by hub deposits. It is not a governance
token or a tradeable asset. Spoke LPs instead hold non-transferable per-pool receipt-share balances.

## Using the protocol

### How do I swap one stablecoin for another?

1. Check the deployment, listed assets and route, then approve the DollarStore proxy to spend your
   offer token.
2. Call `swapOrQueue(offerAsset, wantAsset, amount, minAmountOut, deadline)` to fill now and queue any
   remainder under your address.
3. Track its returned native input, native output, native queued input and queue position ID.

`amount` is in offer-token decimals and `minAmountOut` is in wanted-token decimals. There is no tip
argument. To avoid queueing, use
`swapExactInput(offerAsset, wantAsset, amount, minAmountOut, recipient, deadline)`.

### What happens if there is no liquidity?

- `swapOrQueue` with an output floor of `0` can queue the input, provided the remainder passes queue
  limits and other checks.
- A full native output minimum makes `swapOrQueue` revert unless the whole order fills now.
- `swapExactInput` requires a full fill by construction and never queues, regardless of its minimum.

For scaling factors from `assetScalingFactor`, the full native output is
`floor(amount / S_offer) * S_want`.

### Can I require that part of my swap settles now, without queueing the rest?

A partial minimum on `swapOrQueue` requires that much now and queues the rest. To leave unused input
in your wallet, quote first and submit only the desired fill through `swapExactInput`. Simulate that
smaller call, since the quote assumes transfers succeed and state may change. See
[Time vs slippage](/concepts/time-tradeoff#choosing-how-much-must-fill).

### Who receives my swap output?

`swapOrQueue` pays its caller, who also owns any queued position and its future payouts.
`swapExactInput` and `swapSpokeToSpoke` pay an explicit `recipient`. It can be the calling integration
or an end user, but cannot be the zero address or DollarStore itself. Routers should use the
all-or-nothing endpoints when they do not intend to manage a queue position.

### How long will I wait in queue?

There is no fixed wait. Opposite swaps can peer-match positions, later same-direction swaps settle
older positions before using reserves, and deposits into a spoke can settle its affected lines.
A deposit into the hub does not itself process queues. Anyone can call `processQueue` when route
liquidity and the inflow checks allow.

### Can I cancel my queue position?

Only its owner can call `cancelQueue(positionId)`. A successful cancellation returns the remaining
escrow in the original offer token, including while paused or after the pool is removed.

If an active position's refund fails, it is parked with escrow unchanged. A failed refund of an
already parked position reverts with `EscrowTransferFailed`, leaving it available to retry when
token transfers can succeed. There is no fallback conversion into DLRS or spoke shares.

### What if my position is partially filled?

You receive each fill in the wanted token. The active remainder keeps its place in line. Cancelling
returns the remaining offered token when the refund can succeed.

### What is a parked position?

A queued position whose owner could not receive a fill or refund is removed from active FIFO so it
does not block later positions. Its offered tokens stay escrowed. It no longer fills automatically;
the owner must cancel once the offered-token transfer can succeed.

`isQueuePositionParked` identifies it, and `getUserQueuePositions` includes both active and parked
positions. See [Parked positions](/concepts/queue#parked-positions).

### Can queue escrow shrink after a loss?

Yes. An actual token balance loss can impair escrow separately from reserves. While the asset's pool
is paused, the guardian can apply `haircutEscrow` proportionally to its active and parked escrow,
including positions left after pool removal. A market depeg alone does not rewrite the token amount.
See [When tokens are lost](/concepts/queue#when-tokens-are-lost).

## DLRS

### What is DLRS?

A non-transferable hub receipt with 6 decimals. A hub deposit of 1,000 normalized dollars mints
1,000 DLRS. Burning it through `withdraw` returns a reserve-weighted basket of hub assets rather
than a chosen token.

### Can I transfer or trade DLRS?

No. `transfer`, `transferFrom` and `approve` revert with `NonTransferable()`.

### What can I do with DLRS?

The owner calls `withdraw(0, receiptAmount, minAmountsOut, deadline)` to burn it for the current hub
basket. Use `previewWithdraw` to see the ordered native payouts and build minimums. To finish with
only one token, withdraw and then swap the others. See [Supply](/concepts/supply).

### How is DLRS accounted for?

During ordinary operations:

```text
DLRS total supply + all spokes' DLRS-side reserves = total hub reserves
```

Spoke funding increases hub reserves and a spoke's allocation without minting wallet DLRS. Queue
escrow is excluded. A governor `syncReserves` write-down after an actual token balance loss can
reduce recorded reserves without reducing wallet DLRS supply, so the equality is not unconditional
after a loss.

### Can someone else deposit or withdraw for me?

Anyone can pay for a deposit and name you as its `receiver`. You own the resulting DLRS or spoke
shares; the depositor does not. Only the receipt owner can withdraw, and receipts cannot be moved to
another owner. An integration should choose a receiver that can call `withdraw` and account for
deposits that third parties may make for it.

### Do pause controls block withdrawals?

No. Withdrawals and queue cancellations bypass protocol and pool pause controls. A withdrawal still
needs sufficient reserves and successful transfers of its basket. Zero-payout asset entries are
normally tested with a zero-value transfer unless governance exempted that asset, so an issuer
restriction can still block an exit. `previewWithdraw` does not test these transfers.

## For integrators

### How do aggregators integrate DollarStore?

1. Calculate the full native wanted-token output from the input and the two scaling factors.
2. Call `getSwapQuote(offerAsset, wantAsset, amount)` and compare it with that full output.
3. Simulate the intended `swapExactInput` call with its actual caller and recipient, then execute if
   suitable. It returns native `(amountIn, amountOut)` and never queues.

For spoke-to-spoke trades, select the hub assets in `via` and simulate `swapSpokeToSpoke` directly.
Its route order affects execution. See [How swaps resolve](/concepts/resolution).

### Does `swapExactInput` ever partially fill?

No. It either fills the full normalized input or reverts with `InsufficientLiquidity`. A separate
minimum-output check uses native output units. The reported fill in a reverted error describes
that attempted execution, not a promise that a smaller retry will fill.

### Why does `getSwapQuote` return 0 when there are reserves?

Older same-direction positions may use the available reserves first. The quote includes reserves
left after simulating up to eight older positions; if that line remains, those reserves are not
available to the new swap. Opposite-queue escrow is counted first, so a same-direction queue does
not automatically make the quote zero.

The view also returns zero for unsupported routes or failed route, pause or offer-price checks.
It accepts no caller or recipient and assumes transfers succeed. A failed queued-owner payout can
change the real fill, and a recipient restriction can revert the final transfer.

### What units does `minAmountOut` use?

**Native decimals of `wantAsset`**, in both `swapOrQueue` and `swapExactInput`. For example, a
1,000-USDS floor is `1_000e18` for an 18-decimal USDS token, while a 1,000-USDC floor is `1_000e6`
for 6-decimal USDC. The minimum is compared without rounding it to normalized units.

Reserves, queue views, queue events and minimum queued order sizes still use normalized 6-decimal
accounting. Spoke receipt amounts are share counts. See [Units](/concepts/supply#units).

### What's the gas cost?

It depends on the route and queue work. The eight-position inline limit applies to same-direction
reserve settlement per pass; opposite peer matching can touch more positions, and spoke deposits
or composed swaps can visit several lines. `processQueue` has a caller-selected bound, with parked
positions counted as visits. Measure the intended call against the deployment you use.

## Technical

### What chains is the protocol on?

See [Addresses](/resources/addresses) for networks, release status and deployment addresses. These
docs describe the **deployed v1.0.0 interface**; check a deployment's `version()` and release details
before using these signatures against a live address.

### Is the contract upgradeable?

Yes. DollarStore uses a UUPS proxy with a dedicated `upgrader` role separate from `governor`.
Role holders and timelock configuration depend on the deployment. The implementation uses ERC-7201
namespaced storage. See [Security](/resources/security) for governance and upgrade details.

### Has it been audited?

Published reports and the revisions they cover are listed under
[Audits](/resources/security#audits). Check the report scope against the release you use; a report
for an earlier revision does not automatically cover every function in this interface.
The software remains experimental.

### Where's the source code?

[github.com/coasify/dollar](https://github.com/coasify/dollar)
