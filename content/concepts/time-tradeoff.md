---
sidebar_position: 4
title: Time vs Slippage
description: The fundamental tradeoff the protocol makes
---

# Time vs Slippage

Every exchange mechanism makes a tradeoff. The DollarStore protocol's tradeoff is explicit: **perfect
price, variable time**.

## The traditional tradeoff

AMMs and order books resolve price differently, and charge for it:

| Mechanism | Users get | Users give up |
|-----------|---------|-------------|
| AMM (Uniswap) | Execution on demand | Price (slippage + fees) |
| Order book | Price discovery | Certainty of execution (may not fill) |
| DollarStore | Exact 1:1 price | Certainty of execution (may queue) |

## There is no slippage

Not "low slippage" — none. The rate is fixed at 1:1 in normalized units by the contract itself. There
is no curve, no pool ratio, no price impact, and no fee. A $10 swap and a $10,000,000 swap execute at
exactly the same rate, and the size of your order cannot move it.

The consequence is that **the classic reasons to set `minAmountOut` do not exist here**. Nothing can
front-run you into a worse price, because there is no price to worsen. Splitting an order across
transactions gains you nothing.

## minAmountOut is a fill floor, not a price floor

This is the one thing to internalize if you have integrated an AMM before.

| | On an AMM | Here |
|---|---|---|
| What can vary | The **rate** you get | The **quantity** filled instantly |
| What `minAmountOut` protects | Against the price moving | Against partial execution |

Here `minAmountOut` answers a different question: *how much of this must fill right now for the
transaction to be acceptable?* Anything below the floor reverts. Anything above it fills, and the rest
goes to the queue.

It is expressed in **normalized 6-decimal units**, not the output token's native decimals. Since the
rate is 1:1, the normalized amount of your input is also the most you could ever get out.

This matters on the hub itself, because its two assets do not share decimals:

```
10,000 USDC  (6 decimals)  = 10_000_000_000 native            → 10_000_000_000 units
10,000 USDS  (18 decimals) = 10_000_000_000_000_000_000_000   → 10_000_000_000 units
```

Same value, same normalized amount, native figures twelve orders of magnitude apart. Passing a native
number where a normalized one belongs is the mistake to watch for.

Convert with `assetScalingFactor(asset)`: `units = nativeAmount / scalingFactor`.

## Choosing how much must fill

You choose how much of the order must settle immediately for the transaction to be acceptable. All
three cases use the same parameter.

None of these makes execution certain — they decide what happens when reserves fall short. What the
protocol fixes is the rate, not the timing.

### The whole order, or nothing

Set `minAmountOut` to the full normalized amount. Either the whole order settles in that transaction or
it reverts — and because nothing is left over, nothing is queued.

```solidity
uint256 units = amount / dollarStore.assetScalingFactor(USDC); // 10_000_000_000

// Settles 10,000 USDC → 10,000 USDS in full, or reverts. Never queues.
(uint256 filled, uint256 queued) = dollarStore.swap(
    USDC, USDS, amount, units, 0, block.timestamp + 300
);
// filled == units, queued == 0
```

[`swapExactInput`](/capabilities/functions#swapexactinput) behaves this way by construction and is the
right endpoint for routers and solvers.

### A minimum share now, remainder queued

Set `minAmountOut` to the fraction you require. Below it, the call reverts and nothing happens; at or
above it, you are paid the settled portion and the shortfall is escrowed in the queue.

```solidity
// "Settle at least 80% now, queue whatever is left"
uint256 floor = (units * 80) / 100;

(uint256 filled, uint256 queued) = dollarStore.swap(
    USDC, USDS, amount, floor, 0, block.timestamp + 300
);
// e.g. filled == 8_500_000_000, queued == 1_500_000_000
```

The floor is enforced atomically at execution, so it also covers liquidity disappearing between the
moment you quoted and the moment your transaction lands.

:::warning The remainder has to be a valid queue order
If the leftover is below the queue's [minimum order size](/concepts/queue#queue-limits) and that queue
already has positions, the whole swap reverts with `OrderTooSmall` — even though your percentage floor
was met. Check `getMinimumOrderSize(offerAsset, wantAsset)` when the remainder could be small, or demand
100% instead.
:::

### A partial fill with nothing queued

`swap` always queues what it cannot fill. To take a partial fill and keep the rest in your wallet, don't
submit the rest: quote first, then send only the amount you want filled, as an all-or-nothing order.

```solidity
uint256 quote = dollarStore.getSwapQuote(USDC, USDS, amount); // native units of USDS
uint256 fillable = quote / dollarStore.assetScalingFactor(USDS);

if (fillable > 0) {
    uint256 amountIn = fillable * dollarStore.assetScalingFactor(USDC);
    dollarStore.swap(USDC, USDS, amountIn, fillable, 0, block.timestamp + 300);
}
// The USDC you did not submit never left your wallet
```

## What limits instant liquidity

Three things, beyond the raw reserve balance:

- **FIFO.** If a queue already exists in the same direction, it owns the instant liquidity. A later
  swapper reaches reserves only once that queue is cleared.
- **Route.** Reserves are per pool. A hub → spoke swap draws on that spoke's reserve; a spoke → hub swap
  draws on hub reserves and is additionally capped by the spoke's DLRS-side reserve above its
  [protected minimum](/concepts/spokes#the-brake-mindlrsreserve).
- **Risk gates.** A depegged, stale-priced or paused offer asset cannot flow in at all.

## Predictable behavior for integrators

The [`swapExactInput`](/capabilities/functions#swapexactinput) function never queues. It either executes
fully or reverts.

```solidity
// This either delivers the full amount of USDS, or reverts.
// Never partial fills, never queues. Output goes to msg.sender.
uint256 out = dollarStore.swapExactInput(
    USDC, USDS, amountIn, minUnits, block.timestamp + 300
);
```

Aggregators check [`getSwapQuote`](/capabilities/functions#getswapquote) first. It returns the amount
fillable *right now*, in native units of the output token, capped at what was asked. Compare it against
what you need rather than testing for non-zero — a partial number means `swapExactInput` will revert.
It returns 0 for an unsupported route, and also when a same-direction queue holds the liquidity.
