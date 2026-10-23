---
slug: /
sidebar_position: 1
title: Idea
description: Understanding the DollarStore protocol
---

# The idea

> **1:1 stablecoin swaps, executed by autonomous smart contracts.**

Users can swap between listed stablecoins at 1:1 in normalized units. No price curve. No protocol fees.

Swaps fill from users waiting on the opposite side and from available reserves. When liquidity falls
short, a user can choose a full immediate fill or a revert, or accept a partial fill and queue the
remainder. Queued liquidity is not a guarantee: a position fills at par as liquidity arrives, in the
order of its directed queue.

## How liquidity is organized

A **hub** pool holds the core stablecoins selected by governance. Each additional stablecoin can have
its own **spoke** pool, funded by liquidity providers and paired against hub-side liquidity.

Swaps run hub-to-hub, hub-to-spoke, or spoke-to-hub. A dedicated spoke-to-spoke function combines two
legs through the hub in one transaction, filling completely or reverting. See
[Supply](/concepts/supply) and [Spokes](/concepts/spokes) for how the pools work.

USDC, USDS and other token names in examples illustrate possible pool configurations. Read the asset
registry of the deployment you use rather than assuming a fixed launch pair.

## Why this matters

Listed stablecoins are exchanged at par by the protocol. A larger order does not move its exchange
rate, but it can use up the available liquidity and need to wait.

The choice is explicit: **fill the whole order now or revert**, or **fill what is available now and
queue the rest**. To leave unused funds in your wallet, quote first and submit a smaller order for a
full immediate fill. [Time vs slippage](/concepts/time-tradeoff) explains these options.

## Who this is for

- **Aggregators** integrating stablecoin routes
- **Protocols** needing predictable stablecoin conversion
- **Issuers** seeking a par-value venue for their stablecoin as a spoke
- **Anyone** moving listed stablecoins at scale

See [Addresses](/resources/addresses) for release and deployment information.
