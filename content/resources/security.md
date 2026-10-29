---
sidebar_position: 2
title: Security
description: Security considerations and trust assumptions
---

# Security

:::info Ethereum mainnet
The proxy reports `1.0.0`. This reference follows
[`b1668d0`](https://github.com/coasify/dollar/tree/b1668d0835c896e6ec310f51b3598e97cc5e46b0).
See [Contract addresses](/resources/addresses) for the onchain snapshot and verification limitations.
:::

The software is experimental. The [OpenZeppelin reports](#audits) cover the code versions identified
below, rather than every subsequent change. A review does not establish that software is free of defects.

## Mainnet verification status

The role and configuration snapshot on [Contract addresses](/resources/addresses) records a
**3-hour governor delay** and a **6-hour upgrader delay**, not the governance script defaults of
7 and 14 days. The guardian and unpauser Safes each read as 2 of 2 in that snapshot; final intended
ownership and thresholds have not been confirmed.

An earlier bytecode comparison matched the implementation, `SpokeAdminLib` and `SwapRouteLib` to the
release reference, but found a mismatch for `SpokeLifecycleLib` at
`0xd55D9474d8fBc3b3883aa1b244cDA06a3e397A5A`. Its exact deployed source/build remains unresolved.
The reported version and successful execution tests do not establish full source/build equivalence.

## Trust assumptions

### Roles and their holders

The contract separates five kinds of authority. The following holders describe the governance
deployment topology; verify the actual addresses and timelock configuration for the network you use.
The contract's role checks authorize addresses and do not themselves require a Safe or timelock.

| Authority | Documented holder | What it can do |
|-----------|-------------------|----------------|
| Upgrader | Long-delay TimelockController | Replace the UUPS implementation and initiate its own two-step role transfer |
| Governor | TimelockController | List assets, create and retire spokes, set caps and reserve floors, configure oracle and probe settings, mark reserves down, rescue unaccounted excess tokens, and replace the guardian or unpauser |
| Pausers | A permitted set of addresses | Each can pause globally, per pool, or per asset; cannot lift a pause or change the pauser list |
| Unpauser | Safe multisig | Lift pauses and add or remove pausers immediately |
| Guardian | Safe multisig | Lower launch caps and apply an eligible escrow haircut; cannot pause, unpause, force-cancel a queue position, change a feed, or upgrade |

The upgrader is the most powerful authority: replacement code can change the other controls.
The governor cannot rotate the upgrader. Governor, guardian and upgrader transfers require the incoming
address to accept; the governor initiates guardian replacement. The governor replaces the unpauser
with `setUnpauser`, without an acceptance step. The unpauser manages pausers with `setPauser`.

A separate **veto Safe** holds cancellation authority on both timelocks in the deployment script. It
has no DollarStore role. Each proposer also retains cancellation rights on its own timelock;
execution is open after the delay. The script separates the guardian from veto and proposer Safes on
Ethereum mainnet. Publish the actual holder configuration rather than assuming a guardian can veto.

### Other dependencies

- **Price feeds:** Chainlink feeds check offered assets on inflow. Incorrect or stale data can block
  an inflow or allow an off-peg asset in.
- **Stablecoin issuers:** swaps use nominal parity in normalized units. Issuers can restrict transfers,
  freeze addresses, or change token behavior independently of the protocol.
- **Code and upgrades:** current behavior depends on the implementation behind the proxy. Historical
  reports do not cover changes made after their reviewed versions.

### Programmed behavior

- **Swap pricing:** swaps use 1:1 normalized parity with no pricing curve or protocol fee.
  Rounding, liquidity, queue order and the caller's native-token minimum still matter.
- **Receipts:** DLRS and spoke receipts are non-transferable accounting records, with no governance
  voting or protocol yield.
- **Exits:** `withdraw` and owner-only `cancelQueue` are not blocked by pause. A transfer restriction,
  issuer probe, reserve shortfall or other transaction condition can still prevent completion.
- **Queue order:** reserve settlement follows FIFO on each directed, pool-scoped queue. A position
  whose owner cannot be paid is parked so the active queue can advance.

## Defaults and deployment configuration

Contract initialization defaults and deployment-script defaults are different from live configuration.
Read `pegTolerance()`, `maxStaleness()` and each timelock's `getMinDelay()` on the intended deployment.

| Setting | Default or bound | Where it is set |
|---------|------------------|-----------------|
| Upgrader delay | 14 days by default | Governance deployment script; configurable at deployment |
| Governor delay | 7 days by default | Governance deployment script; configurable at deployment |
| Safe owners and thresholds | Deployment-specific | Publish and verify the actual Safe configuration |
| Peg tolerance | 50 bps (0.5%) initially; allowed 1–500 bps | Contract initialization; governor can change it |
| Maximum oracle age | 90,000 seconds (25 hours) initially; allowed above zero through 3 days | Contract initialization; governor can change it |

The 25-hour oracle window allows margin beyond a 24-hour feed heartbeat. Configure a deployment using
the feeds actually listed there, and distinguish the permitted ceiling from the value in use.

## During an incident

1. **A pauser pauses** the affected asset, pool, or the whole protocol immediately.
2. **The governor fixes the cause** through its configured timelock, for example by repointing a feed
   or reconciling recorded reserves. A code change instead uses the upgrader timelock. While the
   asset's pool is paused, the guardian can haircut impaired queued and parked escrow if the
   contract's shortfall conditions are met.
3. **The unpauser lifts the pause** after the response. Neither a pauser nor the guardian can do this
   by virtue of that role.

For a deprecated feed, a pauser can stop the asset's inflows, the governor can update `setPriceFeed`
after its timelock, and the unpauser can reopen the asset.

### What pauses block

| Pause | Blocked operations | Operations left open by that pause |
|-------|--------------------|------------------------------------|
| Global | Deposits, `swapOrQueue`, `swapExactInput`, `swapSpokeToSpoke`, and `processQueue`; quotes return zero | `withdraw`, `cancelQueue` |
| Per asset | Deposits or swaps offering the asset, routed swaps using it, and queue processing on lines offering it | Payouts of that asset, `withdraw`, `cancelQueue` |
| Spoke pool | Deposits into the spoke, swaps touching it in either direction, and queue processing on its lines | `withdraw`, `cancelQueue` |
| Hub pool | Hub deposits, hub-asset deposits into spokes, swaps offering a hub asset, spoke-to-spoke routing, and queue processing offering a hub asset | Spoke-to-hub pair swaps paying hub assets out, `withdraw`, `cancelQueue` |

These are pause checks, rather than a promise of successful execution. Other route, issuer, balance and
minimum-output checks continue to apply.

## Exit and queue delivery

### Proportional withdrawals and issuer checks

`withdraw(poolId, receiptAmount, minAmountsOut, deadline)` burns the caller's DLRS or spoke shares and
pays a proportional basket. Hub exits pay hub assets; spoke exits pay the spoke asset plus the spoke's
proportional hub-asset basket. There is no selected-asset withdrawal or separate `redeemSpoke` endpoint.
Use `previewWithdraw` to obtain the asset ordering and native-token amounts before choosing minimums.

A positive payout uses the token's transfer controls. A zero payout is checked with a zero-value
transfer to the caller unless the governor has exempted that asset with `setProbeExempt`. A failed
probe raises `ExitBlockedByIssuer`; a failed real transfer also reverts the withdrawal. The probe
depends on the token checking recipients even for zero amounts. It does not detect every kind of
issuer restriction. A preview calculates the basket without testing these transfer permissions.

The governor can change probe exemptions through its configured timelock. Exemption removes the
zero-value check, while a real payout still uses the token's own transfer controls. See the repository's
[issuer-control notes](https://github.com/coasify/dollar/blob/b1668d0835c896e6ec310f51b3598e97cc5e46b0/SECURITY.md#exit-probe-and-issuer-transfer-controls)
for token-listing considerations.

### Parked escrow and cancellation

If paying a queued owner fails, the position moves outside the active FIFO queue to a parked line.
Its original offered-token escrow and ownership stay unchanged; no DLRS or spoke receipts are minted.
It will not automatically resume filling. The owner can retry `cancelQueue` once that token can be
returned to them.

If an active position's cancellation cannot refund its owner, that first attempt parks it. If an
already parked position still cannot refund, cancellation reverts `EscrowTransferFailed`. A successful
transaction that emits `QueueParked` therefore does not confirm a refund; look for `QueueCancelled`.
Use `isQueuePositionParked` and `getUserQueuePositions` to track retained escrow.

## Security measures

- **Reentrancy guard:** protects token-moving entrypoints and relevant accounting and registry
  operations. Role and pause setters have their own authority checks.
- **Token accounting:** SafeERC20 handles token transfers; inflows reject receiving less than
  the amount pulled, including fee-on-transfer behavior.
- **Oracle limits:** inflows check peg and freshness against bounded governor-set parameters. Feed
  calls have a 100,000-gas budget; failed reads are treated as unhealthy.
- **Launch caps:** deposits check their pool's cap. The governor configures caps; the guardian can
  only lower them. A zero cap is uncapped.
- **Storage layout:** ERC-7201 namespaces organize state. Future upgrades must preserve existing
  field order and types; namespacing does not enforce compatibility by itself.
- **Impairment accounting:** governor-only `syncReserves` reduces recorded reserves to the actual
  balance after subtracting escrow. Guardian-only `haircutEscrow` can proportionally reduce queued
  and parked escrow when its pool is paused and the required shortfall exists. Neither mints value;
  `rescueTokens` is limited to unaccounted excess above reserves and escrow.

### Queue protections

- Each active directed queue has a maximum of 150 positions.
- The queued-order minimum starts at 500 normalized dollars and grows tenfold every 25 active
  positions. An empty line permits a smaller remainder; parked positions do not set its minimum.
- Same-direction reserve settlement visits at most eight positions per line in an automatic pass,
  counting positions it parks. Opposite-queue matching is separate; a spoke deposit can visit several
  eligible lines, each with its own eight-position bound. A hub deposit does not automatically settle
  queues. `processQueue` takes the caller's visit budget.

## Audits

The published OpenZeppelin reports identify these historical review versions:

| Report | Report date | Audited commit | Fix-review commit |
|--------|-------------|----------------|-------------------|
| [Report #01](/audits/dollarstore-openzeppelin-audit-01.pdf), pre-v3 single-pool protocol | March 10, 2026 | `091852e` | `591a4ac` |
| [Report #02](/audits/dollarstore-openzeppelin-audit-02.pdf), v3 hub-and-spoke rebuild | August 5, 2026 | `d4cea9a` | `5e2e241` |

These reports do not establish a review of the entire `1.0.0` release reference at `b1668d0`. Consult the reports for the
scope and status of individual findings and the
[repository audit index](https://github.com/coasify/dollar/blob/b1668d0835c896e6ec310f51b3598e97cc5e46b0/audits/README.md)
for commit provenance. The reports use the old `contracts/src/` paths; current source lives in `src/`.

## Operational limitations

Peg checks apply to inflows, not payouts. Liquidity can be exhausted even at nominal swap parity;
`swapOrQueue` can queue a remainder, while `swapExactInput` and `swapSpokeToSpoke` fill completely or
revert. Quotes estimate delivery assuming queued-owner transfers succeed, and do not check the
caller or recipient's token-transfer permissions. Simulate the exact call with its intended recipient.

Spoke receipts expose their holder to the pool's assets and issuer restrictions. Withdrawals return the
pool's current mix, and losses can prevent the nominal amount from being recovered. The swap reserve
floor does not block a proportional withdrawal. Cancellation remains owner-only and subject to the
offered token's ability to transfer.

An implementation upgrade can change the protocol's behavior. Monitor the actual upgrader timelock
and the version reported by the proxy, rather than relying on documentation of a different deployment.

## Vulnerability reports

Report suspected vulnerabilities privately to **admin@dollarstore.world**. Please do not disclose
publicly until a fix has been deployed.

## Recommended practices

1. Verify the network, proxy, implementation version and role holders against the
   [deployment record](/resources/addresses).
2. Use the proxy with the ABI for its verified version.
3. Preview basket exits and simulate transactions with the intended caller, receiver or recipient.
4. Track queued and parked positions separately, including updates after an escrow haircut.
5. Begin with small amounts and review pending governance operations before relying on a deployment.
