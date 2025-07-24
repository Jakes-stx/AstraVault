# AstraVault 🔐

> Secure Bitcoin Inheritance Across Time

AstraVault is a decentralized inheritance protocol built on Stacks that enables secure Bitcoin wealth preservation across generations. The protocol allows users to create inheritance vaults with configurable conditions for automatic wealth transfer to designated beneficiaries.

## 🌟 Features

- **Multi-Beneficiary Support**: Add multiple heirs with customizable allocation percentages
- **Inactivity Detection**: Automatic inheritance triggering based on owner inactivity periods
- **Multi-Signature Security**: Require multiple signatures for secure early claims
- **Time-Lock Mechanisms**: Configurable inactivity thresholds for inheritance activation
- **Heartbeat System**: Owners can prove activity to prevent premature inheritance claims
- **Flexible Conditions**: Support for both time-based and signature-based inheritance triggers

## 🏗️ Architecture

### Smart Contract Components

- **Vault Management**: Create and manage inheritance vaults with STX deposits
- **Beneficiary System**: Add, configure, and manage multiple beneficiaries per vault
- **Activity Tracking**: Monitor owner activity through heartbeat mechanisms
- **Claim Processing**: Handle inheritance claims with proper validation
- **Multi-Sig Support**: Enable signature-based early claims for emergency situations

### Key Data Structures

- `vaults`: Core vault information including balance, activity, and settings
- `vault-beneficiaries`: Beneficiary details with allocation and claim permissions
- `beneficiary-count`: Track number of beneficiaries per vault
- `vault-owners`: Map owners to their vault IDs

## 🚀 Getting Started

### Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) installed
- Basic understanding of Clarity smart contracts
- Stacks wallet for testing

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
;; Create a vault with 1000 STX, 1-day inactivity threshold, requiring 1 signature
(contract-call? .astravault create-vault u1000000000 u144 u1)
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

```clarity
;; Beneficiary claims their inheritance after inactivity period
(contract-call? .astravault claim-inheritance u1)
```

## 🔧 Configuration

### Constants

- `max-beneficiaries-per-vault`: Maximum 10 beneficiaries per vault
- `min-inactivity-period`: Minimum 144 blocks (~1 day)
- `max-inactivity-period`: Maximum 52,560 blocks (~1 year)

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

## 🧪 Testing

The contract includes comprehensive error handling and validation:

- Parameter validation for all inputs
- Proper authorization checks
- Balance and timelock verification
- Multi-signature validation
- Activity tracking accuracy

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🔗 Links

- [Stacks Documentation](https://docs.stacks.co/)
- [Clarity Language Reference](https://docs.stacks.co/clarity/)
- [Clarinet Documentation](https://github.com/hirosystems/clarinet)

## ⚠️ Disclaimer

This software is provided "as is" without warranty. Users should conduct thorough testing before using with real funds. Inheritance protocols involve significant risks and should be used with proper legal consultation.