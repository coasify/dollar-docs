---
slug: /
sidebar_position: 1
title: Idea
description: Understanding the DollarStore protocol
---

# The Idea

> **1:1 stablecoin swaps, executed by autonomous smart contracts.**

Users can swap between listed stablecoins at 1:1. No slippage. No fees.

Swaps execute when reserves allow. When the asset someone wants is available, the swap settles against
those reserves; when it isn't, they can get in line for it, and whatever *is* available fills against
what they asked for. Queued liquidity is not a guarantee — a position fills as reserves arrive, in FIFO
order, at 1:1 whenever the fill lands. Getting in line is a choice: a swap can just as easily be told to
revert instead.

## How liquidity is organized

A **hub** pool holds the core stablecoins — USDC and USDS at launch. Each additional stablecoin gets its
own **spoke** pool, funded by liquidity providers and paired against the hub; USDT is expected to be the
first. Swaps route hub-to-hub, hub-to-spoke or spoke-to-hub, always at par. See
[Supply](/concepts/supply) for how the two sides work.

## Why this matters

Listed stablecoins are treated at par by the protocol. Conventional venues still make users manage
route selection, price impact, fees and execution timing for assets that are intended to track the same
unit of account.

Large swaps on AMMs can require splitting orders, monitoring execution and managing slippage. The
DollarStore protocol is simpler: a fixed 1:1 rate in normalized units, a single transaction, and an
explicit choice between settling only what is available now or queueing the rest.

## Who this is for

- **Aggregators** integrating stablecoin routes (1inch, CowSwap, 0x)
- **Protocols** needing predictable stablecoin conversion
- **Issuers** who want a par-value venue for their stablecoin, listed as its own spoke
- **Anyone** moving stablecoins at scale
