---
sidebar_position: 5
title: How Swaps Resolve
description: The complete flow of a swap transaction
---

# How Swaps Resolve

This page explains the complete lifecycle of a swap, from input to output.

The examples swap USDC for USDS, the two hub assets. The mechanics are the same for any listed pair —
where a spoke changes the accounting, it is called out.

## Direct swap flow

When calling [`swap`](/capabilities/functions#swap)`(offerAsset, wantAsset, amount, minAmountOut, tip, deadline)`:

```
1. Validate
   → deadline not passed, tip == 0, offerAsset != wantAsset
   → classify the route: hub->hub, hub->spoke or spoke->hub (spoke->spoke reverts)
   → offerAsset must be listed, unpaused, on peg, with a fresh price feed

2. Pull offerAsset from the user (exact amount, sub-unit dust stays in the wallet)

3. Fill from the exact-opposite (wantAsset -> offerAsset) queue
   → those owners receive offerAsset; their escrowed wantAsset goes to the swapper
   → peer-to-peer: touches no protocol reserves

4. If anything remains, settle the same-direction (offerAsset -> wantAsset) queue
   from reserves, in FIFO order, up to 8 positions

5. If that queue is now empty, fill the rest from protocol reserves on the route

6. Require amountFilled >= minAmountOut, else revert

7. Send the filled wantAsset to the user

8. Escrow any remainder as a new position at the tail of the (offerAsset -> wantAsset) queue
```

**Note:** for "all or nothing" behavior, set `minAmountOut` to the full normalized amount, or use
`swapExactInput`.

## What a reserve fill moves

Step 5 is the only step that touches pool accounting, and what it moves depends on the route.

| Route | Effect |
|-------|--------|
| hub → hub | Hub reserve of `wantAsset` down, hub reserve of `offerAsset` up. Reserve-neutral: no DLRS minted or burned |
| hub → spoke | Spoke reserve of `wantAsset` down, hub reserve of `offerAsset` up, and the spoke's DLRS-side reserve up |
| spoke → hub | Hub reserve of `wantAsset` down, spoke reserve of `offerAsset` up, and the spoke's DLRS-side reserve down |

For a spoke → hub swap, instant liquidity is therefore capped by both the hub reserve of the wanted
asset *and* the spoke's DLRS-side reserve above its protected minimum, whichever is smaller.

## Example: full instant swap from reserves

```
State before:
  Hub USDC reserve: 10,000
  Hub USDS reserve: 5,000
  Both USDC->USDS and USDS->USDC queues: empty

User swaps 3,000 USDC → USDS:

1. 3,000 USDC pulled from the user
2. Opposite (USDS->USDC) queue is empty — no peer match
3. Same-direction queue is empty, so reserves are reachable
4. USDS reserve (5,000) covers 3,000 ✓
5. 3,000 USDS sent to the user

State after:
  Hub USDC reserve: 13,000
  Hub USDS reserve: 2,000
```

## Example: peer match against the opposite queue

```
State before:
  Hub USDS reserve: 0
  USDS->USDC queue: [Alice: 3,000 USDS escrowed, wants USDC]

User swaps 3,000 USDC → USDS:

1. 3,000 USDC pulled from the user
2. Opposite queue match:
   → Alice receives 3,000 USDC, her position closes
   → her escrowed 3,000 USDS goes to the swapper
3. 3,000 USDS sent to the user

State after:
  Hub USDS reserve: 0        (untouched — no reserves were involved)
  USDS->USDC queue: empty
```

Two users with opposite needs settle against each other, with no reserves in the middle.

## Example: partial fill with queue

```
State before:
  Hub USDC reserve: 10,000
  Hub USDS reserve: 1,000
  Both queues: empty

User swaps 3,000 USDC → USDS with minAmountOut = 0:

1. 3,000 USDC pulled from the user
2. Opposite queue empty
3. Same-direction queue empty, reserves reachable
4. USDS reserve (1,000) < 3,000 → fill 1,000
5. 1,000 USDS sent to the user
6. Remaining 2,000 USDC escrowed at the tail of the USDC->USDS queue

State after:
  Hub USDC reserve: 11,000
  Hub USDS reserve: 0
  USDC->USDS queue: [User: 2,000 USDC escrowed]
```

Had `minAmountOut` been set to 3,000, the whole call would have reverted with `MinAmountNotMet` instead —
nothing filled, nothing queued.

## Example: the queue gets filled

Continuing from above:

```
State:
  Hub USDS reserve: 0
  USDC->USDS queue: [User: 2,000 USDC escrowed]

Someone deposits 5,000 USDS into the hub:

  Hub USDS reserve: 5,000
  DLRS minted to the depositor: 5,000

The queued position is now settleable. It clears on the next swap that
would otherwise touch reserves on that route, or immediately if anyone calls:

  processQueue(USDC, USDS, maxPositions)

  → User receives 2,000 USDS, position closes
  → their escrowed 2,000 USDC moves into hub reserves

State after:
  Hub USDC reserve: 13,000
  Hub USDS reserve: 3,000
  USDC->USDS queue: empty
```

A hub deposit does not settle queues by itself — settlement is triggered by swaps on that route, by a
spoke liquidity deposit, or by an explicit `processQueue` call. Since `processQueue` is permissionless,
anyone can push it, and the caller chooses how many positions to drain. See [how much settles per
transaction](/concepts/queue#how-much-settles-per-transaction).

## Aggregator flow

The [`swapExactInput`](/capabilities/functions#swapexactinput) function follows the same fill logic with
one difference: it never queues.

```
1. Check the deadline
2. Validate and classify the route; check the offer asset is unpaused and on peg
3. Pull offerAsset from the user
4. Fill from the opposite queue, then FIFO-settle, then reserves
5. If the fill is short of the full amount, REVERT (no partial fills, no queue)
6. Require filled >= minAmountOut, else revert
7. Send wantAsset to msg.sender
```

The call either executes in full or reverts — no intermediate states. Note that the output goes to the
caller, so a router receives the tokens and forwards them itself.
