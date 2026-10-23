---
sidebar_position: 2
title: Quickstart
description: Integrate the DollarStore 0.11.0 interface
---

# Quickstart

Integrate against the **DollarStore proxy**, never the implementation address.

:::info Interface version
These examples describe the upcoming **0.11.0** interface at
[`ae25d5a`](https://github.com/coasify/dollar/blob/ae25d5a48dcec9f6731773fa0290927d50d638da/src/interfaces/IDollarStore.sol).
Confirm the matching network, release and proxy in [Addresses](/resources/addresses) before sending
transactions; a deployment with an older interface needs its own ABI.
:::

## The five things to know

1. **The caller pays.** Approve the proxy before a direct deposit or swap; it pulls the offered token
   with `transferFrom`. A router must obtain the input from its user and approve the proxy itself.
2. **Deposits, withdrawals and swaps take a deadline.** It is a Unix timestamp with no default.
   `cancelQueue` and `processQueue` do not take one.
3. **`minAmountOut` uses the output token's native decimals.** It is a floor on the quantity delivered
   immediately. Reserves and queue accounting still use normalized six-decimal units.
4. **Ownership is explicit.** `deposit` credits `receiver`; the all-or-nothing swaps pay `recipient`.
   `swapOrQueue` pays its caller, who also owns any queued position and later payouts.
5. **Sub-unit input dust is not pulled.** Amounts are rounded down to a whole normalized unit. If a
   router first collects a larger budget, it must return any input the protocol did not pull.

## Units

Read each listed asset's frozen scaling factor, `10**(decimals - 6)`:

```solidity
uint256 offerScaling = dollarStore.assetScalingFactor(offer);
uint256 wantScaling = dollarStore.assetScalingFactor(want);
uint256 units = budget / offerScaling;
uint256 nativeInput = units * offerScaling;
uint256 fullNativeOutput = units * wantScaling;
```

For an illustrative swap from 1,000 USDC with 6 decimals to USDS with 18 decimals, the input is
`1_000_000_000` and the full output minimum is `1_000_000_000_000_000_000_000`. The examples assume those
assets are listed as hub assets on the chosen deployment; they do not establish a launch asset list.

See [Time vs Slippage](/concepts/time-tradeoff) for choosing an immediate-fill floor.

## Swapping from a contract

Use `swapExactInput` for a router: the rounded input fills in full or the whole transaction reverts.
The protocol can pay the user directly. This adapter uses OpenZeppelin's `SafeERC20`; the user
approves the router and supplies the recipient and deadline.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IDollarStore {
    function assetScalingFactor(address asset) external view returns (uint64);
    function swapExactInput(
        address offerAsset,
        address wantAsset,
        uint256 amount,
        uint256 minAmountOut,
        address recipient,
        uint256 deadline
    ) external returns (uint256 amountIn, uint256 amountOut);
}

contract StableRouter {
    using SafeERC20 for IERC20;

    IDollarStore public immutable dollarStore;

    constructor(IDollarStore store) {
        dollarStore = store;
    }

    function swapStables(
        address offer, address want, uint256 budget, address recipient, uint256 deadline
    ) external returns (uint256 amountIn, uint256 amountOut) {
        uint256 offerScaling = dollarStore.assetScalingFactor(offer);
        uint256 units = budget / offerScaling;
        uint256 roundedInput = units * offerScaling;
        uint256 fullOutput = units * dollarStore.assetScalingFactor(want);

        // The user approves this router. Pull only what the protocol can consume.
        IERC20(offer).safeTransferFrom(msg.sender, address(this), roundedInput);
        IERC20(offer).forceApprove(address(dollarStore), roundedInput);

        return dollarStore.swapExactInput(
            offer, want, roundedInput, fullOutput, recipient, deadline
        );
    }
}
```

`amountIn` is the native input actually pulled; `amountOut` is native output delivered to `recipient`.
For an indication of liquidity, call `getSwapQuote(offer, want, budget)` and compare its native output
with `fullNativeOutput`. The quote assumes token payments succeed; simulate the actual swap with its
caller and recipient to check execution. A partial quote alone does not determine whether execution
will fail, because failed payouts to older queue owners can change which liquidity is available.

## Swapping from an app

Use `swapOrQueue` when the user intends to leave unfilled input in a queue. This example requires at
least 80% immediately; the remainder queues if permitted by the queue's size and capacity rules.
`publicClient`, `walletClient`, the token addresses, `dollarStore` and the current `abi` come from your
deployment configuration.

```typescript
import { erc20Abi, parseEventLogs, parseUnits } from 'viem'

const [user] = await walletClient.getAddresses()
const budget = parseUnits('1000', 6) // Native USDC
const fullOutput = parseUnits('1000', 18) // Native USDS
const minOut = fullOutput * 80n / 100n

const approvalHash = await walletClient.writeContract({
  account: user,
  address: USDC, abi: erc20Abi, functionName: 'approve',
  args: [dollarStore, budget],
})
await publicClient.waitForTransactionReceipt({ hash: approvalHash })

const { request } = await publicClient.simulateContract({
  account: user,
  address: dollarStore, abi, functionName: 'swapOrQueue',
  args: [
    USDC, USDS, budget, minOut,
    BigInt(Math.floor(Date.now() / 1000) + 300),
  ],
})
const hash = await walletClient.writeContract(request)
const receipt = await publicClient.waitForTransactionReceipt({ hash })
const joined = parseEventLogs({
  abi,
  eventName: 'QueueJoined',
  logs: receipt.logs.filter(log =>
    log.address.toLowerCase() === dollarStore.toLowerCase()),
})
const positionId = joined[0]?.args.positionId // Absent when nothing queued
```

At call time, `swapOrQueue` returns `(amountIn, amountOut, amountInQueued, positionId)`: input and queued
input are native USDC, output is native USDS, and the ID is zero when nothing queued. A simulation's
values describe its block; read the mined `Swap` and `QueueJoined` events for what actually happened.

Set the native output minimum to `fullOutput` to require a full instant fill, or `0n` to accept any
instant amount and queue the rest. For a swap that must never queue, use
`swapExactInput(offer, want, budget, minOut, recipient, deadline)` instead.

## Depositing and withdrawing

Deposits take an explicit owner and return actual native input plus receipts:

```solidity
(uint256 amountIn, uint256 receiptAmount) =
    dollarStore.deposit(poolId, asset, budget, receiver, deadline);
```

The caller pays; `receiver` owns the non-transferable DLRS or spoke shares and must be able to call
`withdraw`. Anyone can fund a receiver, so a contract's receipt balance need not equal its own deposits.

Withdrawals return a proportional basket, with no chosen output asset:

```solidity
(address[] memory assets, uint256[] memory preview) =
    dollarStore.previewWithdraw(poolId, receiptAmount);

// Empty minimums accept the calculated basket. To protect each leg, build native
// minimums from the preview's order; a new hub listing changes the required length.
uint256[] memory minAmountsOut = new uint256[](0);
(address[] memory paidAssets, uint256[] memory amounts) =
    dollarStore.withdraw(poolId, receiptAmount, minAmountsOut, deadline);
```

The hub pays across its hub assets. A spoke pays its own asset plus its proportional hub allocation.
Previewing computes amounts; it does not check the caller's balance or whether issuer-controlled
transfers will succeed. See [Functions](/capabilities/functions#withdraw) for minimums and asset order.

## Discovering what is listed

Resolve the governed asset set at runtime:

```solidity
uint256 pools = dollarStore.poolCount(); // Pool IDs include retired pools
address[] memory hubAssets = dollarStore.getPoolAssets(0);
bool listed = dollarStore.isAssetListed(token);
uint16 pool = dollarStore.assetPoolId(token); // 0 = hub; >= 1 = spoke
```

`swapOrQueue` and `swapExactInput` support hub↔hub and hub↔spoke. For two spoke assets, use the atomic
`swapSpokeToSpoke(offer, want, via, amount, recipient, deadline)` endpoint with an ordered list of hub
assets. It never queues, and list order can affect fillability. A direct spoke-pair `getSwapQuote`
returns zero; simulate the routed call. See [Functions](/capabilities/functions#swapspoketospoke).

## Before you ship

- **Simulate with the actual caller and recipient.** State can change between simulation and execution;
  the minimum and deadline still apply when the transaction executes.
- **Decode the current ABI.** `InsufficientLiquidity` and `MinAmountNotMet` include the output asset
  and native output amounts; [Errors](/capabilities/errors) covers recovery.
- **Handle `OrderTooSmall`.** A small queued remainder reverts the whole call unless it opens an empty
  queue. `swapOrQueue` has no tip argument.
- **Track refunds by state and events.** A failed first cancellation parks escrow; transaction success
  alone does not prove the original tokens were returned. See [The queue](/concepts/queue).
- **Resolve deployment and asset configuration.** Addresses, ABI versions and listing status can differ
  across networks. Monitor `ReservesSynced` and `EscrowHaircut` for accounting changes.

## Next steps

- [Functions](/capabilities/functions) — parameters, return values and views
- [Events](/capabilities/events) — indexing actual execution and queue state
- [Errors](/capabilities/errors) — protocol and token failures
- [Spokes](/concepts/spokes) — supplying and exiting spoke liquidity
