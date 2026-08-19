---
sidebar_position: 1
title: Supply
description: How supplying and withdrawing stablecoins works
---

# Supply

Liquidity in the protocol is held in **pools**. Users supply stablecoins to a pool and take them back
out at any time — withdrawals are an exit path and keep working even when the protocol is paused.

## Hub and spokes

| Pool | id | What it holds |
|------|----|---------------|
| **Hub** | `0` | The core stablecoins, whichever governance lists. It is the pool DLRS is a claim on |
| **Spoke** | `>= 1` | One additional stablecoin each, paired against a DLRS-side reserve funded with hub assets |

An asset belongs to exactly one pool. Adding a stablecoin to the hub or opening a spoke for it is a
governance decision, and the token's decimals are frozen at that moment.

## Supplying to the hub

When a user supplies a hub stablecoin, the protocol records the contribution at 1:1 and mints DLRS:

```
Supply 1,000 USDC → 1,000 DLRS minted
Supply 500 USDT   → 500 DLRS minted
```

DLRS is fungible regardless of which stablecoin was supplied. 1,000 DLRS from a USDC supply is identical
to 1,000 DLRS from a USDT supply — both are a claim on the same hub basket.

## Withdrawing from the hub

Burning DLRS takes out any hub stablecoin that has reserves, 1:1:

```
Burn 1,000 DLRS → Receive 1,000 USDC (if reserves cover it)
Burn 1,000 DLRS → Receive 1,000 USDT (if reserves cover it)
```

If the specific stablecoin isn't available, users can either:
1. Withdraw a different hub stablecoin that is available
2. Get in line for the one they want (see [The Queue](/concepts/queue))

## Supplying to a spoke

A spoke has two sides, and a liquidity provider can fund either:

- **The spoke asset itself** — it enters that spoke's reserve.
- **A hub asset** — it enters hub reserves and credits the spoke's internal DLRS-side reserve.

Either way the LP receives **receipt shares** in that spoke, minted pro-rata against the pool's total
value. Shares are non-transferable and are tracked per pool, not as a token.

Exiting works in three ways: burn shares for the spoke asset, burn shares for a hub asset, or use
`redeemSpoke` to take a proportional slice of both sides in one call. The last one is what lets an LP
drain a position completely without leaving rounding dust stranded on one side.

Supplying to a spoke means taking exposure to that spoke's issuer, and the hub does not absorb that
risk. [Spokes](/concepts/spokes) covers how a spoke works and what that exposure actually looks like.

## Units

All internal accounting is in **normalized 6-decimal units**. An asset with more decimals is scaled by
`10**(decimals - 6)`, and supported decimals are `[6, 18]`. Sub-unit dust is never pulled from a
supplier — it stays in their wallet.

## Implementation detail

DLRS is a non-transferable ERC-20 with 6 decimals, minted only by the protocol. It cannot be
transferred, traded, or used outside the protocol; `transfer`, `transferFrom` and `approve` all revert.
It is fully backed — total supply equals the sum of hub reserves, and queue escrow is never counted as
backing.

See [Addresses](/resources/addresses) for deployment status.
