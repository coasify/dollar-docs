---
sidebar_position: 1
title: Contract Addresses
description: Deployed contract addresses
---

# Contract Addresses

:::warning Not Yet Deployed
The protocol is **not deployed to any network**. There are no live contract addresses to integrate
against yet. Any DollarStore address circulating today is not ours — do not send funds to it.
:::

Addresses will be published here once deployment happens, and this page is the canonical source for
them. Verify against it rather than against links from anywhere else.

## Ethereum Mainnet

| Contract | Address |
|----------|---------|
| DollarStore proxy | *pending* |
| DollarStore implementation | *pending* |
| DLRS | *pending* |

## Testnet

| Contract | Address |
|----------|---------|
| DollarStore proxy | *pending* |
| DollarStore implementation | *pending* |
| DLRS | *pending* |

## Roles

The protocol is governed by three separate on-chain roles, each held by a timelock or a Safe. Their
addresses and delays will be published alongside the deployment. See [Security](/resources/security)
for what each one can do.

| Role | Held by | Address | Delay |
|------|---------|---------|-------|
| `upgrader` | TimelockController | *pending* | *pending* |
| `governor` | TimelockController | *pending* | *pending* |
| `guardian` | Safe (direct, no timelock) | *pending* | — |

## Listed assets

Which stablecoins are listed, and in which pool, is set by the governor after deployment. Discover it
on-chain rather than hardcoding a list:

```solidity
uint256 pools = dollarStore.poolCount();      // index 0 is the hub
address[] memory hubAssets = dollarStore.getPoolAssets(0);
bool listed = dollarStore.isAssetListed(token);
uint16 pool = dollarStore.assetPoolId(token);
```

## What to check when it lands

- **Call the proxy, never the implementation.** The implementation address is published only so the
  bytecode can be verified.
- **Read `version()`** on the proxy and confirm it matches the surface you integrated against.
- **Read the roles** — `upgrader()`, `governor()`, `guardian()` and their `pending*` counterparts —
  and confirm they match the published addresses.

```bash
cast call $PROXY "version()(string)"   --rpc-url $RPC
cast call $PROXY "upgrader()(address)" --rpc-url $RPC
cast call $PROXY "governor()(address)" --rpc-url $RPC
cast call $PROXY "guardian()(address)" --rpc-url $RPC
```

## Interface

The canonical interface is `IDollarStore.sol`. See [Functions](/capabilities/functions),
[Events](/capabilities/events) and [Errors](/capabilities/errors) for the full surface.

Source: [IDollarStore.sol on GitHub](https://github.com/wandering-soupsmith/dollar/blob/main/contracts/src/interfaces/IDollarStore.sol)
