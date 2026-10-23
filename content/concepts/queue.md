---
sidebar_position: 3
title: The Queue
description: How the FIFO queue system works
---

# The queue

When an immediate swap cannot fill completely, `swapOrQueue` can put the remainder in line. Active
positions are processed in FIFO order: first in, first out, within each directed queue.

## Directed queues

There is one queue per **direction and pool**, rather than one queue per token. A position in
`USDC → USDS` offers USDC and waits for USDS; `USDS → USDC` holds the opposite side.

A swap first matches the **exact-opposite** queue, paying those owners directly and receiving their
escrowed tokens. This peer matching moves no protocol reserves. A later swap in the same direction
must settle earlier positions from reserves before using reserves for itself.

Hub-to-hub lines belong to pool `0`; a hub-to-spoke or spoke-to-hub line belongs to that spoke. This
pool ID keeps a retired spoke's positions separate if its asset is listed again.

## How it works

`swapOrQueue(offerAsset, wantAsset, amount, minAmountOut, deadline)` fills what it can immediately and
escrows any remainder at the tail of its directed queue. The escrow is the **offer asset**, rather
than DLRS or a spoke receipt. The caller owns the new position, receives later payouts, and is the
only address that can cancel it.

Its returned `amountInQueued` is in native offer-token decimals and `positionId` identifies the new
position, or is `0` when nothing was queued. Queue views and events report normalized 6-decimal
accounting amounts instead.

```text
Illustrative USDC → USDS queue:
  Alice offers   500 USDC
  Bob offers   1,000 USDC
  Carol offers   600 USDC

Reserve settlement has 800 USDS available:
  Alice receives 500 USDS and leaves the queue.
  Bob receives 300 USDS and remains first for another 700.
  Carol continues waiting behind Bob.

The filled 800 USDC of escrow moves into hub reserves.
```

An active position can fill, be cancelled, or be **parked** if a transfer to its owner fails. Queue
escrow can also shrink after an actual token balance loss; see [When tokens are lost](#when-tokens-are-lost).

## Partial fills

A partial fill pays the owner immediately in the wanted asset. The remainder stays in its original
place in the active queue. `QueueFilled` reports the amount filled and the remaining escrow, both
in normalized 6-decimal units.

Queueing is a choice. Use `swapExactInput` for a complete immediate fill or a revert, with no position
created. Its recipient can differ from the caller. Routers should use that endpoint when they do not
intend to own and manage a queue position themselves.

## FIFO is enforced against reserves

Before a swapper can reach protocol reserves, the contract settles older positions on that same
directed line. Only when the line becomes empty can the swapper use the remaining reserves.
Opposite-queue peer liquidity is considered first, independently of this reserve priority.

### How much settles per transaction

A normal swap visits up to **eight older same-direction positions** during inline reserve
settlement. A visit can fully fill, partially fill or park a position. If positions remain afterward,
the swapper cannot draw from that route's reserves.

The eight-position bound is per reserve-settlement pass, not a total transaction limit. Opposite
peer matching can reach more than eight positions. A spoke deposit can visit up to eight positions
on **each affected line**, while a hub deposit does not trigger queue settlement. A composed
spoke-to-spoke swap can touch multiple lines.

Anyone can also request bounded settlement directly:

```solidity
(uint256 visited, uint256 filledUnits) = dollarStore.processQueue(
    offerAsset, wantAsset, maxPositions
);
```

`maxPositions` counts visited positions, including those parked after a failed payout. `filledUnits`
is the normalized amount settled. This call needs available route liquidity and passes the normal
route, pause and offer-asset inflow checks; it does not force a fill while those checks fail.

There is no protocol reward for processing a queue. An owner or integrator may call it to progress
waiting positions or clear a line before another swap. Larger bounds cost more gas.

## FIFO is per queue, not global

There is no global ordering across directed lines, even when they want the same asset. For example,
with USDC and USDS in the hub and USDT in a spoke:

```text
USDS → USDT    Alice, queued a week ago
USDC → USDT    Bob, queued today
```

A USDT deposit into the spoke walks hub assets in listing order. If USDC is listed before USDS,
Bob's line is visited first. Alice's line retains its own FIFO order but has no priority over Bob's
line based on age.

When reserves and risk checks allow, anyone can process Alice's line explicitly:

```solidity
dollarStore.processQueue(USDS, USDT, maxPositions);
```

A **USDT → USDS** swap can also peer-match her position. A **USDS → USDT** swap may instead settle
her first from reserves before filling itself.

## Leaving the queue

Only the position owner can cancel:

```solidity
dollarStore.cancelQueue(positionId);
```

A successful cancellation returns the remaining escrow **in the original offer asset** and removes
the position. It works while the protocol or a pool is paused, or after the position's pool is
removed. To join again, make a new swap and take a new place at the tail.

If the escrow transfer fails, an active position is parked instead. No DLRS or spoke shares are
minted as a substitute.

## Parked positions

A failed payout during peer matching, reserve settlement or cancellation moves a position out of
the directed FIFO line and onto the parked line for its offer asset. `QueueParked` reports the move.
Ownership and escrow remain, and later active positions can proceed.

A parked position receives no further automatic fills. The owner retries `cancelQueue` once its
offer-token transfer can succeed. If that retry fails, it reverts with `EscrowTransferFailed` and
the escrow stays parked.

Use these views to track it:

- `getUserQueuePositions(owner)` includes active and parked positions.
- `getQueuePosition(positionId)` returns the owner, original pair, remaining normalized escrow,
  timestamp and original pool ID.
- `isQueuePositionParked(positionId)` identifies a parked position.
- `getQueueDepth(offerAsset, address(0))` returns the offer asset's total parked escrow in normalized
  units, even if it is no longer listed.

When a pool is removed, its old positions can no longer fill. The ordinary pair-based depth view
does not report the retired line, so use the owner's position IDs to find and cancel those positions.
Relisting the token creates separate lines in a new pool.

## When tokens are lost

Queue escrow is separate from active reserves, but the tokens remain subject to their issuer's
transfer controls and actual balance losses. A depeg alone does not reduce the recorded token amount.

If actual token holdings no longer cover the accounted reserves and escrow, the guardian can apply
`haircutEscrow` while the asset's pool is paused. This reduces surviving escrow proportionally across
active and parked positions, including positions left after a pool is removed. A position reduced
to zero is removed. A later cancellation returns its surviving escrow, rather than the original
pre-loss amount. See [Security](/resources/security) for the separate reserve write-down process.

## Queue limits

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Maximum active positions per directed queue | 150 | Bounds an individual active line |
| Base minimum queued remainder | 500 normalized dollars | Discourages small positions |
| Minimum scaling | 10× per 25 existing active positions | Raises the minimum as the line grows |

### Minimum order scaling

| Existing active positions | Minimum queued remainder |
|---------------------------|--------------------------|
| 0–24 | 500 |
| 25–49 | 5,000 |
| 50–74 | 50,000 |
| 75–99 | 500,000 |
| 100–124 | 5,000,000 |
| 125–149 | 50,000,000 |

The table uses human-readable normalized dollars: the base on-chain amount is `500e6`.
`getMinimumOrderSize(offerAsset, wantAsset)` returns the current minimum in normalized units;
multiply it by the offer asset's scaling factor to compare with a native queued remainder.

The minimum is waived for the first position of an empty line. It applies to the **remainder that
would be queued**, so a swap can meet its immediate-fill floor and still revert with `OrderTooSmall`
or `QueueFull` when the remainder cannot join. A partial position already in line can fall below
the current minimum without losing its place.
