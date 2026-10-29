---
sidebar_position: 1
title: Supply
description: How supplying and withdrawing stablecoins works
---

# Supply

Liquidity is held in **pools**. Supply a listed stablecoin to receive a non-transferable receipt;
burn that receipt to withdraw the pool's current mix of assets. Withdrawals are not blocked by pause,
although token transfer restrictions or insufficient reserves after a loss can still make them fail.

## Hub and spokes

| Pool | ID | What it holds |
|------|----|---------------|
| **Hub** | `0` | The stablecoins listed as hub assets; hub suppliers receive DLRS |
| **Spoke** | `>= 1` | One additional stablecoin and an internal DLRS-side reserve funded with hub assets; suppliers receive spoke receipt shares |

An asset belongs to one pool at a time. Governance lists assets and records their decimals for
accounting. The supported token-decimal range is 6 through 18.

## Supplying to the hub

A hub deposit mints DLRS one for one in normalized 6-decimal units. For example, if USDC and USDS are
listed hub assets:

```text
Supply 1,000 USDC → 1,000 DLRS minted
Supply   500 USDS →   500 DLRS minted
```

DLRS represents the hub basket rather than the token originally supplied. DLRS from a USDC deposit
and DLRS from a USDS deposit work the same way.

```solidity
(uint256 amountIn, uint256 receipts) = dollarStore.deposit(
    0, USDC, 1_000e6, msg.sender, block.timestamp + 300
);
// amountIn == 1_000e6 native USDC; receipts == 1_000e6 raw DLRS.
```

Approve the DollarStore proxy to spend the offered token before depositing. `amount` is a native
token budget; any portion smaller than one normalized unit stays in the caller's wallet.

### Who owns the receipt

The caller pays, but `receiver` owns the DLRS or spoke shares. Pass your own address for your own
position, or the user's address when depositing through an integration. The zero address and
DollarStore itself are invalid receivers.

Receipts cannot be transferred, and only their owner can call `withdraw`. Choose a receiver that can
make that call. Anyone can deposit for a receiver without asking it, so an integration's receipt
balance can include deposits made by others.

## Withdrawing from the hub

`withdraw` burns an exact amount of your DLRS and pays a **basket of hub assets**, split by the hub's
current reserve weights. You do not select a single output token.

```text
Illustrative hub reserve mix: 60% USDC, 40% USDS
Burn 1,000 DLRS → Receive 600 USDC + 400 USDS
Native payout:  [600e6, 400e18]
```

To finish entirely in one token, withdraw first, then swap the other assets. That swap follows the
normal liquidity and queue rules.

### Previewing and setting minimums

`previewWithdraw(poolId, receiptAmount)` returns the asset list and native amounts that the withdrawal
would pay at the current state. Use its returned asset order to build `minAmountsOut`:

```solidity
(address[] memory assets, uint256[] memory quoted) =
    dollarStore.previewWithdraw(0, 1_000e6);

uint256[] memory minimums = new uint256[](quoted.length);
for (uint256 i; i < quoted.length; ++i) {
    minimums[i] = quoted[i] * 99 / 100; // Accept up to 1% less of each token.
}

(, uint256[] memory paid) = dollarStore.withdraw(
    0, 1_000e6, minimums, block.timestamp + 300
);
// paid[i] is in the native decimals of assets[i].
```

An empty minimums array accepts the proportional payout without per-token minimums. Otherwise, its
length must match the preview's asset list. A new hub asset adds an entry, so an older minimums array
will revert on length rather than apply to the wrong tokens.

The preview checks the calculation, not the caller's receipt balance or token transfer permissions.
The mix can change before execution. Minimums let you refuse an unacceptable mix; they do not change
the basket the contract calculates.

## Supplying to a spoke

A spoke has two sides, and a liquidity provider can fund either:

- **The spoke asset** enters that spoke's reserve.
- **A hub asset** enters hub reserves and increases that spoke's internal DLRS-side reserve.

Both mint **receipt shares** in the selected spoke, proportional to its value before the deposit.
Shares are non-transferable balances tracked per pool, rather than ERC-20 tokens. A hub asset
deposited into a spoke mints spoke shares, not wallet DLRS.

Use the same `deposit` function with the spoke's pool ID. Its `receiver` owns the shares and later
calls `withdraw` to burn them for a proportional slice of both sides: the spoke asset, plus hub assets
representing the spoke's DLRS-side allocation. The hub portion follows the hub's current basket,
regardless of which hub token funded the spoke. The receipt does not preserve the mix you deposited.

For a spoke exit, the preview lists the spoke asset first, then every hub asset in listing order.
Build minimums from `previewWithdraw`, not `getPoolAssets(spokePoolId)`, which lists only the spoke
asset. [Spokes](/concepts/spokes) explains the changing asset mix and issuer exposure.

## Deposit limits

Deposits are subject to global, pool and asset pauses, fresh oracle prices within the configured peg
tolerance, and the selected pool's launch cap. A winding-down spoke accepts no new deposits.

Caps are checked on deposits. The hub cap limits wallet DLRS supply; a spoke cap limits its spoke
reserve plus its DLRS-side reserve. Funding a spoke with a hub token uses the **spoke's** cap, so
aggregate hub reserves can exceed the hub's own cap. A cap of `0` means uncapped.

## Units

| Value | Units |
|-------|-------|
| Deposit `amount`, returned `amountIn`, withdrawal amounts and minimums | Native decimals of the relevant token |
| Hub `receiptAmount` | Raw DLRS, with 6 decimals |
| Spoke `receiptAmount` | Receipt-share count; it can stop matching deposited value after a loss |
| Reserves, DLRS-side reserves, caps, floors and queue accounting | Normalized 6-decimal units |

For a token with `decimals` decimals, its scaling factor is `10**(decimals - 6)`.
`units = nativeAmount / scalingFactor`; only `units * scalingFactor` is pulled.
Do not add native USDC and native USDS amounts directly: their decimal scales differ.

## Receipt accounting

DLRS is an ERC-20 with 6 decimals, minted and burned only by DollarStore. `transfer`, `transferFrom`
and `approve` revert with `NonTransferable()`.

During ordinary operations, the accounting identity is:

```text
DLRS total supply + sum of all spokes' DLRS-side reserves = total hub reserves
```

For example, 1,000 wallet DLRS plus a spoke's 500-unit hub allocation corresponds to 1,500 units of
hub reserves. Queue escrow is separate and never counted as a reserve. A governor reserve write-down
after an actual token balance loss can break this equality; it does not burn existing wallet DLRS.

An exit is not pausable, but every token it pays must transfer successfully. Assets paying zero are
normally tested with a zero-value transfer; governance can exempt an asset from that probe. See
[Security](/resources/security) for issuer restrictions and loss handling, and
[Addresses](/resources/addresses) for deployment information.
