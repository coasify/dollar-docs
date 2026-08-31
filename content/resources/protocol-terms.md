---
sidebar_position: 5
title: Protocol Terms
description: Dollar Store protocol end-user terms and conditions
---

# Dollar Store Protocol End-User Terms & Conditions

**Last Updated: August 26, 2026**

## Important Notice

THE DOLLAR STORE PROTOCOL IS PERMISSIONLESS, NON-CUSTODIAL SMART-CONTRACT SOFTWARE DEPLOYED ON PUBLIC
BLOCKCHAIN NETWORKS. NO PERSON HOLDS YOUR DIGITAL ASSETS, ACTS AS YOUR COUNTERPARTY, OR PROVIDES ANY
SERVICE TO YOU THROUGH THE PROTOCOL. BY ACCESSING, CONNECTING A WALLET TO, OR USING THE PROTOCOL IN ANY
MANNER, YOU ACKNOWLEDGE THAT YOU HAVE READ, UNDERSTOOD, AND AGREED TO BE BOUND BY THESE TERMS. IF YOU
DO NOT AGREE, DO NOT USE THE PROTOCOL. U.S. PERSONS ARE PROHIBITED FROM USING THE PROTOCOL. THESE TERMS
DESCRIBE THE SOFTWARE AND GOVERN YOUR RELATIONSHIP WITH BUCKETS.

## 1. Definitions

For purposes of these Terms:

**"Dollar Store"** or the **"Protocol"** means the non-custodial smart-contract software deployed on one
or more public blockchain networks under the name Dollar Store, comprising a proxy contract, the
Implementation from time to time in effect, and associated contracts and code libraries, that records
deposits, withdrawals, and swaps of Supported Assets according to its code.

**"Implementation"** means the smart-contract logic in effect for the Protocol at any given time, as
such logic may be replaced from time to time exclusively through the programmed software-update
mechanism described in Section 4.

**"Hub Pool"** means the Protocol's pooled reserves of Supported Assets, deposits into which the code
records as DLRS entries.

**"Spoke Pool"** means a pool created through the administrative functions described in Section 4.2 that
pairs a single Supported Asset with an internal allocation of Hub Pool value, as described in Section
6.6.

**"Receipt Shares"** means the non-transferable record of a liquidity provider's proportional interest
in a Spoke Pool, as described in Section 6.6.

**"Supported Asset"** means a digital asset that the Protocol's code recognizes for deposit,
withdrawal, or swap at the relevant time, as reflected in the on-chain configuration.

**"DLRS"** means the accounting entry by which the Protocol's code records the amount a User has
deposited into the Hub Pool and not yet withdrawn. DLRS is a bookkeeping record, not a transferable
token, as described in Section 7.

**"Impairment Event"** means any circumstance in which the Protocol's actual balance of a Supported
Asset is less than the amount the Protocol has recorded as reserves and queued funds for that asset,
including as a result of a freeze, seizure, clawback, or other action by the asset's issuer.

**"Timelock"** means a programmed, publicly visible on-chain delay between the proposal of an action and
the earliest time it can take effect.

**"Interface"** means any website, application, or software that enables interaction with the Protocol,
whether made available by Buckets, LLC or any third party.

**"Buckets Interface"** means an Interface published by Buckets that presents these Terms and requires
an affirmative acknowledgment before first use. Third-party Interfaces are not Buckets Interfaces and
are not controlled by Buckets.

**"Digital Assets"** means cryptographic tokens, coins, or other blockchain-based assets.

**"Effective Date"** means, as to you, the date on which you first accept these Terms under Section 5.1
or first access or use the Protocol, whichever is earlier. A revised version of these Terms becomes
effective as to you on your first acceptance or use after that version takes effect under Section 14.
References to the Implementation in effect as of the Last Updated date refer to the version of the
Protocol's code that these Terms describe.

**"U.S. Person"** means: (a) any natural person resident in the United States; or (b) any partnership,
corporation, limited liability company, or other entity organized or incorporated under the laws of the
United States or of any state, district, or territory of the United States. "United States" includes its
states, the District of Columbia, and its territories and possessions.

