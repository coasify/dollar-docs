---
sidebar_position: 2
title: Quickstart
description: Integrate DollarStore in 5 minutes
---

# Quickstart

Everything below targets the **proxy** address. The implementation is published only so its bytecode can
be verified — never call it directly.

:::info Not deployed yet
There are no live addresses to point this at. See [Addresses](/resources/addresses) for status. The
interface below is what you will integrate against.
:::

## The five things to know

1. **Approve the proxy** for the input token before any deposit or swap. The protocol pulls with
   `transferFrom`.
2. **Every state-changing call takes a `deadline`** (a Unix timestamp). There is no default.
3. **`minAmountOut` is in normalized 6-decimal units**, not the output token's decimals — and it is a
   floor on *quantity filled*, not on price. See [Time vs Slippage](/concepts/time-tradeoff).
4. **Output goes to `msg.sender`.** There is no recipient parameter, so a router receives the tokens and
   forwards them itself.
5. **Sub-unit dust is never pulled.** A token with more than 6 decimals leaves the remainder in your
   wallet rather than rounding it away.

:::info Assets in these examples
The hub launches with **USDC and USDS**, and the examples below swap between them. Other stablecoins
join as spokes — **USDS** is expected to be the first. The listed set is governed and grows, so resolve
it at runtime instead of hardcoding: see [Discovering what is listed](#discovering-what-is-listed).
:::

## Units

The protocol accounts in normalized 6-decimal units. Convert with the scaling factor the contract
already exposes:

```solidity
uint64 scaling = dollarStore.assetScalingFactor(token); // 10**(decimals - 6)
uint256 units  = nativeAmount / scaling;
uint256 native = units * scaling;
```

Because the rate is exactly 1:1, the normalized amount of your input is also the maximum you can get out.

## Swapping from a contract

The router path: quote, then execute all-or-nothing.

```solidity
interface IDollarStore {
    function getSwapQuote(address offerAsset, address wantAsset, uint256 amount)
        external view returns (uint256);
    function assetScalingFactor(address asset) external view returns (uint64);
    function swapExactInput(
        address offerAsset,
        address wantAsset,
        uint256 amount,
        uint256 minAmountOut,
        uint256 deadline
    ) external returns (uint256 amountOut);
}

function swapStables(address offer, address want, uint256 amountIn, address to) external {
    IERC20(offer).safeTransferFrom(msg.sender, address(this), amountIn);

    // 1. Will it fill? The quote is in native units of `want`, capped at what you asked for.
    uint256 quote = dollarStore.getSwapQuote(offer, want, amountIn);
    uint256 wantScaling = dollarStore.assetScalingFactor(want);
    uint256 quoteUnits = quote / wantScaling;

    uint256 offerUnits = amountIn / dollarStore.assetScalingFactor(offer);
    require(quoteUnits >= offerUnits, "insufficient instant liquidity");

    // 2. Approve the proxy and execute. Reverts rather than partially filling.
    IERC20(offer).forceApprove(address(dollarStore), amountIn);
    uint256 out = dollarStore.swapExactInput(
        offer,
        want,
        amountIn,
        offerUnits,           // minAmountOut: normalized 6dp floor
        block.timestamp + 300 // deadline
    );

    // 3. Output landed here, not with the user. Forward it.
    IERC20(want).safeTransfer(to, out);
}
```

Compare the quote against what you need rather than testing for non-zero: it can come back partial, and
a partial quote means `swapExactInput` will revert.

## Swapping from an app

```typescript
import { parseUnits } from 'viem'

const amountIn = parseUnits('10000', 6) // 10,000 USDC

// 1. How much fills right now?
const quote = await publicClient.readContract({
  address: dollarStore, abi, functionName: 'getSwapQuote',
  args: [USDC, USDS, amountIn],
})

// 2. Normalized floor. Rate is 1:1, so input units == max output units.
const offerScaling = await publicClient.readContract({
  address: dollarStore, abi, functionName: 'assetScalingFactor', args: [USDC],
})
const units = amountIn / offerScaling

// 3. Approve the proxy
await walletClient.writeContract({
  address: USDC, abi: erc20Abi, functionName: 'approve',
  args: [dollarStore, amountIn],
})

// 4. Simulate, then send. Every validation runs in the simulation, so a clean
//    simulate in the current block means route, peg, pause and liquidity all pass.
const { request } = await publicClient.simulateContract({
  address: dollarStore, abi, functionName: 'swap',
  args: [
    USDC, USDS, amountIn,
    units,                            // minAmountOut: require a full instant fill
    0n,                               // tip: must be 0
    BigInt(Math.floor(Date.now() / 1000) + 300),
  ],
  account,
})
const hash = await walletClient.writeContract(request)
```

Change one argument to change the guarantee: `units` demands 100% instantly or reverts, `units * 80n /
100n` demands 80% and queues the rest, `0n` takes whatever is available and queues the remainder. See
[Guaranteeing execution](/concepts/time-tradeoff#guaranteeing-execution).

## Discovering what is listed

Do not hardcode an asset list — read it.

```solidity
uint256 pools = dollarStore.poolCount();          // index 0 is the hub
address[] memory hubAssets = dollarStore.getPoolAssets(0);
bool ok = dollarStore.isAssetListed(token);
uint16 pool = dollarStore.assetPoolId(token);     // which pool the asset belongs to
```

Routes are hub↔hub, hub↔spoke and spoke↔hub. A direct spoke-to-spoke swap reverts with `InvalidRoute` —
route it as two legs through a hub asset. There is no on-chain router that does this for you today, so
that composition is yours to build.

## Before you ship

- **Simulate every call.** It is the cheapest way to surface the revert reasons in
  [Errors](/capabilities/errors).
- **Handle `InsufficientLiquidity`** on `swapExactInput` — it means route elsewhere, not that something
  broke.
- **Handle `OrderTooSmall`** if you use `swap` with a partial floor: a remainder below the queue's
  minimum reverts the whole call when that queue is not empty.
- **Do not cache addresses or decimals across networks.** Decimals are frozen per asset at listing, but
  the asset set is governed and can grow.
- **Watch `ReservesSynced`** if you hold DLRS or spoke shares — it is the event that marks backing down.

## Next steps

- [Functions](/capabilities/functions) — the complete call surface
- [Errors](/capabilities/errors) — every revert and what to do about it
- [Time vs Slippage](/concepts/time-tradeoff) — choosing `minAmountOut`
- [Spokes](/concepts/spokes) — if you are listing an asset or providing liquidity
