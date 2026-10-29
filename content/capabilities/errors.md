---
sidebar_position: 4
title: Errors
description: Error conditions and handling for the DollarStore 1.0.0 interface
---

# Errors

These protocol errors describe the **1.0.0** interface at
[`b1668d0`](https://github.com/coasify/dollar/blob/b1668d0835c896e6ec310f51b3598e97cc5e46b0/src/interfaces/IDollarStore.sol).
Use the matching deployment ABI. Token, OpenZeppelin and oracle calls can also propagate errors;
the protocol's custom errors are not the only possible revert data.

## Validation errors

### ZeroAmount

```solidity
error ZeroAmount();
```

Input was zero or below one normalized unit, or a spoke withdrawal rounds to zero value after
impairment. A token with more than six decimals needs at least `10**(decimals - 6)` native input units.

### ZeroAddress

```solidity
error ZeroAddress();
```

A configuration address required to be nonzero was zero. Deposit receivers and swap recipients use
`InvalidRecipient` instead.

### InvalidRecipient

```solidity
error InvalidRecipient(address recipient);
```

A deposit receiver or all-or-nothing swap recipient was zero or DollarStore itself. Choose a receiver
that can call `withdraw` for its non-transferable receipts, or a recipient able to receive the token.

### DeadlineExpired

```solidity
error DeadlineExpired(uint256 deadline, uint256 timestamp);
```

Execution occurred after the supplied Unix timestamp. Deposits, withdrawals and swaps require a
deadline; queue cancellation and processing do not.

### AssetNotListed

```solidity
error AssetNotListed(address asset);
```

The path requires a currently listed asset. Check `isAssetListed` and deployment configuration.
Cancelling an old position can remain possible after its asset is unlisted.

### WrongPool

```solidity
error WrongPool(address asset, uint16 poolId);
```

The asset is not valid for the supplied pool. A hub asset may fund a spoke's DLRS-side reserve;
another spoke's asset may not. Check `assetPoolId` and current listing status.

### InvalidPool

```solidity
error InvalidPool(uint16 poolId);
```

No pool has this ID. Allocated IDs range from zero to `poolCount() - 1`, including retired pools;
also check `getPoolStatus` for a spoke's lifecycle state.

## Route errors

### SameAsset

```solidity
error SameAsset();
```

The offered and wanted asset are identical.

### InvalidRoute

```solidity
error InvalidRoute(address offerAsset, address wantAsset);
```

The chosen endpoint cannot use this pair. `swapOrQueue` and `swapExactInput` reject spoke-to-spoke;
use `swapSpokeToSpoke` with an ordered, nonempty hub-asset `via` list. Its endpoints must be spoke
assets and every `via` entry must form valid spoke→hub and hub→spoke legs.

There is no `tip` argument or `TipNotEnabled` error in this interface.

## Reserve and liquidity errors

### InsufficientReserves

```solidity
error InsufficientReserves(address asset, uint256 requested, uint256 available);
```

The hub's total reserves cannot cover the hub-dollar portion of a withdrawal or preview after a
reserve write-down. `requested` and `available` use normalized six-decimal units; `asset` identifies
the exited pool, not a token the caller selected. A basket exit cannot be repaired by choosing a
different withdrawal asset. Read the current preview and backing state before retrying.

### InsufficientLiquidity

```solidity
error InsufficientLiquidity(
    address wantAsset,
    uint256 fillableAmountOut,
    uint256 requestedAmountOut
);
```

An all-or-nothing `swapExactInput` or `swapSpokeToSpoke` could not deliver full output. Both amounts
use **native `wantAsset` decimals**. `requestedAmountOut` is `(amount / offerScaling) * wantScaling`.

`fillableAmountOut` reports progress accounted by this attempted execution before the whole call
reverted. It is not a maximum-liquidity quote or a promise that a smaller retry will fill. Simulate the
specific retry; a routed swap may need another `via` list or order. Quotes assume token payments
succeed and state may change before execution.

### MinAmountNotMet

```solidity
error MinAmountNotMet(address wantAsset, uint256 amountOut, uint256 minAmountOut);
```

Immediate output was below the minimum in `swapOrQueue` or `swapExactInput`. Both amounts are **native
wanted-token values**, not six-decimal accounting units. The entire transaction reverts, including
any queue changes.

### InsufficientReceiptShares

```solidity
error InsufficientReceiptShares(uint256 requested, uint256 available);
```

A spoke withdrawal exceeds the caller's shares, or a preview asks for more than all outstanding DLRS
or shares. `previewWithdraw` does not check the caller's own balance. A real hub withdrawal with too
few DLRS instead receives the receipt token's `ERC20InsufficientBalance` error.

### DepositTooSmall

```solidity
error DepositTooSmall();
```

The share calculation would mint zero shares for a spoke deposit. The call reverts instead of
donating value to existing LPs; increase the deposit if appropriate.

### PoolFullyImpaired

```solidity
error PoolFullyImpaired();
```

A spoke has outstanding shares but zero recorded pool value. New deposits are rejected instead of
being allocated to those old shares. Governance can retire a spoke with zero active reserves and
relist its asset in a fresh pool, subject to listing checks and escrow coverage. `DepositTooSmall`
and this error come from the share library.

### FeeOnTransferNotSupported

```solidity
error FeeOnTransferNotSupported(address asset);
```

The native input delivered was less than the amount pulled. Fee-on-transfer and other incompatible
input tokens are unsupported.

## Withdrawal protection errors

### MinAmountsLength

```solidity
error MinAmountsLength(uint256 provided, uint256 expected);
```

`minAmountsOut` was nonempty but did not have one entry per withdrawal asset. Use `previewWithdraw`'s
returned order, including zero payout slots; a new hub listing adds a slot. An empty array accepts the
calculated basket without per-asset minimums.

### WithdrawMinNotMet

```solidity
error WithdrawMinNotMet(address asset, uint256 amount, uint256 minimum);
```

One basket leg is below its specified minimum. Both amounts use native decimals of `asset`.
Refresh the preview and inspect reserve composition before changing the minimum.

### ExitBlockedByIssuer

```solidity
error ExitBlockedByIssuer(address asset, address wallet);
```

A zero-value transfer probe of an unpaid basket asset failed for this wallet. The whole exit reverts.
A successful preview does not run these probes. Governance may exempt tokens whose behavior makes
the probe unsuitable; an exemption does not disable the token's own controls on real payments.
Failures on positive payments can instead propagate token or `SafeERC20` errors.

## Queue errors

### QueueFull

```solidity
error QueueFull(address offerAsset, address wantAsset);
```

The active directed line already has 150 positions. Wait for fills/cancellations or call
`processQueue` where reserve settlement is possible. Parked positions sit outside that active line.

### OrderTooSmall

```solidity
error OrderTooSmall(uint256 providedUnits, uint256 minimumUnits);
```

The queued remainder is below the line's normalized minimum. `getMinimumOrderSize` returns normalized
units starting at `500e6`; multiply by offered-token scaling for native input. The minimum is waived
only for the first position of an empty line. The whole swap reverts when the remainder fails it.

### QueuePositionNotFound

```solidity
error QueuePositionNotFound(uint256 positionId);
```

The position was never created or has already been removed by full fill, successful cancellation or
an escrow haircut that rounded it to zero. Parking alone does not remove the owner's position.

### NotPositionOwner

```solidity
error NotPositionOwner(uint256 positionId, address caller);
```

Only the position owner can cancel. For `swapOrQueue`, that owner is its caller, including a router
that submits the call on someone else's behalf.

### EscrowTransferFailed

```solidity
error EscrowTransferFailed(uint256 positionId);
```

An already parked position's original offered token still could not be returned to its owner.
Retry when the token can be paid. The first failed cancellation of an active position instead succeeds
by parking it and emitting `QueueParked`; neither path converts escrow to DLRS or shares.

## Risk control errors

Inflows check the offered asset's pause, pool pause, peg and oracle freshness. Withdrawals and
cancellations bypass protocol pause and price checks, but token transfer restrictions still apply.

### DepositsPaused

```solidity
error DepositsPaused(address asset);
```

A permitted pauser has stopped this asset's inflows. It can still be an output where the route allows;
unpausing is restricted to the unpauser.

### PoolPaused

```solidity
error PoolPaused(uint16 poolId);
```

The operation requires an unpaused pool. An offered hub asset is checked against the hub's inflow
pause, and a swap involving a spoke also checks that spoke's pause. Global pause uses OpenZeppelin's
`EnforcedPause` instead. See [Security](/resources/security) for the distinct pause scopes.

### Oracle errors

| Error | Meaning |
|-------|---------|
| `NoPriceFeed(address asset)` | No feed configured |
| `InvalidPrice(address asset)` | Non-positive oracle answer |
| `StaleRound(address asset)` | Answer belongs to an earlier round |
| `PriceStale(address asset, uint256 updatedAt)` | Answer is older than `maxStaleness()` or has a future timestamp |
| `PriceOutOfBounds(address asset, uint256 price, uint256 lower, uint256 upper)` | Price outside the peg band; prices/bounds use 18-decimal oracle normalization |

An off-peg or stale asset is not price-blocked as an output or on withdrawal. A failed oracle call can
also propagate its own revert; the quote returns zero for an unusable offered-asset feed.

### LaunchCapExceeded

```solidity
error LaunchCapExceeded(uint16 poolId, uint256 attempted, uint256 cap);
```

A deposit exceeds the pool's normalized cap; zero cap means uncapped. The hub cap tracks DLRS supply.
A spoke cap tracks spoke-asset reserve plus DLRS-side reserve, including hub assets funding that spoke.

### SpokeWindingDown

```solidity
error SpokeWindingDown(uint16 poolId);
```

New spoke deposits and risk-increasing spoke→hub swaps are blocked. LP exits, cancellations and
hub→spoke swaps remain available subject to their other checks. A routed spoke-to-spoke swap includes
a spoke→hub leg and must respect its offered spoke's lifecycle state.

### PoolKilled

```solidity
error PoolKilled(uint16 poolId);
```

A retired spoke cannot be removed again or unpaused. Old queued/parked positions remain cancellable
but never fill against a fresh listing of its asset.

## Governance errors

| Error | Meaning |
|-------|---------|
| `OnlyGovernor()` / `OnlyGuardian()` / `OnlyUpgrader()` | Caller lacks the required role |
| `OnlyPauser()` / `OnlyUnpauser()` | Caller lacks permission for the requested pause-management action |
| `OnlyPendingGovernor()` / `OnlyPendingGuardian()` / `OnlyPendingUpgrader()` | Only the nominee may accept that role |
| `AssetAlreadyListed(address asset)` | Asset is currently listed in a pool |
| `MaxPoolsReached()` | Pool ID space is exhausted |
| `PoolNotSpoke(uint16 poolId)` | A spoke-only operation targeted a non-spoke pool |
| `PoolNotEmpty(uint16 poolId)` | Spoke-asset reserve or DLRS-side reserve is nonzero; residual shares/escrow alone do not prevent removal |
| `InvalidTolerance()` / `InvalidStaleness()` | Risk parameter outside the allowed range |
| `CapNotStricter()` | Guardian cap change would not tighten the current cap |
| `ReservesNotDrifted(address asset)` | Actual balance covers recorded reserves plus escrow; no downward sync is available |
| `NoExcessTokens(address asset)` | No unaccounted token balance to rescue |
| `EscrowImpaired(address asset)` | Actual token balance is below accounted queue escrow |
| `AssetNotImpaired(address asset)` | Balance covers reserves plus escrow, so no impairment haircut is available |
| `NoEscrowToHaircut(address asset)` | No offered-token escrow remains for this asset |
| `HaircutBudgetExceeded()` | Haircut needs more position visits; the whole call reverted |
| `PoolNotPaused(uint16 poolId)` | Haircut requires the asset's pool to be paused |
| `UnsupportedDecimals(uint8 decimals)` | Token decimals outside `[6, 18]`, or feed decimals above 18 |

There is no `adminCancelQueue` entrypoint or `NotEnabled` placeholder in this interface.

## Token and inherited errors

### NonTransferable

```solidity
error NonTransferable();
```

DLRS rejects `transfer`, `transferFrom` and `approve`. Spoke receipts are also non-transferable but are
internal share balances, not ERC-20 tokens; read them with `getReceiptShares`.

Other useful failures include:

- `ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)` from DLRS on an oversized
  hub withdrawal, and token balance/allowance errors on input pulls.
- `SafeERC20FailedOperation(address token)` or issuer-specific errors when a token operation fails.
- `EnforcedPause()` for globally paused inflows and `ExpectedPause()` for an invalid unpause action.
- `ReentrancyGuardReentrantCall()` for reentry, plus standard initialization/UUPS errors on deployment
  and upgrade paths.

## Handling errors

### In Solidity

```solidity
try dollarStore.swapExactInput(
    offerAsset, wantAsset, budget, minNativeOutput, recipient, deadline
) returns (uint256 amountIn, uint256 amountOut) {
    // Native input consumed and native output delivered.
} catch (bytes memory reason) {
    // Decode the matching protocol, token or library error.
}
```

### In viem

Include the current error signatures in `abi`, and simulate with the actual caller and recipient:

```typescript
import { BaseError, ContractFunctionRevertedError } from 'viem'

try {
  await publicClient.simulateContract({
    account,
    address: dollarStore,
    abi,
    functionName: 'swapExactInput',
    args: [offerAsset, wantAsset, budget, minNativeOutput, recipient, deadline],
  })
} catch (error) {
  if (error instanceof BaseError) {
    const revert = error.walk(e => e instanceof ContractFunctionRevertedError)
    if (revert instanceof ContractFunctionRevertedError &&
        revert.data?.errorName === 'InsufficientLiquidity') {
      const [wantAsset, fillableAmountOut, requestedAmountOut] = revert.data.args
      // Both values are native wantAsset. Simulate a specific alternative route.
    }
  }
}
```

Wait for any approval transaction to be mined before simulating a call that needs its allowance.
Simulation tests execution at its block; state can change before the transaction is mined, so keep
appropriate native minimums and deadlines on the transaction itself.
