#!/usr/bin/env node

/**
 * Sync Addresses Script
 *
 * Synchronizes contract addresses in documentation with canonical addresses
 * from @juicedollar/jusd package.
 *
 * Uses context-based replacement:
 * - Tracks current markdown section (headings)
 * - Replaces addresses based on section context or inline contract names
 *
 * Designed to run in GitHub Actions for continuous synchronization.
 */

const fs = require('fs')
const path = require('path')

// Chain ID for Citrea Testnet
const CHAIN_ID = 5115

// Ethereum address regex (full addresses)
const ETH_ADDRESS_REGEX = /0x[a-fA-F0-9]{40}/g

// Truncated address regex (e.g., 0x3b59...5153)
const TRUNCATED_ADDRESS_REGEX = /0x([a-fA-F0-9]{4})\.\.\.([a-fA-F0-9]{3,4})/g

// Helper to create truncated address from full address
function truncateAddress(addr, endLength = 4) {
  return `0x${addr.slice(2, 6)}...${addr.slice(-endLength)}`
}

// Load addresses from package
let jusdAddresses

try {
  const { ADDRESS } = require('@juicedollar/jusd')
  jusdAddresses = ADDRESS[CHAIN_ID]
  if (!jusdAddresses) {
    throw new Error(`No addresses found for chain ID ${CHAIN_ID} in @juicedollar/jusd`)
  }
} catch (err) {
  console.error('Failed to load @juicedollar/jusd:', err.message)
  console.error('Run: npm install')
  process.exit(1)
}

