# Implementierungsspezifikation: JUSD auf OP_NET

**Version:** 1.0
**Datum:** 20. April 2026
**Basis:** [Machbarkeitsstudie v4.0](../README.md)

---

## Inhaltsverzeichnis

1. [Architektur](#1-architektur)
2. [Contract-Spezifikationen](#2-contract-spezifikationen)
   - 2.1 [JUSD Token](#21-jusd-token)
   - 2.2 [MintingHub](#22-mintinghub)
   - 2.3 [Position (Template)](#23-position-template)
3. [Storage-Layout](#3-storage-layout)
4. [Events](#4-events)
5. [Cross-Contract-Interaktionen](#5-cross-contract-interaktionen)
6. [Protokoll-Parameter](#6-protokoll-parameter)
7. [Deployment-Plan](#7-deployment-plan)
8. [Testing-Strategie](#8-testing-strategie)
9. [Repository-Struktur](#9-repository-struktur)
10. [Offene Entscheidungen](#10-offene-entscheidungen)

---

## 1. Architektur

### 1.1 Uebersicht

```
┌──────────────────────────────────────────────────────────┐
│                        User                              │
│                   (OP_WALLET / SDK)                       │
└────────┬──────────────┬──────────────────┬───────────────┘
         │              │                  │
         ▼              ▼                  ▼
    ┌─────────┐   ┌──────────┐      ┌──────────────┐
    │  JUSD   │   │ Minting  │      │   Position   │
    │ (OP-20) │◄──│   Hub    │─────►│  (Template)  │
    │         │   │          │      │              │
    │ Minter  │   │ Factory  │      │ Collateral   │
    │ Registry│   │ Challenge│      │ Interest     │
    │ Reserve │   │ Auction  │      │ Liquidation  │
    └─────────┘   └──────────┘      └──────────────┘
         ▲              │                  │
         │              │                  ▼
         │              │            ┌──────────┐
         └──────────────┴───────────►│   WBTC   │
                                     │ (OP-20S) │
                                     │ existing │
                                     └──────────┘
```

### 1.2 Contract-Beziehungen

| Von | Nach | Beziehung |
|-----|------|-----------|
| MintingHub | Position | Erstellt via `deployContractFromExisting()`, ruft `notifyChallenge*()` |
| MintingHub | JUSD | Ist registrierter Minter, ruft `mintWithReserve()`, `burnWithReserve()` |
| MintingHub | WBTC | Ruft `transferFrom()` fuer Collateral-Transfers |
| Position | JUSD | Ruft `mintWithReserve()`, `burnFromWithReserve()` via Hub |
| Position | WBTC | Haelt Collateral, ruft `transfer()` fuer Withdrawals |
| User | MintingHub | `openPosition()`, `clonePosition()`, `challenge()`, `bid()` |
| User | Position | `mint()`, `repay()`, `adjustPrice()`, `withdrawCollateral()` |
| User | JUSD | Standard OP-20 Transfers |

### 1.3 Datenfluss: Position oeffnen

```
1. User ruft MintingHub.openPosition(wbtc, params...)
2. MintingHub prueft: User hat WBTC approved
3. MintingHub deployt neuen Position-Contract via deployContractFromExisting(template, salt, initData)
4. MintingHub transferiert WBTC vom User zur neuen Position (WBTC.transferFrom)
5. MintingHub registriert neue Position als Minter bei JUSD
6. MintingHub emittiert PositionOpened Event
7. Nach Init-Periode (14 Tage): User kann Position.mint() aufrufen
8. Position.mint() ruft JUSD.mintWithReserve() via MintingHub
```

### 1.4 Datenfluss: Challenge

```
1. Challenger ruft MintingHub.challenge(position, collateralAmount)
2. MintingHub transferiert Challenger-Collateral (WBTC) in den Hub
3. MintingHub ruft Position.notifyChallengeStarted(amount)
4. MintingHub speichert Challenge-Daten und emittiert ChallengeStarted

--- Phase 1 (Aversion): Erste Haelfte der Challenge-Periode ---

5a. Bidder ruft MintingHub.bid(challengeId, size) zum Liquidationspreis
6a. Position-Owner erhaelt JUSD, Bidder erhaelt Collateral
7a. Challenger erhaelt sein Collateral zurueck + Reward
8a. Position.notifyChallengeAverted()

--- Phase 2 (Dutch Auction): Zweite Haelfte ---

5b. Bidder ruft MintingHub.bid(challengeId, size) zum aktuellen Auktionspreis
6b. Preis = liqPrice * timeRemaining / phaseDuration
7b. Bidder zahlt JUSD, erhaelt Collateral
8b. Challenger erhaelt Reward (2% des Bid-Werts)
9b. JUSD wird gebrannt, Position-State aktualisiert
```

---

## 2. Contract-Spezifikationen

### 2.1 JUSD Token

**Basis:** OP-20 (erbt von `OP20` → `ReentrancyGuard` → `OP_NET`)

**Zusaetzliche Funktionalitaet:**
- Minter-Registry (wer darf JUSD minten)
- Reserve-Tracking (globale Minter-Reserve)
- Fester Zinssatz (Deployer-updateable, wird spaeter durch Leadrate ersetzt)

#### Methoden

**Geerbte OP-20 Methoden (Standard):**

| Methode | Parameter | Return | Beschreibung |
|---------|-----------|--------|--------------|
| `name()` | - | string | "JuiceDollar" |
| `symbol()` | - | string | "JUSD" |
| `decimals()` | - | u8 | 8 |
| `totalSupply()` | - | u256 | Aktuelle Gesamtmenge |
| `maximumSupply()` | - | u256 | Hard Cap |
| `balanceOf()` | owner: Address | u256 | Balance eines Holders |
| `transfer()` | to: Address, amount: u256 | - | Transfer |
| `transferFrom()` | from, to: Address, amount: u256 | - | Delegierter Transfer |
| `increaseAllowance()` | spender: Address, amount: u256 | - | Approval erhoehen |
| `decreaseAllowance()` | spender: Address, amount: u256 | - | Approval senken |
| `burn()` | amount: u256 | - | Eigene Tokens verbrennen |

**Custom Methoden:**

| Methode | Parameter | Return | Access | Beschreibung |
|---------|-----------|--------|--------|--------------|
| `isMinter()` | addr: Address | bool | Public | Prueft ob Adresse registrierter Minter ist |
| `registerMinter()` | addr: Address | - | onlyDeployer | Registriert neuen Minter |
| `removeMinter()` | addr: Address | - | onlyDeployer | Entfernt Minter |
| `mintWithReserve()` | target: Address, amount: u256, reservePPM: u256 | - | onlyMinter | Mintet JUSD, trackt Reserve-Anteil |
| `burnWithReserve()` | amount: u256, reservePPM: u256 | - | onlyMinter | Verbrennt JUSD, reduziert Reserve |
| `burnFromWithReserve()` | owner: Address, amount: u256, reservePPM: u256 | - | onlyMinter | Verbrennt JUSD von Adresse, reduziert Reserve |
| `minterReserve()` | - | u256 | Public | Globale Minter-Reserve (×1e6 Praezision) |
| `interestRatePPM()` | - | u256 | Public | Aktueller Zinssatz in PPM |
| `setInterestRate()` | newRatePPM: u256 | - | onlyDeployer | Setzt neuen Zinssatz |
| `coverLoss()` | amount: u256 | - | Public | Reduziert Reserve bei Verlust |

#### Mint-mit-Reserve-Logik

```
mintWithReserve(target, amount, reservePPM):
    reserveAmount = amount * reservePPM / 1_000_000
    usableAmount = amount - reserveAmount
    _mint(target, usableAmount)
    _mint(address(this), reserveAmount)     // Reserve bleibt im Contract
    minterReserveE6 += reserveAmount * 1e6  // Praezisions-Tracking
```

### 2.2 MintingHub

**Basis:** OP_NET mit ReentrancyGuard

#### Methoden

| Methode | Parameter | Return | Access | Beschreibung |
|---------|-----------|--------|--------|--------------|
| `openPosition()` | collateral: Address, minCollateral: u256, initialCollateral: u256, mintingMaximum: u256, initPeriodSeconds: u64, expirationSeconds: u64, challengeSeconds: u64, riskPremiumPPM: u256, liqPrice: u256, reservePPM: u256 | Address | Public | Erstellt neue Position |
| `clonePosition()` | existing: Address, initialCollateral: u256, mintAmount: u256, expirationSeconds: u64 | Address | Public | Klont bestehende Position |
| `challenge()` | position: Address, collateralAmount: u256 | u256 | Public | Startet Challenge, gibt challengeId zurueck |
| `bid()` | challengeId: u256, size: u256 | - | Public | Bietet auf Challenge |
| `forceSale()` | position: Address, amount: u256 | - | Public | Erzwingt Verkauf abgelaufener Position |
| `getChallenge()` | challengeId: u256 | tuple | Public | Challenge-Daten abfragen |
| `jusd()` | - | Address | Public | JUSD Token Adresse |
| `positionTemplate()` | - | Address | Public | Position Template Adresse |

#### Challenge-Datenstruktur

```
Challenge {
    challenger: Address      // Wer hat gechallengd
    position: Address        // Welche Position
    size: u256               // Collateral-Menge
    start: u256              // Startzeitpunkt (MTP)
    filledSize: u256         // Bereits via Bid gefuellte Menge
}
```

#### Bid-Preisberechnung

```
bid(challengeId, size):
    challenge = challenges[challengeId]
    position = Position(challenge.position)

    // Zeitberechnung
    elapsed = block.medianTimestamp - challenge.start
    challengePeriod = position.challengePeriod()

    if elapsed <= challengePeriod:
        // Phase 1 (Aversion): Fester Preis = Virtual Price
        unitPrice = position.virtualPrice()
    else:
        // Phase 2 (Dutch Auction): Linearer Preisverfall
        phase2Elapsed = elapsed - challengePeriod
        if phase2Elapsed >= challengePeriod:
            unitPrice = 0  // Auction abgelaufen
        else:
            timeLeft = challengePeriod - phase2Elapsed
            unitPrice = position.virtualPrice() * timeLeft / challengePeriod

    // Bid ausfuehren
    offer = unitPrice * size / PRICE_PRECISION
    reward = offer * CHALLENGER_REWARD / 1_000_000

    // Transfers
    JUSD.transferFrom(bidder, address(this), offer)
    WBTC.transfer(bidder, size)                       // Collateral an Bidder
    JUSD.transfer(challenge.challenger, reward)        // Reward an Challenger
    JUSD.burnWithReserve(offer - reward, reservePPM)  // Rest verbrennen

    position.notifyChallengeSucceeded(size, offer)
```

### 2.3 Position (Template)

**Basis:** OP_NET Contract (standalone, wird via Factory deployed)

#### Methoden

| Methode | Parameter | Return | Access | Beschreibung |
|---------|-----------|--------|--------|--------------|
| `mint()` | target: Address, amount: u256 | - | onlyOwner | JUSD minten gegen Collateral |
| `repay()` | amount: u256 | - | Public (mit JUSD-Allowance) | Schulden zurueckzahlen |
| `adjustPrice()` | newPrice: u256 | - | onlyOwner | Liquidationspreis anpassen |
| `withdrawCollateral()` | target: Address, amount: u256 | - | onlyOwner | Ueberschuessiges Collateral abheben |
| `deny()` | - | - | onlyHub | Position ablehnen (Governance) |
| `getPosition()` | - | tuple | Public | Alle Position-Daten |
| `virtualPrice()` | - | u256 | Public | Max(liqPrice, berechneter Preis) |
| `isExpired()` | - | bool | Public | Ablauf-Check |
| `isClosed()` | - | bool | Public | Principal + Interest == 0 |
| `notifyChallengeStarted()` | amount: u256 | - | onlyHub | Challenge-Tracking |
| `notifyChallengeAverted()` | amount: u256 | - | onlyHub | Challenge abgewendet |
| `notifyChallengeSucceeded()` | amount: u256, bidAmount: u256 | - | onlyHub | Challenge erfolgreich |
| `notifyForceSale()` | amount: u256 | - | onlyHub | Forced Sale nach Expiration |

#### Collateral-Invariante

Die zentrale Sicherheitsbedingung, die bei jeder State-Aenderung geprueft wird:

```
collateralBalance * price >= (principal + interest * 1_000_000 / reservePPM) * PRICE_PRECISION
```

Wobei:
- `collateralBalance`: WBTC-Balance der Position (via WBTC.balanceOf(this))
- `price`: Liquidationspreis (u256, Praezision 10^28)
- `principal`: Gemintete JUSD (ohne Reserve)
- `interest`: Aufgelaufene Zinsen
- `reservePPM`: Reserve-Anteil in Parts per Million
- `PRICE_PRECISION`: 10^(36 - collateralDecimals) = 10^28

#### Zins-Akkretion

```
_accrueInterest():
    if principal == 0: return

    deltaTime = block.medianTimestamp - lastInterestUpdate
    if deltaTime == 0: return

    usablePrincipal = principal * (1_000_000 - reservePPM) / 1_000_000
    newInterest = usablePrincipal * fixedAnnualRatePPM * deltaTime
                  / (365 * 24 * 3600 * 1_000_000)

    interest += newInterest
    lastInterestUpdate = block.medianTimestamp
```

#### Virtual Price Berechnung

```
virtualPrice():
    if collateralBalance == 0: return price

    totalDebt = principal + interest * 1_000_000 / reservePPM
    calculatedPrice = totalDebt * PRICE_PRECISION / collateralBalance

    return max(price, calculatedPrice)
```

---

## 3. Storage-Layout

### 3.1 JUSD Token

```
Pointer  0-8:  OP-20 Base (name, symbol, decimals, totalSupply, maxSupply,
               balances, allowances, nonces)
Pointer  9:    minterRegistry: AddressMemoryMap  (minter → u256(1=active))
Pointer 10:    minterReserveE6: StoredU256        (globale Reserve × 1e6)
Pointer 11:    interestRatePPM: StoredU256         (fester Zinssatz)
```

### 3.2 MintingHub

```
Pointer  0:    jusdAddress: StoredAddress
Pointer  1:    positionTemplate: StoredAddress
Pointer  2:    challengeCounter: StoredU256        (naechste Challenge-ID)
Pointer  3:    challenges: MapOfMap<u256>           (challengeId → Feld-Index → Wert)
                 SubKey 0: challenger (als u256)
                 SubKey 1: position (als u256)
                 SubKey 2: size
                 SubKey 3: start
                 SubKey 4: filledSize
Pointer  4:    positionRegistry: AddressMemoryMap  (position → u256(1=registered))
```

### 3.3 Position

```
Pointer  0:    hub: StoredAddress
Pointer  1:    jusd: StoredAddress
Pointer  2:    owner: StoredAddress
Pointer  3:    collateral: StoredAddress            (WBTC Token-Adresse)
Pointer  4:    collateralDecimals: StoredU256
Pointer  5:    price: StoredU256                    (Liquidationspreis)
Pointer  6:    principal: StoredU256                (gemintetes JUSD)
Pointer  7:    interest: StoredU256                 (aufgelaufene Zinsen)
Pointer  8:    reservePPM: StoredU256
Pointer  9:    limit: StoredU256                    (max JUSD mintbar)
Pointer 10:    minted: StoredU256                   (bisher gemintet, inkl. Klone)
Pointer 11:    expiration: StoredU256               (Ablauf-Timestamp)
Pointer 12:    challengePeriod: StoredU256           (Challenge-Dauer in Sekunden)
Pointer 13:    cooldown: StoredU256                  (Cooldown-Ende Timestamp)
Pointer 14:    riskPremiumPPM: StoredU256
Pointer 15:    fixedAnnualRatePPM: StoredU256        (gesperrter Rate bei Eroeffnung)
Pointer 16:    challengedAmount: StoredU256
Pointer 17:    start: StoredU256                     (Erstellungszeitpunkt)
Pointer 18:    lastInterestUpdate: StoredU256
Pointer 19:    denied: StoredBoolean
Pointer 20:    closed: StoredBoolean
```

---

## 4. Events

Alle Events muessen innerhalb des 352-Byte-Limits bleiben.

### 4.1 JUSD Events

| Event | Felder | Groesse |
|-------|--------|---------|
| `MinterChanged(minter, active)` | Address + bool | 33 Bytes |
| `RateChanged(oldRate, newRate)` | u256 + u256 | 64 Bytes |
| `LossCovered(amount)` | u256 | 32 Bytes |

### 4.2 MintingHub Events

| Event | Felder | Groesse |
|-------|--------|---------|
| `PositionOpened(position, owner, collateral, liqPrice, limit, expiration)` | 4×Address + 2×u256 | 192 Bytes |
| `ChallengeStarted(challengeId, challenger, position, size)` | u256 + 2×Address + u256 | 128 Bytes |
| `ChallengeAverted(challengeId, bidder, size)` | u256 + Address + u256 | 96 Bytes |
| `ChallengeSucceeded(challengeId, bidder, size, offer, reward)` | u256 + Address + 3×u256 | 160 Bytes |
| `ForcedSale(position, buyer, amount, proceeds)` | Address + Address + 2×u256 | 128 Bytes |

### 4.3 Position Events

| Event | Felder | Groesse |
|-------|--------|---------|
| `MintingUpdate(position, owner, collateral, price, principal, interest, limit, minted)` | 2×Address + 6×u256 | 256 Bytes |
| `PositionDenied(position)` | Address | 32 Bytes |
| `OwnershipTransferred(oldOwner, newOwner)` | 2×Address | 64 Bytes |

---

## 5. Cross-Contract-Interaktionen

Alle Calls verwenden `Blockchain.call(target, calldata, stopOnFailure=true)` fuer atomare Ausfuehrung.

### 5.1 Method-Selektoren

Selektoren werden via `SHA-256` (nicht Keccak-256) berechnet:

```
// Zentral definiert in constants/Selectors.ts
const MINT_WITH_RESERVE = encodeSelector('mintWithReserve(address,uint256,uint256)');
const BURN_WITH_RESERVE = encodeSelector('burnWithReserve(uint256,uint256)');
const BURN_FROM_WITH_RESERVE = encodeSelector('burnFromWithReserve(address,uint256,uint256)');
const REGISTER_MINTER = encodeSelector('registerMinter(address)');
const TRANSFER_FROM = encodeSelector('transferFrom(address,address,uint256)');
const TRANSFER = encodeSelector('transfer(address,uint256)');
const BALANCE_OF = encodeSelector('balanceOf(address)');
const NOTIFY_CHALLENGE_STARTED = encodeSelector('notifyChallengeStarted(uint256)');
const NOTIFY_CHALLENGE_AVERTED = encodeSelector('notifyChallengeAverted(uint256)');
const NOTIFY_CHALLENGE_SUCCEEDED = encodeSelector('notifyChallengeSucceeded(uint256,uint256)');
```

### 5.2 Call-Pattern (Beispiel: MintingHub ruft JUSD.mintWithReserve)

```typescript
// MintingHub → JUSD
private callMintWithReserve(target: Address, amount: u256, reservePPM: u256): void {
    const calldata = new BytesWriter(4 + 32 + 32 + 32);
    calldata.writeSelector(MINT_WITH_RESERVE);
    calldata.writeAddress(target);
    calldata.writeU256(amount);
    calldata.writeU256(reservePPM);

    const result = Blockchain.call(this.jusdAddress, calldata, true);
    // stopOnFailure=true → revertiert gesamte TX bei Fehler
}
```

---

## 6. Protokoll-Parameter

### 6.1 Feste Konstanten (immutable nach Deploy)

| Konstante | Wert | Begruendung |
|-----------|------|-------------|
| `OPENING_FEE` | 1.000 JUSD (100_000_000 Satoshi-Einheiten) | Spam-Schutz, identisch zu Citrea |
| `CHALLENGER_REWARD` | 20.000 PPM (= 2%) | Oekonomisch tragfaehig (siehe Studie Abschnitt 5.2) |
| `EXPIRED_PRICE_FACTOR` | 10 | Forced-Sale-Preis = 10× Virtual Price |
| `MIN_CHALLENGE_PERIOD` | 86.400 Sekunden (1 Tag) | 144 Preis-Ticks, <0,7% max. Ueberzahlung |
| `COOLDOWN_PERIOD` | 259.200 Sekunden (3 Tage) | Schutz nach Preiserhoehung |
| `MIN_INIT_PERIOD` | 1.209.600 Sekunden (14 Tage) | Governance-Veto-Fenster |
| `PRICE_PRECISION` | 10^28 | 10^(36 - 8 Decimals) |
| `PPM` | 1.000.000 | Parts per Million |
| `JUSD_DECIMALS` | 8 | Konsistent mit Bitcoin/WBTC |
| `MAX_SUPPLY` | 100.000.000 JUSD (10^16 in Basiseinheiten) | Initialer Hard Cap |

### 6.2 Konfigurierbare Parameter (Deployer)

| Parameter | Initialwert | Aenderbar durch | Begruendung |
|-----------|-------------|-----------------|-------------|
| `interestRatePPM` | 40.000 (= 4% p.a.) | Deployer | Wird spaeter durch JUICE-Governance (Leadrate) ersetzt |

### 6.3 Positions-Parameter (pro Position, vom Ersteller gewaehlt)

| Parameter | Min | Max | Begruendung |
|-----------|-----|-----|-------------|
| `reservePPM` | 100.000 (10%) | 1.000.000 (100%) | Reserve-Anteil, Sicherheitspuffer |
| `challengePeriod` | 86.400s (1 Tag) | - | Min 144 Preis-Ticks |
| `initPeriod` | 1.209.600s (14 Tage) | - | Governance-Veto |
| `expiration` | - | ~15.778.800s (6 Mon.) | WBTC-Collateral begrenzt |
| `riskPremiumPPM` | 0 | - | Individueller Risikoaufschlag |
| `liqPrice` | > 0 | - | Muss realistisch sein (Collateral-Check) |

---

## 7. Deployment-Plan

### 7.1 Reihenfolge

```
Schritt 1: JUSD Token deployen
    → Constructor: maxSupply, decimals=8, name="JuiceDollar", symbol="JUSD"
    → Adresse notieren: JUSD_ADDRESS

Schritt 2: Position Template deployen
    → Wird NICHT direkt genutzt, dient nur als Template fuer Klone
    → Adresse notieren: POSITION_TEMPLATE

Schritt 3: MintingHub deployen
    → Constructor: JUSD_ADDRESS, POSITION_TEMPLATE
    → Adresse notieren: HUB_ADDRESS

Schritt 4: MintingHub als Minter bei JUSD registrieren
    → JUSD.registerMinter(HUB_ADDRESS)

Schritt 5: Genesis Position oeffnen
    → MintingHub.openPosition(
        collateral: WBTC_ADDRESS,
        minCollateral: 10_000 (0.0001 WBTC),
        initialCollateral: <Deployer waehlt>,
        mintingMaximum: 100_000_000_000_000 (1M JUSD),
        initPeriodSeconds: 1_209_600 (14 Tage),
        expirationSeconds: 15_778_800 (~6 Monate),
        challengeSeconds: 86_400 (1 Tag),
        riskPremiumPPM: 0,
        liqPrice: <konservativ, z.B. 50.000 JUSD/WBTC>,
        reservePPM: 200_000 (20%)
      )

Schritt 6: Nach Init-Periode (14 Tage) → Initiale JUSD minten
```

### 7.2 Testnet-Deployment zuerst

1. Alle Contracts auf OP_NET Testnet (Chain ID 5115) deployen
2. E2E-Flows testen (Open, Clone, Mint, Repay, Challenge, Bid, ForceSale)
3. Edge Cases testen (Expiration, Zero-Amount, Max-Values)
4. Erst nach erfolgreichen Tests: Mainnet-Deploy

---

## 8. Testing-Strategie

### 8.1 Unit Tests (pro Contract)

**JUSD:**
- Mint/Burn mit Reserve korrekt berechnet
- Nur registrierte Minter koennen minten
- CoverLoss reduziert Reserve korrekt
- InterestRate aenderbar nur durch Deployer

**MintingHub:**
- Position wird korrekt via Factory deployed
- Opening Fee wird korrekt abgezogen
- Challenge-Lifecycle: Start → Avert ODER Start → Bid → Succeed
- Challenge-Reward wird korrekt berechnet
- ForceSale nach Expiration funktioniert
- ForceSale vor Expiration revertiert

**Position:**
- Collateral-Invariante wird bei jedem State-Wechsel geprueft
- Interest akkumuliert korrekt ueber Zeit
- Mint respektiert Limit
- Repay priorisiert Zinsen vor Principal
- AdjustPrice: runter jederzeit, rauf mit Cooldown
- WithdrawCollateral: nur wenn ueberbesichert

### 8.2 Integration Tests

- **Happy Path:** Open → Deposit → Mint → Trade → Repay → Withdraw → Close
- **Challenge Happy Path:** Open → Mint → Challenge → Bid (Avert) → Position weiter nutzbar
- **Challenge Liquidation:** Open → Mint → Challenge → Bid (Succeed) → Principal reduziert
- **Clone:** Open → Clone → Mint auf Clone → Limit geteilt
- **Forced Sale:** Open → Mint → Wait until expired → ForceSale
- **Interest:** Open → Mint → Wait X Blocks → Repay → Pruefen dass Interest korrekt

### 8.3 Edge Cases

- Position mit 0 Collateral
- Challenge waehrend Position in Cooldown
- Bid nach Challenge-Ablauf
- Mint ueber Limit
- Repay mehr als geschuldet
- adjustPrice auf 0
- Challenge auf geschlossene Position
- Mehrere gleichzeitige Challenges auf dieselbe Position

---

## 9. Repository-Struktur

**Repository:** `JuiceDollar/opnet-contracts`

```
opnet-contracts/
├── package.json
├── tsconfig.json
├── asconfig.json                        # AssemblyScript Build-Config
├── README.md
├── src/
│   ├── contracts/
│   │   ├── JUSD.ts                      # Stablecoin Token
│   │   ├── MintingHub.ts                # Position Factory + Challenges
│   │   └── Position.ts                  # Collateral Position (Template)
│   ├── constants/
│   │   ├── Pointers.ts                  # Alle Storage-Pointer zentral
│   │   ├── Config.ts                    # Protokoll-Konstanten
│   │   └── Selectors.ts                # Cross-Contract Method-Selektoren
│   ├── events/
│   │   ├── PositionOpenedEvent.ts
│   │   ├── ChallengeStartedEvent.ts
│   │   ├── ChallengeAvertedEvent.ts
│   │   ├── ChallengeSucceededEvent.ts
│   │   ├── MintingUpdateEvent.ts
│   │   ├── ForcedSaleEvent.ts
│   │   ├── MinterChangedEvent.ts
│   │   └── RateChangedEvent.ts
│   ├── extern/
│   │   ├── JUSDCalls.ts                 # Helper: Calls → JUSD
│   │   ├── PositionCalls.ts             # Helper: Calls → Position
│   │   └── ERC20Calls.ts               # Helper: Calls → WBTC (OP-20)
│   └── math/
│       └── PositionMath.ts              # Collateral-Berechnungen
├── tests/
│   ├── jusd.spec.ts
│   ├── minting-hub.spec.ts
│   ├── position.spec.ts
│   ├── challenge.spec.ts
│   └── integration.spec.ts
└── abis/                                # Auto-generiert via opnet-transform
```

---

## 10. Offene Entscheidungen

Die folgenden Punkte muessen vor Implementierungsbeginn finalisiert werden:

| # | Frage | Vorschlag | Status |
|---|-------|-----------|--------|
| 1 | **WBTC Mint-Limit fuer Genesis-Position** | 1.000.000 JUSD | Offen |
| 2 | **WBTC Expiration** | 6 Monate (~15.778.800 Sekunden) | Offen |
| 3 | **Initialer Zinssatz** | 4% p.a. (40.000 PPM) | Offen |
| 4 | **JUSD Max Supply** | 100.000.000 JUSD (100M) | Offen |
| 5 | **Genesis-Position Collateral** | Wie viel WBTC deposited der Deployer? | Offen |
| 6 | **Genesis-Position Liquidationspreis** | 50.000 JUSD/WBTC (konservativ) | Offen |
| 7 | **Soll Position-Ownership transferierbar sein?** | Ja (wie auf Citrea) | Offen |
| 8 | **Soll das Repo jetzt erstellt werden?** | Ja, `JuiceDollar/opnet-contracts` | Offen |

---

*Diese Spezifikation basiert auf der [Machbarkeitsstudie v4.0](../README.md) und der vollstaendigen Analyse des JuiceDollar-Quellcodes (15 Solidity Contracts), der OP_NET-Runtime (btc-runtime, op-vm) und der Referenz-Implementierungen (NativeSwap, MotoChef).*
