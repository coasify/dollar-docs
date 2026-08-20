---
sidebar_position: 3
title: FAQ
description: Frequently asked questions
---

# FAQ

## General

### What is DollarStore?

DollarStore is open-source smart contract software that enables zero-fee stablecoin swaps. Users can
swap between listed stablecoins at exactly 1:1, with no slippage and no fees.

### What's the catch?

Time. If liquidity is available, the protocol executes swaps instantly. If not, users wait in a queue
until someone supplies what they need.

### Why use this instead of Uniswap?

For users swapping stablecoins who care more about price than speed. On a DEX, users lose 0.01-0.3% to
slippage and fees. The DollarStore protocol executes at exactly 1:1.

### Which stablecoins are supported?

The hub launches with **USDC and USDS**. Other stablecoins join as spokes, and **USDT** is expected to
be the first one listed.

The set is governed and grows over time, so read it live with `getPoolAssets(0)` and `isAssetListed()`
rather than hardcoding a pair.

### What are hub and spoke pools?

The **hub** (poolId 0) holds the core stablecoins — USDC and USDS at launch — and is the pool DLRS is a
claim on. Each additional stablecoin gets its own **spoke** pool (poolId >= 1), funded by liquidity
providers and paired against a DLRS-side reserve backed by hub assets. Swaps route hub-to-hub,
hub-to-spoke or spoke-to-hub; a direct spoke-to-spoke swap is rejected on-chain and has to be done as
two legs through the hub.

So a USDC ↔ USDS swap is hub-to-hub, and a USDC ↔ USDT swap crosses into the USDT spoke.

### Is there a token?

DLRS is an internal accounting receipt: a 1:1 claim on the hub reserves, minted when you deposit a hub
asset. It is not a governance token, a stablecoin, or a tradeable asset. Spoke liquidity providers get
non-transferable receipt shares instead, tracked per pool.

---

## Using the Protocol

### How do I swap one stablecoin for another?

1. Approve the DollarStore proxy to spend the asset you are offering
2. Call `swap(offerAsset, wantAsset, amount, minAmountOut, 0, deadline)`
3. The protocol transfers the asset you want instantly for whatever it can fill, and queues the remainder

Set `minAmountOut` equal to the normalized amount to require a full instant fill or revert. The `tip`
parameter must currently be `0`.

### What happens if there is no liquidity?

Users have options:
- Let the remainder queue (`minAmountOut = 0`) and wait for someone to supply the asset
- Require a full instant fill by setting `minAmountOut` to the full amount, so the call reverts instead
- Use `swapExactInput`, which is all-or-nothing and never queues (router/solver mode)

### Can I guarantee part of my swap fills instantly, without queueing the rest?

Yes. `minAmountOut` is the floor on what must fill immediately — set it to the percentage you require
and the call reverts if that much is not available. Setting it to the full amount gives you 100%
instantly or nothing.

Note that `swap` always queues whatever it could not fill. If you want a partial fill with the leftover
staying in your wallet, submit only the amount you want filled. [Time vs
Slippage](/concepts/time-tradeoff#guaranteeing-execution) walks through all three cases with code.

### How long will I wait in queue?

Depends entirely on when someone supplies the asset needed. Could be seconds, could be days. Queues are
settled automatically as swaps and spoke deposits flow through, and anyone can push them along by
calling `processQueue`.

### Can I cancel my queue position?

Yes. Calling `cancelQueue(positionId)` exits the queue and returns the **escrowed offer asset** — the
token you put in. Cancelling is an exit path and works even while the protocol is paused.

### What if my position is partially filled?

You receive partial fills as they happen, in the asset you asked for, and the position stays in the
queue for the remainder. Cancelling then returns whatever offer asset is still escrowed.

---

## DLRS

### What is DLRS?

DLRS is a non-transferable receipt representing a 1:1 claim on the hub reserves. Deposit 1,000 units of
a hub asset and 1,000 DLRS is minted to you; burn it with `withdraw` to take out any hub asset 1:1.
It has 6 decimals, matching the protocol's normalized accounting unit.

### Can I transfer or trade DLRS?

No. DLRS is soulbound. Calls to `transfer()`, `transferFrom()` and `approve()` revert with
`NonTransferable()`.

### What can I do with DLRS?

Burn it through `withdraw` to take out any hub asset that has reserves, 1:1. Withdrawals are an exit
path and are not blocked by pause.

### Is DLRS fully backed?

Yes. Total DLRS supply equals the sum of hub reserves, and queue escrow is never counted as backing.
`syncReserves` — the only function that can reduce reserves — only ever decreases them, and is a
governor decision behind the timelock precisely because it marks down that backing.

---

## For integrators

### How do aggregators integrate DollarStore?

1. Call `getSwapQuote(offerAsset, wantAsset, amount)` to check instant fillability
2. If the quote covers your amount, call `swapExactInput(...)` to execute
3. If it returns 0 or less than you need, route elsewhere

Note that `swapExactInput` pays the caller (`msg.sender`), so a router receives the output itself and
forwards it.

### Does `swapExactInput` ever partially fill?

No. It fills completely or reverts. That makes integration predictable.

### Why does `getSwapQuote` return 0 when there are reserves?

FIFO. If a queue already exists in the same direction, it owns the instant liquidity and the quote is 0
until that queue clears. The same applies to unsupported routes (spoke-to-spoke, unlisted assets, a
paused spoke).

### What units does `minAmountOut` use?

Normalized 6-decimal units, in both `swap` and `swapExactInput` — not the native decimals of the output
token. Convert with `assetScalingFactor(asset)`.

Be aware it means something different here than on an AMM: the rate is fixed at 1:1, so `minAmountOut`
is not slippage protection. It is a floor on the **quantity** filled instantly.

### What's the gas cost?

It varies with the route and how much queue work a call performs: filling queued positions and settling
FIFO ahead of a reserve fill both add cost proportional to the positions touched. The swap engine also
runs through a linked library via `DELEGATECALL`. Measure against a deployment rather than budgeting
from a fixed number.

---

## Technical

### What chains is the protocol on?

None yet. The protocol is not deployed to any network — see [Addresses](/resources/addresses).

### Is the contract upgradeable?

Yes. It is a UUPS proxy. Upgrade authority is a dedicated `upgrader` role held by a TimelockController,
separate from the governor, so an upgrade carries a public delay. Storage uses ERC-7201 namespaced
layouts and is append-only across upgrades. See [Security](/resources/security).

### Has it been audited?

Yes — two OpenZeppelin reports, one on the pre-v3 protocol and one on the v3 hub-and-spoke rebuild.
Findings were fixed or explicitly acknowledged; the details are in [Security](/resources/security#audits).
It is still experimental software, and it is not deployed.

### Where's the source code?

[github.com/wandering-soupsmith/dollar](https://github.com/wandering-soupsmith/dollar)
