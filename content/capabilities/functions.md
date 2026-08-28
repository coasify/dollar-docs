---
sidebar_position: 2
title: Functions
description: Complete function reference for DollarStore
---

# Functions

All amounts marked *native* are in the token's own decimals. All amounts marked *units* are in
normalized 6-decimal protocol units. See [Overview](/capabilities/overview#units).

## Core functions

### deposit

Supply liquidity to a pool. On the hub this mints DLRS 1:1; on a spoke it mints non-transferable
receipt shares.

```solidity
function deposit(
    uint16 poolId,
    address asset,
    uint256 amount,
    uint256 deadline
) external returns (uint256 receiptUnits)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `poolId` | uint16 | `0` for the hub, `>= 1` for a spoke |
| `asset` | address | Listed asset to supply (native units) |
| `amount` | uint256 | Amount to supply, native units |
| `deadline` | uint256 | Unix timestamp after which the call reverts |

**Returns:** DLRS minted (hub), or receipt shares credited (spoke), in normalized units

**Effects:**
- Checks the asset is on peg, its feed is fresh, and neither the asset nor the pool is deposit-paused
- Pulls exactly `units * scalingFactor`; sub-unit dust stays with the caller
- Enforces the pool's launch cap, if one is set
- Hub: credits hub reserves and mints DLRS 1:1
- Spoke, own asset: credits the spoke reserve and mints shares pro-rata
- Spoke, hub asset: credits hub reserves and the spoke's DLRS-side reserve, and mints shares pro-rata
- A spoke deposit also settles the queues the new liquidity can now fill, FIFO, up to 8 positions each

**Reverts if:** deadline passed, amount rounds to zero units, asset not listed, asset does not belong to
`poolId`, the pool is paused or winding down, the asset is deposit-paused or off peg, the launch cap
would be exceeded, or the token charges a transfer fee

---

### withdraw

Take liquidity out of a pool. Exit path — **not** blocked by pause.

```solidity
function withdraw(
    uint16 poolId,
    address asset,
    uint256 units,
    uint256 deadline
) external returns (uint256 nativeAmountOut)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `poolId` | uint16 | `0` for the hub, `>= 1` for a spoke |
| `asset` | address | Asset to receive |
| `units` | uint256 | Hub: DLRS to burn. Spoke: receipt shares to burn |
| `deadline` | uint256 | Unix timestamp after which the call reverts |

**Returns:** Native amount sent to the caller

**Effects:**
- Hub: burns `units` DLRS and sends the chosen hub asset 1:1
- Spoke, paid in the spoke asset: burns shares and pays the pro-rata value from that spoke's reserve
- Spoke, paid in a hub asset: burns shares and pays out of hub reserves, consuming the spoke's DLRS-side
  reserve. The pool's `minDlrsReserve` floor does **not** gate LP exits

**Reverts if:** deadline passed, `units` is 0, asset not listed or in the wrong pool, reserves cannot
cover the amount, or the caller holds too few DLRS / receipt shares

---

### redeemSpoke

Proportional spoke exit: pays the pro-rata slice of **both** sides of the pool in one call, so a
departing LP is not left with dust stranded on one side. Exit path — not blocked by pause, not gated by
`minDlrsReserve`.

```solidity
function redeemSpoke(
    uint16 poolId,
    uint256 shares,
    uint256 deadline
) external returns (uint256 spokeUnits, uint256 dlrsUnits)
```

**Returns:** value paid from the spoke reserve, and value paid from the DLRS side across hub assets,
both in normalized units

Burning the last shares drains both reserves to exactly zero, which is what allows a fully-exited spoke
to be removed by the governor.

---

## Swap functions

### swap

Swap one asset for another 1:1. Fills from the exact-opposite queue first, then protocol reserves, then
queues whatever is left.

```solidity
function swap(
    address offerAsset,
    address wantAsset,
    uint256 amount,
    uint256 minAmountOut,
    uint256 tip,
    uint256 deadline
) external returns (uint256 amountFilled, uint256 amountQueued)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `offerAsset` | address | Input asset |
| `wantAsset` | address | Output asset |
| `amount` | uint256 | Amount to swap, native units of `offerAsset` |
| `minAmountOut` | uint256 | Minimum that must be filled **instantly**, normalized 6dp. Set equal to the normalized `amount` to require a full instant fill |
| `tip` | uint256 | Reserved for priority queues. **Must be 0** |
| `deadline` | uint256 | Unix timestamp after which the call reverts |

**Returns:**
- `amountFilled`: filled instantly, normalized units
- `amountQueued`: escrowed into the queue, normalized units

**Fill order:**
1. The exact-opposite `(wantAsset → offerAsset)` queue — a peer match that touches no reserves
2. Protocol reserves, but only after settling the same-direction queue ahead of the caller, and only if
   that queue is then empty
3. The remainder is escrowed as a new position at the tail of the `(offerAsset → wantAsset)` queue

**Reverts if:** deadline passed, `tip != 0`, same asset, unsupported route, an asset is not listed, the
offer asset is deposit-paused or off peg, a spoke involved is paused (or winding down, for spoke → hub),
`amountFilled < minAmountOut`, the queue is full, or the queued remainder is below the minimum order size

---

### swapExactInput

Router/solver endpoint. Never queues—either fully executes or reverts.

```solidity
function swapExactInput(
    address offerAsset,
    address wantAsset,
    uint256 amount,
    uint256 minAmountOut,
    uint256 deadline
) external returns (uint256 amountOut)
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `offerAsset` | address | Input asset |
| `wantAsset` | address | Output asset |
| `amount` | uint256 | Exact input amount, native units |
| `minAmountOut` | uint256 | Floor on the filled amount, **normalized 6dp** — same convention as `swap` |
| `deadline` | uint256 | Unix timestamp after which the call reverts |

**Returns:** output amount in native units of `wantAsset`

Output is sent to `msg.sender`; there is no `recipient` parameter. A router receives the tokens and
forwards them itself.

**Reverts if:** deadline passed, the full amount cannot be filled instantly (`InsufficientLiquidity`),
`filled < minAmountOut`, or any of the route/peg/pause validations fail

---

## Queue functions

### cancelQueue

Cancel a queue position and get the escrowed offer asset back. Exit path — not blocked by pause.

```solidity
function cancelQueue(uint256 positionId) external
```

**Reverts if:** the position does not exist, or the caller does not own it

If the token transfer back to the owner fails (for example a blacklist), the escrow is converted into
the canonical receipt instead of reverting — DLRS on the hub, receipt shares on a spoke — and
`QueuePositionRefunded` is emitted.

---

### processQueue

Permissionless. Settle a directed queue from available reserves in FIFO order, bounded by an explicit
position budget.

```solidity
function processQueue(
    address offerAsset,
    address wantAsset,
    uint256 maxPositions
) external returns (uint256 positionsProcessed, uint256 amountFilled)
```

**Returns:** positions filled or partially filled, and the total filled in normalized units

Anyone can call this to push a queue along—useful for keepers, and for clearing a queue that is blocking
instant liquidity on its route.

---

## View functions

### getSwapQuote

Instantly fillable amount for a swap. Used by aggregators to check fillability.

```solidity
function getSwapQuote(
    address offerAsset,
    address wantAsset,
    uint256 amount
) external view returns (uint256)
```

**Returns:** the fillable amount in **native units of `wantAsset`**, capped at `amount`. Returns `0` if
the route is unsupported (same asset, unlisted, spoke → spoke, paused or winding-down spoke), or if a
same-direction queue already exists — under FIFO that queue owns the instant liquidity.

Instant liquidity is the opposite queue's escrow plus the route-aware protocol reserves. It can be less
than `amount`, so compare against what you need rather than testing for non-zero.

---

### getReserves

All assets in a pool and their reserves, in normalized units.

```solidity
function getReserves(uint16 poolId) external view returns (
    address[] memory assets,
    uint256[] memory amounts
)
```

---

### getReserve

Reserve of a single asset in a pool, normalized units.

```solidity
function getReserve(uint16 poolId, address asset) external view returns (uint256)
```

---

### getQueueDepth

Total escrowed depth of a directed queue, normalized units.

```solidity
function getQueueDepth(address offerAsset, address wantAsset) external view returns (uint256)
```

---

### getQueuePosition

Details of a queue position. Returns zeros if it does not exist.

```solidity
function getQueuePosition(uint256 positionId) external view returns (
    address owner,
    address offerAsset,
    address wantAsset,
    uint256 amount,
    uint256 timestamp
)
```

---

### getUserQueuePositions

All position ids owned by a user.

```solidity
function getUserQueuePositions(address user) external view returns (uint256[] memory)
```

---

### getMinimumOrderSize

Current minimum size to queue into a directed queue, normalized units. Starts at 500 and grows 10x every
25 positions in that queue.

```solidity
function getMinimumOrderSize(address offerAsset, address wantAsset) external view returns (uint256)
```

The minimum is waived for the first position of an empty queue.

---

### Registry views

| Function | Returns |
|----------|---------|
| `poolCount()` | Number of pools; index 0 is the hub |
| `getPoolAssets(uint16 poolId)` | Assets belonging to a pool |
| `poolKind(uint16 poolId)` | `0` = Hub, `1` = Spoke |
| `getPoolStatus(uint16 poolId)` | `0` = Active, `1` = WindingDown, `2` = Killed |
| `isAssetListed(address asset)` | Whether the asset is supported |
| `assetDecimals(address asset)` | Decimals frozen at listing |
| `assetScalingFactor(address asset)` | `10**(decimals - 6)` |
| `assetPoolId(address asset)` | The pool the asset belongs to |
| `assetPriceFeed(address asset)` | Chainlink feed for the asset |
| `dlrs()` | DLRS token address |
| `version()` | Semantic version of the implementation |

### Spoke views

| Function | Returns |
|----------|---------|
| `getDlrsReserve(uint16 poolId)` | The spoke's DLRS-side reserve, normalized |
| `getMinDlrsReserve(uint16 poolId)` | Protected minimum on that reserve |
| `getReceiptShares(uint16 poolId, address owner)` | An LP's receipt-share balance |
| `getReceiptTotalShares(uint16 poolId)` | Total outstanding shares in the pool |

### Risk views

| Function | Returns |
|----------|---------|
| `isDepositPaused(address asset)` | Whether inflows of the asset are paused |
| `isPoolPaused(uint16 poolId)` | Whether the pool is paused |
| `paused()` | Whether the protocol is globally paused |
| `pegTolerance()` | Peg tolerance in basis points |
| `maxStaleness()` | Max oracle staleness in seconds |
| `getLaunchCap(uint16 poolId)` | Pool exposure cap; `0` means uncapped |

---

## Governance functions

Not callable by integrators, but worth monitoring. See [Security](/resources/security) for the trust
model behind each role.

| Role | Functions |
|------|-----------|
| `upgrader` (timelock) | `upgradeToAndCall`, `transferUpgrader` / `acceptUpgrader` |
| `governor` (timelock) | `addHubAsset`, `createSpoke`, `setMinDlrsReserve`, `windDownSpoke`, `removePool`, `setLaunchCap`, `setPriceFeed`, `setPegTolerance`, `setMaxStaleness`, `syncReserves`, `rescueTokens`, `transferGovernor` / `acceptGovernor`, `transferGuardian` |
| `guardian` (Safe, instant) | `pause` / `unpause`, `pauseDeposits` / `unpauseDeposits`, `pausePool` / `unpausePool`, `lowerLaunchCap`, `adminCancelQueue`, `haircutEscrow`, `acceptGuardian` |

Read the current holders with `upgrader()`, `governor()`, `guardian()` and their `pending*`
counterparts—every role transfer is two-step.
