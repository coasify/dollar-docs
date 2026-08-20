---
sidebar_position: 1
title: Overview
description: Contract architecture and integration points
---

# Capabilities Overview

The DollarStore protocol consists of two contracts:

| Contract | Purpose |
|----------|---------|
| **DollarStore** | Main protocol logic—pools, deposits/withdrawals, directed swaps, queues, risk controls. A UUPS proxy: integrate against the proxy address, never the implementation |
| **DLRS** | Non-transferable 6-decimal receipt token, minted 1:1 when a hub stablecoin is deposited. Immutable, not upgradeable |

## Pools

Liquidity is organized into pools, identified by a `uint16` poolId.

| Pool | id | Contents |
|------|----|----------|
| **Hub** | `0` | The core stablecoins. Depositing mints DLRS 1:1 |
| **Spoke** | `>= 1` | One additional stablecoin each, paired against a DLRS-side reserve funded with hub assets. Depositing mints non-transferable receipt shares |

An asset belongs to exactly one pool. The governor lists hub assets with `addHubAsset` and creates
spokes with `createSpoke`; both freeze the token's decimals at listing time. Listed assets are never
unlisted individually — only a fully-drained spoke pool can be removed.

### Routes

| Route | Supported |
|-------|-----------|
| hub → hub | yes |
| hub → spoke | yes |
| spoke → hub | yes |
| spoke → spoke | **not on the protocol** — reverts `InvalidRoute`. Composed as two legs through a hub asset, and a peripheral router is planned to do that in one call |

## Units

All protocol accounting is in **normalized 6-decimal units**. An asset with more decimals is scaled by
`10**(decimals - 6)`; supported decimals are `[6, 18]`.

- `amount` parameters are in the asset's **native** units.
- `minAmountOut`, reserves, queue depths and minimum order sizes are in **normalized 6dp** units.
- Sub-unit dust is never pulled from the caller; it stays in their wallet.

Read `assetDecimals(asset)` and `assetScalingFactor(asset)` to convert.

## Supported stablecoins

The hub launches with **USDC and USDS**. Every other stablecoin joins as its own spoke.

Examples throughout these docs follow that layout: a hub-to-hub swap is USDC ↔ USDS, and a hub-to-spoke
swap is USDC ↔ USDT.

The set is governed and grows over time, so resolve it at runtime rather than hardcoding:

```solidity
uint256 pools = dollarStore.poolCount();
address[] memory hubAssets = dollarStore.getPoolAssets(0);
bool listed = dollarStore.isAssetListed(token);
uint16 pool = dollarStore.assetPoolId(token);   // 0 = hub, >= 1 = that spoke
```

`assetPoolId` is what tells you which route you are on, and therefore which rules apply.

The protocol is not deployed yet — see [Addresses](/resources/addresses).

## Integration paths

### For aggregators

Use `getSwapQuote` to check instant fillability, then `swapExactInput` to execute:

```solidity
// Instantly fillable amount, in native units of the output token (0 if the route is unsupported,
// or if a same-direction queue already owns the liquidity)
uint256 quote = dollarStore.getSwapQuote(USDC, USDS, amountIn);

if (quote >= expectedOut) {
    // All-or-nothing: fills fully or reverts. Never queues. Pays msg.sender.
    uint256 out = dollarStore.swapExactInput(
        USDC,                  // offerAsset
        USDS,                  // wantAsset
        amountIn,              // amount, native units of USDC
        minUnits,              // minAmountOut, normalized 6dp floor
        block.timestamp + 300  // deadline
    );
}
```

Output goes to `msg.sender` — a router receives the tokens itself and forwards them.

### For direct users

Use `swap`, which fills what reserves allow and queues the rest:

```solidity
(uint256 filled, uint256 queued) = dollarStore.swap(
    USDC,                  // offerAsset
    USDS,                  // wantAsset
    amount,                // native units of USDC
    0,                     // minAmountOut: 0 = accept any instant fill and queue the remainder
    0,                     // tip: must be 0 (reserved)
    block.timestamp + 300  // deadline
);
```

Set `minAmountOut` to the full normalized amount to demand an instant fill or revert.

### For liquidity providers

`deposit` into the hub mints DLRS 1:1; `withdraw` burns it for any hub asset with reserves.

```solidity
uint256 dlrs = dollarStore.deposit(0, USDC, amount, deadline);
uint256 out  = dollarStore.withdraw(0, USDS, units, deadline);
```

Depositing into a spoke — either its own asset or a hub asset funding its DLRS side — mints receipt
shares instead. Use `redeemSpoke` to exit proportionally across both sides of the pool.

## Key invariants

1. **1:1 ratio**: every swap and every deposit/withdrawal is 1:1 in normalized units. No fees, no curve.
2. **DLRS supply matches reserves**: total DLRS supply equals the sum of hub reserves; queue escrow is
   never counted as a reserve.
3. **FIFO ordering**: each directed `(offerAsset → wantAsset)` queue is strictly first-in-first-out, and
   a swapper only reaches reserves once the queue ahead of it is cleared.
4. **Exits stay open**: `withdraw`, `redeemSpoke` and `cancelQueue` are not blocked by pause.
5. **All-or-nothing for routers**: `swapExactInput` executes in full or reverts—no intermediate states.

## Next steps

- [Functions](/capabilities/functions) — Complete function reference
- [Events](/capabilities/events) — Events for monitoring
- [Errors](/capabilities/errors) — Error conditions and handling
