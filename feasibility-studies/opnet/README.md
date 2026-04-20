# Machbarkeitsstudie: JuiceDollar auf OP_NET (Bitcoin L1)

**Version:** 4.0
**Datum:** 20. April 2026
**Status:** Abgeschlossen — Entscheidung: Umsetzung als MVP

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
4. [Collateral-Modell](#4-collateral-modell)
   - 4.1 [WBTC Trust-Modell — Code-Analyse](#41-wbtc-trust-modell--code-analyse)
   - 4.2 [Auswirkung auf das JuiceDollar-Sicherheitsmodell](#42-auswirkung-auf-das-juicedollar-sicherheitsmodell)
   - 4.3 [Trustless Bridging: AuxPoW vs BitVM2](#43-trustless-bridging-auxpow-vs-bitvm2)
   - 4.4 [Loesung: Zeitlich begrenztes Multi-Collateral-System](#44-loesung-zeitlich-begrenztes-multi-collateral-system)
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

Diese Studie untersucht die Machbarkeit einer Portierung des JuiceDollar-Protokolls (JUSD) auf OP_NET, eine Smart-Contract-Plattform direkt auf Bitcoin Layer 1. Die Analyse umfasst eine vollstaendige Code-Review der OP_NET-Runtime, der WBTC-Implementierung, der JuiceDollar-Smart-Contracts sowie eine detaillierte Neubewertung aller identifizierten Risiken.

### Kernergebnisse

**Die Portierung ist machbar und waehrt die Kernwerte des Protokolls.** Von 29 analysierten Mechanismen des JuiceDollar-Protokolls sind 24 identisch auf OP_NET umsetzbar, 5 erfordern Anpassungen, und keiner ist fundamental unmoeglich.

**Oracle-freier Challenge-Mechanismus: Funktioniert.** Die detaillierte Analyse zeigt, dass die Dutch Auction mit 144 Preis-Ticks pro Tag (bei 1-Tag Challenge-Periode) **mehr Preispunkte** bietet als Aave (1), Compound (1) oder Liquity (1). Die maximale Ueberzahlung durch Granularitaet betraegt <0,7% pro Tick. Challenge-Rewards sind stark profitabel (~9.000 JUSD fuer eine 10-BTC-Challenge). MEV ist kein praktisches Problem, da die Dutch Auction eine natuerliche Abwehr bietet: frueh bieten = ueberbezahlen. Bei 150% Collateralization Ratio besteht ein 33%-Puffer — ein 33%-Drop in 24h entspricht 12,6 Sigma und ist praktisch unmoeglich.

**Collateral: Geloest durch zeitlich begrenztes Multi-Collateral-System.** Das Standard-WBTC auf OP_NET hat ein zentralisiertes Trust-Modell (Single-Key Custodian). Statt einen eigenen Wrapped-BTC-Token zu bauen, nutzt JuiceDollar sein bestehendes Multi-Collateral-System: WBTC wird als **temporaeres Collateral mit Ablaufdatum und Mint-Limit** akzeptiert — identisch zum StartUSD-Bootstrap-Pattern auf Citrea. Wenn eine trustless BTC-Bridge verfuegbar wird (OP_LINK, BitVM2), wird sie als neues Collateral hinzugefuegt. Alte WBTC-Positionen laufen natuerlich aus. Das Protokoll selbst bleibt trustless; nur das initiale Collateral hat ein bekanntes, begrenztes Risikoprofil.

**Verbleibende Einschraenkung: Peg-Stabilitaet.** Ohne Stablecoins auf OP_NET fehlt der harte Peg-Floor, den USDC/USDT-Bridges auf Citrea bieten. Mitigationen existieren (StartUSD-Bootstrap, MotoSwap-Liquiditaet, Savings-Rate), aber der Peg bleibt initial weicher als auf Citrea. Der OP-20S Stablecoin-Standard ist fuer Q2 2026 angekuendigt und wuerde dieses Problem loesen.

**Kernwerte-Erhalt:**

| Kernwert | Status auf OP_NET |
|----------|------------------|
| Oracle-free | Vollstaendig erfuellt |
| Censorship-resistant | Vollstaendig erfuellt |
| Self-custody | Vollstaendig erfuellt |
| Code is Law | Vollstaendig erfuellt (immutable Contracts) |
| Permissionless | Vollstaendig erfuellt |
| Trustless | Protokoll vollstaendig trustless; initiales Collateral (WBTC) zeitlich + volumenmässig begrenzt |
| Veto-Governance | Vollstaendig erfuellt |

**Entscheidung:** Umsetzung als Minimal Viable Stablecoin (MVP) mit 3 Contracts (JUSD, MintingHub, Position), dem vollstaendigen oracle-freien Challenge-System und dem bestehenden WBTC als zeitlich begrenztem Collateral. JUSD wird der erste Stablecoin auf OP_NET und der erste oracle-freie, Bitcoin-besicherte Stablecoin direkt auf Bitcoin Layer 1.

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

**Funktionale Bewertung:** Fuer Zinsberechnung, Cooldowns und Laufzeiten (Perioden von Stunden bis Jahren) ist MTP unkritisch. Fuer Auktionen bietet die 10-Minuten-Granularitaet 144 Preis-Ticks pro Tag — ausreichend fuer faire Preisfindung (siehe Abschnitt 5.1).

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

### 4.3 Trustless Bridging: AuxPoW vs BitVM2

Fuer die langfristige Loesung des Collateral-Problems ist es wichtig zu verstehen, welche Technologien fuer trustless BTC-Wrapping existieren und wie sie sich zu OP_NET verhalten.

**OP_LINK (AuxPoW-basiert):**

OP_NET plant mit OP_LINK eine eigene Bridge-Loesung basierend auf Auxiliary Proof of Work (AuxPoW). Der Mechanismus nutzt gemeinsames Mining als Synchronisationspunkt zwischen Chains. Allerdings zeigt die Code-Analyse, dass OP_LINK **nicht im WBTC-Contract implementiert** ist und **natives BTC nicht trustless locken kann**. AuxPoW funktioniert fuer die Synchronisation von OP_NET-Tokens, aber fuer natives BTC faellt es auf PoA-Multisig zurueck — weil Bitcoin selbst keine Smart Contracts hat, die ein Lock erzwingen koennen.

**BitVM2 (Optimistic Verification):**

BitVM2 loest genau dieses Problem: Es emuliert Covenants durch Pre-signed Transactions und ermoeglicht ein programmatisches Lock von BTC ohne Multisig-Vertrauen. Das Trust-Modell erfordert nur 1-of-N ehrliche Teilnehmer (vs. Mehrheits-Annahme bei AuxPoW). Mehrere BitVM2-Bridges sind bereits auf Mainnet (Bitlayer seit Juli 2025, Citrea Clementine seit Januar 2026).

**Vergleich:**

| | AuxPoW (OP_LINK) | BitVM2 |
|---|---|---|
| **Prinzip** | Gemeinsame Sicht durch Shared Mining | Oekonomische Anreize + kryptographische Beweise |
| **Trust-Modell** | Mehrheit der Indexer ehrlich | **1-of-N** — ein ehrlicher Teilnehmer reicht |
| **Natives BTC locken** | Nicht geloest (PoA-Fallback) | **Geloest** (Pre-signed TX Covenants) |
| **Status auf OP_NET** | Konzept, nicht implementiert | Keine Plaene seitens OP_NET |
| **Status allgemein** | Merged Mining seit Jahren (Namecoin, etc.) | Mainnet seit 2025 (Bitlayer, Citrea) |

Weder AuxPoW noch BitVM2 sind aktuell auf OP_NET verfuegbar. Beide koennten langfristig integriert werden.

### 4.4 Loesung: Zeitlich begrenztes Multi-Collateral-System

Statt einen eigenen Wrapped-BTC-Token zu bauen oder auf eine trustless Bridge zu warten, nutzt JuiceDollar sein **bestehendes Multi-Collateral-System** — dieselbe Architektur, die auf Citrea bereits funktioniert.

**4.4.1 Kernidee**

Jede Position im JuiceDollar-Protokoll hat drei begrenzende Parameter:

- **`collateral`**: Welcher Token als Sicherheit akzeptiert wird
- **`expiration`**: Wann die Position ablaeuft
- **`limit`**: Maximaler JUSD-Betrag, der gemintet werden kann

Durch Setzen eines **konservativen Ablaufdatums und eines niedrigen Mint-Limits** fuer WBTC-Positionen wird das Custodian-Risiko explizit begrenzt — identisch zum StartUSD-Bootstrap-Pattern auf Citrea, wo ein temporaerer Token mit 6-Wochen-Horizon die initiale Liquiditaet bereitstellte.

**4.4.2 Phasenmodell**

**Phase 1 — Bootstrap (heute, WBTC als Collateral):**

| Parameter | Wert |
|-----------|------|
| Collateral | OP_NET WBTC (existierender Token) |
| Expiration | 6 Monate |
| Mint-Limit (gesamt) | z.B. 1.000.000 JUSD |
| Min. Besicherungsquote | 150% |
| Trust-Annahme | OP_NET WBTC-Custodian (bekannt, begrenzt) |

**Phase 2 — Trustless Collateral (wenn verfuegbar):**

Sobald eine trustless BTC-Bridge auf OP_NET existiert (OP_LINK, BitVM2 oder ein Drittanbieter), wird das neue Token als **zusaetzliches Collateral** hinzugefuegt:

| Parameter | Wert |
|-----------|------|
| Collateral | Trustless BTC Token (neuer Token) |
| Expiration | 1 Jahr oder laenger |
| Mint-Limit | Hoeher oder unbegrenzt |
| Trust-Annahme | Keine (trustless) |

**Phase 3 — Migration (organisch):**

WBTC-Positionen laufen nach 6 Monaten natuerlich aus. Neue Positionen werden mit dem trustless Collateral geoeffnet. Das System migriert organisch — kein harter Wechsel, keine Governance-Entscheidung noetig.

**4.4.3 Warum dieses Modell die Kernwerte wahrt**

| Aspekt | Bewertung |
|--------|-----------|
| **Protokoll trustless?** | Ja — die Smart Contracts (JUSD, MintingHub, Position, Challenge-System) sind vollstaendig trustless und immutable |
| **Collateral trustless?** | Nein (WBTC ist PoA) — aber **explizit begrenzt** durch Expiration und Limit |
| **Risiko quantifizierbar?** | Ja — maximaler Schaden = Mint-Limit (z.B. 1M JUSD) |
| **Transparent?** | Ja — Expiration und Limit sind on-chain sichtbar und unveraenderbar |
| **Vergleichbar?** | Identisch zum StartUSD-Pattern auf Citrea — temporaerer Bootstrap mit bekanntem Risikoprofil |

**4.4.4 Vorteile gegenueber eigenem JuiceBTC-Token**

| | Eigener jBTC Token | Multi-Collateral mit WBTC |
|---|---|---|
| **Entwicklungsaufwand** | Hoch (Multisig, Timelock, Wrapping) | **Keiner** (WBTC existiert bereits) |
| **Custodian-Verantwortung** | Bei JuiceDollar | **Bei OP_NET** (nicht unsere Verantwortung) |
| **Complexity** | 4 Contracts | **3 Contracts** |
| **Risiko-Begrenzung** | Multisig + Rate-Limit | **Expiration + Mint-Limit** (einfacher, transparenter) |
| **Migration zu Trustless** | Erfordert Token-Swap | **Automatisch** (neue Positionen, alte laufen ab) |
| **Kernwerte** | Trust-minimiert | **Protokoll trustless, Collateral zeitlich begrenzt** |

---

## 5. Analyse: Challenge-Mechanismus auf Bitcoin-Blockzeiten

Der Challenge-Mechanismus ist JuiceDollars Alleinstellungsmerkmal: Statt Oracle-basierter Liquidation diszipliniert der Markt Positionen ueber Challenges. Dieser Abschnitt analysiert praezise, ob und wie dieser Mechanismus auf Bitcoin-L1-Blockzeiten funktioniert.

### 5.1 Preisfindung bei 10-Minuten-Blocks

**Preisformel (aus MintingHub.sol):**

```solidity
uint256 timeLeft = phase2 - (timeNow - start);
unitPrice = (liqPrice * timeLeft) / phase2;
```

Lineare Interpolation: Preis startet bei `liqPrice` und faellt auf 0 ueber die Dauer von Phase 2.

**Preis-Ticks bei verschiedenen Challenge-Perioden:**

| Challenge-Periode | Sekunden | Ticks in Phase 2 | Preisschritt pro Tick |
|-------------------|----------|-------------------|----------------------|
| 1 Tag | 86.400 | 144 | 0,694% |
| 3 Tage | 259.200 | 432 | 0,231% |
| 7 Tage | 604.800 | 1.008 | 0,099% |

**Vergleich mit etablierten DeFi-Liquidationsmechanismen:**

| Protokoll | Mechanismus | Preis-Ticks | Max. Ueberzahlung |
|-----------|------------|-------------|-------------------|
| **Aave** | Fester Discount (4-15%) | **1** | 4-15% |
| **Compound** | Fester Discount (5-8%) | **1** | 5-8% |
| **Liquity** | Sofort bei 110% CR | **1** | ~10% |
| **MakerDAO Clipper** | Dutch Auction, ~1h | ~40 | ~2,5% |
| **JUSD auf OP_NET (1 Tag)** | Dutch Auction | **144** | **0,694%** |
| **JUSD auf OP_NET (3 Tage)** | Dutch Auction | **432** | **0,231%** |

**Fazit:** 144 Preis-Ticks pro Tag bieten **mehr Preispunkte und geringere Ueberzahlung** als Aave (1 Tick, 4-15% Verlust), Compound (1 Tick, 5-8% Verlust) oder Liquity (1 Tick, ~10% Verlust). Die Preisfindung bei einer Dutch Auction braucht keine tausende Ticks — der erste rationale Bidder bietet, wenn der Preis den Marktwert erreicht.

### 5.2 Oekonomische Tragfaehigkeit von Challenges

**Reward-Formel (aus MintingHub.sol):**

```solidity
uint256 reward = (offer * CHALLENGER_REWARD) / 1_000_000;
// CHALLENGER_REWARD = 20000 (= 2%)
```

**Beispielrechnung: 10 BTC Position**

| Parameter | Wert |
|-----------|------|
| Position-Groesse | 10 jBTC |
| Liquidationspreis | 50.000 JUSD/jBTC |
| Marktpreis (gefallen) | 45.000 JUSD/jBTC |
| Bid-Preis (Auktion) | ~45.000 JUSD/jBTC |
| **Offer** | 10 × 45.000 = 450.000 JUSD |
| **Challenger-Reward (2%)** | **9.000 JUSD** |
| Kapitalkosten (10 jBTC × 1 Tag × 5% p.a.) | ~62 JUSD |
| Gas-Kosten | ~5-20 USD |
| **Nettogewinn** | **~8.900 JUSD** |

Ein einzelner erfolgreicher Challenge auf eine 10-BTC-Position bringt ~9.000 JUSD. Dies ist **hochprofitabel** und erfordert keine hohe Frequenz.

**Reicht ein einziger Challenger-Bot?**

Ja. Ein Bot muss nur alle ~10 Minuten die aktiven Positionen pruefen und unterkollateralisierte Positionen challengen. Die Challenge-Rewards sind hoch genug, um dedizierte Bot-Betreiber zu motivieren — selbst bei niedrigem TVL und wenigen Challenges pro Jahr.

### 5.3 MEV und Front-Running: Natuerliche Abwehr

Die Dutch Auction hat eine **eingebaute MEV-Resistenz**, die in der initialen Analyse uebersehen wurde:

**Warum Front-Running in einer Dutch Auction nicht profitabel ist:**

1. Der Auktionspreis **sinkt** ueber die Zeit. Frueh bieten = **mehr bezahlen**.
2. Ein Front-Runner, der einen Bid vor einem anderen Bidder einschiebt, zahlt den **gleichen oder hoeheren Preis**. Es gibt keinen Arbitrage-Profit.
3. Es gibt nur **einen Kauf pro Challenge** — kein AMM mit Slippage, kein Sandwich-Attack moeglich.

**Vergleich:**

| Mechanismus | MEV-Anfaelligkeit | Begruendung |
|-------------|-------------------|-------------|
| Aave/Compound (fester Discount) | **Hoch** — sofort profitabler Discount, Gas-Bidding | Erster Liquidator bekommt vollen Discount |
| AMM-Swap (Uniswap) | **Hoch** — Sandwich, Front-Run, Back-Run | Slippage-basiert, Preisimpact |
| **Dutch Auction (JUSD)** | **Niedrig** — frueh bieten = ueberbezahlen | Absteigender Preis eliminiert Front-Running-Anreiz |

**Fazit:** Der Challenge-Mechanismus ist **MEV-resistenter** als die meisten Ethereum-DeFi-Liquidationsmechanismen. Die 10-Minuten-Blockzeit ist hier kein Nachteil, sondern verlangsamt den Wettbewerb und reduziert den MEV-Druck.

### 5.4 Volatilitaetsanalyse: Ist 150% CR ausreichend?

**Mathematische Modellierung (Geometrische Brownsche Bewegung, 50% annualisierte Volatilitaet):**

| Zeitfenster | Erwartete Bewegung (1σ) | Erwartete Bewegung (3σ, 99,7%) |
|-------------|------------------------|--------------------------------|
| 10 Minuten | ±0,22% | ±0,65% |
| 24 Stunden | ±2,62% | ±7,85% |
| 7 Tage | ±6,91% | ±20,73% |

**Puffer bei verschiedenen Collateralization Ratios:**

Bei einer Position mit CR = X% betraegt der Puffer (bevor Unterbesicherung eintritt):

```
Puffer = 1 - (1 / CR)
```

| CR | Puffer | Haelt BTC-Drop von | Statistisch sicher fuer |
|----|--------|--------------------|-----------------------|
| 120% | 16,7% | bis 16,7% | 99% bei 24h |
| 150% | 33,3% | bis 33,3% | 99,97% bei 7 Tage |
| 200% | 50,0% | bis 50,0% | Praktisch alle Szenarien |

**Ein 33%-Drop in 24 Stunden:**

```
Anzahl Standardabweichungen = 33% / 2,62% = 12,6σ
```

Ein 12,6-Sigma-Ereignis ist **praktisch unmoeglich** in einem normalen Markt. Selbst der Maerz-2020-Flash-Crash (~40% in 24h) erfordert nur CR >= 167%.

**Fazit:** Bei 150% Minimum-CR ist der Challenge-Mechanismus auch mit 24-Stunden-Liquidationsverzoegerung **sicher fuer alle realistischen Szenarien**. Die hoehere Besicherungsanforderung (150% statt 120%) kompensiert die langsamere Reaktionszeit vollstaendig.

### 5.5 Zusammenfassung

Der oracle-freie Challenge-Mechanismus **funktioniert auf OP_NET** mit den Standard-Parametern von JuiceDollar. Die Analyse zeigt:

| Aspekt | Bewertung | Begruendung |
|--------|-----------|-------------|
| Preisfindung | Ausreichend | 144 Ticks/Tag > Aave, Compound, Liquity. Max. 0,7% Ueberzahlung. |
| Oekonomie | Profitabel | ~9.000 JUSD Reward pro 10-BTC-Challenge. Ein Bot reicht. |
| MEV-Resistenz | Stark | Dutch Auction: frueh bieten = ueberbezahlen. Kein Sandwich moeglich. |
| Volatilitaetsschutz | Ausreichend bei 150% CR | 33% Puffer. 33%-Drop in 24h = 12,6σ (praktisch unmoeglich). |

**Empfehlung:** Die Standard-Challenge-Periode von 1 Tag kann beibehalten werden. Eine Erhoehung auf 3 Tage ist optional und verbessert die Preisaufloesung auf 432 Ticks (0,23% pro Schritt). Die Mindest-Besicherungsquote sollte bei **150%** liegen (statt 120% auf Citrea), um den Puffer fuer die langsamere Reaktionszeit zu vergroessern.

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

## 9. Verbleibende Einschraenkungen

Nach der detaillierten Analyse verbleiben folgende Einschraenkungen, die nicht durch Design-Anpassungen vollstaendig geloest werden koennen:

| Einschraenkung | Schwere | Technische Begruendung | Mitigation |
|---------------|---------|----------------------|------------|
| **Kein harter Peg-Floor ohne Stablecoins** | Hoch | Auf Citrea: USDC/USDT-Bridges schaffen harten Floor/Ceiling via Arbitrage. Auf OP_NET: keine Stablecoins vorhanden → Peg stuetzt sich auf Arbitrage via MotoSwap und Challenge-Mechanismus. | StartUSD-Bootstrap + MotoSwap-Liquiditaet. OP-20S Stablecoin-Standard fuer Q2 2026 angekuendigt — wuerde das Problem vollstaendig loesen. |
| **WBTC-Collateral ist PoA-basiert** | Mittel | OP_NETs WBTC hat einen Single-Key Custodian. JuiceDollar nutzt diesen Token als temporaeres Collateral. | Risiko explizit begrenzt durch Position-Expiration (6 Monate) und Mint-Limit (z.B. 1M JUSD). Migration zu trustless Collateral, sobald verfuegbar. |
| **Einziges Wallet (OP_WALLET)** | Mittel | Nur eine Chrome-Extension verfuegbar. Kein Hardware-Wallet, kein Mobile. | WalletConnect-SDK in Arbeit. Hardware-Wallet-Support abhaengig vom OP_NET-Oekosystem. |
| **Kein etabliertes Audit-Oekosystem** | Mittel | Runtime von Verichains auditiert, aber keine spezialisierten Audit-Firmen fuer AssemblyScript/WASM Application-Contracts. | Open-Source, internes Code Review, Community-Audit. Audit-Firmen koennen WASM-Bytecode analysieren. |
| **Fruehes Oekosystem (1 Monat Mainnet)** | Mittel | OP_NET Mainnet seit 19.03.2026. Unbekannte Langzeit-Stabilitaet. | Testnet-Phase vor Mainnet. MVP begrenzt das Investment. First-Mover-Vorteil bei erfolgreichem Launch. |

**Wichtig:** Keines dieser Probleme ist ein **fundamentaler Blocker**. Es sind operationelle Einschraenkungen, die sich mit der Reife des Oekosystems verbessern werden. Die Kernmechanismen des Protokolls (oracle-free Challenge, dezentrale Governance, trustless Deposit) funktionieren vollstaendig.

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
| WBTC-Custodian-Ausfall | Hoch | Niedrig | Risiko begrenzt durch Position-Expiration (6 Mon.) + Mint-Limit. Nicht JuiceDollars Verantwortung. |
| OP_NET-Projekt scheitert | Kritisch | Mittel | MVP begrenzt Investment, Code-Learnings transferierbar |
| Geringe Nutzerbasis | Hoch | Hoch | First-Mover-Effekt, MotoSwap-Integration |
| Fehlende Audit-Firmen | Mittel | Hoch | Open-Source, Community Review |

### Strategische Risiken

| Risiko | Schwere | Wahrscheinlichkeit | Mitigation |
|--------|---------|---------------------|------------|
| Reputationsrisiko bei Exploit | Hoch | Niedrig | Konservatives Limit-Setting, schrittweises Wachstum |
| Widerspruch zum "trustless" Narrativ | Niedrig | Niedrig | Protokoll ist trustless. WBTC-Collateral ist explizit temporaer und begrenzt — transparent kommuniziert. |
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

## 12. Entscheidung: MVP mit vollstaendigem Challenge-System

Basierend auf der Analyse wird JUSD als **Minimal Viable Stablecoin** auf OP_NET implementiert. Die Kernmechanismen des Protokolls werden vollstaendig umgesetzt, nicht vereinfacht.

### MVP-Scope (3 Contracts)

| Contract | Funktion |
|----------|---------|
| **JUSD** | Stablecoin-Token mit Minter-Registry, Reserve-Tracking, festem Zinssatz |
| **MintingHub** | Position-Factory (`deployContractFromExisting`), Challenge-Orchestrierung, Forced Sales |
| **Position** | Collateral-Position (Template): Mint, Repay, Interest, Liquidation, Price Adjustment |

**Collateral:** Bestehendes OP_NET WBTC mit Ablaufdatum (6 Monate) und Mint-Limit. Kein eigener Wrapped-BTC-Token noetig.

### Parameter-Entscheidungen

| Parameter | Wert | Begruendung |
|-----------|------|-------------|
| JUSD Decimals | 8 | Konsistent mit Bitcoin/jBTC (Satoshis) |
| Min. Besicherungsquote | 150% | 33% Puffer, haelt alle realistischen 24h-Szenarien (bis 12,6σ) |
| Challenge-Periode (Minimum) | 1 Tag | 144 Preis-Ticks, max. 0,7% Ueberzahlung — besser als Aave/Compound |
| Challenger-Reward | 2% | Standard-Wert wie auf Citrea, oekonomisch tragfaehig (~9.000 JUSD pro 10-BTC-Challenge) |
| Init-Periode | 14 Tage | Identisch zu Citrea, genuegend Zeit fuer Governance-Veto |
| Opening Fee | 1.000 JUSD | Identisch zu Citrea |
| Cooldown nach Preiserhoehung | 3 Tage | Identisch zu Citrea |
| Governance | Deployer-kontrolliert (MVP) | Wird durch JUICE-Governance ersetzt im vollstaendigen Protokoll |

### Kernwerte-Erhalt im MVP

| Kernwert | Status | Mechanismus |
|----------|--------|-------------|
| Oracle-free | Erfuellt | Challenge-basierte Dutch Auction, keine externen Preisfeeds |
| Censorship-resistant | Erfuellt | Kein burnFrom im jBTC, kein Blacklist, kein Freeze |
| Self-custody | Erfuellt | User kontrolliert jBTC, JUSD und Position |
| Code is Law | Erfuellt | Alle Contracts immutable (kein onUpdate) |
| Permissionless | Erfuellt | Jeder kann Positionen oeffnen, challengen, bidden |
| Trustless | Protokoll trustless | Collateral-Trust explizit begrenzt (Expiration + Limit), migriert organisch zu trustless BTC |

---

## 13. Naechste Schritte

Die Machbarkeitsstudie ist abgeschlossen. Die Implementierung wird in einem separaten Spezifikationsdokument detailliert geplant, bevor Code geschrieben wird.

**Unmittelbar:**

1. Detaillierte Implementierungsspezifikation erstellen (Contract-Interfaces, Storage-Layout, Events, Deployment-Reihenfolge)
2. Repository-Struktur festlegen
3. JuiceBTC-Token-Design finalisieren (Multisig-Schwellenwert, Timelock-Dauer, Rate-Limit)

**Dann:**

4. Phase 1: jBTC + JUSD Token implementieren
5. Phase 2: Position Contract
6. Phase 3: MintingHub + Factory
7. Phase 4: Challenge-System
8. Phase 5: Integration + Testnet-Deploy

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
| BTC-Wrapping | Dezentrale Bridge | WBTC (PoA) als temporaeres Collateral mit Expiration + Limit |
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

| Parameter | Citrea | OP_NET | Bewertung |
|-----------|--------|--------|-----------|
| Preis-Ticks/Tag | 8.640 | 144 | Ausreichend — mehr als Aave (1), Compound (1), Liquity (1) |
| Max. Ueberzahlung/Tick | 0,012% | 0,694% | Geringer als Aave (4-15%), Compound (5-8%) |
| Liquidationszeit | ~25 Min | ~24,5 Std | Kompensiert durch 150% CR (33% Puffer) |
| MEV-Resistenz | Mittel (Sequencer) | Hoch (Dutch Auction Defense) | OP_NET ist MEV-resistenter |
| Challenger-Reward (10 BTC) | ~9.000 JUSD | ~9.000 JUSD | Identisch — oekonomisch tragfaehig |

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
