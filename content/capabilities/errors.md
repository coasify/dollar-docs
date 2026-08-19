---
sidebar_position: 4
title: Errors
description: Error conditions and how to handle them
---

# Errors

The DollarStore protocol uses custom errors for gas-efficient reverts with clear failure reasons.

## Validation errors

### ZeroAmount

```solidity
error ZeroAmount();
```

The amount was 0, or it rounded down to zero normalized units. An asset with more than 6 decimals needs
at least `10**(decimals - 6)` native units to register.

---

### ZeroAddress

```solidity
error ZeroAddress();
```

An address parameter was the zero address.

---

### DeadlineExpired

```solidity
error DeadlineExpired(uint256 deadline, uint256 timestamp);
```

The deadline had already passed. Every state-changing user entrypoint takes one.

---

### AssetNotListed

```solidity
error AssetNotListed(address asset);
```

The asset is not listed. Check `isAssetListed()` before calling.

---

### WrongPool

```solidity
error WrongPool(address asset, uint16 poolId);
```

The asset does not belong to the pool you passed. An asset belongs to exactly one pool—read it with
`assetPoolId()`. A hub asset is valid on a spoke deposit only when it is funding that spoke's DLRS side.

---

### InvalidPool

```solidity
error InvalidPool(uint16 poolId);
```

No pool exists with that id. Valid ids are `0` to `poolCount() - 1`.

---

## Route errors

### SameAsset

```solidity
error SameAsset();
```

A swap was attempted with the same input and output asset.

---

### InvalidRoute

```solidity
error InvalidRoute(address offerAsset, address wantAsset);
```

The route is not supported on-chain. In practice this means **spoke → spoke**: route it as two legs
through a hub asset instead.

---

### TipNotEnabled

```solidity
error TipNotEnabled();
```

A non-zero `tip` was passed to `swap`. Priority queues are a post-launch upgrade; pass `0`.

---

## Reserve and liquidity errors

### InsufficientReserves

```solidity
error InsufficientReserves(address asset, uint256 requested, uint256 available);
```

The pool's reserves cannot cover a withdrawal. Check `getReserve()` first, or withdraw a different asset
that does have reserves.

---

### InsufficientLiquidity

```solidity
error InsufficientLiquidity(uint256 filled, uint256 requested);
```

`swapExactInput` could not fill the full amount instantly. This function never queues—it either fully
executes or reverts.

**For aggregators:** check that `getSwapQuote()` covers the amount you need before calling. Note the
quote can go stale within a block.

---

### MinAmountNotMet

```solidity
error MinAmountNotMet(uint256 filled, uint256 required);
```

The instantly-filled amount was below `minAmountOut`. Remember `minAmountOut` is in **normalized 6dp
units**, not the output token's native decimals—in both `swap` and `swapExactInput`.

---

### InsufficientReceiptShares

```solidity
error InsufficientReceiptShares(uint256 requested, uint256 available);
```

The caller does not hold enough spoke receipt shares. Read the balance with `getReceiptShares()`.

---

### DepositTooSmall

```solidity
error DepositTooSmall();
```

A spoke deposit was too small to mint a whole receipt share at the pool's current share price. Raised by
the share math, not by the main interface. Deposit more, rather than donating the value to existing LPs.

---

### FeeOnTransferNotSupported

```solidity
error FeeOnTransferNotSupported(address asset);
```

The token delivered less than was pulled. Fee-on-transfer and other non-standard tokens are unsupported.

---

## Queue errors

### QueueFull

```solidity
error QueueFull(address offerAsset, address wantAsset);
```

The directed queue has reached its maximum of 150 positions. Wait for positions to be filled, or call
`processQueue` to push it along.

---

### OrderTooSmall

```solidity
error OrderTooSmall(uint256 provided, uint256 minimum);
```

The queued remainder is below the minimum order size for that queue's current depth. Check
`getMinimumOrderSize()`. The minimum is waived only for the first position of an empty queue.

---

### QueuePositionNotFound

```solidity
error QueuePositionNotFound(uint256 positionId);
```

The position id does not exist—never created, or already filled or cancelled.

---

### NotPositionOwner

```solidity
error NotPositionOwner(uint256 positionId, address caller);
```

The caller tried to cancel a position they do not own.

---

## Risk control errors

Inflows—deposits, swaps, and queue settlements—are gated on the offer asset being unpaused, on peg, and
backed by a fresh oracle round. Exits are not.

### DepositsPaused