**"Restricted Jurisdiction"** means any country, region, or territory that is the subject of
comprehensive economic sanctions administered by the U.S. Office of Foreign Assets Control ("OFAC"),
the United Nations, the European Union, or the United Kingdom (currently including Cuba, Iran, North
Korea, Syria, and the Crimea, Donetsk, and Luhansk regions of Ukraine), and any other country, region,
or territory identified in the Restricted Jurisdiction list published in the Protocol's documentation,
as updated from time to time.

**"You"** or **"User"** means any person or entity that accesses or uses the Protocol.

## 2. Nature of the Protocol

### 2.1 Software Only

Dollar Store consists of self-executing smart contracts deployed on public blockchain networks. It is
permissionless for eligible persons and non-custodial. Digital Assets recorded to the Protocol are held
by the smart contracts themselves and move only as the code provides, and you retain exclusive control
of your wallet and private keys at all times. No person acts as your counterparty, agent, broker,
dealer, exchange, money transmitter, custodian, fiduciary, or advisor, and no services are provided to
you through the Protocol. Transactions are final and irreversible except to the extent the Protocol's
own programmed rules provide otherwise. Descriptions of the Protocol in these Terms refer to the
Implementation in effect as of the Last Updated date. Section 4 describes how the Implementation can
change.

## 3. Role of Buckets, LLC

### 3.1 Software Publisher

Buckets, LLC ("Buckets"), a Wyoming limited liability company, designs, develops, publishes, and
documents the Protocol's open-source code and publishes these Terms. Buckets does not custody or have
access to user Digital Assets or private keys. It does not execute, route, match, or settle
transactions, and it does not act as a counterparty or intermediary to any Protocol transaction. It does
not use the Protocol. It charges Users nothing and receives no fee, tip, or other payment through the
Protocol. It conducts no KYC, AML screening, or transaction monitoring of Users. The administrative
functions described in Section 4 are functions of the code, not services, and neither they nor these
Terms create any custodial, agency, fiduciary, or advisory relationship between you and Buckets, any
role-holder, or any other person. Affiliates of Buckets, including investment vehicles affiliated with
its parent, Coasify Corporation, may use the Protocol as users on the same terms as any other user,
without priority or access to information that is not publicly available on-chain. Coasify Corporation
may receive fees from issuers or distributors of Supported Assets as described in Section 8.4.

## 4. Software Updates and Administrative Functions

### 4.1 Updates

The Protocol uses an upgradeable architecture. The Implementation can be replaced only through a
programmed update mechanism, after a public on-chain Timelock during which you may withdraw and stop
using the Protocol. No update can bypass the then-applicable on-chain Timelock, as reflected in the
on-chain record. An update may add, remove, or change Protocol features, parameters, Supported Assets,
and economic properties, including properties described in these Terms. YOUR SOLE AND EXCLUSIVE REMEDY
WITH RESPECT TO ANY UPDATE IS TO WITHDRAW YOUR SUPPORTED ASSETS, CANCEL QUEUED POSITIONS, AND
DISCONTINUE USE BEFORE IT TAKES EFFECT. That protection is incomplete if reserves are insufficient, an
issuer has restricted your address, an Impairment Event has occurred, or network conditions prevent your
transaction from being included. The code will nonetheless operate as updated once the Timelock elapses.
Your continued use after an update takes effect is acceptance of the Protocol as updated. You are
responsible for monitoring pending updates, and the on-chain record is authoritative.

### 4.2 Administrative Functions

