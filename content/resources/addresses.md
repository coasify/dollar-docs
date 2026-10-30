---
sidebar_position: 1
title: Contract Addresses
description: Ethereum mainnet deployment and configuration
---

# Contract addresses

## Ethereum mainnet

The original deployment configuration was checked at block **26,301,797**, 2026-10-29 23:50:35 UTC.
The PYUSD listing and pool configuration below were checked separately at block **26,308,073** on
2026-10-30. These are dated snapshots; read current settings before submitting transactions.

| Item | Value |
|------|-------|
| Network and chain ID | Ethereum mainnet · `1` |
| Protocol version | `1.0.0` |
| **DollarStore proxy and approval spender** | [`0x825e1e13D804816b8ccdA405F1a7B7915461dDc4`](https://etherscan.io/address/0x825e1e13D804816b8ccdA405F1a7B7915461dDc4) |
| Implementation reference | [`0x921b754eeD24a38834ee2AddC96FdD60F500B2d9`](https://etherscan.io/address/0x921b754eeD24a38834ee2AddC96FdD60F500B2d9) |
| DLRS hub receipt token | [`0x79E593F533Fb502d8AdFD66980d49f1264B38eB3`](https://etherscan.io/address/0x79E593F533Fb502d8AdFD66980d49f1264B38eB3) |
| Recorded event indexing start | `26294486` |
| Source and interface reference | [`b1668d0`](https://github.com/coasify/dollar/tree/b1668d0835c896e6ec310f51b3598e97cc5e46b0) |

Call and approve the **proxy**; the implementation is a reference for verification, not a user entrypoint.
The indexing start is the recorded scan boundary, rather than a deployment transaction receipt.

## Listed assets and pools

| Asset | Token address | Native decimals | Pool |
|-------|---------------|-----------------|------|
| USDC | [`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`](https://etherscan.io/address/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48) | 6 | Core `0` |
| USDS | [`0xdC035D45d973E3EC169d2276DDab16f1e407384F`](https://etherscan.io/address/0xdC035D45d973E3EC169d2276DDab16f1e407384F) | 18 | Core `0` |
| USDG | [`0xe343167631d89B6Ffc58B88d6b7fB0228795491D`](https://etherscan.io/address/0xe343167631d89B6Ffc58B88d6b7fB0228795491D) | 6 | Spoke `1` |
| PYUSD | [`0x6c3ea9036406852006290770BEdFcAbA0e23A0e8`](https://etherscan.io/address/0x6c3ea9036406852006290770BEdFcAbA0e23A0e8) | 6 | Spoke `2` |

USDT is not part of this verified listing snapshot. Other token names in conceptual examples do not
establish a live listing; discover the governed registry onchain.

| Pool setting | Core `0` | USDG spoke `1` | PYUSD spoke `2` |
|--------------|----------|----------------|-----------------|
| Launch cap | $10,000,000 | $5,000,000 | $5,000,000 |
| Status at respective snapshot | Active; unpaused | Active; unpaused | Active; unpaused |
| Minimum hub backing for spoke-to-hub swaps | Not applicable | $1 | $1 |

Both pools and the global protocol were unpaused; deposit pauses for USDC, USDS and USDG were off.
The PYUSD pool and its deposit control were also unpaused at the later check, with zero token and
hub reserves. A listing does not establish available swap liquidity.
Each spoke can be funded with its own token or a listed hub asset. Global or pool pauses block new
inflows while withdrawals and queue cancellation remain available under their normal token controls.

### PYUSD spoke creation

Pool **2** was created inside the existing DollarStore proxy using the existing PayPal USD token;
there is no separate PYUSD application contract to approve.

| Creation detail | Value |
|-----------------|-------|
| Created | 2026-10-30 15:44:35 UTC |
| Ethereum block | [`26306550`](https://etherscan.io/block/26306550) |
| Transaction | [`0x673df61db39c82a491bc2fc65857f1b8f6c8ad1a79bff59248876e3256d21067`](https://etherscan.io/tx/0x673df61db39c82a491bc2fc65857f1b8f6c8ad1a79bff59248876e3256d21067) |
| Launch cap at creation | $5,000,000 / `5000000000000` normalized units |
| Minimum DLRS reserve at creation | $1 / `1000000` normalized units |

The successful creation transaction emitted `PoolCreated`, `AssetListed`, `MinDlrsReserveSet` and
`LaunchCapSet`. PYUSD has **6 native decimals**; its Chainlink PYUSD/USD feed has **8 decimals**.

## Oracle configuration

| Asset | Price feed |
|-------|------------|
| USDC | [`0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6`](https://etherscan.io/address/0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6) |
| USDS | [`0xfF30586cD0F29eD462364C7e81375FC0C71219b1`](https://etherscan.io/address/0xfF30586cD0F29eD462364C7e81375FC0C71219b1) |
| USDG | [`0x14f0737d6b705259e521EA6E9E3506AC78dBd311`](https://etherscan.io/address/0x14f0737d6b705259e521EA6E9E3506AC78dBd311) |
| PYUSD | [`0x8f1dF6D7F2db73eECE86a18b4381F4707b918FB1`](https://etherscan.io/address/0x8f1dF6D7F2db73eECE86a18b4381F4707b918FB1) |

The inflow guard uses `pegTolerance() = 50` basis points (±0.5%) and
`maxStaleness() = 90000` seconds (25 hours). These checks reject unhealthy inflows; they do not
set a persistent pause flag.

## Roles and timelocks

The following role and delay observations are from the original 2026-10-29 snapshot.

| Authority | Observed holder | Configuration at snapshot |
|-----------|-----------------|---------------------------|
| Governor | [`0xa50E2Fc91964CD4aE0f63fCae8AdD4DB75485906`](https://etherscan.io/address/0xa50E2Fc91964CD4aE0f63fCae8AdD4DB75485906) | Timelock; 10,800 seconds / 3 hours |
| Upgrader | [`0x9240F61f843276cF9d269eDB2C846DdE96184712`](https://etherscan.io/address/0x9240F61f843276cF9d269eDB2C846DdE96184712) | Timelock; 21,600 seconds / 6 hours |
| Guardian | [`0x5F5A42097F82858EFa28612ecA60200F65344598`](https://etherscan.io/address/0x5F5A42097F82858EFa28612ecA60200F65344598) | Safe; threshold 2 of 2 owners |
| Unpauser | [`0x8165e519a89209dA4264e876A81ad040388401bc`](https://etherscan.io/address/0x8165e519a89209dA4264e876A81ad040388401bc) | Safe; threshold 2 of 2 owners |

The script defaults of 7 days for governance and 14 days for upgrades are **not the observed delays**.
Final intended Safe ownership/thresholds and timelock proposer, canceller and executor permissions
remain unverified here. Read pauser permissions through `isPauser(address)` and `PauserSet` events.

## Verification status

The proxy version, addresses, listed assets and configuration above were read from Ethereum mainnet.
An earlier comparison matched the implementation, `SpokeAdminLib` and `SwapRouteLib` to the release
reference, but the exact deployed build of `SpokeLifecycleLib` remains unresolved; see
[Mainnet verification status](/resources/security#mainnet-verification-status). This snapshot does not
establish complete source/build equivalence or final governance readiness.

## Historical Sepolia rehearsal

The earlier `0.10.0` Sepolia rehearsal at block `11823702` is historical; its
[deployment record](https://github.com/coasify/dollar/blob/ae25d5a48dcec9f6731773fa0290927d50d638da/deployments/sepolia.md)
does not establish current mainnet addresses, roles or asset listings. Do not use rehearsal addresses
with the mainnet ABI.

## Discover current listings

```solidity
uint256 pools = dollarStore.poolCount(); // Includes retired pool IDs
address[] memory hubAssets = dollarStore.getPoolAssets(0);
bool listed = dollarStore.isAssetListed(token);
if (listed) {
    uint16 pool = dollarStore.assetPoolId(token);
}
```

Pool 0 is the hub. Relisting a removed spoke asset creates a fresh pool ID; an older queue position
retains its original pool ID.

## Verification before integrating

- Verify Ethereum chain ID `1`, then read `version()` on the proxy.
- Use the matching ABI; swap and deposit amounts use token-native units, while internal reserve
  accounting and receipt shares use six decimals.
- Read live listings, feeds, caps, reserve floors and pauses.
- Check role holders, pending role transfers, each timelock’s permissions and delay, and Safe owners
  and thresholds; a reported version alone does not verify deployed bytecode.
- Simulate with the actual caller and recipient before requesting a wallet transaction.

```bash
export PROXY=0x825e1e13D804816b8ccdA405F1a7B7915461dDc4
cast call "$PROXY" "version()(string)" --rpc-url "$RPC"
cast call "$PROXY" "governor()(address)" --rpc-url "$RPC"
cast call "$PROXY" "upgrader()(address)" --rpc-url "$RPC"
cast call "$PROXY" "guardian()(address)" --rpc-url "$RPC"
cast call "$PROXY" "unpauser()(address)" --rpc-url "$RPC"
```

## Interface

The interface reference is [`IDollarStore.sol` at `b1668d0`](https://github.com/coasify/dollar/blob/b1668d0835c896e6ec310f51b3598e97cc5e46b0/src/interfaces/IDollarStore.sol).
See [Functions](/capabilities/functions), [Events](/capabilities/events) and
[Errors](/capabilities/errors) for signatures and units.
