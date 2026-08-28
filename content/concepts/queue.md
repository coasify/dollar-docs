---
sidebar_position: 3
title: The Queue
description: How the FIFO queue system works
---

# The Queue

When a user wants an asset that isn't currently available, they can get in line for it. Queues are
processed in strict FIFO (First In, First Out) order.

## Directed queues

There is not one queue per stablecoin — there is one queue per **direction**. A position in the
`USDC → USDS` queue is someone offering USDC and waiting for USDS. The `USDS → USDC` queue is a
different queue, holding the opposite side.

That distinction is what makes peer matching work: a swap looks at the **exact-opposite** queue first
and settles against it directly, moving no protocol reserves at all.

## How it works

Getting in line happens as part of a swap: whatever cannot be filled instantly is escrowed as a new
position at the tail of the queue. The escrow is the **offer asset** — the token the user put in, not a
receipt. Your spot is held until either:

- The asset you want arrives and you receive it
- You leave the line and take your offer asset back

If you leave, you can immediately swap or withdraw against whatever is available. If you want back in
line, you join at the tail.

```
Queue USDC → USDS:
  Position 1: Alice offers 500 USDC, wants USDS
  Position 2: Bob offers 1,000 USDC, wants USDS
  Position 3: Carol offers 600 USDC, wants USDS

800 USDS becomes available:
  → Alice receives 500 USDS (position closes, her 500 USDC enters reserves)
  → Bob receives 300 USDS (still in line for 700 more)
  → Carol still waiting

Queue USDC → USDS (after):
  Position 1: Bob offers 700 USDC
  Position 2: Carol offers 600 USDC
```

## Partial fills

Positions can be partially filled. When this happens:

- The user receives the partial amount immediately
- The position stays in the queue for the remainder, keeping its place in line
- The `QueueFilled` event reports both the filled and the remaining amounts

## FIFO is enforced against reserves

A queue does not just wait for someone to walk in with the right token. Before any swapper is allowed to
touch protocol reserves on that route, the protocol settles the queue ahead of them, in order. Only if
that queue is then empty does the swapper reach reserves.

### How much settles per transaction

A single swap or deposit settles at most **8** positions inline, oldest first. That bound exists so one
user's transaction is never forced to walk an arbitrarily long queue — it is a gas-safety limit, not a
limit on how deep a queue can get.

With 100 positions waiting, a swap settles the 8 oldest and the other 92 stay queued, in order. They
drain through subsequent swaps and deposits, or explicitly:

```solidity
dollarStore.processQueue(offerAsset, wantAsset, maxPositions);
```

`processQueue` is permissionless and you choose the bound, so a keeper can pass a large number and drain
as much as their gas allows. Nothing gets stuck. Note there is **no reward** for calling it — the
protocol charges no fees, so it pays none either. The incentive to call it is having an order in that
queue, or wanting the route unblocked so your own swap can reach reserves.

## FIFO is per queue, not global

Each directed queue is strict FIFO by arrival. There is no global clock **across** queues, including
queues that want the same asset.

```
USDS → USDT    Alice, queued a week ago
USDC → USDT    Bob, queued today
```

Both are waiting for USDT, but they are two separate queues — one per hub asset offered. When USDT
liquidity arrives, the auto-settlement walks the hub assets in the pool's own order, so if USDC comes
before USDS in that order, Bob settles before Alice despite arriving later.

Alice is not stuck, though. She can drain her own queue directly at any time:

```solidity
dollarStore.processQueue(USDS, USDT, maxPositions);
```

and a `USDS → USDT` swap from anyone else matches against her position too. Only the automatic
settlement follows pool order; every other path respects her queue's own FIFO.

If ordering against other pairs matters to you, treat `processQueue` as the tool that puts you back in
control rather than waiting for the automatic path.

## Leaving the queue

Users can leave at any time:

```solidity
dollarStore.cancelQueue(positionId);
```

Cancelling returns the escrowed offer asset and is an exit path — it works even while the protocol is
paused. If the transfer back fails (for example a token blacklist), the escrow is converted into the
canonical receipt instead of bricking the position: DLRS on the hub, receipt shares on a spoke.

## Queue limits

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Max positions per directed queue | 150 | Prevents unbounded gas costs |
| Min order (base) | $500 | Prevents spam at low queue depth |
| Min order scaling | 10x per 25 positions | Higher minimums as the queue grows |

### Minimum order scaling

The minimum order size increases as that queue gets deeper:

| Queue positions | Minimum order |
|-----------------|---------------|
| 0-24 | $500 |
| 25-49 | $5,000 |
| 50-74 | $50,000 |
| 75-99 | $500,000 |
| 100-124 | $5,000,000 |
| 125-149 | $50,000,000 |

This prevents queue spam and ensures positions are meaningful at scale. The minimum is waived for the
first position of an empty queue, so a route can always be opened. Read the current value with
`getMinimumOrderSize(offerAsset, wantAsset)`.