The code includes a limited set of administrative functions (approval of updates, configuration of
operational parameters including which assets the Protocol supports, under published listing criteria,
and protective actions such as pausing new deposits and swaps or tightening exposure limits) each held
by a designated role and constrained by limits written into the code. Functions that change the rules or
economics of the Protocol take effect only after a Timelock. Functions that act immediately run only in
the protective direction. The current roles, their limits, and their Timelocks are described in the
Protocol's public documentation and recorded on-chain, which are incorporated in these Terms by
reference. Certain reconciliation functions described in Section 6.4 are limited to conforming the
Protocol's records to actual balances following an external event and cannot create value or redirect
value to any person. No administrative function can transfer user balances or queued funds to any person
other than their owner, apply any exchange rate other than the programmed 1:1 parity, impose a protocol
fee or collect any payment through the Protocol, reorder individual queue positions, or block your
withdrawals or the cancellation of your own queued positions. The only administrative actions that
affect a user's position are the reconciliation adjustments following an Impairment Event described in
Section 6.4. Pauses and caps restrict new deposits, swaps, and queue processing only. Withdrawals and
cancellations are never pausable, though they may fail in practice for lack of reserves, an issuer
restriction, an Impairment Event, or network conditions. No role-holder owes you any duty to exercise or
refrain from exercising any administrative function. These are protective capabilities of the software,
not services, and no assurance is given that they will be exercised in any circumstance.

## 5. Assent; Eligibility; Prohibited Persons

### 5.1 Assent

Interfaces published by Buckets require you to affirmatively acknowledge these Terms by confirming the
self-certification, with the version of these Terms identified and your wallet signature recorded before
you can use the Protocol through them. That acknowledgment is your acceptance of these Terms, and it is
renewed on each material revision under Section 14. If you interact with the smart contracts directly or
through an Interface not published by Buckets, these Terms are the published conditions on which Buckets
makes the software available, and by choosing to interact you accept them to the extent applicable law
permits acceptance by conduct. In either case, Buckets asserts no relationship with you beyond these
Terms and the notices in them. A third-party Interface may impose its own terms. Those terms do not bind
Buckets, and these Terms are not a contract with you solely because a third party displayed them.

### 5.2 U.S. Persons Prohibited

The Protocol is not offered to, and may not be accessed or used by, from, or for the benefit of, any
U.S. Person or any person located in the United States or its territories. This prohibition applies to
all U.S. Persons without exception, whether retail or institutional, and to any person acting for or on
behalf of a U.S. Person.

### 5.3 Restricted Jurisdictions

The Protocol may not be accessed or used by, from, or for the benefit of any person located, organized,
or resident in a Restricted Jurisdiction.

### 5.4 Sanctions, AML, and Compliance Representations

By using the Protocol, you represent and warrant on a continuing basis that: (a) you are not subject to
sanctions administered by the United States, the United Nations, the European Union, or the United
Kingdom; (b) you are not listed on any restricted-party list, including the OFAC SDN List; (c) you are
not acting on behalf of a sanctioned person or a person in a Restricted Jurisdiction; (d) your use of
the Protocol does not involve proceeds of crime or other illicit activity; and (e) you are solely
responsible for compliance with all AML, counter-terrorist-financing, and sanctions laws applicable to
you. No KYC, AML screening, or transaction monitoring is conducted by the Protocol or by Buckets.
Interfaces may independently implement geoblocking or screening measures, including the blocking of
jurisdictions beyond Restricted Jurisdictions and the screening of wallet addresses, at their own
discretion. You may not use the Protocol to evade any issuer-level control, sanction, freeze, or
blacklist applicable to you or to any asset.

## 6. Protocol Mechanics

### 6.1 Deposits, Withdrawals, and Asset Substitution

You may deposit a Supported Asset into the Hub Pool. The code records the deposit as an accounting entry
(DLRS) against your address in the nominal amount deposited, subject to rounding that never permits
extraction of value from the Hub Pool, oracle checks, pauses, and caps. You may withdraw Supported
Assets up to your recorded amount, which the code reduces accordingly, subject to available reserves.
THE PROTOCOL MAY DELIVER A DIFFERENT SUPPORTED ASSET THAN THE ASSET YOU DEPOSITED OR REQUESTED,
ACCORDING TO ITS PROGRAMMED RULES AND THE COMPOSITION OF RESERVES AT THE TIME OF WITHDRAWAL, and you
accept that risk.

### 6.2 Swaps and Queues

