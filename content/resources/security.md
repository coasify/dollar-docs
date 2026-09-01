---
sidebar_position: 2
title: Security
description: Security considerations and trust assumptions
---

# Security

:::danger Experimental Software
The protocol is **not deployed to any network** and has never held funds. It has been reviewed by
OpenZeppelin (see [Audits](#audits)), but review is not a guarantee of correctness. Use at your own risk.
:::

## Trust assumptions

### What you trust

1. **The upgrader**: a TimelockController that can replace the implementation through a UUPS upgrade.
   This is the most powerful role — whoever controls it can eventually rewrite every other control. It
   sits behind the longest delay and can only hand itself off (the governor cannot rotate it).
2. **The governor**: a TimelockController that lists assets, creates spokes, sets launch caps, sets the
   price feeds and risk parameters, marks reserves down (`syncReserves`) and sweeps unaccounted tokens
   (`rescueTokens`). Every governor action carries its timelock delay, which is your exit window.
3. **The guardian**: a Safe multisig with instant fail-safe brakes only — pause (global, per pool, per
   asset), force-cancel a queue position back to its owner, tighten a launch cap, and apply an escrow
   haircut on a balance-impaired asset while its pool is paused. It cannot move funds, repoint an
   oracle, or upgrade.
4. **The smart contract code**: reviewed, but not formally verified.
5. **The price feeds**: Chainlink feeds gate every inflow. A misreporting feed can either block deposits
   and swaps, or let an off-peg asset in.
6. **The underlying stablecoins**: the protocol trades at par, so it assumes listed assets hold their peg.

Each role has a two-step transfer (`transfer*` + `accept*`), so a handoff requires the incoming address
to explicitly accept.

### What you don't need to trust

1. **Pricing**: every swap is 1:1 in normalized units. There is no curve, no discretion, no slippage and
   no fee, so there is no price for anyone to set against you.
2. **Governance tokens**: there is no token, no voting, no treasury.
3. **Exits**: `withdraw`, `redeemSpoke` and `cancelQueue` are exit paths and are **not** blocked by
   pause. A paused protocol still lets you out.
4. **Queue ordering**: strict FIFO per directed queue, enforced on-chain. Reserves are not handed to a
   later swapper ahead of an earlier queued position.

## Governance parameters

These are the values the protocol is intended to launch with. They are not yet set on-chain — read the
live values with `pegTolerance()`, `maxStaleness()` and the timelocks' own `getMinDelay()` once deployed,
and treat this table as intent until then.

| Parameter | Intended value | Why |
|-----------|----------------|-----|
| Upgrader timelock delay | 7 days | Upgrades are the highest-impact action, so they get the longest exit window |
| Governor timelock delay | 48-72 h to start, raised over time | Long enough to be a real exit window, short enough to stay operational |
| Guardian | Safe multisig, 3-of-5 | Instant brakes need availability, but never unilateral control |
| Peg tolerance | 0.5% (50 bps) | Contract default; the governor can set 0.01%-5% |
| Max oracle staleness | 1 hour | Contract default; the governor can set up to 24 h |

What makes the delays meaningful is what sits behind each timelock: the **proposer** is a Safe multisig
(a timelock proposed by a single key is theater), **execution is open** so it does not depend on any one
signer being around after the delay, and the guardian Safe holds **cancel** rights so a mistaken or
malicious queued proposal can be aborted.

## During an incident

Incidents are handled in two moves, deliberately split by speed.

1. **The guardian pauses instantly** — globally, per pool, or per asset. This blocks inflows only.
2. **The governor fixes the cause through its timelock** — repoint a broken feed, adjust tolerance, mark
   reserves down, sweep stray tokens — then unpauses. A code fix goes through the upgrader timelock
   instead.

For example, if a Chainlink feed is deprecated: the guardian pauses that asset immediately, the governor
schedules `setPriceFeed`, and after the delay it executes and the asset is unpaused.

### What you can still do while paused

Exits are never blocked by pause. Whatever the state of the protocol:

| Action | Blocked by pause? |
|--------|-------------------|
| `withdraw` — burn DLRS or spoke shares for an asset | **No** |
| `redeemSpoke` — proportional spoke exit | **No** |
| `cancelQueue` — take your escrowed offer asset back | **No** |
| `deposit` | Yes |
| `swap` / `swapExactInput` | Yes |
| `processQueue` | Yes |

A per-asset deposit pause is narrower still: it stops that asset from flowing *in* — as a deposit, as a
swap's offer, or as a queue settlement — while withdrawals of it keep working. This is the intended
response to a depeg: stop absorbing the asset at par, without trapping anyone holding it.

The one thing pause cannot give back is liquidity. If reserves are empty, exits in that specific asset
still wait on reserves arriving, the same as at any other time.

## Security measures

### In the contract

- **ReentrancyGuard**: all state-changing entrypoints are protected.
- **SafeERC20**: safe token transfer handling; fee-on-transfer tokens are rejected outright.
- **Layered pause**: global, per pool, and per asset (deposits/inflows). Exits stay open in all three.
- **Oracle peg checks**: every inflow verifies the asset is on peg (default tolerance 0.5%) and the feed
  is fresh (default max staleness 1 hour). Both parameters are governor-set and bounded.
- **Launch caps**: per-pool exposure ceilings. The governor sets them; the guardian can only tighten.
- **Two-step role transfers**: for upgrader, governor and guardian.
- **Checks-effects-interactions**: state changes before external calls.
- **ERC-7201 namespaced storage**: append-only across upgrades, so an upgrade cannot silently reinterpret
  existing state.
- **Blacklist resilience**: if paying a queued owner fails (for example a token blacklist), the position
  is ejected and its escrow converted into the canonical receipt (DLRS on the hub, spoke shares on a
  spoke) instead of bricking the queue.

### Queue protections

- **Max 150 positions per directed queue**: bounded gas costs.
- **Minimum order scaling**: $500 base, growing 10x every 25 positions, to prevent dust spam.
- **FIFO ordering**: no manipulation of queue order.
- **Bounded settlement**: a swap or deposit settles at most 8 queued positions inline, so no single
  transaction can be forced to walk an arbitrarily long queue.

## Audits

Two OpenZeppelin reports:

- **[Report #01](/audits/dollarstore-openzeppelin-audit-01.pdf)** — the pre-v3 single-pool protocol.
  Findings fixed, including depeg protection and queue blacklist resilience.
- **[Report #02](/audits/dollarstore-openzeppelin-audit-02.pdf)** — the v3 upgradeable hub-and-spoke
  rebuild: two mediums, two lows, four notes. Fixed: FIFO settlement before reserve fills (M-01),
  consistent `minAmountOut` units (L-01), and the notes. Acknowledged by design and not changed: the peg
  check applies to inflows only (M-02), and the frozen reserve redemption race (L-02).

Review coverage is not the same as safety, and the reviewed code has not run in production.

## Known limitations

### Peg checks apply to inflows only

An asset trading above par can be taken out at par. That is ordinary arbitrage on a par-value exchange
and is peg-restoring; the harmful direction — a below-par asset entering and displacing good reserves —
is what the inflow check and the guardian deposit pause block. Deliberate, so withdrawals never depend
on a live oracle.

### Liquidity can be depleted

If everyone wants the same asset, its reserve empties and users queue. This is by design — the tradeoff
is time, not price.

### `swapExactInput` has no partial-fill mode

The router function either fills completely or reverts. No slippage protection is needed at a 1:1 rate,
but liquidity can be consumed between the quote and the execution.

### Spoke liquidity providers carry issuer risk

An LP in a spoke pool is exposed to the issuer of that spoke's asset. The protocol offers no
compensation for that exposure and does not whitelist depositors.

### Oracle dependency

A deprecated or broken feed blocks every inflow of that asset until the governor repoints it through the
timelock. The guardian can pause immediately in the meantime.

### Upgradeability

The implementation can be replaced. The delay is the protection, not immutability — watch the upgrader
timelock if that matters to you.

## Bug bounty

No formal bug bounty program exists yet. Report suspected vulnerabilities privately to
**admin@dollarstore.world**, and please do not disclose publicly until a fix has been deployed.

## Recommended practices

1. **Start small**: test with small amounts first
2. **Verify addresses**: always verify contract addresses from official sources, and call the proxy, not
   the implementation
3. **Check `version()`**: once deployed, confirm the implementation matches the surface you integrated against
4. **Monitor positions**: watch queue positions for fills
5. **Understand the risks**: this is experimental software
