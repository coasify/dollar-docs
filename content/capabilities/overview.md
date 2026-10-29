---
sidebar_position: 1
title: Overview
description: Contract architecture and integration points
---

# Capabilities overview

This reference describes the **1.0.0** interface at
[`b1668d0`](https://github.com/coasify/dollar/blob/b1668d0835c896e6ec310f51b3598e97cc5e46b0/src/interfaces/IDollarStore.sol).
Use [Addresses](/resources/addresses) to confirm a proxy and release that match it.

| Contract | Purpose |
|----------|---------|
| **DollarStore** | Pools, deposits, basket withdrawals, swaps, queues and risk controls. A UUPS proxy; integrate against the proxy address |
| **DLRS** | Non-transferable, six-decimal hub receipt token, minted at par for normalized hub deposits. Immutable, not upgradeable |

## Pools

Pools have a `uint16` ID. The governor lists hub assets with `addHubAsset` and creates spokes with
`createSpoke`, freezing token decimals when listed. An asset is listed in one pool at a time.

| Pool | ID | Contents and receipts |
|------|----|-----------------------|
| **Hub** | `0` | Several listed stablecoins. A hub deposit mints DLRS at 1:1 in normalized units |
| **Spoke** | `>= 1` | One additional stablecoin plus an internal DLRS-side reserve funded with hub assets. A deposit mints non-transferable receipt shares |

A governor can remove a spoke once its spoke-asset reserve and DLRS-side reserve are zero. Worthless
shares and queued or parked positions can remain; those positions no longer fill but remain
owner-cancellable. Relisting the asset creates a fresh pool ID and separate queues.

### Routes

| Route | Endpoint |
|-------|----------|
| hub → hub | `swapOrQueue` or `swapExactInput` |
| hub → spoke | `swapOrQueue` or `swapExactInput` |
| spoke → hub | `swapOrQueue` or `swapExactInput` |
| spoke → spoke | `swapSpokeToSpoke`, through the caller's ordered hub-asset list; never queues |

The ordinary pair endpoints reject spoke-to-spoke. The dedicated routed endpoint executes atomically
and requires the whole rounded input to fill. It tries the caller's `via` list in order rather than
searching for a best route; order can affect fillability.

## Units

Internal accounting uses **normalized six-decimal units**. For token decimals in `[6, 18]`, the frozen
scaling factor is `10**(decimals - 6)`.

| Quantity | Units |
|----------|-------|
| Swap `amount`, returned `amountIn`, returned `amountInQueued` | Native offered token |
| Swap `minAmountOut`, returned `amountOut`, `getSwapQuote` result | Native wanted token |
| Deposit `amount`, returned `amountIn` | Native deposited token |
| Withdrawal/preview output arrays and withdrawal minimums | Native amount of the asset at that index |
| Hub `receiptAmount` | DLRS, with six decimals |
| Spoke `receiptAmount` | Receipt-share count; not a fixed dollar amount |
| Reserves, DLRS-side reserve, queue depths/position amounts, minimum order sizes, caps and reserve floors | Normalized six-decimal units |

Read `assetDecimals(asset)` and `assetScalingFactor(asset)` to convert. With scaling factors `So` and
`Sw`, a native input budget `amount` pulls `(amount / So) * So`; full native output is
`(amount / So) * Sw`. Integer division rounds down. Sub-unit dust stays with the protocol's caller;
a router that collected a larger budget must refund its own leftover input.

## Supported stablecoins

Read the deployment's asset set instead of assuming a launch list:

```solidity
uint256 pools = dollarStore.poolCount(); // Includes retired pool IDs
address[] memory hubAssets = dollarStore.getPoolAssets(0);
bool listed = dollarStore.isAssetListed(token);
uint16 pool = dollarStore.assetPoolId(token); // Meaningful for routing when listed
```

Use `getPoolStatus` to identify retired spokes. The USDC/USDS examples in these docs illustrate a
six-decimal input and an eighteen-decimal output when both are listed as hub assets; verify the actual
network and release in [Addresses](/resources/addresses).

## Integration paths

### For aggregators

`getSwapQuote` returns estimated instant output in native wanted-token units. It models opposite-queue
liquidity and reserves left after settling up to eight older same-direction positions. An existing
same-direction queue does not always make the quote zero.

Simulate with the actual caller and recipient, then use the all-or-nothing endpoint:

```solidity
(uint256 amountIn, uint256 amountOut) = dollarStore.swapExactInput(
    offerAsset,
    wantAsset,
    budget,               // Native offered token
    minNativeOutput,      // Native wanted token
    recipient,
    block.timestamp + 300
);
```

Output goes directly to `recipient`. The quote checks route, pause and offer-asset inflow conditions
but assumes every token payment succeeds; it checks neither caller balances/approvals nor recipient
transfer permissions. Parking an older position can make execution fill more or less than quoted.

### For direct users

`swapOrQueue` fills what it can now and escrows the remainder under its caller:

```solidity
(uint256 amountIn, uint256 amountOut, uint256 amountInQueued, uint256 positionId) =
    dollarStore.swapOrQueue(
        offerAsset, wantAsset, budget, minNativeOutput, deadline
    );
```

Set the minimum to full native output to require an instant fill, or zero to accept any instant fill
and queue the rest. Queue size/capacity rules still apply. `positionId` is zero when nothing queued.
The caller receives later payouts and is the only address allowed to cancel; there is no separate
queue recipient. Routers should use a never-queue endpoint unless they deliberately manage positions.

### For liquidity providers

`deposit` pulls input from its caller and credits non-transferable receipts to `receiver`:

```solidity
(uint256 amountIn, uint256 receiptAmount) =
    dollarStore.deposit(poolId, asset, budget, receiver, deadline);

(address[] memory assets, uint256[] memory expected) =
    dollarStore.previewWithdraw(poolId, receiptAmount);

uint256[] memory minimums = new uint256[](0); // Accept the calculated basket
(address[] memory paidAssets, uint256[] memory amounts) =
    dollarStore.withdraw(poolId, receiptAmount, minimums, deadline);
```

A hub exit burns DLRS and pays a reserve-weighted basket of hub assets. A spoke exit burns shares and
pays a proportional mix of the spoke asset and hub assets. There is no selected-asset withdrawal or
separate `redeemSpoke` endpoint. To end in one token, withdraw and then swap.

Build per-asset native minimums from `previewWithdraw`'s returned order, not `getPoolAssets` for a spoke.
A new hub listing adds an output slot, so a stale minimums array can revert on length. A preview checks
the calculation, not the caller's balance or issuer transfer permissions.

## Core behavior

1. **Swap parity:** swaps exchange equal normalized quantities, with no protocol fee or price curve.
   Hub deposits mint DLRS at par; spoke shares are valued proportionally to current pool value.
2. **Reserve accounting:** before reserve write-downs, total hub reserves equal DLRS total supply plus
   the sum of spokes' DLRS-side reserves. Queue escrow is separate. A reserve write-down reduces recorded
   backing without reducing DLRS balances.
3. **FIFO reserve access:** peer matching starts with the exact-opposite queue. A new swap uses reserves
   only after its earlier same-direction queue is cleared; inline settlement visits up to eight of
   those positions per line.
4. **Pause-independent exit entrypoints:** `withdraw` and `cancelQueue` are not blocked by protocol
   pause. Reserve insufficiency or issuer-controlled token transfers can still prevent payment.
5. **Parked escrow:** a failed queue payment parks the position, leaving its original offered token in
   escrow. The owner retries cancellation when that token can be returned; no receipt fallback is minted.
6. **All-or-nothing routing:** `swapExactInput` and `swapSpokeToSpoke` either fill their rounded input in
   full or revert. Neither creates a queued position.

## Next steps

- [Functions](/capabilities/functions) — parameters, return values and governance controls
- [Events](/capabilities/events) — indexing payments and position changes
- [Errors](/capabilities/errors) — failure conditions and recovery