// Contract definitions with patterns for both inline and section-based matching
const CONTRACTS = [
  // Core tokens
  {
    name: 'JuiceDollar',
    address: jusdAddresses.juiceDollar,
    inlinePattern: /\bJuiceDollar\b|\bJUSD\b(?!\s*\(Savings)/i,
    sectionPattern: /^#{1,4}\s*(?:JuiceDollar|JUSD)(?:\s|$)/i,
  },
  {
    name: 'Equity',
    address: jusdAddresses.equity,
    inlinePattern: /\bEquity\b|\bJUICE\b(?:\s*\(Equity\))?/i,
    sectionPattern: /^#{1,4}\s*(?:Equity|JUICE)\b/i,
  },
  {
    name: 'SavingsVaultJUSD',
    address: jusdAddresses.savingsVaultJUSD,
    inlinePattern: /\bSavingsVaultJUSD\b|\bsvJUSD\b/i,
    sectionPattern: /^#{1,4}\s*(?:SavingsVaultJUSD|svJUSD)/i,
  },

  // Gateways
  {
    name: 'FrontendGateway',
    address: jusdAddresses.frontendGateway,
    inlinePattern: /\bFrontendGateway\b/i,
    sectionPattern: /^#{1,4}\s*FrontendGateway/i,
  },
  {
    name: 'SavingsGateway',
    address: jusdAddresses.savingsGateway,
    inlinePattern: /\bSavingsGateway\b/i,
    sectionPattern: /^#{1,4}\s*SavingsGateway/i,
  },
  {
    name: 'MintingHubGateway',
    address: jusdAddresses.mintingHubGateway,
    inlinePattern: /\bMintingHubGateway\b|\bMintingHub\b(?!Gateway)/i,
    sectionPattern: /^#{1,4}\s*(?:MintingHubGateway|MintingHub)(?:\s|$)/i,
  },

  // MintingHub components
  {
    name: 'PositionFactory',
    address: jusdAddresses.positionFactoryV2,
    inlinePattern: /\bPositionFactory\b/i,
    sectionPattern: /^#{1,4}\s*PositionFactory/i,
  },
  {
    name: 'PositionRoller',
    address: jusdAddresses.roller,
    inlinePattern: /\bPositionRoller\b/i,
    sectionPattern: /^#{1,4}\s*PositionRoller/i,
  },

  // Bridge contracts
  {
    name: 'StartUSDBridge',
    address: jusdAddresses.bridgeStartUSD,
    inlinePattern: /\bStartUSD\s*Bridge\b|\bStablecoinBridge\b/i,
    sectionPattern: /^#{1,4}\s*(?:StartUSD\s*Bridge|StablecoinBridge)/i,
  },
  {
    name: 'StartUSD',
    address: jusdAddresses.startUSD,
    // Only match standalone StartUSD, not "StartUSD Bridge"
    inlinePattern: /\bStartUSD\b(?!\s*Bridge)/i,
    sectionPattern: /^#{1,4}\s*StartUSD(?!\s*Bridge)(?:\s|$)/i,
  },
]

console.log('Loaded canonical addresses from @juicedollar/jusd:')
CONTRACTS.forEach(c => {
  console.log(`  ${c.name}: ${c.address}`)
})
console.log('')

// Build a map of old addresses to new addresses for quick lookup
// This helps with truncated address matching
const addressMap = new Map()

// Files to update
const SRC_DIR = path.join(__dirname, '..', 'src')
const MD_FILES = fs
  .readdirSync(SRC_DIR, { recursive: true })
  .filter(f => f.endsWith('.md'))
  .map(f => path.join(SRC_DIR, f))

// Process each file
let totalReplacements = 0
const changes = []

for (const filepath of MD_FILES) {
  const filename = path.relative(SRC_DIR, filepath)
  const content = fs.readFileSync(filepath, 'utf8')
  const lines = content.split('\n')
  let fileReplacements = 0
  let modified = false

  // Track current section for context-based replacement
  let currentSection = null

  const newLines = lines.map((line, lineNum) => {
    // Check if this is a heading that defines a section
    for (const contract of CONTRACTS) {
      if (contract.sectionPattern && contract.sectionPattern.test(line)) {
        currentSection = contract
        return line // Don't modify heading lines
      }
    }

    // Check for inline contract name matches first
    let matchedContract = null
    for (const contract of CONTRACTS) {
      if (contract.inlinePattern && contract.inlinePattern.test(line)) {
        matchedContract = contract
        break
      }
    }

    // If in a section and line has "Address" property, use section context
    if (!matchedContract && currentSection && /\*\*Address\*\*/.test(line)) {
      matchedContract = currentSection
    }

    // Reset section on horizontal rule or new major heading
    if (/^---\s*$/.test(line) || /^#{1,2}\s/.test(line)) {
      currentSection = null
    }

    if (!matchedContract || !matchedContract.address) return line

    let newLine = line

    // Find and replace full addresses on this line
    const fullAddresses = line.match(ETH_ADDRESS_REGEX)
    if (fullAddresses) {
      for (const addr of fullAddresses) {
        if (addr.toLowerCase() === matchedContract.address.toLowerCase()) continue

        newLine = newLine.replace(new RegExp(addr, 'gi'), matchedContract.address)
        fileReplacements++
        modified = true
        changes.push({
          file: filename,
          line: lineNum + 1,
          contract: matchedContract.name,
          old: addr,
          new: matchedContract.address,
        })
      }
    }

    // Find and replace truncated addresses on this line
    const truncatedMatches = [...line.matchAll(TRUNCATED_ADDRESS_REGEX)]
    for (const match of truncatedMatches) {
      const [fullMatch, prefix, suffix] = match
      const expectedTruncated = truncateAddress(matchedContract.address, suffix.length)

      // Skip if it already matches
      if (fullMatch.toLowerCase() === expectedTruncated.toLowerCase()) continue

      newLine = newLine.replace(fullMatch, expectedTruncated)
      fileReplacements++
      modified = true
      changes.push({
        file: filename,
        line: lineNum + 1,
        contract: matchedContract.name,
        old: fullMatch,
        new: expectedTruncated,
      })
    }

    return newLine
  })

  if (modified) {
    fs.writeFileSync(filepath, newLines.join('\n'))
    console.log(`Updated ${filename}: ${fileReplacements} replacements`)
    totalReplacements += fileReplacements
  }
}

console.log('')
console.log(`Total replacements: ${totalReplacements}`)

if (changes.length > 0) {
  console.log('\nDetailed changes:')
  changes.forEach(c => {
    console.log(`  ${c.file}:${c.line} [${c.contract}]`)
    console.log(`    - ${c.old}`)
    console.log(`    + ${c.new}`)
  })
}
