# AstraVault 🔐

> Secure Multi-Chain Bitcoin Inheritance Across Time

AstraVault is a decentralized inheritance protocol built on Stacks that enables secure multi-chain wealth preservation across generations. The protocol allows users to create inheritance vaults with configurable conditions for automatic wealth transfer to designated beneficiaries across multiple blockchains and asset types.

## 🌟 Features

- **Multi-Chain Asset Support**: Support for STX, BTC, SIP-10 tokens, SIP-09 NFTs, and external blockchain assets
- **Cross-Chain Compatibility**: Ethereum, Polygon, Bitcoin, and Stacks blockchain support
- **Multi-Beneficiary Support**: Add multiple heirs with customizable allocation percentages
- **Inactivity Detection**: Automatic inheritance triggering based on owner inactivity periods
- **Multi-Signature Security**: Require multiple signatures for secure early claims
- **Time-Lock Mechanisms**: Configurable inactivity thresholds for inheritance activation
- **Heartbeat System**: Owners can prove activity to prevent premature inheritance claims
- **NFT Inheritance**: Support for non-fungible token inheritance across chains
- **External Asset References**: Track and manage assets on external blockchains
- **Flexible Conditions**: Support for both time-based and signature-based inheritance triggers

## 🏗️ Architecture

### Smart Contract Components

- **Vault Management**: Create and manage multi-chain inheritance vaults
- **Asset Management**: Support for STX, SIP-10 tokens, SIP-09 NFTs, and external assets
- **Multi-Chain Support**: Track assets across Stacks, Bitcoin, Ethereum, and Polygon
- **Beneficiary System**: Add, configure, and manage multiple beneficiaries per vault
- **Activity Tracking**: Monitor owner activity through heartbeat mechanisms
- **Claim Processing**: Handle inheritance claims with proper validation for different asset types
- **Multi-Sig Support**: Enable signature-based early claims for emergency situations

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

- `vaults`: Core vault information including activity, settings, and asset count
- `vault-assets`: Multi-chain asset storage with type, blockchain, and amount information
- `vault-beneficiaries`: Beneficiary details with allocation and claim permissions
- `beneficiary-count`: Track number of beneficiaries per vault
- `vault-owners`: Map owners to their vault IDs
- `asset-count`: Track number of assets per vault

## 🚀 Getting Started

### Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) installed
- Basic understanding of Clarity smart contracts
- Stacks wallet for testing
- Understanding of multi-chain asset management

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

### Creating a Vault

```clarity
;; Create a vault with 1-day inactivity threshold, requiring 1 signature
(contract-call? .astravault create-vault u144 u1)
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
- `min-inactivity-period`: Minimum 144 blocks (~1 day)
- `max-inactivity-period`: Maximum 52,560 blocks (~1 year)

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

## 🛡️ Security Features

### Multi-Chain Security
- Asset type validation for each blockchain
- Blockchain ID verification for external assets
- Contract address validation for tokens and NFTs
- External address format validation

### Enhanced Validation
- Comprehensive parameter validation for all inputs
- Proper error handling with specific error codes
- Balance and timelock verification across asset types
- Multi-signature validation for early claims
- Activity tracking accuracy across all functions

## 🧪 Testing

The contract includes comprehensive error handling and validation:

- Multi-chain asset management testing
- Cross-chain compatibility verification
- Parameter validation for all asset types
- Proper authorization checks across functions
- Balance and timelock verification for each asset type
- Multi-signature validation for different scenarios
- Activity tracking accuracy for all operations

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

### Future Expansion
The architecture supports easy addition of new:
- Blockchain networks
- Asset types and standards
- Cross-chain bridges
- Multi-signature schemes

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/multi-chain-support`)
3. Commit your changes (`git commit -m 'Add multi-chain asset support'`)
4. Push to the branch (`git push origin feature/multi-chain-support`)
5. Open a Pull Request

## 🔗 Links

- [Stacks Documentation](https://docs.stacks.co/)
- [Clarity Language Reference](https://docs.stacks.co/clarity/)
- [Clarinet Documentation](https://github.com/hirosystems/clarinet)
- [SIP-10 Token Standard](https://github.com/stacksgov/sips/blob/main/sips/sip-010/sip-010-fungible-token-standard.md)
- [SIP-09 NFT Standard](https://github.com/stacksgov/sips/blob/main/sips/sip-009/sip-009-nft-standard.md)

## ⚠️ Disclaimer

This software is provided "as is" without warranty. Users should conduct thorough testing before using with real funds. Multi-chain inheritance protocols involve significant risks and should be used with proper legal consultation. External asset references require manual management and verification on respective blockchains.