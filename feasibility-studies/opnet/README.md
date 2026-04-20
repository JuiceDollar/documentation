# Machbarkeitsstudie: JuiceDollar auf OP_NET (Bitcoin L1)

**Version:** 2.0
**Datum:** 20. April 2026
**Status:** Abgeschlossen

---

## Inhaltsverzeichnis

1. [Executive Summary](#1-executive-summary)
2. [Projektkontext](#2-projektkontext)
   - 2.1 [JuiceDollar Protokoll](#21-juicedollar-protokoll)
   - 2.2 [OP_NET Plattform](#22-opnet-plattform)
   - 2.3 [Zielsetzung](#23-zielsetzung)
3. [Technische Analyse: Plattform-Faehigkeiten](#3-technische-analyse-plattform-faehigkeiten)
   - 3.1 [Smart-Contract-Portierbarkeit](#31-smart-contract-portierbarkeit)
   - 3.2 [Gas und Performance](#32-gas-und-performance)
   - 3.3 [Zeitmodell und Blockzeiten](#33-zeitmodell-und-blockzeiten)
   - 3.4 [Cross-Contract-Architektur](#34-cross-contract-architektur)
   - 3.5 [Event-System](#35-event-system)
   - 3.6 [Storage-Modell](#36-storage-modell)
   - 3.7 [Mathematische Operationen](#37-mathematische-operationen)
   - 3.8 [Kryptographische Primitive](#38-kryptographische-primitive)
4. [Kritische Analyse: Collateral-Modell](#4-kritische-analyse-collateral-modell)
   - 4.1 [WBTC Trust-Modell — Code-Analyse](#41-wbtc-trust-modell--code-analyse)
   - 4.2 [Auswirkung auf das JuiceDollar-Sicherheitsmodell](#42-auswirkung-auf-das-juicedollar-sicherheitsmodell)
   - 4.3 [Loesungsansaetze fuer das Custodian-Problem](#43-loesungsansaetze-fuer-das-custodian-problem)
5. [Kritische Analyse: Challenge-Mechanismus](#5-kritische-analyse-challenge-mechanismus)
   - 5.1 [Preisfindung bei 10-Minuten-Blocks](#51-preisfindung-bei-10-minuten-blocks)
   - 5.2 [Oekonomische Tragfaehigkeit von Challenges](#52-oekonomische-tragfaehigkeit-von-challenges)
   - 5.3 [MEV und Front-Running in Auktionen](#53-mev-und-front-running-in-auktionen)
   - 5.4 [Reaktionsgeschwindigkeit bei Volatilitaet](#54-reaktionsgeschwindigkeit-bei-volatilitaet)
   - 5.5 [Loesungsansaetze fuer das Challenge-Problem](#55-loesungsansaetze-fuer-das-challenge-problem)
6. [Kritische Analyse: Peg-Stabilitaet](#6-kritische-analyse-peg-stabilitaet)
   - 6.1 [Peg-Mechanismen auf Citrea vs. OP_NET](#61-peg-mechanismen-auf-citrea-vs-opnet)
   - 6.2 [Loesungsansaetze fuer die Peg-Stabilitaet](#62-loesungsansaetze-fuer-die-peg-stabilitaet)
7. [Oekosystem-Analyse](#7-oekosystem-analyse)
   - 7.1 [Netzwerk-Reife und Status](#71-netzwerk-reife-und-status)
   - 7.2 [Vorhandene Infrastruktur](#72-vorhandene-infrastruktur)
   - 7.3 [Wallet-Support und Developer Tooling](#73-wallet-support-und-developer-tooling)
8. [Was funktioniert — Technisch machbare Komponenten](#8-was-funktioniert--technisch-machbare-komponenten)
9. [Was nicht funktioniert — Fundamentale Einschraenkungen](#9-was-nicht-funktioniert--fundamentale-einschraenkungen)
10. [Risikobewertung](#10-risikobewertung)
11. [Aufwandsschaetzung](#11-aufwandsschaetzung)
12. [Handlungsoptionen](#12-handlungsoptionen)
13. [Empfehlung](#13-empfehlung)
14. [Anhang](#14-anhang)
    - A. [Technische Vergleichstabellen](#a-technische-vergleichstabellen)
    - B. [Contract-Interface-Spezifikation (MVP)](#b-contract-interface-spezifikation-mvp)
    - C. [Referenzen und Quellen](#c-referenzen-und-quellen)

---

## 1. Executive Summary

Diese Studie untersucht die Machbarkeit einer Portierung des JuiceDollar-Protokolls (JUSD) auf OP_NET, eine Smart-Contract-Plattform direkt auf Bitcoin Layer 1. Die Analyse umfasst eine vollstaendige Code-Review der OP_NET-Runtime, der WBTC-Implementierung und der JuiceDollar-Smart-Contracts.

### Kernergebnisse

**Die Portierung der Smart-Contract-Logik ist technisch machbar.** OP_NET bietet alle notwendigen Primitive: OP-20-Token-Standard, Cross-Contract-Calls, Factory-Pattern, SafeMath, Timestamps und Events. Gas-Limits sind ausreichend, und das Developer-Tooling ist vollstaendig.

**Drei fundamentale Probleme verhindern jedoch eine funktional aequivalente Portierung des JuiceDollar-Konzepts:**

1. **Das Collateral (WBTC) ist vollstaendig zentralisiert.** Die Code-Analyse des OP-20S-Contracts zeigt: Ein einzelner Private Key (kein Multisig) kann unbegrenzt WBTC minten, von jeder Adresse verbrennen und den Peg-Rate sofort aendern. Es gibt keinen On-Chain-Beweis, dass gemintetes WBTC durch reales BTC gedeckt ist. JuiceDollars Versprechen eines "trustless Stablecoins" waere auf ein zentralisiertes Collateral gebaut.

2. **Der Challenge-Mechanismus ist oekonomisch nicht tragfaehig.** Bei 10-Minuten-Blockzeiten, ~5-10 TPS und einer kleinen Nutzerbasis bietet die Dutch Auction nur 144 Preis-Ticks pro Tag (statt 8.640 auf Citrea), der geschaetzte Return fuer Challenger liegt unter 1% p.a., und Block-Produzenten koennen profitable Bids per Front-Running abschoepfen. Ohne aktive Challenger verliert das Protokoll seine Kernfunktion: die oracle-freie Preisdisziplin.

3. **Es gibt keinen Peg-Stabilisierungsmechanismus.** Auf Citrea sichern USDC/USDT-Bridges einen harten Floor fuer den JUSD-Preis. Auf OP_NET existieren keine Stablecoins. Der Peg stuetzt sich ausschliesslich auf den Challenge-Mechanismus (der nicht funktioniert) und Arbitrage auf MotoSwap (der tiefe Liquiditaet erfordert, die nicht vorhanden ist).

**Bewertung:** Eine 1:1-Portierung des JuiceDollar-Konzepts ist auf OP_NET **nicht sinnvoll**. Eine angepasste Version mit veraenderten Parametern und ergaenzenden Mechanismen ist moeglich, waere aber ein **anderes Produkt** mit anderem Risikoprofil. Diese Studie zeigt fuer jedes Problem detailliert auf, was technisch moeglich ist, was nicht, warum — und welche Loesungsansaetze existieren.

---

## 2. Projektkontext

### 2.1 JuiceDollar Protokoll

JuiceDollar (JUSD) ist ein oracle-freier, vollstaendig besicherter Stablecoin auf Citrea (Bitcoin L2 ZK-Rollup). Das Protokoll ist ein Fork von dEURO (abstammend von Frankencoin) und basiert auf dem Cypherpunk-Prinzip: keine Admin-Keys, keine Upgradability, permissionless.

**Zwei-Token-System:**

| Token | Zweck | Standard |
|-------|-------|----------|
| **JUSD** | Stablecoin (1 USD Peg) | ERC-20 auf Citrea |
| **JUICE** | Governance und Equity | ERC-20 auf Citrea |

**Drei Saeulen des Protokolls:**

1. **Oracle-freie Besicherung:** Nutzer hinterlegen cBTC als Collateral und setzen selbst einen Liquidationspreis. Keine externen Preis-Orakel. Der Markt diszipliniert ueber Challenges.
2. **Dezentrales Collateral:** cBTC (Wrapped Bitcoin auf Citrea) wird ueber eine Bridge gehalten. Die Bridge ist dezentral aufgebaut und bietet kryptographische Garantien.
3. **Peg-Stabilitaet:** Stablecoin-Bridges (USDC, USDT, CTUSD) schaffen einen harten Floor/Ceiling fuer den JUSD-Preis. Arbitrageure halten den Peg innerhalb enger Grenzen.

**Aktuelle Architektur:** 15 Smart Contracts (Solidity 0.8.26), NestJS-API, Ponder-Indexer, Next.js-Browser-App. Deployed auf Citrea Mainnet (Chain ID 4114) und Testnet (Chain ID 5115).

### 2.2 OP_NET Plattform

OP_NET ist eine Smart-Contract-Plattform direkt auf Bitcoin Layer 1. Im Gegensatz zu Sidechains oder Rollups nutzt OP_NET Bitcoin-Blocks fuer die Transaktionsbestaetigung und erreicht mathematischen Konsensus ueber deterministische WASM-Ausfuehrung.

**Technische Eckdaten:**

| Eigenschaft | Wert |
|-------------|------|
| Konsensus | Proof of Calculation (PoC) + Proof of Work (PoW) |
| Smart-Contract-Sprache | AssemblyScript (kompiliert zu WebAssembly) |
| Block-Zeit | ~10 Minuten (Bitcoin L1) |
| Epoch-Modell | 5 Bitcoin-Blocks pro Epoch (~50 Minuten) |
| Gas-Token | Bitcoin (Satoshis) |
| Token-Standard | OP-20 (fungibel), OP-721 (NFT) |
| Mainnet-Launch | 19. Maerz 2026 |
| Quantum-Resistenz | ML-DSA (FIPS 204) nativ |
| TPS | 5-10 (Baseline), bis 50 mit Parallelisierung |

**Architektur-Besonderheiten:**

- **Kein separater Chain:** Transaktionen sind Bitcoin-Transaktionen, bestaetigt durch Bitcoin-Miner.
- **Deterministische Ausfuehrung:** Floating-Point ist verboten. Jeder Node berechnet identische Ergebnisse.
- **Verify-Only fuer BTC:** Contracts koennen keine nativen Bitcoin-UTXOs halten. Stattdessen existiert WBTC als OP-20-Token.
- **Epochen-Finalisierung:** Volle Finalitaet nach ~20 Bitcoin-Blocks (~200 Minuten).

### 2.3 Zielsetzung

Evaluierung, ob das JuiceDollar-Protokoll auf OP_NET deployed werden kann, um einen oracle-freien, Bitcoin-besicherten Stablecoin direkt auf Bitcoin Layer 1 anzubieten.

---

## 3. Technische Analyse: Plattform-Faehigkeiten

Dieser Abschnitt bewertet die **technische Grundlage** von OP_NET — ob die Plattform die notwendigen Primitive fuer einen komplexen DeFi-Protokoll bietet. Die konzeptionellen Probleme werden in den Abschnitten 4-6 behandelt.

### 3.1 Smart-Contract-Portierbarkeit

Die Portierung erfordert ein vollstaendiges Rewrite von Solidity nach AssemblyScript. Die Geschaeftslogik ist jedoch zu grossen Teilen uebertragbar.

**Feature-Vergleich:**

| Feature | Solidity (Citrea) | AssemblyScript (OP_NET) | Bewertung |
|---------|-------------------|-------------------------|-----------|
| Token-Standard | ERC-20 | OP-20 | Vollstaendig kompatibel |
| Integer-Arithmetik | uint256, SafeMath | u256, SafeMath | Vollstaendig kompatibel |
| Mappings | `mapping(K => V)` | `AddressMemoryMap`, `MapOfMap` | Vollstaendig kompatibel |
| Events | `event` + `emit` | `NetEvent` + `emitEvent()` | Eingeschraenkt (352 Byte Limit) |
| msg.sender | `msg.sender` | `Blockchain.tx.sender` | Identisch |
| block.timestamp | `block.timestamp` | `Blockchain.block.medianTimestamp` | Funktional aequivalent |
| Reentrancy Guard | Manuell (OpenZeppelin) | Nativ eingebaut | Besser auf OP_NET |
| Factory Pattern | ERC-1167 Minimal Proxy | `deployContractFromExisting()` | Funktional aequivalent |
| Cross-Contract Calls | `contract.method()` | `Blockchain.call(addr, data)` | Manuelles Encoding noetig |
| delegatecall | Unterstuetzt | **Nicht vorhanden** | Proxy-Pattern nicht moeglich |
| Flash Loans | Moeglich | **Nicht verfuegbar** | Alternatives Design noetig |
| Floating-Point | Verfuegbar | **Verboten** | Kein Problem (JUSD nutzt PPM) |

**Portierbarkeit pro Contract:**

| Contract | Portierbarkeit | Begruendung |
|----------|---------------|-------------|
| JuiceDollar.sol | Hoch | OP-20-Basis + Minter-Registry. ERC-3009 entfaellt, OP-20S-Signaturen als Alternative. |
| Equity.sol | Mittel | 10.-Wurzel-Berechnung erfordert custom Newton-Iteration in u256. |
| Leadrate.sol | Hoch | Reine Mathematik und Storage, 1:1 portierbar. |
| MintingHub.sol | Mittel | `deployContractFromExisting()` statt ERC-1167. Manuelles Selector-Encoding fuer Calls. |
| Position.sol | Mittel | Decimal-Anpassung (8 statt 18), MTP-Timestamps, 42 Funktionen. |
| PositionRoller.sol | Niedrig | Flash-Loan-Abhaengigkeit muss durch atomare Cross-Calls ersetzt werden. |
| Savings.sol | Hoch | Lineare Zinsberechnung, reine u256-Mathematik. |
| SavingsVaultJUSD.sol | Mittel | Kein ERC-4626-Standard auf OP_NET, manuelle Vault-Implementierung. |
| StablecoinBridge.sol | Hoch | Triviale Logik, aber abhaengig von Gegen-Token-Verfuegbarkeit. |

**Fazit:** ~85% der Geschaeftslogik sind direkt portierbar. Die technische Portierung ist **nicht der Engpass** dieser Studie.

### 3.2 Gas und Performance

**Gas-Limits:**

| Parameter | Wert |
|-----------|------|
| Max Gas pro Transaktion | 150.000.000.000 (150 Mrd.) |
| Max Gas pro Block | 20.000.000.000.001 (20 Mrd.+) |
| Satoshi-zu-Gas-Verhaeltnis | 1 Satoshi = 1.000.000 Gas |

**Kosten der teuersten Operationen:**

| Operation | Gas-Kosten |
|-----------|-----------|
| Neuer Storage-Slot (erstmaliges Schreiben) | 200.000.000 |
| Cold Address Access (erster Zugriff auf Contract) | 26.000.000 |
| Warm Storage Write (wiederholter Zugriff) | 29.000.000 |
| Event Emission (Basis + 200 Bytes) | ~19.750.000 |
| SHA-256 Hash (32 Bytes) | ~1.100.000 |
| Schnorr-Signatur-Verifikation | 41.000.000 |
| ML-DSA-44 Signatur-Verifikation | 201.000.000 |

**Worst-Case-Modellierung: Position oeffnen**

Die komplexeste Transaktion im Protokoll wurde auf Basis der op-vm Gas-Konstanten modelliert:

| Komponente | Gas | Quelle |
|-----------|-----|--------|
| Contract-Initialisierung (WASM) | 20.000.000 | MAX_GAS_WASM_INIT |
| Factory: deployContractFromExisting | ~500.000.000 | Bytecode-Laden + Init |
| MintingHub → Position (Cold Call) | 26.000.000 | COLD_ACCOUNT_ACCESS_COST |
| Position: 10 neue Storage-Slots | 2.000.000.000 | 10 × STORAGE_COST_NEW_SLOT |
| WBTC.transferFrom (Cold Call) | 26.000.000 | COLD_ACCOUNT_ACCESS_COST |
| JUSD.mintWithReserve (Cold Call) | 26.000.000 | COLD_ACCOUNT_ACCESS_COST |
| 3 Events (~200 Bytes gesamt) | 59.250.000 | BASE + BYTES × 80.000 |
| Mathematische Berechnungen | 10.000.000 | Collateral-Check, Interest |
| **Gesamt** | **~2.700.000.000** | **1,8% des TX-Limits** |

**Bewertung:** Gas ist kein Blocker. Selbst die komplexesten Operationen nutzen unter 5% des Transaktionslimits. Bei normalen Bitcoin-Gebuehren liegen die Kosten bei 1-2 USD pro Transaktion, bei Congestion bis 10-20 USD.

### 3.3 Zeitmodell und Blockzeiten

Bitcoin-Blocks werden im Durchschnitt alle 10 Minuten gefunden. JuiceDollars Zeitlogik ist sekundenbasiert, nicht blockbasiert, sodass die Berechnung ueber Timestamps identisch funktioniert.

OP_NET verwendet den **Median Time Past (MTP)** — den Median der letzten 11 Block-Timestamps. MTP ist tamper-resistenter als ein einzelner Timestamp, hinkt aber der Realzeit um ~1 Stunde hinterher.

| Zeitparameter | Citrea (~10 Sek/Block) | OP_NET (~10 Min/Block) | Real-Zeit |
|---------------|----------------------|----------------------|-----------|
| Challenge-Periode (1 Tag) | 8.640 Blocks | 144 Blocks | Identisch |
| Cooldown (3 Tage) | 25.920 Blocks | 432 Blocks | Identisch |
| Init-Periode (14 Tage) | 120.960 Blocks | 2.016 Blocks | Identisch |
| Position-Laufzeit (1 Jahr) | 3.153.600 Blocks | 52.560 Blocks | Identisch |

**Funktionale Bewertung:** Fuer Zinsberechnung, Cooldowns und Laufzeiten (Perioden von Stunden bis Jahren) ist MTP unkritisch. Fuer zeitkritische Mechanismen wie Auktionen ist die geringe Granularitaet jedoch ein fundamentales Problem (siehe Abschnitt 5.1).

### 3.4 Cross-Contract-Architektur

JuiceDollar besteht aus 15 interagierenden Contracts. OP_NET bietet vollstaendige Cross-Contract-Kommunikation.

**Aufrufmechanismus:**

Solidity: `jusd.mintWithReserve(target, amount, reservePPM)`
OP_NET: `Blockchain.call(jusdAddress, encodedCalldata, stopOnFailure)`

Calldata wird manuell via `BytesWriter` encodiert. Method-Selektoren werden per **SHA-256** (nicht Keccak-256 wie in Solidity) berechnet.

**Atomizitaet:**

Mit `stopOnFailure=true` (Default) revertiert die gesamte Transaktion, wenn ein verschachtelter Call fehlschlaegt. Dies ist **funktional identisch** zu Soliditys Revert-Verhalten. Alle State-Aenderungen aller beteiligten Contracts werden zurueckgerollt.

Mit `stopOnFailure=false` revertiert nur der aufgerufene Contract, und der Aufrufer kann den Fehler behandeln — analog zu Soliditys `try/catch`.

**Bewertung:** Cross-Contract-Calls funktionieren zuverlaessig. Die manuelle Calldata-Encodierung erhoet den Implementierungsaufwand, ist aber kein funktionales Problem.

**Factory Pattern:**

`deployContractFromExisting(templateAddress, salt, constructorData)` erstellt vollstaendige Contract-Instanzen mit deterministischer Adresse (CREATE2-Stil). Dies ersetzt ERC-1167 Minimal Proxies, die auf OP_NET mangels delegatecall nicht moeglich sind.

### 3.5 Event-System

OP_NET Events haben ein **Limit von 352 Bytes pro Event**. Dies ist die einzige harte technische Einschraenkung.

| Event | Felder | Geschaetzte Groesse | Status |
|-------|--------|-------------------|--------|
| Transfer (from, to, amount) | 3 × 32 Bytes | 96 Bytes | Kein Problem |
| MintingUpdate (8 Felder) | 8 × 32 Bytes | 256 Bytes | Knapp, machbar |
| ChallengeStarted (5 Felder) | 5 × 32 Bytes | 160 Bytes | Kein Problem |
| PositionOpened (~12 Felder) | 12 × 32 Bytes | 384 Bytes | **Ueberschreitung** |

**Mitigation:** PositionOpened kann in zwei Events aufgeteilt oder auf wesentliche Felder reduziert werden. Position-Parameter sind ueber den Contract-State abfragbar, sodass ein reduziertes Event akzeptabel ist.

### 3.6 Storage-Modell

OP_NET verwendet Pointer-basiertes Storage mit SHA-256-Hash-Adressierung. Maximale Pointer pro Contract: 65.535 (u16).

| Contract | Geschaetzte Pointer | % des Limits |
|----------|-------------------|--------------|
| JUSD | ~15 | 0,02% |
| MintingHub | ~10 | 0,02% |
| Position | ~20 | 0,03% |

**Bewertung:** Kein Risiko. Das Limit wird nicht ansatzweise erreicht.

### 3.7 Mathematische Operationen

JuiceDollar verwendet ausschliesslich Integer-Arithmetik mit PPM-Praezision (Parts per Million). Da OP_NET Floating-Point verbietet, ist dies direkt kompatibel.

Verfuegbar: `SafeMath.add()`, `.sub()`, `.mul()`, `.div()`, `.mod()`, `.pow()`, `.sqrt()` — alle auf u256 mit Overflow/Underflow-Schutz.

**Spezialfall: 10. Wurzel (JUICE/Equity):**

Die JUICE-Share-Berechnung erfordert `x^(1/10)`. OP_NET bietet keinen nativen nth-Root-Operator. Implementierbar via Newton-Iteration:

```
x_{k+1} = ((n-1) * x_k + a / x_k^(n-1)) / n
```

Alternativ: `exp(ln(x) / 10)` mit `SafeMath.approxLog()`. Aufwand: ~50-100 Zeilen AssemblyScript. Nur relevant fuer das vollstaendige Protokoll (JUICE), nicht fuer den MVP.

**Decimal-Anpassung:** WBTC auf OP_NET hat 8 Decimals (Satoshis), cBTC auf Citrea hat 18 Decimals. Die Preisberechnung nutzt `10^(36 - collateralDecimals)` als Praezision: 10^28 statt 10^18. Alle Konstanten muessen entsprechend angepasst werden.

### 3.8 Kryptographische Primitive

| Funktion | Verfuegbarkeit | JuiceDollar-Nutzung |
|----------|---------------|---------------------|
| SHA-256 | `Blockchain.sha256()` | Storage-Keys |
| Keccak-256 | `keccak256()` | Signatur-Domains (EIP-712) |
| Schnorr-Signatur | `Blockchain.verifySignature()` | Permit-Approvals |
| ML-DSA (Post-Quantum) | `Blockchain.verifySignature()` | Zukunftssicher |

**Post-Quantum:** JUSD auf OP_NET waere von Tag 1 quantum-ready (ML-DSA FIPS 204). Dies ist ein Alleinstellungsmerkmal gegenueber allen EVM-basierten Stablecoins.

---

## 4. Kritische Analyse: Collateral-Modell

Dieser Abschnitt dokumentiert die **Code-Analyse** des WBTC-Contracts auf OP_NET und bewertet die Auswirkungen auf JuiceDollars Sicherheitsmodell.

### 4.1 WBTC Trust-Modell — Code-Analyse

Die WBTC-Implementierung auf OP_NET basiert auf dem OP-20S-Standard (Pegged Token). Die vollstaendige Code-Review der Dateien `OP20S.ts` (btc-runtime) und `MyPeggedToken.ts` (example-contracts) zeigt folgende Architektur:

**4.1.1 Einzelner Custodian-Key**

Der Custodian ist ein **einzelner Private Key**, kein Multisig:

```typescript
// MyPeggedToken.ts — Custodian-Pruefung
private _onlyCustodian(): void {
    if (!Blockchain.tx.sender.equals(this._getCustodian())) {
        throw new Revert('Not custodian');
    }
}
```

Ein einzelner `StoredAddress`-Pointer speichert die Custodian-Adresse. Es gibt kein Multisig-Array, keinen Threshold-Mechanismus und keine Governance-Abstimmung.

**Technische Konsequenz:** Ein kompromittierter Private Key ermoeglicht sofortigen, vollstaendigen Zugriff auf alle WBTC-Funktionen.

**4.1.2 Unbegrenztes Minting**

Der Custodian kann beliebig viel WBTC minten (bis zum max Supply von 21M BTC):

```typescript
// MyPeggedToken.ts — Mint-Funktion
public mint(calldata: Calldata): BytesWriter {
    this._onlyCustodian();  // Einzige Pruefung
    const to = calldata.readAddress();
    const amount = calldata.readU256();
    this._mint(to, amount);  // Kein Proof-of-Reserve, kein Rate-Limit
    return new BytesWriter(0);
}
```

Es gibt keine Verbindung zwischen dem Mint-Aufruf und einem tatsaechlichen BTC-Deposit. Der Code erzwingt keinerlei Backing — die Deckung ist eine Vertrauenssache.

**4.1.3 Unilaterales Burning von beliebigen Adressen**

```typescript
// MyPeggedToken.ts — BurnFrom-Funktion
public burnFrom(calldata: Calldata): BytesWriter {
    this._onlyCustodian();  // Einzige Pruefung
    const from = calldata.readAddress();
    const amount = calldata.readU256();
    this._burn(from, amount);  // Verbrennt von JEDER Adresse
    return new BytesWriter(0);
}
```

Der Custodian kann Token von jeder Adresse verbrennen — **ohne Zustimmung des Halters**. Dies ist funktional eine Konfiszierung.

**4.1.4 Sofortige Peg-Rate-Aenderung**

```typescript
// OP20S.ts — updatePegRate
public updatePegRate(calldata: Calldata): BytesWriter {
    this._onlyPegAuthority();
    const newRate = calldata.readU256();
    this._pegRate.value = newRate;  // Sofortige Aenderung, kein Timelock
    return new BytesWriter(0);
}
```

Kein Timelock, keine Governance-Abstimmung, keine Verzoegerung. Die Peg-Rate kann in einem Block von 1:1 auf einen beliebigen Wert geaendert werden.

**4.1.5 Custodian-Transfer ohne Timelock**

```typescript
// MyPeggedToken.ts — Transfer in zwei Schritten, aber ohne Verzoegerung
public transferCustodian(calldata: Calldata): BytesWriter {
    this._onlyCustodian();
    this._setPendingCustodian(newCustodian);  // Schritt 1
    return new BytesWriter(0);
}

public acceptCustodian(_: Calldata): BytesWriter {
    // Schritt 2 — kann im SELBEN Block ausgefuehrt werden
    this._setCustodian(pending);
    return new BytesWriter(0);
}
```

Der Two-Step-Mechanismus schuetzt zwar vor versehentlicher Uebertragung, bietet aber keinen zeitlichen Puffer fuer Nutzer, um zu reagieren.

**4.1.6 Zusammenfassung des Trust-Modells**

| Aspekt | Status | Risiko |
|--------|--------|--------|
| Custodian-Typ | Einzelner Private Key | Kritisch |
| Minting | Unbegrenzt, kein Proof-of-Reserve | Kritisch |
| Burning | Von jeder Adresse, ohne Zustimmung | Kritisch |
| Peg-Rate | Sofort aenderbar, kein Timelock | Kritisch |
| Custodian-Transfer | Kein Timelock, im selben Block moeglich | Kritisch |
| BTC-Backing | Nicht on-chain verifiziert | Kritisch |
| Freeze/Blacklist | Nicht implementiert | Positiv |

### 4.2 Auswirkung auf das JuiceDollar-Sicherheitsmodell

JuiceDollars Sicherheit basiert auf der Annahme, dass das Collateral seinen Wert behaelt. Wenn der Collateral-Token (WBTC) zentralisiert ist, ergeben sich folgende Szenarien:

**Szenario A: Custodian mintet ungedecktes WBTC**

1. Custodian mintet 10.000 WBTC ohne BTC-Backing
2. Nutzer hinterlegen dieses WBTC als Collateral fuer JUSD-Positionen
3. Das Collateral ist wertlos → alle JUSD-Positionen sind ungedeckt
4. Challenge-Mechanismus greift nicht, weil WBTC on-chain weiterhin als WBTC erscheint

**Szenario B: Custodian brennt WBTC aus Positionen**

1. Custodian ruft `burnFrom(positionAddress, amount)` auf
2. Die Position verliert ihr Collateral
3. Die Position ist sofort unter-besichert
4. JUSD bleibt im Umlauf, aber ohne Deckung

**Szenario C: Custodian aendert Peg-Rate**

1. Custodian setzt Peg-Rate von 1:1 auf 1:0.5
2. Alle WBTC-Halter verlieren 50% ihres Werts
3. Alle JUSD-Positionen sind sofort unter-besichert

**Kernproblem:** Das JuiceDollar-Protokoll kann diese Szenarien **nicht erkennen und nicht verhindern**. Der Challenge-Mechanismus prueft Collateral-Mengen, nicht die tatsaechliche BTC-Deckung des WBTC.

### 4.3 Loesungsansaetze fuer das Custodian-Problem

**Loesungsansatz 1: Eigener WBTC-Contract mit verstaerkten Sicherheiten**

Statt den bestehenden WBTC-Contract zu nutzen, koennte ein eigener Wrapped-BTC-Token deployed werden mit:

- **Multisig-Custodian** (z.B. 3-von-5 Signaturen fuer Mint/Burn)
- **Timelock** (z.B. 24 Stunden Verzoegerung fuer Mint-Operationen)
- **Rate-Limit** (z.B. maximal 10 BTC pro Tag mintbar)
- **On-Chain-Attestation** (z.B. Bitcoin-TX-Hash als Mint-Parameter)

**Bewertung:** Technisch machbar auf OP_NET (OP-20S kann erweitert werden). Verbessert die Sicherheit signifikant, aber loest das Grundproblem nicht: Ein On-Chain-Proof-of-Reserve ist auf OP_NET nicht moeglich, solange keine trustless Bridge existiert.

**Loesungsansatz 2: PSBT-basiertes Collateral**

OP_NET unterstuetzt PSBT (Partially Signed Bitcoin Transactions). Theoretisch koennte Collateral als PSBT-Lock implementiert werden:

1. Nutzer erstellt ein PSBT, das BTC in einem Timelock-Script sperrt
2. Der Smart Contract verifiziert die PSBT-Outputs (`Blockchain.tx.outputs`)
3. Bei Repayment wird das Timelock-Script aufgeloest

**Bewertung:** Konzeptionell interessant, aber fundamental eingeschraenkt. OP_NET-Contracts koennen Outputs **verifizieren**, aber nicht **sperren**. Der Nutzer koennte das BTC parallel ausgeben (Double-Spend), da der Smart Contract keine UTXO-Locks erzwingen kann. Dieses Modell funktioniert nur fuer atomare Swaps, nicht fuer langfristige Besicherung.

**Loesungsansatz 3: Warten auf OP_LINK (Trustless Bridge)**

Die OP_NET-Dokumentation beschreibt OP_LINK als trustless Bridge fuer BTC ↔ WBTC. Zum jetzigen Zeitpunkt ist OP_LINK jedoch **nicht im WBTC-Contract-Code implementiert** — die `mint()`-Funktion hat keine Integration mit OP_LINK. Die Bridge-Logik existiert als Konzept, nicht als Code.

**Bewertung:** Wenn OP_LINK vollstaendig implementiert wird und der WBTC-Contract kryptographische BTC-Lock-Proofs vor dem Minting verlangt, waere das Custodian-Problem geloest. Der Zeitrahmen ist jedoch unbekannt.

**Loesungsansatz 4: Risiko akzeptieren und transparent kommunizieren**

Das WBTC-Custodian-Risiko ist vergleichbar mit WBTC auf Ethereum (BitGo-Custodian). Viele DeFi-Protokolle (MakerDAO, Aave, Compound) akzeptieren dieses Risiko.

**Bewertung:** Ehrlichster Ansatz. JUSD auf OP_NET waere nicht trustless im Sinne des Cypherpunk-Ideals, sondern **trust-minimized** — aehnlich wie WBTC-basierte Positionen auf Ethereum. Dies muesste offen kommuniziert werden und veraendert die Marktpositionierung.

---

## 5. Kritische Analyse: Challenge-Mechanismus

Der Challenge-Mechanismus ist JuiceDollars Alleinstellungsmerkmal: Statt Oracle-basierter Liquidation diszipliniert der Markt Positionen ueber Challenges. Dieser Abschnitt analysiert, ob dieser Mechanismus auf Bitcoin-L1-Blockzeiten funktioniert.

### 5.1 Preisfindung bei 10-Minuten-Blocks

**Wie die Dutch Auction funktioniert:**

Die Challenge-Auktion besteht aus zwei Phasen:
- **Phase 1 (Aversion):** Erste Haelfte der Challenge-Periode. Bidder koennen zum Liquidationspreis bieten und die Challenge abwenden.
- **Phase 2 (Dutch Auction):** Zweite Haelfte. Der akzeptierte Preis sinkt linear von Liquidationspreis auf Null.

Der Preis wird zeitbasiert berechnet:

```
unitPrice = liqPrice * timeRemaining / phaseDuration
```

**Granularitaet auf Citrea vs. OP_NET:**

| Parameter | Citrea (~10 Sek) | OP_NET (~10 Min) | Faktor |
|-----------|-----------------|-----------------|--------|
| Challenge-Periode (1 Tag) | 86.400 Sekunden | 86.400 Sekunden | Identisch |
| Blocks pro Periode | 8.640 | 144 | 60x weniger |
| Preis-Ticks in Phase 2 | 4.320 | 72 | 60x weniger |
| Preissprung pro Block | ~0,012% | **~0,7%** | 60x groesser |

**Konkretes Beispiel:**

Eine Position mit Liquidationspreis 20.000 JUSD/WBTC wird gechallengd. In Phase 2 sinkt der Preis linear:

- **Auf Citrea:** Preis faellt in 10-Sekunden-Schritten. Ein Bidder kann bei 19.998, 19.996, 19.994 JUSD/WBTC bieten — praezise Preisfindung.
- **Auf OP_NET:** Preis faellt in 10-Minuten-Schritten. Verfuegbare Preise: 20.000, 19.860, 19.720, 19.580... — Spruenge von **~140 JUSD/WBTC pro Block**.

Ein Bidder muss entscheiden: Biete ich im aktuellen Block (zu hoch) oder warte ich auf den naechsten Block (140 JUSD guenstiger)? Diese Entscheidung fuehrt zu einer **Warteoptimierung** statt einer **Preisoptimierung**: Wer am laengsten wartet, zahlt am wenigsten. Aber wer zu lange wartet, wird von einem anderen Bidder ueberboten.

**Technische Bewertung:** Die Preisfindung funktioniert mathematisch korrekt, ist aber **60x weniger granular**. Fuer grosse Positionen (z.B. 10 WBTC) bedeutet ein Preissprung von 0,7% pro Block einen Unterschied von ~1.400 JUSD pro Schritt — dies ueberschreitet typische Bid-Ask-Spreads bei weitem.

### 5.2 Oekonomische Tragfaehigkeit von Challenges

**Kapitalanforderung:**

Ein Challenger muss Collateral in gleicher Menge wie die gechallengede Position hinterlegen. Fuer eine 1-WBTC-Position muss der Challenger also 1 WBTC (~100.000 USD) bereitstellen.

**Reward-Berechnung:**

```
Challenger-Reward = Bid-Wert × 2%
```

**Beispiel:**

- Position: 1 WBTC, Liquidationspreis 80.000 JUSD/WBTC
- Marktpreis: 75.000 JUSD/WBTC (Position ist unter-besichert)
- Bidder kauft Collateral bei 74.000 JUSD/WBTC
- Challenger-Reward: 74.000 × 2% = **1.480 JUSD**
- Gebundenes Kapital: 1 WBTC fuer ~24 Stunden
- Transaktionskosten: ~5-20 USD (Challenge + evtl. Rueckzahlung)

**Annualisierte Rendite bei 4 erfolgreichen Challenges pro Jahr:**

```
4 × 1.480 JUSD / 100.000 USD = 5,9% p.a.
```

Allerdings setzt dies voraus, dass:
- 4 unter-besicherte Positionen pro Jahr existieren (abhaengig vom TVL)
- Der Bidder immer erscheint (auf einem Netzwerk mit <100 Nutzern unsicher)
- Kein Front-Running stattfindet (siehe 5.3)

**Auf einem Netzwerk mit niedrigem TVL (<100 BTC):**

Die Anzahl challengebarer Positionen korreliert mit der Gesamtzahl der Positionen. Bei 20 offenen Positionen und einer durchschnittlichen Collateral-Ratio von 150% werden statistisch 1-3 Positionen pro Jahr unter-besichert (bei BTC-Volatilitaet von ~60% p.a.).

**Bewertung:** Die oekonomische Tragfaehigkeit haengt direkt vom TVL und der Nutzerbasis ab. Bei niedrigem TVL gibt es zu wenige Challenges, um Kapital effizient einzusetzen. Bei hohem TVL (>1.000 BTC) wird der Mechanismus tragfaehig.

### 5.3 MEV und Front-Running in Auktionen

**OP_NET-Transaktionsordnung:**

Transaktionen werden sortiert nach: Gas-Preis → Priority Fee → Transaktions-ID. Diese Ordnung ist deterministisch und oeffentlich.

**Front-Running-Szenario:**

1. Bidder A sieht eine profitable Auktion und sendet `bid()` mit Gas-Preis X
2. Block-Produzent (oder ein Full-Node-Betreiber mit Mempool-Zugang) sieht Bidder As Transaktion
3. Block-Produzent sendet eigenen `bid()` mit Gas-Preis X+1 → wird **vor** Bidder A sortiert
4. Block-Produzent erhaelt das Collateral, Bidder As Transaktion revertiert (Challenge bereits erfuellt)

**Technische Begruendung:** OP_NET-Transaktionen sind im Bitcoin-Mempool sichtbar, bevor sie in einen Block aufgenommen werden. Da OP_NETs Sortierung deterministisch nach Gas-Preis ist, kann ein Angreifer mit hoeherem Gas-Preis jede profitable Transaktion front-runnen.

**Vergleich mit Citrea:** Citrea als ZK-Rollup hat einen Sequencer, der Transaktionen ordnet. Der Sequencer koennte theoretisch ebenfalls front-runnen, aber auf Citrea sind Blocks ~10 Sekunden — das Zeitfenster fuer Front-Running ist 60x kleiner.

**Bewertung:** Das Front-Running-Risiko existiert auf jeder Blockchain ohne private Mempool-Mechanismen. Auf OP_NET ist es durch die langen Blockzeiten (10 Minuten Zeitfenster) und die transparente Sortierung **besonders ausgepraegt**.

### 5.4 Reaktionsgeschwindigkeit bei Volatilitaet

**Szenario: BTC faellt 20% in 2 Stunden**

| Zeitpunkt | Aktion | Wartezeit |
|-----------|--------|-----------|
| T+0 Min | BTC beginnt zu fallen | - |
| T+10 Min | Erster Block mit Preis-Update | 10 Min |
| T+20 Min | Challenge-TX im Mempool | 20 Min |
| T+30 Min | Challenge bestaetigt (naechster Block) | 30 Min |
| T+12h 30 Min | Phase 1 (Aversion) endet | 12,5 Stunden |
| T+24h 30 Min | Phase 2 (Auction) endet, Liquidation | **24,5 Stunden** |

In diesen 24,5 Stunden kann BTC weitere 10-30% fallen. Die Position, die bei T+0 noch 120% besichert war, koennte bei Liquidation nur noch 80% besichert sein. Die Differenz traegt das Equity (JUICE-Reserven).

**Vergleich mit Citrea:** Auf Citrea laeuft die gesamte Kette in ~25 Minuten statt ~24,5 Stunden ab. Das Verlustrisiko waehrend der Wartezeit ist um den Faktor ~60 geringer.

**Technische Begruendung:** Die langsame Reaktion ist keine Eigenschaft des Protokoll-Designs, sondern eine fundamentale Eigenschaft von Bitcoin L1. 10-Minuten-Blocks koennen nicht beschleunigt werden — sie sind der Herzschlag des Bitcoin-Netzwerks.

### 5.5 Loesungsansaetze fuer das Challenge-Problem

**Loesungsansatz 1: Laengere Challenge-Perioden mit hoeheren Rewards**

| Parameter | Original (Citrea) | Angepasst (OP_NET) |
|-----------|-------------------|---------------------|
| Challenge-Periode | 1 Tag | 3-7 Tage |
| Challenger-Reward | 2% | 5-10% |
| Min. Besicherungsquote | ~120% | ~150-200% |

**Begruendung:** Laengere Perioden geben mehr Preis-Ticks in der Auktion (432-1.008 statt 144), hoehere Rewards machen Challenges oekonomisch attraktiver, und hoehere Besicherungsquoten schaffen einen groesseren Puffer fuer die langsamere Reaktion.

**Bewertung:** Verbessert die Situation signifikant, loest aber nicht das MEV-Problem und erfordert mehr gebundenes Kapital pro Position.

**Loesungsansatz 2: Governance-kontrollierte Notfall-Liquidation**

Zusaetzlich zum Challenge-System koennte ein **Deployer-kontrollierter Notfall-Mechanismus** implementiert werden:

- Deployer kann Positionen unter einer bestimmten Besicherungsquote direkt liquidieren
- Nur aktivierbar wenn Position <110% besichert (Sicherheitsmargin)
- Liquidation zum aktuellen besten verfuegbaren Preis

**Bewertung:** Widerspricht dem "oracle-free" Prinzip, da der Deployer einen Preis beurteilen muss. Aber als Sicherheitsnetz gegen extreme Volatilitaet sinnvoll, solange transparent kommuniziert.

**Loesungsansatz 3: Commit-Reveal-Bidding**

Statt offener Bids im Mempool koennte ein zweiphasiges Bidding implementiert werden:

1. **Commit-Phase:** Bidder submitted einen Hash ihres Bids (kein klartextlicher Preis)
2. **Reveal-Phase:** Nach Commit-Deadline enthuellen alle Bidder ihren tatsaechlichen Preis
3. **Hoechster Bid gewinnt**

**Begruendung:** Eliminiert Front-Running, da Block-Produzenten den Bid-Preis nicht sehen koennen, bevor alle Commits vorliegen.

**Bewertung:** Technisch machbar auf OP_NET (SHA-256 + Commit-Reveal-Pattern), aber erfordert ein fundamentales Redesign der Auktionsmechanik. Jeder Commit/Reveal benoetigt einen eigenen Bitcoin-Block (10 Minuten), was die Auktionsdauer verdoppelt.

**Loesungsansatz 4: Oracle als optionaler Fallback**

Das Protokoll koennte als **primaer oracle-free** positioniert werden, mit einem optionalen Oracle-Fallback fuer Notfaelle:

- Standard-Betrieb: Challenge-basierte Liquidation (wie heute)
- Notfall: Wenn kein Challenger innerhalb von X Stunden reagiert und die Besicherungsquote unter Y% faellt, wird ein externer Preis-Feed (z.B. via Signatur eines Trusted Oracle) als Trigger akzeptiert

**Bewertung:** Hybrides Modell, das die Vorteile beider Ansaetze kombiniert. Widerspricht teilweise dem "oracle-free" Narrativ, bietet aber praktischen Schutz. Die Oracle-Signatur koennte von mehreren unabhaengigen Parteien kommen (Threshold-Signature).

---

## 6. Kritische Analyse: Peg-Stabilitaet

### 6.1 Peg-Mechanismen auf Citrea vs. OP_NET

**Citrea (funktioniert):**

JUSD hat drei Peg-Stabilisierungsmechanismen:

1. **Stablecoin-Bridges:** 1:1 Konvertierung JUSD ↔ USDC/USDT. Wenn JUSD < $1, kaufen Arbitrageure JUSD und tauschen via Bridge gegen USDC → Preis steigt. Wenn JUSD > $1, tauschen sie USDC gegen JUSD und verkaufen → Preis sinkt. Harter Floor/Ceiling.

2. **Challenge-Mechanismus:** Unter-besicherte Positionen werden liquidiert → JUSD wird verbrannt → Supply sinkt → Preis steigt.

3. **Savings-Rate:** Hohe Savings-Rate zieht JUSD aus dem Umlauf → weniger Sell-Pressure → Preis stabilisiert sich.

**OP_NET (problematisch):**

1. **Stablecoin-Bridges:** Nicht moeglich — keine Stablecoins auf OP_NET vorhanden.
2. **Challenge-Mechanismus:** Oekonomisch fragwuerdig (siehe Abschnitt 5).
3. **Savings-Rate:** Nicht im MVP enthalten; selbst im vollstaendigen Protokoll abhaengig von funktionierender Governance.

**Verbleibendes Peg-Mechanismus auf OP_NET:**

Der einzige Peg-Mechanismus waere Arbitrage auf MotoSwap:
- JUSD < $1: Kaufe billig JUSD auf MotoSwap → repay Position → erhalte WBTC → verkaufe WBTC
- JUSD > $1: Oeffne Position → minte JUSD → verkaufe teuer auf MotoSwap

**Problem:** Dieser Mechanismus erfordert:
- Einen tiefen JUSD/WBTC-Pool auf MotoSwap (existiert noch nicht)
- Aktive Arbitrageure (auf einem 1 Monat alten Netzwerk unwahrscheinlich)
- Einen allgemein akzeptierten Dollar-Wert fuer WBTC (kein On-Chain-Oracle vorhanden)

### 6.2 Loesungsansaetze fuer die Peg-Stabilitaet

**Loesungsansatz 1: Eigenes StartUSD + Bootstrap-Bridge**

Identisch zum Citrea-Modell: Ein einfaches OP-20-Token (StartUSD) wird deployed, und eine Bridge konvertiert StartUSD 1:1 zu JUSD. Der Deployer mintet initiales StartUSD und stellt ueber die Bridge die erste JUSD-Liquiditaet bereit.

**Bewertung:** Loest das initiale Liquiditaetsproblem, aber schafft keinen dauerhaften Peg-Floor, da StartUSD selbst keinen externen Wert hat.

**Loesungsansatz 2: Warten auf OP-20S Stablecoins**

Der OP-20S-Standard fuer Stablecoins ist fuer Q2 2026 angekuendigt. Wenn USDC oder USDT auf OP_NET verfuegbar werden, koennen Bridges analog zum Citrea-Modell implementiert werden.

**Bewertung:** Wuerde das Peg-Problem vollstaendig loesen, aber der Zeitrahmen ist ungewiss.

**Loesungsansatz 3: Aggressives Liquidity Mining auf MotoSwap**

Der Deployer stellt einen signifikanten Teil der initialen JUSD-Mints als Liquiditaet in einem JUSD/WBTC-Pool auf MotoSwap bereit. Zusaetzlich koennten Liquiditaets-Anreize (z.B. via eines Reward-Tokens) Liquidity Provider anziehen.

**Bewertung:** Erfordert signifikantes Eigenkapital des Deployers. Ohne externe Stablecoins bleibt der Peg dennoch "weich" — er stuetzt sich auf Marktvertrauen, nicht auf Arbitrage-Mechanismen.

---

## 7. Oekosystem-Analyse

### 7.1 Netzwerk-Reife und Status

| Merkmal | Status | Bewertung |
|---------|--------|-----------|
| Mainnet-Launch | 19. Maerz 2026 (1 Monat alt) | Sehr frueh |
| Finanzierung | 5 Mio. USD | Solide fuer fruehes Projekt |
| TVL | Nicht messbar (kein DefiLlama) | Unbekannt |
| Medienberichterstattung | CoinDesk, CoinTelegraph, The Defiant | Positiv |
| GitHub-Aktivitaet | 69 Repos, aktive Entwicklung | Gut |
| Community | Telegram, Discord, X | Nicht bezifferbar |
| Sicherheitsaudit | Runtime auditiert von Verichains | Basis vorhanden |
| Node-Version | 1.0.3 | Stabil |

### 7.2 Vorhandene Infrastruktur

**DeFi-Protokolle:**

| Protokoll | Typ | Status |
|-----------|-----|--------|
| MotoSwap | AMM DEX | Live |
| MotoChef | Yield Farming | Live |
| NativeSwap | Zwei-Phasen-AMM | Live |

**Fehlende Infrastruktur:**

- Keine Stablecoins
- Kein Lending-Protokoll
- Kein Block-Explorer (vergleichbar mit Etherscan)
- Kein DefiLlama-Listing
- Keine Preis-Aggregator-Anbindung

### 7.3 Wallet-Support und Developer Tooling

**Wallet-Support:**

| Wallet | Status |
|--------|--------|
| OP_WALLET (Chrome Extension) | Einzige Option |
| WalletConnect | SDK vorhanden, Integration in Arbeit |
| Hardware-Wallets | Nicht unterstuetzt |

**Developer Tooling:**

| Tool | Beschreibung | Bewertung |
|------|-------------|-----------|
| btc-runtime | Contract-Runtime | Vollstaendig |
| opnet SDK | Client-Library | Vollstaendig |
| opnet-cli | Kompilierung, Deployment | Vollstaendig |
| opnet-transform | ABI-Generator | Vollstaendig |
| unit-test-framework | Test-Framework | Vollstaendig |
| example-contracts | Referenz-Implementierungen | Gut |

**Bewertung:** Das Developer Tooling ist ueberraschend komplett fuer ein 1 Monat altes Netzwerk. Komplexe Referenz-Implementierungen (NativeSwap mit 34 Contract-Dateien, MotoChef mit Factory-Pattern) existieren als Vorlagen.

---

## 8. Was funktioniert — Technisch machbare Komponenten

Die folgende Tabelle listet alle Komponenten des JuiceDollar-Protokolls, die auf OP_NET technisch machbar sind, mit Begruendung.

| Komponente | Machbarkeit | Technische Begruendung |
|-----------|------------|----------------------|
| **JUSD Token (OP-20)** | Ja | OP-20-Standard deckt alle Funktionen ab. Minter-Registry via AddressMemoryMap. Reserve-Tracking via StoredU256. |
| **JUICE Token (OP-20)** | Ja | Basis-Token als OP-20. Voting-Power-Berechnung (Balance × Haltedauer) via Timestamps und u256-Math. |
| **Position Contract** | Ja | Eigenstaendiger Contract mit eigenem State. Collateral via WBTC.transferFrom(). Interest-Accrual via MTP-Timestamps. |
| **MintingHub + Factory** | Ja | `deployContractFromExisting()` fuer Position-Klone. Minter-Registrierung via Cross-Contract-Call zu JUSD. |
| **Position Cloning** | Ja | Identisch zum Factory-Pattern. Salt-basierte deterministische Adressen. |
| **Lineare Zinsberechnung** | Ja | `interest = principal × rate × deltaTime / (365d × 1M²)` — reine u256-Arithmetik mit SafeMath. |
| **Reserve-Mechanismus** | Ja | `mintWithReserve()` trackt Reserve-Anteil im JUSD-Contract. Verlustabsorption via `coverLoss()`. |
| **Savings/Leadrate** | Ja | Ticks-basierte Berechnung (PPM-Sekunden) ist reine Mathematik. Keine Plattform-Abhaengigkeit. |
| **Collateral Withdrawal** | Ja | Pruefung `collateral × price >= required`, dann WBTC.transfer() an Owner. |
| **Price Adjustment** | Ja | Cooldown via MTP-Vergleich. Preissenkung jederzeit, Preiserhoehung mit 3-Tage-Cooldown. |
| **Frontend Rewards** | Ja | Gateway-Pattern mit bytes32 Frontend-Codes. Reward-Tracking via Storage Maps. |
| **Reentrancy-Schutz** | Ja | Nativ in OP_NET eingebaut (ReentrancyGuard mit STANDARD oder CALLBACK Level). |
| **ERC-4626 Vault (Savings)** | Ja | Kein Standard auf OP_NET, aber manuell als OP-20 mit Vault-Logik implementierbar. Virtual Shares Pattern in u256. |
| **10. Wurzel (JUICE Shares)** | Ja | Newton-Iteration in u256: ~50-100 Zeilen, gas-effizient. |
| **Position Roller** | Ja | Kein Flash-Loan noetig. Roller wird als Minter registriert und fuehrt atomare Cross-Calls aus: mint → repay → deposit. |

---

## 9. Was nicht funktioniert — Fundamentale Einschraenkungen

| Problem | Schwere | Technische Begruendung | Loesung moeglich? |
|---------|---------|----------------------|-------------------|
| **WBTC ist zentralisiert (Single-Key Custodian)** | Kritisch | OP-20S-Code: `_onlyCustodian()` prueft einen einzelnen StoredAddress. Kein Multisig, kein Timelock, kein Proof-of-Reserve. Custodian kann unbegrenzt minten und von jeder Adresse brennen. | Eigener WBTC-Contract mit Multisig + Timelock (verbessert, aber nicht trustless). Oder Warten auf OP_LINK Trustless Bridge. |
| **Challenge-Oekonomie bei niedrigem TVL** | Kritisch | Bei <100 BTC TVL: ~1-3 challengebare Positionen/Jahr. Challenger bindet 1 WBTC fuer 24h fuer ~1.480 JUSD Reward. Annualisiert <6% bei optimistischen Annahmen — unattraktiv gegenueber Alternativen. | Hoehere Rewards (5-10%) + laengere Challenge-Perioden (3-7 Tage) verbessern die Attraktivitaet. Skaliert mit TVL. |
| **Dutch Auction: 60x grobere Preisfindung** | Hoch | 144 Blocks/Tag statt 8.640. Preissprung pro Block: ~0,7% statt ~0,012%. Bei 10-WBTC-Position: ~1.400 JUSD Differenz pro Preisschritt. | Laengere Auktionsphasen (3-7 Tage → 432-1.008 Ticks). Alternativ: Commit-Reveal-Bidding (eliminiert auch Front-Running). |
| **MEV/Front-Running in Auktionen** | Hoch | Deterministisch oeffentliche TX-Sortierung (Gas-Preis → Priority Fee → TX-ID). Block-Produzenten sehen alle Bids 10 Min vor Inklusion. | Commit-Reveal-Bidding (2 Phasen: Hash-Commit, dann Reveal). Oder Encrypted-Mempool (nicht verfuegbar auf OP_NET). |
| **Keine Peg-Stabilisierung ohne Stablecoins** | Hoch | Auf Citrea: USDC/USDT-Bridges schaffen harten Floor/Ceiling. Auf OP_NET: keine Stablecoins → kein Arbitrage-Mechanismus → Peg rein marktbasiert. | Warten auf OP-20S Stablecoins (Q2 2026 angekuendigt). Oder eigene Bootstrap-Bridge mit StartUSD. |
| **24h Liquidationsverzoegerung** | Mittel | Bitcoin L1: 10 Min/Block. Challenge → Aversion (12h) → Auction (12h) = 24h. In dieser Zeit kann BTC weitere 20-30% fallen. | Hoehere Min-Besicherungsquote (150-200% statt 120%). Kuerzere Challenge-Perioden fuer kleine Positionen. Notfall-Liquidation durch Deployer. |
| **Einziges Wallet** | Mittel | Nur OP_WALLET (Chrome Extension). Kein Hardware-Wallet-Support, kein Mobile-Wallet. | WalletConnect-Integration in Arbeit. Hardware-Wallet-Support abhaengig vom OP_NET-Oekosystem. |
| **Kein Audit-Oekosystem fuer AssemblyScript** | Mittel | Verichains auditierte die Runtime, aber keine etablierten Audit-Firmen fuer OP_NET Application-Level Contracts. | Internes Review, Community-Audit, Open-Source. Oder Audit-Firma beauftragen, die bereit ist, WASM-Contracts zu pruefen. |

---

## 10. Risikobewertung

### Technische Risiken

| Risiko | Schwere | Wahrscheinlichkeit | Mitigation |
|--------|---------|---------------------|------------|
| AssemblyScript-Bugs in Contract-Logik | Hoch | Mittel | Umfangreiche Unit Tests, SafeMath, Code Review |
| Gas-Spikes bei BTC-Congestion | Mittel | Mittel | Deferred Execution Queue (OIP-0001), keine zeitkritischen TXs |
| WASM-VM-Bugs | Hoch | Niedrig | Runtime auditiert von Verichains |
| Event-Groessen-Limit (352 Bytes) | Niedrig | Sicher | Events redesignen, Felder reduzieren |
| Decimal-Fehler (8 vs 18) | Hoch | Mittel | Exhaustive Tests aller Preisberechnungen |

### Oekosystem-Risiken

| Risiko | Schwere | Wahrscheinlichkeit | Mitigation |
|--------|---------|---------------------|------------|
| OP_NET Netzwerk-Instabilitaet | Kritisch | Mittel | Testnet zuerst, Mainnet erst nach Validation |
| WBTC-Custodian-Ausfall/Rug-Pull | Kritisch | Niedrig | Eigener WBTC-Contract mit Multisig, Monitoring |
| OP_NET-Projekt scheitert | Kritisch | Mittel | MVP begrenzt Investment, Code-Learnings transferierbar |
| Geringe Nutzerbasis | Hoch | Hoch | First-Mover-Effekt, MotoSwap-Integration |
| Fehlende Audit-Firmen | Mittel | Hoch | Open-Source, Community Review |

### Strategische Risiken

| Risiko | Schwere | Wahrscheinlichkeit | Mitigation |
|--------|---------|---------------------|------------|
| Reputationsrisiko bei Exploit | Hoch | Niedrig | Konservatives Limit-Setting, schrittweises Wachstum |
| Widerspruch zum "trustless" Narrativ | Mittel | Hoch | Transparente Kommunikation, WBTC-Risiko klar benennen |
| Kannibalisierung des Citrea-Deployments | Niedrig | Niedrig | Verschiedene Zielgruppen |

---

## 11. Aufwandsschaetzung

### 11.1 MVP-Phasen (Minimal Viable Stablecoin)

| Phase | Dauer | Beschreibung |
|-------|-------|--------------|
| Phase 1: Setup + JUSD Token | 1 Woche | Repository, Toolchain, OP-20 + Minter-Registry + Reserve |
| Phase 2: Position Contract | 2 Wochen | Collateral, Minting, Repayment, Interest, Price Adjustment |
| Phase 3: MintingHub + Factory | 2 Wochen | Position-Factory, Cloning, Opening Fee |
| Phase 4: Challenge-System | 2 Wochen | Angepasste Dutch Auction, Bidding, Forced Sales |
| Phase 5: Integration + Testnet | 1 Woche | E2E Tests, Testnet-Deploy, Genesis Position |
| **Gesamt MVP** | **~8 Wochen** | 3 Contracts, angepasstes Challenge-System |

### 11.2 Vollstaendiges Protokoll (nach erfolgreichem MVP)

| Phase | Dauer | Beschreibung |
|-------|-------|--------------|
| Phase 6: JUICE/Equity | 3 Wochen | Governance-Token, Voting, nth-Root-Math |
| Phase 7: Leadrate + Savings | 2 Wochen | Dynamischer Zinssatz, Savings-Vault |
| Phase 8: Bridges + Roller | 2 Wochen | StablecoinBridge (wenn Gegen-Token verfuegbar) |
| Phase 9: Gateways + Peripherie | 1 Woche | Frontend-Rewards, TeamMinter |
| Phase 10: Off-Chain-Stack | 4 Wochen | Indexer, API, Frontend |
| Phase 11: Audit + Hardening | 4-6 Wochen | Externer Review, Gas-Optimierung |
| **Gesamt (ab MVP)** | **+16-18 Wochen** | |
| **Gesamtaufwand** | **~24-26 Wochen** | ~6 Monate |

---

## 12. Handlungsoptionen

### Option A: MVP mit angepasstem Design

**Beschreibung:** Implementierung eines Minimal Viable Stablecoin mit drei Kern-Contracts (JUSD, MintingHub, Position) und angepassten Parametern:

- Laengere Challenge-Perioden (3-7 Tage)
- Hoehere Challenger-Rewards (5-10%)
- Hoehere Mindest-Besicherungsquote (150-200%)
- Deployer-kontrollierte Notfall-Liquidation als Backup
- Transparente Kommunikation des WBTC-Custodian-Risikos

**Aufwand:** ~8 Wochen
**Risiko:** Mittel — begrenztes Investment, aber Reputationsrisiko
**Chance:** First-Mover als erster Stablecoin auf OP_NET

### Option B: Abwarten und beobachten

**Beschreibung:** Kein aktives Development, aber aktives Monitoring von:
- OP_LINK-Entwicklung (Trustless Bridge → loest WBTC-Problem)
- OP-20S Stablecoin-Standard (→ loest Peg-Problem)
- TVL-Entwicklung (→ verbessert Challenge-Oekonomie)
- Wallet-Support-Entwicklung
- Zweites/drittes DeFi-Protokoll auf OP_NET

**Aufwand:** Minimal (Monitoring)
**Risiko:** Niedrig — kein Investment, aber Verlust der First-Mover-Position
**Chance:** Bessere Entscheidungsgrundlage in 3-6 Monaten

### Option C: Hybrides Protokoll-Design

**Beschreibung:** Statt einer 1:1-Portierung ein **fuer Bitcoin L1 optimiertes Design** entwickeln:

- Primaar oracle-free mit optionalem Oracle-Fallback
- Commit-Reveal-Bidding statt offener Dutch Auction
- Eigener WBTC-Contract mit Multisig + Timelock
- Governance-kontrollierte Parameter (Challenge-Dauer, Rewards dynamisch anpassbar)
- Savings-Rate als Peg-Stabilisator

**Aufwand:** ~12-16 Wochen (mehr Design-Arbeit als Option A)
**Risiko:** Mittel-Hoch — groesseres Investment, aber robusteres Produkt
**Chance:** Differenziertes Produkt, das Bitcoins Eigenschaften respektiert

### Option D: Kein Deployment auf OP_NET

**Beschreibung:** Entscheidung, dass die fundamentalen Einschraenkungen (zentralisiertes WBTC, Challenge-Oekonomie, fehlende Peg-Stabilisierung) nicht mit JuiceDollars Wertversprechen vereinbar sind. Fokus bleibt auf Citrea.

**Aufwand:** Keiner
**Risiko:** Keiner — aber verpasste Chance, falls OP_NET wachst
**Chance:** Ressourcen-Fokus auf bewaehrte Plattform

---

## 13. Empfehlung

Die Analyse zeigt, dass eine **1:1-Portierung des JuiceDollar-Konzepts auf OP_NET nicht sinnvoll** ist. Die drei Saeulen des Protokolls — trustless Collateral, oracle-freie Liquidation, Peg-Stabilitaet — sind auf der aktuellen OP_NET-Plattform kompromittiert.

**Empfohlen: Option B (Abwarten) mit Vorbereitung auf Option C (Hybrides Design)**

1. **Kurzfristig (Q2 2026):** Aktives Monitoring der OP_NET-Entwicklung, insbesondere:
   - OP_LINK Trustless Bridge (loest WBTC-Problem)
   - OP-20S Stablecoin-Standard (loest Peg-Problem)
   - TVL-Wachstum und Nutzerbasis

2. **Mittelfristig (Q3 2026):** Falls die oben genannten Meilensteine erreicht werden, Beginn eines hybriden Protokoll-Designs, das Bitcoin-L1-Eigenschaften respektiert (Option C).

3. **Go/No-Go-Kriterien fuer aktives Development:**
   - Trustless WBTC-Bridge verfuegbar ODER eigener Multisig-WBTC-Contract machbar
   - Mindestens ein weiterer Stablecoin auf OP_NET
   - >50 BTC TVL im OP_NET-Oekosystem
   - Mindestens 2 Wallets mit OP_NET-Support

**Falls sofortiges Handeln gewuenscht:** Option A (MVP mit angepasstem Design) ist machbar, erfordert aber ehrliche Kommunikation, dass JUSD auf OP_NET **nicht das gleiche Sicherheitsmodell** wie auf Citrea bietet.

---

## 14. Anhang

### A. Technische Vergleichstabellen

**A.1 Plattform-Vergleich: Citrea vs. OP_NET**

| Eigenschaft | Citrea | OP_NET |
|-------------|--------|--------|
| Typ | ZK-Rollup (Bitcoin L2) | Consensus Layer (Bitcoin L1) |
| Smart-Contract-Sprache | Solidity | AssemblyScript (WASM) |
| Blockzeit | ~10 Sekunden | ~10 Minuten |
| Finalitaet | Sofort (L2), ~10 Min (L1) | ~50 Min (Epoch), ~200 Min (full) |
| Gas-Token | cBTC | BTC (Satoshis) |
| Token-Standard | ERC-20 | OP-20 |
| Max Gas/TX | Chain-abhaengig | 150 Mrd. |
| Wrapped BTC | cBTC (18 Decimals) | WBTC (8 Decimals) |
| BTC-Wrapping | Dezentrale Bridge | PoA Single-Key Custodian |
| Wallet-Support | MetaMask, WalletConnect | OP_WALLET |
| Block Explorer | CitreaScan | Nicht vorhanden |
| Quantum-Resistenz | Nein | Ja (ML-DSA) |
| Mainnet seit | Januar 2026 | Maerz 2026 |
| Stablecoins verfuegbar | USDC, USDT, CTUSD | Keine |

**A.2 Gas-Kosten: Kritische Operationen**

| Operation | Gas-Kosten (OP_NET) | % des TX-Limits |
|-----------|---------------------|-----------------|
| Position oeffnen (Worst Case) | ~2,7 Mrd. | 1,8% |
| Challenge starten | ~1,5 Mrd. | 1,0% |
| Bid auf Auktion | ~1,0 Mrd. | 0,7% |
| Savings Deposit | ~800 Mio. | 0,5% |
| JUICE Investment | ~1,2 Mrd. | 0,8% |

**A.3 Challenge-Mechanismus: Citrea vs. OP_NET**

| Parameter | Citrea | OP_NET | Auswirkung |
|-----------|--------|--------|------------|
| Preis-Ticks/Tag | 8.640 | 144 | 60x grobere Preisfindung |
| Preissprung/Block | 0,012% | 0,7% | Signifikanter bei grossen Positionen |
| Liquidationszeit | ~25 Min | ~24,5 Std | 60x langsamer |
| Front-Running-Fenster | 10 Sek | 10 Min | 60x mehr Zeit fuer Angreifer |
| Challenger-ROI (geschaetzt) | ~20% p.a. | <6% p.a. | Deutlich unattraktiver |

### B. Contract-Interface-Spezifikation (MVP)

**B.1 JUSD Token**

```
Geerbte OP-20-Methoden:
  name() -> string
  symbol() -> string
  decimals() -> u8
  totalSupply() -> u256
  balanceOf(owner: Address) -> u256
  transfer(to: Address, amount: u256)
  transferFrom(from: Address, to: Address, amount: u256)
  increaseAllowance(spender: Address, amount: u256)
  decreaseAllowance(spender: Address, amount: u256)
  burn(amount: u256)

Custom Methoden:
  isMinter(address: Address) -> bool
  registerMinter(address: Address)                                   [onlyDeployer]
  removeMinter(address: Address)                                     [onlyDeployer]
  mintWithReserve(target: Address, amount: u256, reservePPM: u256)   [onlyMinter]
  burnWithReserve(amount: u256, reservePPM: u256)                    [onlyMinter]
  burnFromWithReserve(owner: Address, amount: u256, reservePPM: u256) [onlyMinter]
  minterReserve() -> u256
  interestRatePPM() -> u256
  setInterestRate(newRatePPM: u256)                                  [onlyDeployer]
  coverLoss(amount: u256)
```

**B.2 MintingHub**

```
Position-Management:
  openPosition(collateral, minCollateral, initialCollateral, mintingMaximum,
               initPeriodSeconds, expirationSeconds, challengeSeconds,
               riskPremiumPPM, liqPrice, reservePPM) -> Address
  clonePosition(existing, initialCollateral, mintAmount, expirationSeconds) -> Address

Challenge-System:
  challenge(position: Address, collateralAmount: u256) -> u256 (challengeId)
  bid(challengeId: u256, size: u256)
  forceSale(position: Address, amount: u256)

Queries:
  getChallenge(challengeId: u256) -> (challenger, position, size, start, filledSize)
```

**B.3 Position (Template)**

```
Owner-Aktionen:
  mint(target: Address, amount: u256)
  repay(amount: u256)
  adjustPrice(newPrice: u256)
  withdrawCollateral(target: Address, amount: u256)

Queries:
  getPosition() -> (owner, collateral, price, principal, interest, limit,
                    expiration, reservePPM, challengedAmount, cooldown)
  isExpired() -> bool
  isClosed() -> bool

Hub-Only (Cross-Contract):
  notifyChallengeStarted(amount: u256)
  notifyChallengeAverted(amount: u256)
  notifyChallengeSucceeded(amount: u256, bidAmount: u256)
  notifyForceSale(amount: u256)
  deny()
```

### C. Referenzen und Quellen

**OP_NET Dokumentation und Code:**

- [OP_NET Documentation](https://docs.opnet.org/)
- [btc-runtime](https://github.com/btc-vision/btc-runtime) — Smart-Contract-Runtime
- [opnet SDK](https://github.com/btc-vision/opnet) — Client-Library
- [example-contracts](https://github.com/btc-vision/example-contracts) — Referenz-Implementierungen
- [op-vm (Rust)](https://github.com/btc-vision/op-vm) — VM-Engine mit Gas-Konstanten
- [OIP-0001 bis OIP-0004](https://github.com/btc-vision/OIP) — Improvement Proposals
- [OP20S.ts](https://github.com/btc-vision/btc-runtime) — Pegged Token Standard (WBTC-Basis)
- [NativeSwap](https://github.com/btc-vision/native-swap) — Komplexe DeFi-Referenz

**OP_NET Medienberichterstattung:**

- CoinDesk: "Bitcoin layer-1 smart-contract platform OpNet debuts" (19. Maerz 2026)
- The Defiant: "Bitcoin Gets Native DeFi Stack as OP_NET Goes Live" (Maerz 2026)
- CoinTelegraph: "OP_NET Launches SlowFi DeFi Stack" (Maerz 2026)

**JuiceDollar Protokoll:**

- [JuiceDollar Documentation](https://docs.juicedollar.com/)
- [JuiceDollar Smart Contracts](https://github.com/JuiceDollar/smartContracts) — Solidity (15 Contracts, 204 Funktionen)
- [JuiceDollar App](https://bapp.juicedollar.com/)

**Sicherheitsaudits:**

- Verichains — OP_NET Runtime Audit (Runtime, OP-20/OP-721, SafeMath, ReentrancyGuard)

---

*Diese Machbarkeitsstudie basiert auf vollstaendiger Code-Review der OP_NET-Runtime (btc-runtime, op-vm Gas-Konstanten, OP20S.ts, MyPeggedToken.ts), der JuiceDollar-Smart-Contracts (15 Solidity Contracts, 204 Funktionen), der OP_NET-Referenz-Implementierungen (NativeSwap, MotoChef), sowie oeffentlich verfuegbaren Informationen ueber den Netzwerkstatus (Stand: April 2026).*
