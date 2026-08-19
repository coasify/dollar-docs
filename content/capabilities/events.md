---
sidebar_position: 3
title: Events
description: Events emitted by DollarStore
---

# Events

All amounts named *units* are normalized 6-decimal protocol units; *native* amounts are in the token's
own decimals. Swap and queue events are emitted from the proxy address even though the swap engine runs
in a linked library.

## Core events

### Deposit

Emitted when a user deposits into a pool.

```solidity
event Deposit(
    address indexed user,
    uint16 indexed poolId,
    address indexed asset,
    uint256 nativeAmount,
    uint256 units
);
```

| Parameter | Description |
|-----------|-------------|
| `user` | Address that deposited |
| `poolId` | Pool credited (`0` = hub) |
| `asset` | Asset deposited |
| `nativeAmount` | What was actually pulled, native units (sub-unit dust is not pulled) |
| `units` | Normalized amount credited, and DLRS minted for a hub deposit |

---

### Withdraw

Emitted when a user withdraws from a pool.

```solidity
event Withdraw(
    address indexed user,
    uint16 indexed poolId,
    address indexed asset,
    uint256 units,
    uint256 nativeAmount
);
```

| Parameter | Description |
|-----------|-------------|
| `user` | Address that withdrew |
| `poolId` | Pool debited |
| `asset` | Asset withdrawn |
| `units` | Normalized value withdrawn (DLRS burned on the hub) |
| `nativeAmount` | Native amount sent to the user |

---

## Liquidity provider events

Spoke deposits and withdrawals emit these **instead of** `Deposit` / `Withdraw`.

### SpokeLiquidityAdded

```solidity
event SpokeLiquidityAdded(
    uint16 indexed poolId,
    address indexed provider,
    address indexed asset,
    uint256 nativeAmount,
    uint256 valueUnits,
    uint256 sharesMinted
);
```

`asset` is either the spoke's own asset or a hub asset funding the spoke's DLRS side.

---

### SpokeLiquidityRemoved

```solidity
event SpokeLiquidityRemoved(
    uint16 indexed poolId,
    address indexed provider,
    address indexed asset,
    uint256 sharesBurned,
    uint256 valueUnits,
    uint256 nativeAmount
);
```

---

### SpokeRedeemed

Emitted by `redeemSpoke`, which pays both sides of the pool proportionally.

```solidity
event SpokeRedeemed(
    uint16 indexed poolId,
    address indexed provider,
    uint256 sharesBurned,
    uint256 spokeUnits,
    uint256 dlrsUnits
);
```

---

## Swap events

### Swap

Emitted on any swap, from both `swap` and `swapExactInput`.

```solidity
event Swap(
    address indexed user,
    address indexed offerAsset,
    address indexed wantAsset,
    uint256 amountIn,
    uint256 amountFilled,
    uint256 amountQueued
);
```

| Parameter | Description |
|-----------|-------------|
| `user` | Address that swapped |
| `offerAsset` | Input asset |
| `wantAsset` | Output asset |
| `amountIn` | Total input, normalized units |
| `amountFilled` | Filled instantly |
| `amountQueued` | Escrowed into the queue (always 0 for `swapExactInput`) |

---

## Queue events

### QueueJoined

Emitted when a new queue position is created.

```solidity
event QueueJoined(
    uint256 indexed positionId,
    address indexed owner,
    address offerAsset,
    address wantAsset,
    uint256 amount
);
```

| Parameter | Description |
|-----------|-------------|
| `positionId` | Unique position identifier |
| `owner` | Address that joined |
| `offerAsset` | Asset escrowed by the position |
| `wantAsset` | Asset the position is waiting for |
| `amount` | Escrowed amount, normalized units |

---

### QueueFilled

Emitted when a position receives a fill, full or partial.

```solidity
event QueueFilled(
    uint256 indexed positionId,
    address indexed owner,
    uint256 filled,
    uint256 remaining
);
```

| Parameter | Description |
|-----------|-------------|
| `filled` | Amount filled in this transaction |
| `remaining` | Amount still escrowed (0 if the position closed) |

---

### QueueCancelled

Emitted when a position is cancelled and its escrow returned.

```solidity
event QueueCancelled(
    uint256 indexed positionId,
    address indexed owner,
    uint256 amountReturned
);
```

---

### QueuePositionRefunded

Emitted when paying a position's owner fails—for example a token blacklist—and the escrow is converted
into the canonical receipt instead of bricking the queue: hub escrow becomes reserves plus minted DLRS,
spoke escrow becomes spoke reserves plus receipt shares.

```solidity
event QueuePositionRefunded(
    uint256 indexed positionId,
    address indexed owner,
    address offerAsset,
    uint256 units
);
```

---

## Registry events

### PoolCreated

```solidity
event PoolCreated(uint16 indexed poolId, uint8 kind);
```

`kind`: `0` = Hub, `1` = Spoke. The hub is created at initialization.

---

### AssetListed

```solidity
event AssetListed(
    address indexed asset,
    uint16 indexed poolId,
    uint8 decimals,
    address priceFeed
);
```

Decimals are frozen at listing time.

---

### Spoke lifecycle

```solidity
event MinDlrsReserveSet(uint16 indexed poolId, uint256 oldMin, uint256 newMin);
event SpokeWindDownStarted(uint16 indexed poolId);
event PoolRemoved(uint16 indexed poolId);
```

---

## Admin events

### Risk controls

```solidity
event PriceFeedUpdated(address indexed asset, address indexed feed);
event PegToleranceSet(uint256 tolerance);
event MaxStalenessSet(uint256 staleness);
event DepositsPausedSet(address indexed asset, bool paused);
event PoolPausedSet(uint16 indexed poolId, bool paused);
event LaunchCapSet(uint16 indexed poolId, uint256 cap);
```

`LaunchCapSet` with `cap == 0` means the cap was removed. Global pause emits OpenZeppelin's
`Paused` / `Unpaused`.

---

### Reserve accounting

```solidity
event ReservesSynced(address indexed asset, uint256 previousReserves, uint256 newReserves);
event TokensRescued(address indexed asset, address indexed to, uint256 amount);
event EscrowHaircut(address indexed asset, uint16 indexed poolId, uint256 oldEscrow, uint256 newEscrow);
```

`ReservesSynced` only ever decreases reserves, and marks down DLRS backing—worth alerting on.
`EscrowHaircut` is a guardian emergency action on a balance-impaired asset.

---

### Role transfers

Every role transfer is two-step: an `*Initiated` event when the current holder nominates, and a
`*Completed` event when the nominee accepts.

```solidity
event GovernorTransferInitiated(address indexed currentGovernor, address indexed pendingGovernor);
event GovernorTransferCompleted(address indexed previousGovernor, address indexed newGovernor);
event GuardianTransferInitiated(address indexed currentGuardian, address indexed pendingGuardian);
event GuardianTransferCompleted(address indexed previousGuardian, address indexed newGuardian);
event UpgraderTransferInitiated(address indexed currentUpgrader, address indexed pendingUpgrader);
event UpgraderTransferCompleted(address indexed previousUpgrader, address indexed newUpgrader);
```

Implementation changes emit the standard ERC-1967 `Upgraded(address indexed implementation)`.
