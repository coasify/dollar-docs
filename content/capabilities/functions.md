---
sidebar_position: 2
title: Functions
description: Function reference for the DollarStore 1.0.0 interface
---

# Functions

This page describes the **1.0.0** interface at
[`b1668d0`](https://github.com/coasify/dollar/blob/b1668d0835c896e6ec310f51b3598e97cc5e46b0/src/interfaces/IDollarStore.sol).
Confirm a matching release and proxy in [Addresses](/resources/addresses).

*Native* amounts use the named token's own decimals. *Normalized units* use six decimals. A spoke
receipt amount is a share count, which can differ from normalized dollar value. See
[Overview](/capabilities/overview#units) for the units table.

## Core functions

### deposit

Supply liquidity, paid by the caller and owned by `receiver`.

```solidity
function deposit(
    uint16 poolId,
    address asset,
    uint256 amount,
    address receiver,
    uint256 deadline
) external returns (uint256 amountIn, uint256 receiptAmount);
```

| Parameter | Meaning |
|-----------|---------|
| `poolId` | `0` for the hub, or an active spoke ID |
| `asset` | Listed input asset: a hub asset for the hub; the spoke asset or a hub asset for a spoke |
| `amount` | Native input budget |
| `receiver` | Owner of the resulting non-transferable receipts; cannot be zero or DollarStore |
| `deadline` | Unix timestamp; the call reverts after it |

**Returns:** `amountIn` is native input actually pulled. `receiptAmount` is DLRS minted with six
decimals on the hub, or a receipt-share count on a spoke.

- Rounds input down to a whole normalized unit; sub-unit input stays with the caller.
- Checks asset inflow pause, relevant pool pauses, oracle freshness and peg, and the applicable cap.
- Hub: credits hub reserves and mints DLRS at 1:1 in normalized units.
- Spoke asset: credits the spoke reserve and mints shares proportionally to value added.
- Hub asset into a spoke: credits hub reserves and the spoke's DLRS-side reserve, then mints shares.
  It does not mint wallet DLRS and counts against the spoke cap, not the hub cap.
- A spoke deposit tries the queues that its new liquidity can fill, visiting up to eight older
  same-direction positions per hub-asset line. Unhealthy offered assets are skipped for settlement.
  A hub deposit does not automatically settle queues.

Anyone can deposit for a receiver without its permission; no funds are taken from that receiver.
A receipt balance therefore need not equal that address's own deposits. The receiver must be able to
call `withdraw`, because receipts cannot be transferred to another owner.

Relevant failures include `ZeroAmount`, `InvalidRecipient`, `AssetNotListed`, `WrongPool`, pause/oracle
errors, `SpokeWindingDown`, `LaunchCapExceeded`, `DepositTooSmall`, `PoolFullyImpaired` and unsupported
input-token transfers. See [Errors](/capabilities/errors).

### withdraw

Burn an exact receipt amount for a proportional basket. It pays the caller and is not blocked by
protocol, pool or deposit pause, or by the spoke's `minDlrsReserve` floor.

```solidity
function withdraw(
    uint16 poolId,
    uint256 receiptAmount,
    uint256[] calldata minAmountsOut,
    uint256 deadline
) external returns (address[] memory assets, uint256[] memory amounts);
```

| Parameter | Meaning |
|-----------|---------|
| `poolId` | `0` for the hub, or the spoke being exited |
| `receiptAmount` | DLRS or spoke shares burned from the caller |
| `minAmountsOut` | Empty to accept the calculated payout; otherwise one native minimum per returned asset |
| `deadline` | Unix timestamp; the call reverts after it |

**Returns:** all assets the exit can pay, and each native amount, including zero-amount entries.

- Hub: burns DLRS and divides that normalized amount across hub assets by current reserve weights.
- Spoke: burns shares for a proportional amount of current pool value, split between the spoke asset
  and its hub allocation. The hub portion is distributed across hub assets by reserve weights.
- Asset order is the spoke asset first for a spoke exit, followed by **every hub asset in listing
  order**. A hub exit contains only the hub assets. `getPoolAssets(spokeId)` is not this full exit list.
- Build `minAmountsOut` from `previewWithdraw`'s order. Any nonempty array of a different length
  reverts `MinAmountsLength`; a payout below its native minimum reverts `WithdrawMinNotMet`.
  A newly listed hub asset adds a slot, so an older minimums array fails on length.
- Pool assets whose payout is zero are checked with a zero-value transfer to the caller unless
  governance set `isProbeExempt(asset)`. A failed probe reverts `ExitBlockedByIssuer`. Positive payouts
  use real token transfers, which can also fail under issuer restrictions.

The caller cannot choose an output asset. To end in one token, withdraw and then swap under the swap's
liquidity and queue rules. There is no separate `redeemSpoke` endpoint. This is not ERC-4626.

`previewWithdraw` and `withdraw` use the same rounding calculation. A spoke exit floors total value
once, then splits the two sides; hub amounts are floored by reserve weight and leftover units are
assigned in listing order where reserve remains. The last shares can take both active spoke reserves
to zero when backing and transfers permit the exit.

Relevant failures include expired deadline, insufficient DLRS/shares, zero or sub-unit payout,
insufficient total hub reserves, minimum-array errors and issuer transfer restrictions. A pause does
not promise that an issuer-controlled token will deliver.

### previewWithdraw

Calculate the basket that `withdraw` would pay at the current state:

```solidity
function previewWithdraw(uint16 poolId, uint256 receiptAmount)
    external view returns (address[] memory assets, uint256[] memory amounts);
```

It uses the same ordering, native amounts and rounding as withdrawal. Anyone can preview an amount;
the caller's receipt balance is not checked. A preview above all outstanding DLRS or spoke shares
reverts `InsufficientReceiptShares`, and zero/sub-unit values or insufficient backing can also revert.

A preview does not run token transfers or issuer probes. Simulate the actual exit to test those checks,
and apply minimums to protect the transaction against changes before execution.

## Swap functions

### swapOrQueue

Swap at 1:1 in normalized units, delivering what can fill now and queueing the remainder under the caller.

```solidity
function swapOrQueue(
    address offerAsset,
    address wantAsset,
    uint256 amount,
    uint256 minAmountOut,
    uint256 deadline
) external returns (
    uint256 amountIn,
    uint256 amountOut,
    uint256 amountInQueued,
    uint256 positionId
);
```

| Parameter | Meaning |
|-----------|---------|
| `offerAsset` / `wantAsset` | Listed input and output assets; pair must be hub↔hub or hub↔spoke |
| `amount` | Native offered-token budget |
| `minAmountOut` | Minimum native wanted-token amount delivered immediately |
| `deadline` | Unix timestamp; the call reverts after it |

**Returns:** `amountIn` is native input actually pulled; `amountOut` is native output paid now;
`amountInQueued` is native offered token escrowed, already included in `amountIn`; `positionId` is the
new position ID, or zero if nothing queued. Later queue views/events use normalized amounts instead.

With scaling factors `So` and `Sw`, full instant output is `(amount / So) * Sw`. Use that native value
as the minimum to demand a full immediate fill. Zero permits any immediate amount and queues the rest,
subject to minimum size and queue capacity. There is no tip parameter.

**Fill order:**

1. Match the exact-opposite `(wantAsset → offerAsset)` queue without touching reserves.
2. Visit up to eight older same-direction positions using reserves. Only if that line is then empty
   can the caller's remainder use available route reserves.
3. Escrow the remaining offered token in a new position at the directed queue's tail.

A queue owner's failed payment parks that position rather than converting it into receipts. The
caller owns any new position, receives later fills and is the only address that can cancel it.
There is no separate recipient; routers should normally use a never-queue endpoint.

The operation checks global pause, route validity, offered-asset inflow conditions and spoke pause/status.
It reverts if immediate native output is below the minimum, the queue is full, or the remainder is
below the minimum for a nonempty queue. Input is rounded down; sub-unit dust is not pulled.

### swapExactInput

All-or-nothing execution for wallets, routers and solvers. It fills the rounded input completely or
reverts; it never creates a queued position.

```solidity
function swapExactInput(
    address offerAsset,
    address wantAsset,
    uint256 amount,
    uint256 minAmountOut,
    address recipient,
    uint256 deadline
) external returns (uint256 amountIn, uint256 amountOut);
```

Input comes from the caller; native output goes directly to `recipient`, which cannot be zero or
DollarStore. `amount` is a native input budget and `minAmountOut` is native wanted-token output.
Returns report native input actually pulled and output delivered. Full output is `(amount / So) * Sw`;
sub-unit input remains with the caller.

It follows the same peer matching, inline FIFO settlement, route and inflow checks as `swapOrQueue`.
A partial fill reverts `InsufficientLiquidity`; a native output minimum above what was delivered
reverts `MinAmountNotMet`. All intermediate settlement and parking effects roll back on any revert.

### swapSpokeToSpoke

All-or-nothing spoke-to-spoke execution through the caller's ordered hub-asset list:

```solidity
function swapSpokeToSpoke(
    address offerAsset,
    address wantAsset,
    address[] calldata via,
    uint256 amount,
    address recipient,
    uint256 deadline
) external returns (uint256 amountIn, uint256 amountOut);
```

Both endpoints must be distinct listed spoke assets, and `via` must be nonempty with hub assets.
For each entry, a spoke→hub leg and hub→spoke leg carry what both can fill; unfilled input moves to the
next entry. It never queues. If the list cannot carry all rounded input, the whole call reverts
`InsufficientLiquidity`. Input is native offered token, output native wanted token, and `recipient`
receives it directly. There is no minimum parameter: the full output `(amount / So) * Sw` is required.

The list is used greedily in order, and entries share reserve limits. Another order or a shorter list
can fill when one list does not. Each entry is sized assuming payments to older queued owners succeed;
parking such positions can change the actual outcome. An entry sized at zero skips payouts, and a
later entry, including the same hub asset again, is sized again.

The offered spoke asset must pass inflow checks. A hub `via` failing its inflow check is skipped; the
wanted asset is not price-checked. Spoke route pauses and winding-down rules still apply. Final output
and older queue payments must be deliverable; a revert rolls back the entire transaction.

For a single hub asset, estimate native output with:

```solidity
uint256 hubOutput = dollarStore.getSwapQuote(offerAsset, hubAsset, amount);
uint256 output = dollarStore.getSwapQuote(hubAsset, wantAsset, hubOutput);
```

Equality to full native output indicates enough estimated liquidity assuming payments succeed.
Simulate the actual call with caller and recipient, especially for a list. A direct spoke-pair
`getSwapQuote` returns zero. More routing details are in
[the protocol reference](https://github.com/coasify/dollar/blob/b1668d0835c896e6ec310f51b3598e97cc5e46b0/docs/PROTOCOL.md).

## Queue functions

### cancelQueue

Return the position's original offered-token escrow to its owner. The owner alone can call, including
while paused or after the original spoke is removed.

```solidity
function cancelQueue(uint256 positionId) external;
```

A successful transfer removes the position and emits `QueueCancelled`. If an active position's refund
fails, the transaction parks it and emits `QueueParked`; its offered-token escrow remains. If a parked
position's refund fails again, the call reverts `EscrowTransferFailed`. No receipt is minted in place
of escrow. Retry when the original token can be delivered.

Check events or `isQueuePositionParked`: a successful first cancellation transaction can mean parking,
not a refund. Missing IDs revert `QueuePositionNotFound`; another caller reverts `NotPositionOwner`.

### processQueue

Permissionless reserve settlement of a directed queue in FIFO order, with an explicit visit budget:

```solidity
function processQueue(
    address offerAsset,
    address wantAsset,
    uint256 maxPositions
) external returns (uint256 positionsProcessed, uint256 amountFilled);
```

`positionsProcessed` counts full fills, partial fills and positions parked after a failed payout.
Parked visits count against `maxPositions`; `amountFilled` is the total actually filled in normalized
six-decimal units. Route, global pause and offered-asset inflow checks apply. There is no deadline.

## View functions

### getSwapQuote

Estimate immediate native output for `swapOrQueue` or `swapExactInput`:

```solidity
function getSwapQuote(address offerAsset, address wantAsset, uint256 amount)
    external view returns (uint256);
```

The input is native offered token; the result is native wanted token, capped at
`(amount / So) * Sw`. It counts opposite-queue escrow, then reserves left if up to eight earlier
same-direction positions can be cleared. An existing same-direction queue does not automatically mean
a zero quote.

The result is zero when the route or its pause/inflow checks would fail: global pause, same/unlisted
assets, direct spoke-to-spoke, relevant pool pause, offered-asset deposit pause or unhealthy oracle/peg.
Winding-down blocks spoke→hub, while hub→spoke remains supported unless otherwise paused.

The quote has no caller or recipient and checks no balance, approval or transfer permissions. It
assumes each payment succeeds; a queued owner who cannot be paid can make actual execution fill more
or less. Simulate the intended transaction with its caller and recipient for execution checks, and
allow for state changes before mining.

### getReserves

Pool assets and active reserves, in normalized units. A spoke's internal DLRS-side reserve is separate.

```solidity
function getReserves(uint16 poolId) external view returns (
    address[] memory assets,
    uint256[] memory amounts
);
```

### getReserve

Active reserve of one asset, in normalized units; queue escrow is excluded.

```solidity
function getReserve(uint16 poolId, address asset) external view returns (uint256);
```

### getQueueDepth

```solidity
function getQueueDepth(address offerAsset, address wantAsset) external view returns (uint256);
```

Returns normalized escrow depth on the pair's current pool line. It returns zero if either asset is
not listed, so removed-pool lines are not reported. `getQueueDepth(asset, address(0))` instead reports
that offered asset's parked escrow, whether listed or not.

### getQueuePosition

```solidity
function getQueuePosition(uint256 positionId) external view returns (
    address owner,
    address offerAsset,
    address wantAsset,
    uint256 amount,
    uint256 timestamp,
    uint16 poolId
);
```

Returns zeros for a missing ID. `amount` is remaining normalized escrow, not native input.
`poolId` is the original spoke pool for hub↔spoke or zero for hub↔hub; it remains unchanged on parking
or pool removal. Relisting an asset does not move its old positions into the new pool's queues.

### getUserQueuePositions

```solidity
function getUserQueuePositions(address user) external view returns (uint256[] memory);
```

All position IDs owned by the user, including parked positions.

### isQueuePositionParked

```solidity
function isQueuePositionParked(uint256 positionId) external view returns (bool);
```

Whether the position was lifted out of its directed queue following a failed token payment.
It no longer fills automatically; the owner exits by cancelling when its original token can be paid.

### getMinimumOrderSize

```solidity
function getMinimumOrderSize(address offerAsset, address wantAsset) external view returns (uint256);
```

Current normalized minimum for a queued remainder on the pair's current line. It starts at
`500e6` (500 whole token units) and grows tenfold every 25 active positions. The queue holds at most
150 positions; the minimum is waived only when opening an empty line. Multiply by the offered asset's
scaling factor for a native minimum. An unlisted pair or the parked line returns the base minimum;
the parked line accepts no new orders.

### Registry views

| Function | Returns |
|----------|---------|
| `poolCount()` | Number of allocated pool IDs, including retired pools; ID zero is the hub |
| `getPoolAssets(uint16 poolId)` | Assets registered to the pool; not a spoke's full exit basket |
| `poolKind(uint16 poolId)` | `0` = Hub, `1` = Spoke |
| `getPoolStatus(uint16 poolId)` | `0` = Active, `1` = WindingDown, `2` = Killed |
| `isAssetListed(address asset)` | Whether the asset is currently listed |
| `assetDecimals(address asset)` | Frozen decimals, retained after pool removal; zero if never listed |
| `assetScalingFactor(address asset)` | `10**(decimals - 6)` |
| `assetPoolId(address asset)` | Canonical pool ID; check listing status before routing |
| `assetPriceFeed(address asset)` | Configured Chainlink feed |
| `dlrs()` | DLRS receipt-token address |
| `version()` | Implementation semantic version |

### Spoke views

| Function | Returns |
|----------|---------|
| `getDlrsReserve(uint16 poolId)` | Normalized DLRS-side reserve; zero for the hub |
| `getMinDlrsReserve(uint16 poolId)` | Normalized reserve floor for spoke→hub swaps, not LP exits |
| `getReceiptShares(uint16 poolId, address owner)` | Owner's non-transferable share count |
| `getReceiptTotalShares(uint16 poolId)` | Total outstanding share count |

### Risk views

| Function | Returns |
|----------|---------|
| `isDepositPaused(address asset)` | Whether inflows of this asset are paused |
| `isPoolPaused(uint16 poolId)` | Whether this pool is paused |
| `paused()` | Global pause state |
| `isProbeExempt(address asset)` | Whether zero-payout exit probes are disabled for this asset |
| `pegTolerance()` | Peg tolerance in basis points |
| `maxStaleness()` | Maximum oracle age in seconds |
| `getLaunchCap(uint16 poolId)` | Normalized exposure cap; zero is uncapped |

## Governance functions

The role controls below are separate permissions; a deployment can assign several to one address.
See [Security](/resources/security) and verify deployed holders and timelock settings.

| Role | Functions |
|------|-----------|
| Upgrader | `upgradeToAndCall(address,bytes)`, `transferUpgrader(address)`, `acceptUpgrader()` |
| Governor | `addHubAsset(address,address)`, `createSpoke(address,address,uint256,uint256)`, `setMinDlrsReserve(uint16,uint256)`, `windDownSpoke(uint16)`, `removePool(uint16)`, `setLaunchCap(uint16,uint256)`, `setPriceFeed(address,address)`, `setProbeExempt(address,bool)`, `setPegTolerance(uint256)`, `setMaxStaleness(uint256)`, `syncReserves(uint16,address)`, `rescueTokens(address,address)`, `transferGovernor(address)`, `acceptGovernor()`, `transferGuardian(address)`, `setUnpauser(address)` |
| Guardian | `lowerLaunchCap(uint16,uint256)`, `haircutEscrow(address,uint256)`, `acceptGuardian()` |
| Pauser | `pause()`, `pauseDeposits(address)`, `pausePool(uint16)` |
| Unpauser | `unpause()`, `unpauseDeposits(address)`, `unpausePool(uint16)`, `setPauser(address,bool)` |

The `accept*` functions require the nominated pending holder rather than the current holder.
Read `governor()`, `guardian()`, `upgrader()`, their `pending*` getters, `unpauser()` and
`isPauser(address)`. Governor, guardian and upgrader transfers use nomination and acceptance;
`setUnpauser` directly replaces that role and `setPauser` directly changes permission.

### Pool configuration and recovery

```solidity
function createSpoke(
    address spokeAsset,
    address priceFeed,
    uint256 minDlrsReserve,
    uint256 launchCap
) external returns (uint16 poolId);
```

The governor supplies the normalized reserve floor and launch cap in the creation call; zero cap is
uncapped. Caps are checked on deposits: the hub cap limits DLRS supply, and a spoke cap limits its
spoke reserve plus DLRS-side reserve. `lowerLaunchCap` can only tighten a cap.

`windDownSpoke` stops new spoke liquidity and spoke→hub swaps; LP exits, cancellation and hub→spoke
remain available subject to their other checks. `removePool` requires both active reserves to be zero,
pauses the spoke and unlists its asset; worthless shares and queued/parked escrow can remain.
The killed pool cannot be unpaused, and old positions never fill against a later listing.

`syncReserves` only decreases recorded reserves after actual token balance loss, excluding queue escrow.
`haircutEscrow` is the guardian's bounded, pro-rata escrow reconciliation for an impaired asset while
its pool is paused; it covers queued and parked positions and reverts if the visit budget is too small.
These functions have role restrictions and do not run merely because a market price depegs.

`setProbeExempt` disables zero-payout exit probes for an asset; real transfers still apply the token's
own controls. It is intended for token behavior incompatible with a useful zero-value probe.
