---
sidebar_position: 5
title: How Swaps Resolve
description: The complete flow of a swap transaction
---

# How swaps resolve

A swap first looks for a user on the opposite side, then uses reserves behind any older
same-direction positions. The caller chooses whether unfilled input can queue or must revert.

The examples use an illustrative hub containing USDC and USDS. Amounts in the text diagrams are
human-readable tokens; function inputs and returned token amounts use each token's native decimals.

## Direct swap flow

[`swapOrQueue`](/capabilities/functions#swaporqueue)`(offerAsset, wantAsset, amount, minAmountOut, deadline)`:

```text
1. Check the deadline, listed assets and route.
   Allowed single-leg routes: hub → hub, hub → spoke, spoke → hub.
   Check protocol/spoke pauses, wind-down direction and the offer asset's inflow checks.

2. Normalize the native offer budget and pull only whole normalized units.
   Sub-unit offer-token dust stays with the caller.

3. Fill from the exact-opposite queue, oldest first.
   Pay offerAsset to those owners and use their escrowed wantAsset as output.
   A failed payout parks that position; successful peer matches move no reserves.

4. If input remains, visit up to eight older same-direction positions.
   Fill them from route reserves; park any position whose payout fails.

5. If that same-direction queue is now empty, fill from remaining route reserves.

6. Convert the fill to native wantAsset and compare it with minAmountOut.
   Revert if the immediate output is below the minimum.

7. Send the immediate output to the caller.

8. Escrow remaining offerAsset at the tail, subject to queue size and minimum rules.
   Return amountIn, amountOut, amountInQueued and the new positionId.
```

`amountIn` and `amountInQueued` are native offer-token amounts; `amountOut` and `minAmountOut` are
native wanted-token amounts. `positionId` is `0` if nothing queued. The caller owns a queued position,
receives its later payouts, and is the only address that can cancel it.

Any revert undoes all steps, including earlier fills or parking in that transaction. For a complete
immediate fill, use `swapExactInput`, or set `swapOrQueue`'s minimum to
`floor(amount / S_offer) * S_want`.

## What a reserve fill moves

Reserve settlement in **steps 4 and 5** uses the same route-specific accounting:

| Route | Effect |
|-------|--------|
| hub → hub | Wanted hub reserve decreases; offered hub reserve increases. No DLRS is minted or burned |
| hub → spoke | Wanted spoke reserve decreases; offered hub reserve and that spoke's DLRS side increase |
| spoke → hub | Wanted hub reserve and offered spoke's DLRS side decrease; offered spoke reserve increases |

A reserve-backed spoke-to-hub fill is capped by the wanted hub reserve and the spoke's DLRS side
above its protected minimum, whichever is smaller. Exact-opposite peer matches use escrow instead
and do not consume that allocation.

## Example: full instant swap from reserves

```text
Before:
  Hub USDC reserve: 10,000
  Hub USDS reserve:  5,000
  Both directed queues empty

User offers 3,000 USDC for USDS:
  No opposite peer position or earlier same-direction position.
  USDS reserves cover the entire output.
  User receives 3,000 USDS; no queue position is created.

After:
  Hub USDC reserve: 13,000
  Hub USDS reserve:  2,000
```

With the illustrated token decimals, the native input is `3_000e6` USDC and full output is
`3_000e18` USDS. `swapExactInput` returns these two amounts and pays the specified recipient.

## Example: peer match against the opposite queue

```text
Before:
  Hub USDS reserve: 0
  USDS → USDC queue: Alice offers 3,000 USDS

User offers 3,000 USDC for USDS:
  Alice receives the user's 3,000 USDC and her position closes.
  The user receives Alice's escrowed 3,000 USDS.

After:
  Hub reserves unchanged
  Alice's position removed
```

If Alice cannot receive USDC, her position is parked with its USDS escrow untouched. The swap
continues to other available liquidity; it does not convert her escrow into receipts.

## Example: partial fill with queue

```text
Before:
  Hub USDC reserve: 10,000
  Hub USDS reserve:  1,000
  Both directed queues empty

User offers 3,000 USDC through swapOrQueue with minAmountOut = 0:
  Pull 3,000 USDC.
  Pay 1,000 USDS from reserves.
  Escrow 2,000 USDC as a new USDC → USDS position owned by the caller.

After:
  Hub USDC reserve: 11,000
  Hub USDS reserve:      0
  USDC → USDS queue: caller offers 2,000 USDC
```

The returned tuple is `(3_000e6, 1_000e18, 2_000e6, positionId)` using the illustrated decimals.
`QueueJoined` reports the escrow as `2_000e6` normalized units; for an 18-decimal offer token its
event amount would differ from the native queued amount.

Had the user required `3_000e18` native USDS immediately, `MinAmountNotMet` would revert the call.
`swapExactInput` would instead reject the incomplete fill with `InsufficientLiquidity`; neither
would leave funds queued.

## Example: the queue gets filled

Continue from the previous example:

```text
Someone deposits 5,000 USDS into the hub:
  Hub USDS reserve becomes 5,000.
  The deposit receiver gets 5,000 DLRS.
  The hub deposit does not itself settle the waiting queue.

Anyone calls processQueue(USDC, USDS, maxPositions):
  The queued owner receives 2,000 USDS and the position closes.
  Its 2,000 USDC of escrow enters hub reserves.

After:
  Hub USDC reserve: 13,000
  Hub USDS reserve:  3,000
  USDC → USDS queue empty
```

A later same-direction swap can also settle older positions before drawing reserves. A matching
opposite swap can pay them peer to peer. Deposits into a **spoke** settle the lines enabled by the
new liquidity, up to eight visits per line. See
[How much settles per transaction](/concepts/queue#how-much-settles-per-transaction).

## Aggregator flow

[`swapExactInput`](/capabilities/functions#swapexactinput)`(offerAsset, wantAsset, amount, minAmountOut, recipient, deadline)`
uses the same peer matching and FIFO reserve logic, with a full-fill requirement:

```text
1. Check deadline and recipient; validate the route and offered-token inflow.
2. Pull the rounded native input.
3. Match opposite positions, settle earlier same-direction positions, then use reserves.
4. Revert InsufficientLiquidity unless the full normalized input filled.
5. Compare the native output with minAmountOut.
6. Send the output to recipient; return native (amountIn, amountOut).
```

It never queues. `recipient` can be the end user or the integration; the zero address and DollarStore
itself are rejected. `getSwapQuote` estimates liquidity after the same bounded queue work, assuming
all transfers succeed. Simulate the actual call with its caller and recipient to check execution,
including issuer restrictions and payouts to queued owners.

## Spoke-to-spoke flow

[`swapSpokeToSpoke`](/capabilities/functions#swapspoketospoke)`(offerAsset, wantAsset, via, amount, recipient, deadline)`
combines two single-leg routes for each hub token in `via`:

```text
offered spoke → hub token → wanted spoke
```

The contract validates the routes, pulls the rounded offered input once, and tries the hub tokens
in the caller's order. Each entry carries up to what both legs can fill; any remainder moves to the
next entry. The offer token must pass its inflow check. A hub token failing its own inflow check is
skipped, because the second leg would absorb it into reserves.

Both legs follow peer matching and reserve FIFO, so positions on the lines used can fill or be
parked. When both legs use reserves, aggregate hub reserves end unchanged and hub-side allocation
moves from the offered spoke to the wanted spoke.

The call pays native wanted tokens to `recipient` and returns `(amountIn, amountOut)`. It fills the
whole normalized order or reverts, never queues, and has no separate minimum-output argument.
The `via` order can affect fillability. For a single hub token, chain the two quotes to estimate
liquidity; for a list or transfer checks, simulate the full call. The ordinary swap endpoints still
reject a spoke-to-spoke pair. See [Spoke to spoke](/concepts/spokes#spoke-to-spoke).
