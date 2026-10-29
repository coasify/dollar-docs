---
sidebar_position: 4
title: Time vs Slippage
description: The fundamental tradeoff the protocol makes
---

# Time vs slippage

DollarStore's tradeoff is **fixed rate, variable execution time**. A larger swap does not move the
protocol's rate; it may exhaust immediate liquidity and need to queue.

## The traditional tradeoff

| Mechanism | What sets execution | What can vary |
|-----------|---------------------|---------------|
| AMM | A pool's price curve and liquidity | Output price, fees and fillability |
| Order book | Matching bids and offers | Execution price and whether an order fills |
| DollarStore | A fixed 1:1 normalized rate and available liquidity | How much fills now and how long a queued remainder waits |

## There is no slippage

The contract exchanges the same number of normalized units on each side. There is no price curve,
pool-ratio adjustment or protocol fee. The two tokens' external market prices can still differ;
the protocol rate is not a statement about their market value.

Other transactions can consume liquidity before yours executes. This changes whether your order
fills immediately, rather than giving it a different protocol exchange rate.

## minAmountOut is a fill floor, not a price floor

For `swapOrQueue`, `minAmountOut` answers: **how much wanted token must arrive now for this transaction
to be acceptable?** Less than that reverts the entire call. If the floor is met, any unfilled input
joins the queue, subject to the queue's limits.

`minAmountOut` is expressed in **native decimals of the output token**. It uses the same units as
`amountOut` and `getSwapQuote`, rather than the protocol's normalized accounting unit.

For scaling factors `S_offer` and `S_want`:

```text
normalized input = floor(native input budget / S_offer)
full native output = normalized input * S_want
```

An illustrative USDC-to-USDS trade, with 6 and 18 token decimals respectively:

```text
Input budget:          10,000 USDC = 10_000e6 native USDC
Normalized input:                  10_000e6 accounting units
Full output / minimum: 10,000 USDS = 10_000e18 native USDS
```

The normalized amounts match; the native numbers do not. For an 18-decimal offered token, sub-unit
input dust is left with the caller. The native output minimum is compared as supplied, without
rounding it down to normalized units.

## Choosing how much must fill

The examples assume the illustrated tokens are listed, the offered tokens have been approved to
the DollarStore proxy, and the caller can receive the wanted token.

### The whole order, or nothing

Use [`swapExactInput`](/capabilities/functions#swapexactinput) for a full immediate fill or a revert.
It never queues and pays the explicit `recipient`:

```solidity
uint256 amount = 10_000e6; // Native USDC budget.
uint256 units = amount / dollarStore.assetScalingFactor(USDC);
uint256 fullOut = units * dollarStore.assetScalingFactor(USDS);

(uint256 amountIn, uint256 amountOut) = dollarStore.swapExactInput(
    USDC, USDS, amount, fullOut, recipient, block.timestamp + 300
);
// amountIn == 10_000e6 native USDC; amountOut == 10_000e18 native USDS.
```

The full normalized input must fill even if you set a lower output minimum. Setting the full native
output as the minimum on `swapOrQueue` also makes that call complete or revert, with nothing queued.

### A minimum share now, remainder queued

Use [`swapOrQueue`](/capabilities/functions#swaporqueue) to require a portion immediately and queue
the rest. It pays the caller and creates any remaining position under that same caller:

```solidity
uint256 amount = 10_000e6; // Native USDC budget.
uint256 units = amount / dollarStore.assetScalingFactor(USDC);
uint256 fullOut = units * dollarStore.assetScalingFactor(USDS);
uint256 minimumNow = fullOut * 80 / 100;

(uint256 amountIn, uint256 amountOut, uint256 queued, uint256 positionId) =
    dollarStore.swapOrQueue(
        USDC, USDS, amount, minimumNow, block.timestamp + 300
    );
// Example fill: amountIn == 10_000e6 USDC, amountOut == 8_500e18 USDS,
// queued == 1_500e6 USDC; positionId identifies the caller's escrow.
```

The output and queued input use **different tokens' native decimals**. `QueueJoined` and later
`QueueFilled` events instead report normalized units. See [Events](/capabilities/events).

:::warning The remainder has to be a valid queue order
A nonempty line imposes a minimum on the queued remainder, and a full line accepts no new position.
The whole transaction can revert with `OrderTooSmall` or `QueueFull` even when the immediate output
floor is met. `getMinimumOrderSize` returns normalized units; scale it to native offer-token units
when comparing with the remainder. See [Queue limits](/concepts/queue#queue-limits).
:::

### A partial fill with nothing queued

`swapOrQueue` escrows everything it cannot fill. To keep unused funds in your wallet, quote the
available output, convert it to an input amount, and submit only that amount through `swapExactInput`:

```solidity
uint256 quote = dollarStore.getSwapQuote(USDC, USDS, budget); // Native USDS.
uint256 fillableUnits = quote / dollarStore.assetScalingFactor(USDS);

if (fillableUnits > 0) {
    uint256 smallerInput = fillableUnits * dollarStore.assetScalingFactor(USDC);
    dollarStore.swapExactInput(
        USDC, USDS, smallerInput, quote, recipient, block.timestamp + 300
    );
}
// Only the smaller input is submitted; the rest remains with the caller.
```

Simulate the smaller call before sending it. A quote assumes transfers succeed and reports liquidity
for the amount quoted; a smaller retry or a changed state can produce a different outcome. The
exact-input call reverts rather than queues if it cannot complete.

## What limits instant liquidity

- **FIFO.** An older same-direction queue gets reserve liquidity first. A swap visits up to eight
  positions and can then use remaining reserves only if that line has cleared. Opposite peer matches
  are considered separately, first.
- **Route.** Hub-to-spoke reserve fills use that spoke's token reserve. Spoke-to-hub reserve fills use
  the wanted hub reserve and the spoke's DLRS side above its
  [minimum](/concepts/spokes#the-brake-mindlrsreserve), whichever is smaller.
- **Risk gates.** The offer token must pass pause and fresh-price checks. A paused spoke also blocks
  swaps touching it; wind-down blocks the spoke-to-hub direction.
- **Transfers.** The immediate recipient and queued owners must be able to receive their tokens.
  A failed queued payout parks that position; a failed immediate payout reverts the call.

## Predictable behavior for integrators

`swapExactInput` returns native `(amountIn, amountOut)`, delivers the whole normalized order to its
`recipient`, and never queues. The recipient can be the calling integration or the end user.

[`getSwapQuote`](/capabilities/functions#getswapquote) returns native wanted-token output, capped at
the requested order. It includes opposite-queue escrow and reserves left after simulating up to eight
same-direction settlements. An existing queue therefore does not automatically make the quote zero.

Compare the quote with the full native output calculated for the input, rather than checking only
for nonzero liquidity. The view returns zero for unsupported routes or failed route, pause or
offer-price checks. It takes no caller or recipient and assumes every transfer succeeds; simulate
the actual call with both addresses to check execution.

For two spoke tokens, use the dedicated all-or-nothing
[`swapSpokeToSpoke`](/concepts/spokes#spoke-to-spoke) endpoint and simulate the selected `via` list.
The ordinary quote does not accept a spoke-to-spoke pair directly.
