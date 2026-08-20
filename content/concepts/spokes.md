---
sidebar_position: 2
title: Spokes
description: How spoke pools work and what a liquidity provider takes on
---

# Spokes

A spoke is how a stablecoin joins the protocol without the hub taking on its risk.

## What a spoke is

**A par-value pair: one stablecoin against hub-backed dollars.**

The hub holds the core stablecoins and is what DLRS is a claim on. Every additional stablecoin gets its
own spoke pool, and each spoke is isolated — its own liquidity, its own providers, its own risk.

A spoke has two sides:

```
Spoke pool (USDT, the expected first spoke)
├── Spoke reserve      USDT held by the pool
└── DLRS-side reserve  dollars, funded with hub assets that sit in hub reserves
```

Both sides are counted at par in normalized 6-decimal units, so the pool's value is simply
`spokeReserve + dlrsReserve`.

The two sides exist because a swap consumes one and feeds the other. Someone buying USDT takes it out
of the spoke reserve and pays in hub dollars; someone selling USDT does the reverse. The pool needs
inventory on both sides to serve both directions.

## How swaps move a spoke

| Swap | Spoke reserve | DLRS side | Meaning |
|------|---------------|-----------|---------|
| hub → spoke | down | up | The pool sells its spoke asset and takes in dollars — **risk-reducing** |
| spoke → hub | up | down | The pool absorbs the spoke asset and pays out dollars — **risk-increasing** |

Hub-to-hub swaps never touch a spoke.

The hub asset that comes in on a hub → spoke swap lands in hub reserves, and the spoke's DLRS side is
credited by the same amount. The two always move together, which is what keeps DLRS fully backed no
matter what a spoke does.

## What a liquidity provider holds

An LP can fund either side — the spoke asset itself, or a hub asset that credits the DLRS side. Either
way they receive **receipt shares**: a pro-rata claim on the pool's total value, non-transferable and
tracked per pool rather than as a token.

The first LP into an empty pool mints shares 1:1 with the value they add. After that, shares are
pro-rata against the pool value before the deposit. All rounding is against the depositor, so nobody
mints more claim than the value they bring.

### The position rotates

This is the part worth understanding before supplying. Shares are a claim on the *sum* of both sides,
not on the asset you deposited. As swaps flow, the mix underneath your shares changes:

```
You fund the DLRS side with 100,000 USDC.
Pool: 100,000 USDT + 100,000 dollars = 200,000 value. You hold 50% of it.

The market sells USDT into the pool (spoke → hub, 60,000):

Pool: 160,000 USDT + 40,000 dollars = 200,000 value. You still hold 50%.
```

Your claim is unchanged in dollar terms, but what backs it is now mostly USDT. That is the position: an
LP absorbs the asset the market is selling, at par, with no fee to compensate for it. **You are taking
issuer exposure on that spoke's stablecoin.** If it depegs, the redemption value of your shares is what
the reserves actually turn out to be worth, and a governor write-down (`syncReserves`) makes each share
pay less — losses are shared pro-rata across the pool's LPs, and no further.

The hub does not absorb any of this. DLRS holders are backed by hub reserves, which spoke activity never
draws down beyond that spoke's own DLRS side.

### Exiting

Three ways out, none of them blocked by pause:

| How | What you get |
|-----|--------------|
| `withdraw` with the spoke asset | Your pro-rata value, paid from the spoke reserve |
| `withdraw` with a hub asset | Your pro-rata value, paid from hub reserves, consuming the DLRS side |
| `redeemSpoke` | A proportional slice of **both** sides in one call |

The single-asset paths can fail when one side alone cannot cover your value. `redeemSpoke` always can,
which is why it is the clean way to close a position completely — and burning the last shares drains
both reserves to exactly zero.

## The brake: minDlrsReserve

A spoke → hub swap is what grows an LP's exposure to the spoke asset. `minDlrsReserve` is the floor that
caps it: only the DLRS side **above** that minimum is available to swappers.

```
dlrsReserve = 100,000, minDlrsReserve = 30,000
→ at most 70,000 of spoke asset can be absorbed before the route stops filling
```

So the minimum is a ceiling on how much of the spoke asset the pool will take on. The governor sets it
per spoke, through the timelock.

It does **not** gate LP exits. An LP withdrawing or redeeming can draw the DLRS side all the way to
zero — the floor restrains the market, never the provider getting out.

## Launch caps

A new spoke starts throttled. The launch cap is a ceiling on the pool's exposure — its spoke reserve
plus its DLRS side — and deposits that would exceed it revert. The governor raises, lowers or removes it
through the timelock; the guardian can tighten it instantly but can never loosen it. A cap of `0` means
uncapped.

## Queues on a spoke

Queues are per direction, so a spoke has its own: `USDC → USDT` is a different queue from
`USDT → USDC`. They behave exactly as described in [The Queue](/concepts/queue).

One spoke-specific behavior: adding liquidity to a spoke settles the queues that the new liquidity can
now fill, in FIFO order and [up to 8 positions each](/concepts/queue#how-much-settles-per-transaction).
An issuer topping up their spoke clears the demand that was waiting on it, in the same transaction. Any queue whose offer asset is unhealthy — deposit-paused, in a paused
pool, or off peg — is skipped rather than settled, so a bad asset can neither be absorbed at par nor
block someone else's deposit.

## Lifecycle

| Status | Deposits | spoke → hub | hub → spoke | LP exits & cancels |
|--------|----------|-------------|-------------|--------------------|
| **Active** | yes | yes | yes | yes |
| **WindingDown** | no | no | yes | yes |
| **Killed** | — | — | — | — |

Wind-down is the governor saying *no more exposure to this asset*: it blocks new liquidity and the
risk-increasing direction, while leaving open everything that reduces risk or lets people out.

A spoke can only be removed once it is fully drained — zero reserves on both sides, zero shares, and no
queued depth on any route touching its asset. `redeemSpoke` is how LPs get it there. Removing it pauses
the pool and unlists its asset; the poolId is retired but never reused, so ids never shift.

## Spoke to spoke

Not supported on-chain — a direct spoke-to-spoke swap reverts with `InvalidRoute`. Route it as two legs
through a hub asset instead: spoke → hub, then hub → spoke.