```solidity
error DepositsPaused(address asset);
```

The guardian has paused inflows of this asset. Withdrawals and cancellations still work.

---

### PoolPaused

```solidity
error PoolPaused(uint16 poolId);
```

The pool is paused. Also raised when a swap touches a paused spoke. Exits stay open.

---

### Oracle errors

| Error | Meaning |
|-------|---------|
| `NoPriceFeed(address asset)` | No feed configured for the asset |
| `InvalidPrice(address asset)` | The oracle returned a non-positive price |
| `StaleRound(address asset)` | The round was answered in an earlier round |
| `PriceStale(address asset, uint256 updatedAt)` | The answer is older than `maxStaleness()` |
| `PriceOutOfBounds(address asset, uint256 price, uint256 lower, uint256 upper)` | The price is outside the peg tolerance band |

A depegged or stale asset can still be withdrawn—only inflows are blocked.

---

### LaunchCapExceeded

```solidity
error LaunchCapExceeded(uint16 poolId, uint256 attempted, uint256 cap);
```

The deposit would push the pool's exposure above its launch cap. Read the cap with `getLaunchCap()`;
`0` means uncapped.

---

### SpokeWindingDown

```solidity
error SpokeWindingDown(uint16 poolId);
```

The spoke is winding down: new liquidity and risk-increasing spoke → hub swaps are blocked. LP exits,
cancellations, and hub → spoke swaps stay live.

---

## Governance errors

Raised by admin paths. Integrators do not hit these, but they are listed for completeness.

| Error | Raised when |
|-------|-------------|
| `OnlyGovernor()` / `OnlyGuardian()` / `OnlyUpgrader()` | Caller does not hold the role |
| `OnlyPendingGovernor()` / `OnlyPendingGuardian()` / `OnlyPendingUpgrader()` | Only the nominee can accept a role transfer |
| `AssetAlreadyListed(address asset)` | The asset is already listed in some pool |
| `MaxPoolsReached()` | The poolId space is exhausted |
| `PoolNotSpoke(uint16 poolId)` | A spoke-only operation was aimed at the hub |
| `PoolNotEmpty(uint16 poolId)` | A spoke still holds reserves, shares, or queued depth and cannot be removed |
| `InvalidTolerance()` / `InvalidStaleness()` | Risk parameter outside its allowed range |
| `CapNotStricter()` | The guardian's new cap does not tighten the current one |
| `ReservesNotDrifted(address asset)` | Nothing to sync—reserves match the balance |
| `NoExcessTokens(address asset)` | Nothing unaccounted to rescue |
| `EscrowImpaired(address asset)` / `AssetNotImpaired(address asset)` | Balance-impairment state does not match the path taken |
| `NoEscrowToHaircut(address asset)` / `HaircutBudgetExceeded()` / `PoolNotPaused(uint16 poolId)` | Preconditions of the guardian escrow haircut |
| `NotEnabled()` | The operation is not enabled in this version |
| `UnsupportedDecimals(uint8 decimals)` | Asset decimals outside `[6, 18]`, or a feed reporting more than 18 |

---

## Token errors

### NonTransferable

```solidity
error NonTransferable();
```

DLRS is soulbound. Raised by `transfer()`, `transferFrom()` and `approve()` on the DLRS contract. Spoke
receipt shares are likewise non-transferable, and are not an ERC-20 at all—they are tracked inside the
protocol and read with `getReceiptShares()`.

---

## Handling errors

### In Solidity

```solidity
try dollarStore.swapExactInput(offerAsset, wantAsset, amount, minUnits, deadline)
    returns (uint256 amountOut)
{
    // Success
} catch (bytes memory reason) {
    // Decode and handle specific errors
}
```

### In viem

Custom errors are decoded automatically against the ABI:

```typescript
import { ContractFunctionRevertedError } from 'viem'

try {
  await publicClient.simulateContract({
    address: dollarStore,
    abi,
    functionName: 'swapExactInput',
    args: [offerAsset, wantAsset, amount, minUnits, deadline],
  })
} catch (error) {
  const revert = error.walk(e => e instanceof ContractFunctionRevertedError)
  if (revert?.data?.errorName === 'InsufficientLiquidity') {
    const [filled, requested] = revert.data.args
    // Not enough instant liquidity — route elsewhere
  }
}
```

Simulating before sending is the cheapest way to surface these: every validation above runs in the same
call, so a successful simulation in the current block tells you the route, peg, pause and liquidity
checks all pass.