You may swap one Supported Asset for another at the programmed 1:1 rate. The Protocol provides no price
discovery, price improvement, or slippage. A swap first matches against the opposite queue, then draws
on available reserves, and any remainder joins a first-in, first-out queue for the requested asset that
any person may process against available reserves. Minimum order sizes scale with queue depth. NO
ASSURANCE IS GIVEN THAT ANY QUEUED POSITION WILL BE FILLED, WITHIN ANY PERIOD OR AT ALL. Queued funds
are held by the smart contracts, not by any person. You may cancel your own queued position at any time,
including during a pause, and your queued funds are returned to your address. No other person can cancel
your position. No compensation is payable in respect of any cancellation.

### 6.3 Issuer Actions and Failed Deliveries

Supported Assets are liabilities of third-party issuers, and those issuers can freeze, blacklist, pause,
or otherwise restrict addresses or transfers at any time, independently of the Protocol. If an outbound
delivery on a queue settlement or on the refund of a position you cancel fails (for example because the
receiving address has been restricted by the asset's issuer), the code records the undelivered amount
as an accounting entry (DLRS) for the recipient in place of the failed delivery. Ordinary withdrawals
have no such fallback: a withdrawal whose transfer fails reverts and your recorded entry is unchanged.
An entry so recorded is subject to these Terms in all respects, including Section 5 and the substitution
rule of Section 6.1. The Protocol cannot reverse, and no person will intervene in, issuer-level actions,
and nothing in these Terms entitles any person subject to sanctions or issuer-level restrictions to
receive any asset.

### 6.4 Impairment

If an Impairment Event occurs, the Protocol's records will overstate what the smart contracts actually
hold. Reconciliation functions in the code, which a configured administrative role may trigger, which
execute only when the shortfall is verifiable on-chain, and which cannot create value or move value to
any person, reduce the recorded reserves of the affected asset to the actual balance and, while the
affected pool is paused, reduce queued positions offering that asset pro rata, removing positions that
round to zero. Recorded entries are not reduced. The Hub Pool may therefore hold less than the aggregate
of recorded entries, and withdrawal of the full recorded amount may be unavailable in the impaired asset
or at all. Tokens held by the smart contracts in excess of recorded reserves and queued funds are not
user balances or queued funds and may be swept by a configured administrative role, only to the extent
of the excess, to an address it designates. No compensation is payable in respect of any reduction, and
no role-holder owes you any duty to trigger, or to refrain from triggering, these functions.

### 6.5 Oracles and Network Conditions

The Protocol relies on third-party price feeds to check the peg and freshness of Supported Assets on
inflows. Feed malfunction, staleness, manipulation, or discontinuation may block deposits and swaps or
permit inflows that would otherwise be blocked. Your transactions are subject to network conditions,
including gas costs, congestion, transaction ordering and MEV, and chain reorganizations, none of which
the Protocol controls.

### 6.6 Spoke Pools and Receipt Shares

Spoke Pools may be created through the administrative functions described in Section 4.2, each pairing
one Supported Asset with an internal allocation of Hub Pool value. Swaps between a Spoke Pool's asset
and a Hub Pool asset execute at the programmed 1:1 rate against the Spoke Pool's reserves, and unfilled
remainders queue under Section 6.2. Through the same functions, a Spoke Pool may be given a
minimum-reserve parameter that limits swaps but never redemptions, may be placed into wind-down (no new
liquidity, with redemptions remaining open), may be removed once fully drained, and may be paused under
Section 4.2. A person who supplies liquidity to a Spoke Pool is credited with non-transferable Receipt
Shares proportional to the value supplied. Receipt Shares are a bookkeeping record, not tokens, bear no
fee or yield, and may be realized only through the Protocol's programmed redemption functions for the
holder's proportional share of the Spoke Pool's value, subject to available reserves. THE VALUE OF
RECEIPT SHARES IS NOT FIXED, CANNOT EXCEED THE VALUE SUPPLIED, AND MAY DECLINE, INCLUDING FOLLOWING AN
IMPAIRMENT EVENT OR WIND-DOWN. Section 7 applies to Receipt Shares as it applies to DLRS, except that
the 1:1 bookkeeping convention described for DLRS does not. A regulator could characterize Receipt
Shares differently from DLRS.

## 7. DLRS Accounting Entries

### 7.1 Nature of DLRS

DLRS is the name of the accounting entry by which the Protocol's code keeps track of deposits into the
Hub Pool. It is a bookkeeping record, not an asset. It is recorded by a non-transferable on-chain
contract that exposes balances. The code increases the entry recorded against your address when you
deposit, reduces it when you withdraw, and may record one under Section 6.3, in each case exclusively as
the code provides and without discretion by any person. It is not a coin, a transferable token, or an
instrument. The code contains no capability to transfer, pledge, or deliver an entry to any other
address, and that limitation is structural, not a policy. No person issues or is liable on an entry,
and no person is obligated to pay or deliver anything in respect of it. The only effect of an entry is
that the Protocol's programmed withdrawal function will, subject to reserve sufficiency and the other
conditions of these Terms, deliver Supported Assets up to the recorded amount, in any Supported Asset.
Any nominal 1:1 relationship is a bookkeeping convention, not an entitlement to a fixed amount of
monetary value against any person.

### 7.2 No Yield; No Market; No Guarantee

An entry bears no interest, reward, or other yield, and no person will pay you any amount in respect of
it. Because an entry cannot be transferred, it has no market, market value, or liquidity. It is not
intended for, and cannot be used for, trading, speculation, or investment. Smart-contract failures,
reserve shortfalls, issuer actions, oracle issues, pauses, Impairment Events, or regulatory actions may
impair the nominal 1:1 relationship, withdrawals, or swaps, and no guarantee of parity, convertibility,
or functionality is given at any time.

### 7.3 Characterization

As between you and Buckets, a DLRS entry is not, and shall not be construed as, an electronic money
token or asset-referenced token within the meaning of Regulation (EU) 2023/1114 (MiCA), a payment
stablecoin within the meaning of the U.S. GENIUS Act or any other digital asset designed or usable as a
means of payment or settlement, electronic money, funds, a deposit, an account balance, stored value, a
claim against Buckets or any other person, a security, commodity, swap, or derivative, or an investment.
An entry is not legal tender and is not insured, issued, backed, or guaranteed by any government, by
Buckets, or by any other person. These statements are the intended characterization between you and
Buckets. They do not bind any regulator. No U.S. Person may use the Protocol, and nothing in the
Protocol or these Terms is an offer of a payment stablecoin to any person.

## 8. Fees

### 8.1 No Protocol Fees

The Implementation in effect as of the Last Updated date imposes no protocol fee on deposits,
withdrawals, or swaps, collects no tip or priority payment, and applies only the programmed 1:1 parity
between Supported Assets. Fee properties could change in a future Implementation only through the
timelocked software-update mechanism described in Section 4, with the notice and exit rights described
there.

### 8.2 Network Fees

You are solely responsible for all blockchain network (gas) fees associated with your transactions.

### 8.3 Interface and Third-Party Fees

Interfaces and other third parties may charge their own fees under their own terms. Such fees are not
protocol fees and are not governed by these Terms.

### 8.4 Issuer Arrangements

Coasify Corporation, the parent of Buckets, may receive fees from issuers or distributors of digital
assets for integration engineering, listing on interfaces it or its affiliates operate, distribution,
analytics, and related services. Such fees impose no charge on Users, do not alter the Protocol's
programmed parity, and do not determine whether an asset is supported by the Protocol, which is decided
under the published listing criteria.

## 9. Risk Disclosures

Use of the Protocol involves significant risks. Without limitation, you acknowledge and assume the
following:

**Smart-contract risk.** The code may contain defects, vulnerabilities, or unintended behavior,
notwithstanding audits and testing, and consolidated architecture concentrates such risk in a shared
code surface.

**Software-update risk.** A future update, once its Timelock elapses, may change Protocol features,
parameters, or economics in ways adverse to you. Your protection is the public Timelock and your right
to exit before effectiveness.

**Issuer and depeg risk.** Supported Assets are third-party issuer liabilities that may depeg, become
frozen or blacklisted at the address level, or fail entirely, and the Protocol cannot reverse issuer
actions.

**Asset-substitution risk.** You may receive a different Supported Asset than you supplied or requested.

**Queue and liquidity risk.** Queued positions may be partially filled, filled after long delay,
cancelled, or never filled.

**Impairment and adjustment risk.** If an issuer or other external event reduces what the smart
contracts actually hold, the code's reconciliation rules will write recorded reserves down and reduce
queued positions in the affected asset pro rata or remove them, permanently reducing what you can
recover. Any person may trigger those rules once the shortfall exists.

**Regulatory risk.** Laws and regulations, including stablecoin, money-transmission, sanctions, and
market-structure regimes such as MiCA, may change, may restrict Protocol functionality or the
availability of Supported Assets, and may affect you directly.

**Total loss.** Errors, compromised wallets, or loss of private keys may result in permanent,
unrecoverable loss of Digital Assets, with no recourse.

You assume all such risks in full.

## 10. No Warranties

THE PROTOCOL, ITS RECORDS (INCLUDING DLRS ENTRIES AND RECEIPT SHARES), AND ALL RELATED SOFTWARE AND
CONTENT ARE PROVIDED "AS IS" AND "AS AVAILABLE," WITHOUT WARRANTIES OF ANY KIND, EXPRESS, IMPLIED, OR
STATUTORY, INCLUDING ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE,
NON-INFRINGEMENT, ACCURACY, OR UNINTERRUPTED OR ERROR-FREE OPERATION. NO PERSON UNDERTAKES ANY
OBLIGATION TO MAINTAIN, UPDATE, SUPPORT, PAUSE, UNPAUSE, OR CONTINUE TO MAKE AVAILABLE THE PROTOCOL OR
ANY INTERFACE. NOTHING IN THE PROTOCOL, ANY INTERFACE, OR THESE TERMS IS INVESTMENT, LEGAL, TAX, OR
OTHER ADVICE, AND NO FIDUCIARY DUTY IS OWED TO YOU BY ANY PERSON.

## 11. Limitation of Liability

TO THE MAXIMUM EXTENT PERMITTED BY LAW: (A) NEITHER BUCKETS NOR ANY OF ITS AFFILIATES, MEMBERS,
OFFICERS, EMPLOYEES, CONTRACTORS, OR CONTRIBUTORS, NOR ANY ROLE-HOLDER, SHALL BE LIABLE FOR ANY
INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF
DIGITAL ASSETS, PROFITS, DATA, OR GOODWILL, OR FOR ANY REGULATORY CONSEQUENCES, ARISING OUT OF OR
RELATING TO THE PROTOCOL, ITS RECORDS (INCLUDING DLRS ENTRIES AND RECEIPT SHARES), ANY INTERFACE, OR
THESE TERMS, WHETHER IN CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGES; AND (B) THE AGGREGATE LIABILITY OF ALL SUCH PERSONS FOR ALL CLAIMS SHALL
NOT EXCEED ONE HUNDRED U.S. DOLLARS (US$100). SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS, IN
WHICH CASE THE FOREGOING APPLIES TO THE FULLEST EXTENT PERMITTED. NOTHING IN THESE TERMS EXCLUDES OR
LIMITS LIABILITY FOR FRAUD, FRAUDULENT MISREPRESENTATION, GROSS NEGLIGENCE, OR WILLFUL MISCONDUCT, OR
ANY LIABILITY THAT CANNOT BE EXCLUDED UNDER MANDATORY LAW. THIS SECTION IS SUBJECT TO SECTION 13.5.

## 12. Indemnification

You agree to indemnify, defend, and hold harmless Buckets, its affiliates, and their respective members,
officers, employees, contractors, and contributors, and any role-holder, from and against all claims,
damages, losses, and expenses (including reasonable attorneys' fees) arising out of or relating to your
use of the Protocol, your Digital Assets, your violation of these Terms, or your violation of any law or
the rights of any third party. This indemnity does not apply to the extent a claim arises from the
indemnitee's own fraud, gross negligence, or willful misconduct, and is subject to Section 13.5.

## 13. Dispute Resolution; Arbitration; Class Action Waiver

### 13.1 Binding Arbitration

Any dispute, claim, or controversy arising out of or relating to these Terms or the Protocol, including
their existence, validity, interpretation, breach, or termination, shall be finally resolved by binding
arbitration administered by the American Arbitration Association under its Commercial Arbitration Rules
(or, where you are an individual using the Protocol other than for the trade or profession of an entity,
its Consumer Arbitration Rules, as provided in Section 13.5). The seat of arbitration shall be Sheridan,
Wyoming, U.S.A. The language shall be English, and the arbitration shall be conducted before a single
arbitrator. The arbitrator may conduct proceedings remotely. Judgment on the award may be entered in
any court of competent jurisdiction. This Section applies only where you have accepted these Terms as
described in Section 5.1.

### 13.2 Class Action and Jury Waiver

ALL DISPUTES SHALL BE ARBITRATED ON AN INDIVIDUAL BASIS ONLY. YOU WAIVE ANY RIGHT TO PARTICIPATE IN A
CLASS, COLLECTIVE, CONSOLIDATED, OR REPRESENTATIVE ACTION OR ARBITRATION, AND ANY RIGHT TO A TRIAL BY
JURY, TO THE MAXIMUM EXTENT PERMITTED BY LAW.

### 13.3 Equitable Relief; Forum

Either party may seek temporary equitable relief in aid of arbitration, and Buckets may seek equitable
relief for infringement or misuse of intellectual property, exclusively in the state or federal courts
located in Wyoming, and you consent to the personal jurisdiction and venue of those courts for such
purposes.

### 13.4 Time Limit

To the extent permitted by law, any claim must be commenced within one (1) year after the claim accrues,
or it is permanently barred.

### 13.5 Consumers; Mandatory Law

If you are an individual habitually resident in a jurisdiction whose mandatory law grants you rights
that Section 11, 12, 13, or 15 would limit or exclude, those Sections apply to you only to the extent
that law permits, and nothing in these Terms deprives you of the protection of the mandatory law of your
habitual residence or of any right that law gives you to bring proceedings in its courts. Where Section
13.1 applies to an individual, the AAA Consumer Arbitration Rules apply in place of the Commercial
Arbitration Rules, and either party may instead bring an individual claim in a small-claims court of
competent jurisdiction.

## 14. Modifications to These Terms

Buckets may modify these Terms from time to time by publishing a revised version with an updated
effective date. For material modifications, the revised version will be published at least thirty (30)
days before it takes effect, and Interfaces published by Buckets will endeavor to display notice of the
pending change and will require a fresh acknowledgment before further use. Your continued access to or
use of the Protocol after a revised version takes effect constitutes your acceptance of it, subject to
Section 13.5.

## 15. Governing Law

These Terms are governed by the laws of the State of Wyoming, excluding its conflict-of-law principles,
subject to the Federal Arbitration Act with respect to Section 13.

## 16. General

If any provision of these Terms is held unenforceable, the remaining provisions remain in full force,
and the unenforceable provision will be enforced to the maximum extent permissible. No waiver is
effective unless in writing. You may not assign these Terms. Buckets may assign them to an affiliate or
successor. These Terms are the entire terms governing your use of the Protocol and supersede all prior
versions as of the Effective Date. Provisions that by their nature should survive (including Sections 6,
7, 9, and 10 through 16) survive any termination of your use. The privacy practices of any Buckets
Interface are described in a separate notice and are not part of these Terms. The Protocol's code is
made available under its open-source licenses, and trademarks used with the Protocol or any Buckets
Interface remain the property of Buckets or its affiliates. You are responsible for your own taxes.
Headings are for convenience only. If these Terms are translated, the English version controls.
