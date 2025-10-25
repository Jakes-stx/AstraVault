# AstraVault 🔐

> Secure Multi-Chain Bitcoin Inheritance Across Time

AstraVault is a decentralized inheritance protocol built on Stacks that enables secure multi-chain wealth preservation across generations. The protocol allows users to create inheritance vaults with configurable conditions for automatic wealth transfer to designated beneficiaries across multiple blockchains and asset types, featuring robust emergency recovery mechanisms through trusted guardians.

## 🌟 Features

- **Multi-Chain Asset Support**: Support for STX, BTC, SIP-10 tokens, SIP-09 NFTs, and external blockchain assets
- **Cross-Chain Compatibility**: Ethereum, Polygon, Bitcoin, and Stacks blockchain support
- **Multi-Beneficiary Support**: Add multiple heirs with customizable allocation percentages
- **Emergency Recovery System**: Social recovery through trusted guardians for lost key scenarios
- **Guardian Network**: Up to 5 trusted contacts can help recover vault access
- **Multi-Signature Recovery**: Configurable threshold of guardian signatures required for recovery
- **Inactivity Detection**: Automatic inheritance triggering based on owner inactivity periods
- **Multi-Signature Security**: Require multiple signatures for secure early claims
- **Time-Lock Mechanisms**: Configurable inactivity thresholds for inheritance activation
- **Heartbeat System**: Owners can prove activity to prevent premature inheritance claims
- **Recovery Time Windows**: 7-day recovery period for guardian-initiated recovery
- **NFT Inheritance**: Support for non-fungible token inheritance across chains
- **External Asset References**: Track and manage assets on external blockchains
- **Flexible Conditions**: Support for both time-based and signature-based inheritance triggers
- **Enhanced Validation**: Comprehensive input validation and error handling throughout

## 🏗️ Architecture

### Smart Contract Components

- **Vault Management**: Create and manage multi-chain inheritance vaults with recovery settings
- **Asset Management**: Support for STX, SIP-10 tokens, SIP-09 NFTs, and external assets
- **Multi-Chain Support**: Track assets across Stacks, Bitcoin, Ethereum, and Polygon
- **Beneficiary System**: Add, configure, and manage multiple beneficiaries per vault
- **Guardian System**: Emergency recovery through trusted contacts with multi-sig validation
- **Recovery Processing**: Handle guardian-initiated recovery with time-locked execution
- **Activity Tracking**: Monitor owner activity through heartbeat mechanisms
- **Claim Processing**: Handle inheritance claims with proper validation for different asset types
- **Multi-Sig Support**: Enable signature-based early claims for emergency situations

### Emergency Recovery System

- **Guardian Network**: Trusted contacts designated by vault owners for emergency recovery
- **Recovery Initiation**: Guardians can initiate recovery for new vault ownership
- **Multi-Signature Validation**: Configurable threshold of guardian signatures required
- **Time-Locked Execution**: 7-day waiting period before recovery can be executed
- **Signature Tracking**: Monitor and validate guardian participation in recovery process
- **Recovery Expiration**: Recovery requests expire if not executed within the time window

### Supported Asset Types

- **STX (Native)**: Stacks native tokens stored directly in contract
- **SIP-10 Tokens**: Fungible tokens following SIP-10 standard
- **SIP-09 NFTs**: Non-fungible tokens following SIP-09 standard
- **Bitcoin**: BTC asset references for cross-chain inheritance
- **External Assets**: References to assets on Ethereum, Polygon, and other chains

### Supported Blockchains

- **Stacks**: Primary blockchain for contract execution
- **Bitcoin**: BTC asset inheritance support
- **Ethereum**: ETH and ERC-20/ERC-721 asset references
- **Polygon**: MATIC and Polygon-based asset references

### Key Data Structures

- `vaults`: Core vault information including activity, settings, asset count, and recovery threshold
- `vault-assets`: Multi-chain asset storage with type, blockchain, and amount information
- `vault-beneficiaries`: Beneficiary details with allocation and claim permissions
- `vault-guardians`: Guardian information with recovery signature status
- `recovery-requests`: Active recovery requests with signature count and expiration
- `guardian-recovery-signatures`: Track guardian participation in recovery processes
- `beneficiary-count`: Track number of beneficiaries per vault
- `vault-owners`: Map owners to their vault IDs
- `asset-count`: Track number of assets per vault
- `guardian-count`: Track number of guardians per vault

## 🚀 Getting Started

### Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) installed
- Basic understanding of Clarity smart contracts
- Stacks wallet for testing
- Understanding of multi-chain asset management
- Trusted contacts for guardian setup

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/astravault.git
cd astravault
```

2. Initialize Clarinet project:
```bash
clarinet check
```

3. Run tests:
```bash
clarinet test
```

## 📖 Usage

### Creating a Vault with Recovery Settings

```clarity
;; Create a vault with 1-day inactivity threshold, requiring 1 signature, 3 guardian threshold
(contract-call? .astravault create-vault u144 u1 u3)
```

### Adding Guardians for Emergency Recovery

```clarity
;; Add trusted guardians for recovery
(contract-call? .astravault add-guardian u1 'SP1GUARDIAN1...)
(contract-call? .astravault add-guardian u1 'SP1GUARDIAN2...)
(contract-call? .astravault add-guardian u1 'SP1GUARDIAN3...)
```

### Adding Assets

#### STX Assets
```clarity
;; Add 1000 STX to vault
(contract-call? .astravault add-stx-asset u1 u1000000000)
```

#### SIP-10 Token Assets
```clarity
;; Add SIP-10 tokens to vault
(contract-call? .astravault add-sip10-asset u1 'SP1234...TOKEN-CONTRACT u1000000)
```

#### SIP-09 NFT Assets
```clarity
;; Add NFT to vault
(contract-call? .astravault add-nft-asset u1 'SP1234...NFT-CONTRACT u42)
```

#### External Chain Assets
```clarity
;; Add Ethereum asset reference
(contract-call? .astravault add-external-asset u1 u3 "0x742d35Cc6634C0532925a3b8D401d7fdC47f6541" u1000000000000000000)
```

### Adding Beneficiaries

```clarity
;; Add beneficiary with 50% allocation, can claim early
(contract-call? .astravault add-beneficiary u1 'SP1HEIR... u50 true)
```

### Emergency Recovery Process

#### Initiating Recovery (Guardian)
```clarity
;; Guardian initiates recovery for new owner
(contract-call? .astravault initiate-recovery u1 'SP1NEWOWNER...)
```

#### Signing Recovery Request (Other Guardians)
```clarity
;; Other guardians sign the recovery request
(contract-call? .astravault sign-recovery u1)
```

#### Executing Recovery
```clarity
;; Execute recovery after threshold is met and waiting period passes
(contract-call? .astravault execute-recovery u1)
```

### Updating Activity (Heartbeat)

```clarity
;; Prove you're alive to prevent inheritance claims
(contract-call? .astravault update-activity u1)
```

### Claiming Inheritance

#### STX Inheritance
```clarity
;; Beneficiary claims STX inheritance after inactivity period
(contract-call? .astravault claim-stx-inheritance u1 u1)
```

## 🔧 Configuration

### Constants

- `max-beneficiaries-per-vault`: Maximum 10 beneficiaries per vault
- `max-guardians-per-vault`: Maximum 5 guardians per vault
- `min-inactivity-period`: Minimum 144 blocks (~1 day)
- `max-inactivity-period`: Maximum 52,560 blocks (~1 year)
- `recovery-period`: 1,008 blocks (~7 days) for recovery execution

### Asset Types

- `ASSET_TYPE_STX`: Native STX tokens (u1)
- `ASSET_TYPE_SIP10`: SIP-10 fungible tokens (u2)
- `ASSET_TYPE_SIP09_NFT`: SIP-09 non-fungible tokens (u3)
- `ASSET_TYPE_BTC`: Bitcoin references (u4)
- `ASSET_TYPE_EXTERNAL`: External blockchain assets (u5)

### Supported Chains

- `BLOCKCHAIN_STACKS`: Stacks blockchain (u1)
- `BLOCKCHAIN_BITCOIN`: Bitcoin network (u2)
- `BLOCKCHAIN_ETHEREUM`: Ethereum mainnet (u3)
- `BLOCKCHAIN_POLYGON`: Polygon network (u4)

### Error Codes

- `u100`: Not authorized
- `u101`: Vault not found
- `u102`: Invalid beneficiary
- `u103`: Vault already exists
- `u104`: Insufficient balance
- `u105`: Timelock not expired
- `u106`: Invalid timelock
- `u107`: Beneficiary already exists
- `u108`: Maximum beneficiaries reached
- `u109`: Invalid amount
- `u110`: Vault already claimed
- `u111`: Invalid asset type
- `u112`: Unsupported blockchain
- `u113`: Invalid token ID
- `u114`: Asset not found
- `u115`: Invalid contract address
- `u116`: Guardian already exists
- `u117`: Maximum guardians reached
- `u118`: Guardian not found
- `u119`: Insufficient guardian signatures
- `u120`: Recovery already initiated
- `u121`: Recovery not found
- `u122`: Recovery expired
- `u123`: Invalid guardian
- `u124`: Invalid allocation percentage
- `u125`: Invalid recovery threshold

## 🛡️ Security Features

### Enhanced Input Validation (v1.1)
- **Vault ID Validation**: All vault operations now validate vault IDs before processing
- **Asset ID Validation**: Asset operations verify asset IDs exist and are valid
- **Allocation Validation**: Beneficiary allocations checked for valid percentage ranges (1-100%)
- **Recovery Threshold Validation**: Guardian thresholds verified against actual guardian count
- **Inactivity Threshold Validation**: Vault creation validates inactivity periods are within allowed ranges
- **Required Signatures Validation**: Multi-sig requirements validated on vault creation

### Emergency Recovery Security
- Guardian identity validation and authorization checks
- Multi-signature threshold validation for recovery execution
- Time-locked recovery process to prevent hasty decisions
- Recovery request expiration to limit attack windows
- Signature tracking and validation for all recovery participants

### Multi-Chain Security
- Asset type validation for each blockchain
- Blockchain ID verification for external assets
- Contract address validation for tokens and NFTs
- External address format validation

### Read-Only Function Safety
- All read-only functions validate input parameters before querying data
- Proper handling of optional values prevents unchecked data access
- Consistent validation patterns across all query functions

### Enhanced Validation
- Comprehensive parameter validation for all inputs
- Proper error handling with specific error codes
- Balance and timelock verification across asset types
- Multi-signature validation for early claims
- Activity tracking accuracy across all functions
- Guardian threshold validation against actual guardian count

## 🧪 Testing

The contract includes comprehensive error handling and validation:

- Multi-chain asset management testing
- Cross-chain compatibility verification
- Emergency recovery process testing
- Guardian management and validation testing
- Recovery signature threshold verification
- Parameter validation for all asset types
- Proper authorization checks across functions
- Balance and timelock verification for each asset type
- Multi-signature validation for different scenarios
- Activity tracking accuracy for all operations
- Recovery time window and expiration testing
- Input validation coverage for all public functions
- Read-only function parameter validation

## 🔗 Multi-Chain Integration

### Stacks Native Assets
- Direct STX storage and transfer
- SIP-10 token contract integration
- SIP-09 NFT contract interaction

### External Chain References
- Bitcoin address and amount tracking
- Ethereum contract and token references
- Polygon asset management
- Extensible framework for additional chains

### Emergency Recovery Integration
- Cross-chain guardian coordination
- Multi-blockchain asset recovery processes
- Guardian signature validation across different networks

### Future Expansion
The architecture supports easy addition of new:
- Blockchain networks
- Asset types and standards
- Cross-chain bridges
- Multi-signature schemes
- Guardian coordination protocols

## 🆘 Emergency Recovery Guide

### Setting Up Guardians
1. Choose 3-5 trusted contacts as guardians
2. Add guardians using `add-guardian` function
3. Set appropriate recovery threshold (recommend 60-80% of guardians)
4. Communicate recovery process to all guardians

### Recovery Process
1. **Guardian Initiative**: Any guardian can initiate recovery with `initiate-recovery`
2. **Signature Collection**: Other guardians sign the recovery with `sign-recovery`
3. **Threshold Check**: System validates sufficient guardian signatures
4. **Time Lock**: 7-day waiting period for recovery execution
5. **Execution**: Recovery is executed with `execute-recovery` after time lock

### Recovery Security
- Multiple guardian validation prevents single point of failure
- Time-locked execution allows for dispute resolution
- Signature tracking ensures authentic guardian participation
- Recovery expiration prevents indefinite pending requests

## 📝 Changelog

### Version 1.1.0 - Enhanced Validation & Security
- Added comprehensive input validation for all public functions
- Enhanced vault ID validation across all operations
- Improved asset ID validation in read-only functions
- Added allocation percentage validation (1-100% range)
- Implemented recovery threshold validation against guardian count
- Added inactivity threshold validation on vault creation
- Enhanced read-only functions with parameter validation
- Fixed potential unchecked data warnings
- Improved error handling with new error codes (ERR_INVALID_ALLOCATION, ERR_INVALID_RECOVERY_THRESHOLD)
- Optimized claim calculation with intermediate variables
- Ensured all functions pass `clarinet check` without warnings
