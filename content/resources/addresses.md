---
sidebar_position: 1
title: Contract Addresses
description: Deployed contract addresses
---

# Contract addresses

:::warning Upcoming interface: addresses pending verification
These docs describe the upcoming `0.11.0` interface on
[`fix/guardian-audit`](https://github.com/coasify/dollar/tree/fix/guardian-audit), documented here at
[`ae25d5a`](https://github.com/coasify/dollar/tree/ae25d5a48dcec9f6731773fa0290927d50d638da).
A network deployment exposing this interface has not been verified for this page.
An existing DollarStore deployment may expose a different version; confirm its chain, proxy and
`version()` before choosing an ABI.
:::

## Upcoming release

The network and addresses for this interface will be published here after verification. Until then,
these placeholders are not integration targets.

| Item | Verified value for `0.11.0` |
|------|----------------------------|
| Network and chain ID | Pending verification |
| DollarStore proxy | Pending verification |
| DollarStore implementation | Pending verification |
| DLRS | Pending verification |
| Deployment transaction and source commit | Pending verification |

## Historical Sepolia rehearsal

The repository records a **`0.10.0` Sepolia rehearsal**, deployed October 1, 2026 at block 11823702.
Its [deployment record](https://github.com/coasify/dollar/blob/ae25d5a48dcec9f6731773fa0290927d50d638da/deployments/sepolia.md)
includes old addresses and rehearsal configuration. That record is historical, rather than a current
chain-state check, and explicitly says the deployment lacks the latest repository changes.
Do not combine that endpoint with the `0.11.0` ABI or assume its roles, delays or listed assets describe
another network.

## Roles and timelocks

Publish the verified role holders and operating configuration alongside each deployment. The holders
below describe the governance deployment topology, rather than values verified on a live network.
See [Security](/resources/security) for the complete authority and pause matrix.

| Authority | Documented holder | Address or configuration |
|-----------|-------------------|--------------------------|
| `upgrader` | TimelockController | Pending; publish holder, proposer and actual delay |
| `governor` | TimelockController | Pending; publish holder, proposer and actual delay |
| `guardian` | Safe multisig | Pending; publish owners and threshold |
| `unpauser` | Safe multisig | Pending; publish owners and threshold |
| Pausers | Permitted addresses | Pending; publish initial set and track `PauserSet` updates |
| Timelock veto | Separate canceller Safe; no DollarStore role | Pending; publish timelock permissions, owners and threshold |

The governance script defaults to a 14-day upgrader delay and a 7-day governor delay. Those are script
defaults, not verified live values. The contract itself authorizes role addresses without requiring a
particular Safe threshold or timelock delay.

## Listed assets

The governor configures the asset registry. Discover current registrations instead of hardcoding the
launch list or reusing a rehearsal pool ID:

```solidity
uint256 pools = dollarStore.poolCount();      // poolCount includes retired pool IDs
address[] memory hubAssets = dollarStore.getPoolAssets(0);
bool listed = dollarStore.isAssetListed(token);
// Only interpret assetPoolId as a current registration when listed is true.
if (listed) {
    uint16 pool = dollarStore.assetPoolId(token);
}
```

Pool 0 is the hub. Relisting a removed spoke asset creates a fresh pool ID; an older queue position
retains its original pool ID.

## Verification before integrating

- **Call the proxy.** The implementation address is for source and bytecode verification.
- **Verify the chain and `version()`.** Use the matching interface, implementation source and
  deployment record; a version string alone does not verify the deployed bytecode.
- **Read roles.** Check `upgrader()`, `governor()`, `guardian()` and their pending-transfer getters;
  also check `unpauser()` and `isPauser(address)`. There is no pending-unpauser acceptance step.
- **Verify external controls.** Read each timelock's delay and proposer/canceller/executor permissions,
  and each Safe's owners and threshold. The veto holder is configured on the timelocks.
- **Read operational settings.** Check listed assets, feeds, probe exemptions, pause state, caps,
  reserve floors, `pegTolerance()` and `maxStaleness()` on that deployment.

```bash
cast call "$PROXY" "version()(string)" --rpc-url "$RPC"
cast call "$PROXY" "upgrader()(address)" --rpc-url "$RPC"
cast call "$PROXY" "governor()(address)" --rpc-url "$RPC"
cast call "$PROXY" "guardian()(address)" --rpc-url "$RPC"
cast call "$PROXY" "unpauser()(address)" --rpc-url "$RPC"
cast call "$PROXY" "isPauser(address)(bool)" "$PAUSER" --rpc-url "$RPC"
```

## Interface

The interface for this release is
[`IDollarStore.sol` at `ae25d5a`](https://github.com/coasify/dollar/blob/ae25d5a48dcec9f6731773fa0290927d50d638da/src/interfaces/IDollarStore.sol).
See [Functions](/capabilities/functions), [Events](/capabilities/events) and
[Errors](/capabilities/errors) for signatures and units.
