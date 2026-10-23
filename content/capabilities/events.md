---
sidebar_position: 3
title: Events
description: Events emitted by the DollarStore 0.11.0 interface
---

# Events

These event signatures describe the upcoming **0.11.0** interface at
[`ae25d5a`](https://github.com/coasify/dollar/blob/ae25d5a48dcec9f6731773fa0290927d50d638da/src/interfaces/IDollarStore.sol).
Use the ABI for the actual deployment. Protocol events come from the **proxy address**, including
events emitted through linked-library execution.

`Swap` amounts are **native token amounts**. Queue events and `SpokeSwapRouted.amount` use **normalized
six-decimal units**. Receipt-share counts are a separate quantity. Index each field by its documented
unit rather than applying one conversion to every event.

## Core events

### Deposit

A hub deposit: the caller paid, and the receiver owns the resulting DLRS.

```solidity
event Deposit(
    address indexed receiver,
    uint16 indexed poolId,
    address indexed asset,
    address caller,
    uint256 amountIn,
    uint256 receiptAmount
);
```

| Parameter | Meaning |
|-----------|---------|
| `receiver` | Owner of minted DLRS |
| `poolId` | Zero for a hub deposit |
| `asset` | Input token |
| `caller` | Address that supplied the tokens |
| `amountIn` | Native input actually pulled, excluding sub-unit dust |
| `receiptAmount` | DLRS minted, with six decimals |

Spoke deposits emit `SpokeLiquidityAdded` instead of `Deposit`.

### Withdraw

Emitted once per **positive asset payment** in either a hub or a spoke basket withdrawal.

```solidity
event Withdraw(
    address indexed user,
    uint16 indexed poolId,
    address indexed asset,
    uint256 units,
    uint256 nativeAmount
);
```

| Parameter | Meaning |
|-----------|---------|
| `user` | Caller burning receipts and receiving the basket |
| `poolId` | Pool exited, including the spoke ID for its hub-asset payments |
| `asset` | Token paid in this leg |
| `units` | This leg's normalized six-decimal value, not the total receipts burned |
| `nativeAmount` | Native token amount transferred to the user |

Zero payout slots in `withdraw`'s returned arrays do not emit `Withdraw`. Spoke exits additionally emit
the aggregate `SpokeWithdrawn` event.

## Liquidity provider events

### SpokeLiquidityAdded

```solidity
event SpokeLiquidityAdded(
    uint16 indexed poolId,
    address indexed receiver,
    address indexed asset,
    address caller,
    uint256 nativeAmount,
    uint256 valueUnits,
    uint256 sharesMinted
);
```

`caller` paid `nativeAmount`; `receiver` owns `sharesMinted`. `asset` is either the spoke asset or a hub
asset funding its DLRS-side reserve. `valueUnits` is normalized value added; `sharesMinted` is a share
count and need not equal that value after a reserve write-down.

### SpokeWithdrawn

An aggregate record for a spoke basket withdrawal, emitted after its per-asset `Withdraw` events.

```solidity
event SpokeWithdrawn(
    uint16 indexed poolId,
    address indexed provider,
    uint256 sharesBurned,
    uint256 spokeUnits,
    uint256 hubUnits
);
```

`provider` is the withdrawing caller. `sharesBurned` is a share count; `spokeUnits` and `hubUnits` are
normalized six-decimal totals paid from each side. The hub total is distributed across hub tokens.
The 0.11.0 interface has no `SpokeLiquidityRemoved` or `SpokeRedeemed` event.

## Swap events

### Swap

Emitted by `swapOrQueue`, `swapExactInput` and `swapSpokeToSpoke`.

```solidity
event Swap(
    address indexed caller,
    address indexed offerAsset,
    address indexed wantAsset,
    address recipient,
    uint256 amountIn,
    uint256 amountOut,
    uint256 amountInQueued
);
```

| Parameter | Meaning |
|-----------|---------|
| `caller` | Address that supplied the input |
| `recipient` | Address paid now; equals the caller for `swapOrQueue` |
| `amountIn` | Native offered token actually pulled, including queued input |
| `amountOut` | Native wanted token delivered now |
| `amountInQueued` | Native offered token escrowed; part of `amountIn`, zero for the never-queue endpoints |

Later queue fills emit normalized `QueueFilled` values, not another `Swap` for the original user.

### SpokeSwapRouted

```solidity
event SpokeSwapRouted(address indexed user, address indexed via, uint256 amount);
```

`swapSpokeToSpoke` emits one event for each `via` entry that carries part of the swap, followed by one
whole-call `Swap`. `user` is the caller; `via` is the hub asset; `amount` is the routed normalized
six-decimal value. A hub asset appearing in several used list entries can produce several events.

## Queue events

### QueueJoined

```solidity
event QueueJoined(
    uint256 indexed positionId,
    address indexed owner,
    address offerAsset,
    address wantAsset,
    uint256 amount,
    uint16 poolId
);
```

`amount` is normalized offered-token escrow, unlike `swapOrQueue.amountInQueued`, which is native.
`poolId` identifies the line's original pool: the spoke ID for hub↔spoke, zero for hub↔hub. The owner
receives later fills and alone can cancel. Preserve pool identity when indexing removed and relisted
assets; an old position never joins the later pool's queues.

### QueueFilled

```solidity
event QueueFilled(
    uint256 indexed positionId,
    address indexed owner,
    uint256 filled,
    uint256 remaining
);
```

Both amounts use normalized six-decimal units. `filled` is the value paid in this fill; `remaining` is
offered-token escrow still held. Zero remaining closes the position; a partial fill retains FIFO order.

### QueueCancelled

```solidity
event QueueCancelled(
    uint256 indexed positionId,
    address indexed owner,
    uint256 amountReturned
);
```

Confirms the offered token was returned and the position removed. `amountReturned` is normalized;
the actual transfer is this amount multiplied by the offered token's scaling factor.

### QueueParked

```solidity
event QueueParked(
    uint256 indexed positionId,
    address indexed owner,
    address offerAsset,
    uint256 units
);
```

A payment to the owner failed during settlement or its first cancellation. The position was removed
from the active directed line and placed on the offered asset's parked line. `units` is its normalized
escrow, which remains the original offered token. No DLRS or spoke receipt is minted instead.

The owner retries `cancelQueue` when that token can be returned. A failed parked cancellation reverts
`EscrowTransferFailed`, producing no new event. A successful transaction that emits `QueueParked` is
not a refund. The 0.11.0 interface has no `QueuePositionRefunded` event.

## Registry events

### PoolCreated

```solidity
event PoolCreated(uint16 indexed poolId, uint8 kind);
```

`kind` is zero for the hub or one for a spoke. The hub is created during initialization.

### AssetListed

```solidity
event AssetListed(
    address indexed asset,
    uint16 indexed poolId,
    uint8 decimals,
    address priceFeed
);
```

Token decimals are frozen on listing. Monitor current listing/pool status when handling an asset that
was removed and later relisted.

### Spoke lifecycle

```solidity
event MinDlrsReserveSet(uint16 indexed poolId, uint256 oldMin, uint256 newMin);
event SpokeWindDownStarted(uint16 indexed poolId);
event PoolRemoved(uint16 indexed poolId);
```

The reserve floor uses normalized units. `PoolRemoved` marks a killed, paused pool with its assets
unlisted; residual shares or queue positions can remain as described in [Spokes](/concepts/spokes).

## Admin events

### Risk controls

```solidity
event PriceFeedUpdated(address indexed asset, address indexed feed);
event ProbeExemptSet(address indexed asset, bool exempt);
event PegToleranceSet(uint256 tolerance);
event MaxStalenessSet(uint256 staleness);
event DepositsPausedSet(address indexed asset, bool paused);
event PoolPausedSet(uint16 indexed poolId, bool paused);
event LaunchCapSet(uint16 indexed poolId, uint256 cap);
```

Peg tolerance uses basis points, staleness uses seconds, and a cap uses normalized units; zero cap is
uncapped. A probe exemption disables checks for zero-payout exit legs, not controls on real transfers.
Global pause changes emit OpenZeppelin's `Paused(address account)` and `Unpaused(address account)`.

### Reserve accounting

```solidity
event ReservesSynced(address indexed asset, uint256 previousReserves, uint256 newReserves);
event TokensRescued(address indexed asset, address indexed to, uint256 amount);
event EscrowHaircut(address indexed asset, uint16 indexed poolId, uint256 oldEscrow, uint256 newEscrow);
```

`ReservesSynced` only decreases normalized active reserves after actual balance loss. A hub reduction
changes recorded backing; a spoke reduction changes receipt-share value. `TokensRescued.amount` is
native excess token transferred. `EscrowHaircut` reports aggregate normalized escrow before and after
the guardian's eligible reconciliation; refresh both queued and parked positions after it.

### Role changes

Governor, guardian and upgrader transfers use nomination followed by acceptance:

```solidity
event GovernorTransferInitiated(address indexed currentGovernor, address indexed pendingGovernor);
event GovernorTransferCompleted(address indexed previousGovernor, address indexed newGovernor);
event GuardianTransferInitiated(address indexed currentGuardian, address indexed pendingGuardian);
event GuardianTransferCompleted(address indexed previousGuardian, address indexed newGuardian);
event UpgraderTransferInitiated(address indexed currentUpgrader, address indexed pendingUpgrader);
event UpgraderTransferCompleted(address indexed previousUpgrader, address indexed newUpgrader);
```

The governor replaces the unpauser directly, and the unpauser changes pause permissions directly:

```solidity
event UnpauserSet(address indexed previousUnpauser, address indexed newUnpauser);
event PauserSet(address indexed account, bool allowed);
```

Implementation changes emit the standard ERC-1967 `Upgraded(address indexed implementation)`.
See [Security](/resources/security) for role powers and deployment configuration.
