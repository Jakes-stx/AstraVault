;; AstraVault - Secure Multi-Chain Bitcoin Inheritance Protocol
;; A decentralized inheritance system for Bitcoin wealth preservation across multiple blockchains

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant ERR_NOT_AUTHORIZED (err u100))
(define-constant ERR_VAULT_NOT_FOUND (err u101))
(define-constant ERR_INVALID_BENEFICIARY (err u102))
(define-constant ERR_VAULT_ALREADY_EXISTS (err u103))
(define-constant ERR_INSUFFICIENT_BALANCE (err u104))
(define-constant ERR_TIMELOCK_NOT_EXPIRED (err u105))
(define-constant ERR_INVALID_TIMELOCK (err u106))
(define-constant ERR_BENEFICIARY_ALREADY_EXISTS (err u107))
(define-constant ERR_MAX_BENEFICIARIES_REACHED (err u108))
(define-constant ERR_INVALID_AMOUNT (err u109))
(define-constant ERR_VAULT_ALREADY_CLAIMED (err u110))
(define-constant ERR_INVALID_ASSET_TYPE (err u111))
(define-constant ERR_UNSUPPORTED_BLOCKCHAIN (err u112))
(define-constant ERR_INVALID_TOKEN_ID (err u113))
(define-constant ERR_ASSET_NOT_FOUND (err u114))
(define-constant ERR_INVALID_CONTRACT_ADDRESS (err u115))
(define-constant ERR_GUARDIAN_ALREADY_EXISTS (err u116))
(define-constant ERR_MAX_GUARDIANS_REACHED (err u117))
(define-constant ERR_GUARDIAN_NOT_FOUND (err u118))
(define-constant ERR_INSUFFICIENT_GUARDIAN_SIGNATURES (err u119))
(define-constant ERR_RECOVERY_ALREADY_INITIATED (err u120))
(define-constant ERR_RECOVERY_NOT_FOUND (err u121))
(define-constant ERR_RECOVERY_EXPIRED (err u122))
(define-constant ERR_INVALID_GUARDIAN (err u123))
(define-constant ERR_INVALID_ALLOCATION (err u124))
(define-constant ERR_INVALID_RECOVERY_THRESHOLD (err u125))

;; Asset type constants
(define-constant ASSET_TYPE_STX u1)
(define-constant ASSET_TYPE_SIP10 u2)
(define-constant ASSET_TYPE_SIP09_NFT u3)
(define-constant ASSET_TYPE_BTC u4)
(define-constant ASSET_TYPE_EXTERNAL u5)

;; Blockchain ID constants
(define-constant BLOCKCHAIN_STACKS u1)
(define-constant BLOCKCHAIN_BITCOIN u2)
(define-constant BLOCKCHAIN_ETHEREUM u3)
(define-constant BLOCKCHAIN_POLYGON u4)

;; Data Variables
(define-data-var next-vault-id uint u1)
(define-data-var max-beneficiaries-per-vault uint u10)
(define-data-var min-inactivity-period uint u144) ;; ~1 day in blocks
(define-data-var max-inactivity-period uint u52560) ;; ~1 year in blocks
(define-data-var next-asset-id uint u1)
(define-data-var max-guardians-per-vault uint u5)
(define-data-var recovery-period uint u1008) ;; ~7 days in blocks
(define-data-var next-recovery-id uint u1)

;; Data Maps
(define-map vaults
    { vault-id: uint }
    {
        owner: principal,
        created-at: uint,
        last-activity: uint,
        inactivity-threshold: uint,
        is-active: bool,
        is-claimed: bool,
        required-signatures: uint,
        total-assets: uint,
        recovery-threshold: uint
    }
)

;; Multi-chain asset storage
(define-map vault-assets
    { vault-id: uint, asset-id: uint }
    {
        asset-type: uint,
        blockchain-id: uint,
        contract-address: (optional principal),
        token-id: (optional uint),
        amount: uint,
        external-address: (optional (string-ascii 128)),
        is-active: bool
    }
)

(define-map vault-beneficiaries
    { vault-id: uint, beneficiary: principal }
    {
        allocation-percentage: uint,
        can-claim-early: bool,
        added-at: uint,
        has-signed: bool
    }
)

(define-map beneficiary-count
    { vault-id: uint }
    { count: uint }
)

(define-map vault-owners
    { owner: principal }
    { vault-id: uint }
)

(define-map asset-count
    { vault-id: uint }
    { count: uint }
)

;; Emergency Recovery Maps
(define-map vault-guardians
    { vault-id: uint, guardian: principal }
    {
        added-at: uint,
        is-active: bool,
        has-signed-recovery: bool
    }
)

(define-map guardian-count
    { vault-id: uint }
    { count: uint }
)

(define-map recovery-requests
    { vault-id: uint }
    {
        recovery-id: uint,
        new-owner: principal,
        initiated-at: uint,
        expires-at: uint,
        signatures-count: uint,
        is-executed: bool
    }
)

(define-map guardian-recovery-signatures
    { vault-id: uint, guardian: principal, recovery-id: uint }
    { signed-at: uint }
)

;; Private Functions
(define-private (get-current-block-height)
    stacks-block-height
)

(define-private (is-vault-owner (vault-id uint) (user principal))
    (match (map-get? vaults { vault-id: vault-id })
        vault (is-eq (get owner vault) user)
        false
    )
)

(define-private (calculate-inactivity-blocks (last-activity uint))
    (- (get-current-block-height) last-activity)
)

(define-private (is-inactivity-threshold-met (vault-id uint))
    (match (map-get? vaults { vault-id: vault-id })
        vault 
        (let ((inactivity-blocks (calculate-inactivity-blocks (get last-activity vault))))
            (>= inactivity-blocks (get inactivity-threshold vault))
        )
        false
    )
)

(define-private (get-beneficiary-count (vault-id uint))
    (default-to u0 
        (get count (map-get? beneficiary-count { vault-id: vault-id }))
    )
)

(define-private (increment-beneficiary-count (vault-id uint))
    (let ((current-count (get-beneficiary-count vault-id)))
        (map-set beneficiary-count 
            { vault-id: vault-id }
            { count: (+ current-count u1) }
        )
    )
)

(define-private (get-asset-count (vault-id uint))
    (default-to u0 
        (get count (map-get? asset-count { vault-id: vault-id }))
    )
)

(define-private (increment-asset-count (vault-id uint))
    (let ((current-count (get-asset-count vault-id)))
        (map-set asset-count 
            { vault-id: vault-id }
            { count: (+ current-count u1) }
        )
    )
)

(define-private (get-guardian-count (vault-id uint))
    (default-to u0 
        (get count (map-get? guardian-count { vault-id: vault-id }))
    )
)

(define-private (increment-guardian-count (vault-id uint))
    (let ((current-count (get-guardian-count vault-id)))
        (map-set guardian-count 
            { vault-id: vault-id }
            { count: (+ current-count u1) }
        )
    )
)

(define-private (validate-allocation-percentage (percentage uint))
    (and (> percentage u0) (<= percentage u100))
)

(define-private (validate-asset-type (asset-type uint))
    (or (is-eq asset-type ASSET_TYPE_STX)
        (is-eq asset-type ASSET_TYPE_SIP10)
        (is-eq asset-type ASSET_TYPE_SIP09_NFT)
        (is-eq asset-type ASSET_TYPE_BTC)
        (is-eq asset-type ASSET_TYPE_EXTERNAL))
)

(define-private (validate-blockchain-id (blockchain-id uint))
    (or (is-eq blockchain-id BLOCKCHAIN_STACKS)
        (is-eq blockchain-id BLOCKCHAIN_BITCOIN)
        (is-eq blockchain-id BLOCKCHAIN_ETHEREUM)
        (is-eq blockchain-id BLOCKCHAIN_POLYGON))
)

(define-private (validate-external-address (address (string-ascii 128)))
    (and (> (len address) u0) (<= (len address) u128))
)

(define-private (validate-contract-address (contract-addr principal))
    (not (is-eq contract-addr tx-sender))
)

(define-private (validate-token-id (token-id uint))
    (> token-id u0)
)

(define-private (validate-vault-id (vault-id uint))
    (and (> vault-id u0) (< vault-id (var-get next-vault-id)))
)

(define-private (validate-asset-id (asset-id uint))
    (and (> asset-id u0) (< asset-id (var-get next-asset-id)))
)

(define-private (validate-recovery-threshold (threshold uint) (total-guardians uint))
    (and (> threshold u0) (<= threshold total-guardians) (>= total-guardians u1))
)

(define-private (is-recovery-expired (recovery-data {recovery-id: uint, new-owner: principal, initiated-at: uint, expires-at: uint, signatures-count: uint, is-executed: bool}))
    (> (get-current-block-height) (get expires-at recovery-data))
)

(define-private (is-vault-guardian (vault-id uint) (guardian principal))
    (match (map-get? vault-guardians { vault-id: vault-id, guardian: guardian })
        guardian-data (get is-active guardian-data)
        false
    )
)

(define-private (validate-inactivity-threshold (threshold uint))
    (and (>= threshold (var-get min-inactivity-period))
         (<= threshold (var-get max-inactivity-period)))
)

(define-private (validate-required-signatures (signatures uint))
    (> signatures u0)
)

;; Public Functions

;; Create a new inheritance vault
(define-public (create-vault (inactivity-threshold uint) (required-signatures uint) (recovery-threshold uint))
    (let (
        (vault-id (var-get next-vault-id))
        (current-block (get-current-block-height))
    )
        (asserts! (validate-inactivity-threshold inactivity-threshold) ERR_INVALID_TIMELOCK)
        (asserts! (validate-required-signatures required-signatures) ERR_NOT_AUTHORIZED)
        (asserts! (> recovery-threshold u0) ERR_INVALID_RECOVERY_THRESHOLD)
        (asserts! (is-none (map-get? vault-owners { owner: tx-sender })) ERR_VAULT_ALREADY_EXISTS)
        
        (map-set vaults
            { vault-id: vault-id }
            {
                owner: tx-sender,
                created-at: current-block,
                last-activity: current-block,
                inactivity-threshold: inactivity-threshold,
                is-active: true,
                is-claimed: false,
                required-signatures: required-signatures,
                total-assets: u0,
                recovery-threshold: recovery-threshold
            }
        )
        
        (map-set vault-owners
            { owner: tx-sender }
            { vault-id: vault-id }
        )
        
        (map-set beneficiary-count
            { vault-id: vault-id }
            { count: u0 }
        )
        
        (map-set asset-count
            { vault-id: vault-id }
            { count: u0 }
        )
        
        (map-set guardian-count
            { vault-id: vault-id }
            { count: u0 }
        )
        
        (var-set next-vault-id (+ vault-id u1))
        (ok vault-id)
    )
)

;; Add STX asset to vault
(define-public (add-stx-asset (vault-id uint) (amount uint))
    (let (
        (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR_VAULT_NOT_FOUND))
        (asset-id (var-get next-asset-id))
    )
        (asserts! (validate-vault-id vault-id) ERR_VAULT_NOT_FOUND)
        (asserts! (is-vault-owner vault-id tx-sender) ERR_NOT_AUTHORIZED)
        (asserts! (> amount u0) ERR_INVALID_AMOUNT)
        (asserts! (get is-active vault) ERR_VAULT_NOT_FOUND)
        
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
        
        (map-set vault-assets
            { vault-id: vault-id, asset-id: asset-id }
            {
                asset-type: ASSET_TYPE_STX,
                blockchain-id: BLOCKCHAIN_STACKS,
                contract-address: none,
                token-id: none,
                amount: amount,
                external-address: none,
                is-active: true
            }
        )
        
        (increment-asset-count vault-id)
        (map-set vaults
            { vault-id: vault-id }
            (merge vault { 
                total-assets: (+ (get total-assets vault) u1),
                last-activity: (get-current-block-height)
            })
        )
        
        (var-set next-asset-id (+ asset-id u1))
        (ok asset-id)
    )
)

;; Add SIP-10 token asset to vault
(define-public (add-sip10-asset (vault-id uint) (contract-address principal) (amount uint))
    (let (
        (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR_VAULT_NOT_FOUND))
        (asset-id (var-get next-asset-id))
    )
        (asserts! (validate-vault-id vault-id) ERR_VAULT_NOT_FOUND)
        (asserts! (validate-contract-address contract-address) ERR_INVALID_CONTRACT_ADDRESS)
        (asserts! (is-vault-owner vault-id tx-sender) ERR_NOT_AUTHORIZED)
        (asserts! (> amount u0) ERR_INVALID_AMOUNT)
        (asserts! (get is-active vault) ERR_VAULT_NOT_FOUND)
        
        (map-set vault-assets
            { vault-id: vault-id, asset-id: asset-id }
            {
                asset-type: ASSET_TYPE_SIP10,
                blockchain-id: BLOCKCHAIN_STACKS,
                contract-address: (some contract-address),
                token-id: none,
                amount: amount,
                external-address: none,
                is-active: true
            }
        )
        
        (increment-asset-count vault-id)
        (map-set vaults
            { vault-id: vault-id }
            (merge vault { 
                total-assets: (+ (get total-assets vault) u1),
                last-activity: (get-current-block-height)
            })
        )
        
        (var-set next-asset-id (+ asset-id u1))
        (ok asset-id)
    )
)

;; Add SIP-09 NFT asset to vault
(define-public (add-nft-asset (vault-id uint) (contract-address principal) (token-id uint))
    (let (
        (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR_VAULT_NOT_FOUND))
        (asset-id (var-get next-asset-id))
    )
        (asserts! (validate-vault-id vault-id) ERR_VAULT_NOT_FOUND)
        (asserts! (validate-contract-address contract-address) ERR_INVALID_CONTRACT_ADDRESS)
        (asserts! (validate-token-id token-id) ERR_INVALID_TOKEN_ID)
        (asserts! (is-vault-owner vault-id tx-sender) ERR_NOT_AUTHORIZED)
        (asserts! (get is-active vault) ERR_VAULT_NOT_FOUND)
        
        (map-set vault-assets
            { vault-id: vault-id, asset-id: asset-id }
            {
                asset-type: ASSET_TYPE_SIP09_NFT,
                blockchain-id: BLOCKCHAIN_STACKS,
                contract-address: (some contract-address),
                token-id: (some token-id),
                amount: u1,
                external-address: none,
                is-active: true
            }
        )
        
        (increment-asset-count vault-id)
        (map-set vaults
            { vault-id: vault-id }
            (merge vault { 
                total-assets: (+ (get total-assets vault) u1),
                last-activity: (get-current-block-height)
            })
        )
        
        (var-set next-asset-id (+ asset-id u1))
        (ok asset-id)
    )
)

;; Add external chain asset reference
(define-public (add-external-asset (vault-id uint) (blockchain-id uint) (external-address (string-ascii 128)) (amount uint))
    (let (
        (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR_VAULT_NOT_FOUND))
        (asset-id (var-get next-asset-id))
    )
        (asserts! (validate-vault-id vault-id) ERR_VAULT_NOT_FOUND)
        (asserts! (validate-blockchain-id blockchain-id) ERR_UNSUPPORTED_BLOCKCHAIN)
        (asserts! (validate-external-address external-address) ERR_INVALID_CONTRACT_ADDRESS)
        (asserts! (is-vault-owner vault-id tx-sender) ERR_NOT_AUTHORIZED)
        (asserts! (> amount u0) ERR_INVALID_AMOUNT)
        (asserts! (get is-active vault) ERR_VAULT_NOT_FOUND)
        
        (map-set vault-assets
            { vault-id: vault-id, asset-id: asset-id }
            {
                asset-type: ASSET_TYPE_EXTERNAL,
                blockchain-id: blockchain-id,
                contract-address: none,
                token-id: none,
                amount: amount,
                external-address: (some external-address),
                is-active: true
            }
        )
        
        (increment-asset-count vault-id)
        (map-set vaults
            { vault-id: vault-id }
            (merge vault { 
                total-assets: (+ (get total-assets vault) u1),
                last-activity: (get-current-block-height)
            })
        )
        
        (var-set next-asset-id (+ asset-id u1))
        (ok asset-id)
    )
)

;; Add a beneficiary to a vault
(define-public (add-beneficiary (vault-id uint) (beneficiary principal) (allocation-percentage uint) (can-claim-early bool))
    (let (
        (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR_VAULT_NOT_FOUND))
        (current-count (get-beneficiary-count vault-id))
        (current-block (get-current-block-height))
    )
        (asserts! (validate-vault-id vault-id) ERR_VAULT_NOT_FOUND)
        (asserts! (is-vault-owner vault-id tx-sender) ERR_NOT_AUTHORIZED)
        (asserts! (get is-active vault) ERR_VAULT_NOT_FOUND)
        (asserts! (< current-count (var-get max-beneficiaries-per-vault)) ERR_MAX_BENEFICIARIES_REACHED)
        (asserts! (validate-allocation-percentage allocation-percentage) ERR_INVALID_ALLOCATION)
        (asserts! (not (is-eq beneficiary tx-sender)) ERR_INVALID_BENEFICIARY)
        (asserts! (is-none (map-get? vault-beneficiaries { vault-id: vault-id, beneficiary: beneficiary })) ERR_BENEFICIARY_ALREADY_EXISTS)
        
        (map-set vault-beneficiaries
            { vault-id: vault-id, beneficiary: beneficiary }
            {
                allocation-percentage: allocation-percentage,
                can-claim-early: can-claim-early,
                added-at: current-block,
                has-signed: false
            }
        )
        
        (increment-beneficiary-count vault-id)
        
        (map-set vaults
            { vault-id: vault-id }
            (merge vault { last-activity: current-block })
        )
        
        (ok true)
    )
)

;; Add a guardian to a vault for emergency recovery
(define-public (add-guardian (vault-id uint) (guardian principal))
    (let (
        (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR_VAULT_NOT_FOUND))
        (current-count (get-guardian-count vault-id))
        (current-block (get-current-block-height))
    )
        (asserts! (validate-vault-id vault-id) ERR_VAULT_NOT_FOUND)
        (asserts! (is-vault-owner vault-id tx-sender) ERR_NOT_AUTHORIZED)
        (asserts! (get is-active vault) ERR_VAULT_NOT_FOUND)
        (asserts! (< current-count (var-get max-guardians-per-vault)) ERR_MAX_GUARDIANS_REACHED)
        (asserts! (not (is-eq guardian tx-sender)) ERR_INVALID_GUARDIAN)
        (asserts! (is-none (map-get? vault-guardians { vault-id: vault-id, guardian: guardian })) ERR_GUARDIAN_ALREADY_EXISTS)
        
        (map-set vault-guardians
            { vault-id: vault-id, guardian: guardian }
            {
                added-at: current-block,
                is-active: true,
                has-signed-recovery: false
            }
        )
        
        (increment-guardian-count vault-id)
        
        (map-set vaults
            { vault-id: vault-id }
            (merge vault { last-activity: current-block })
        )
        
        (ok true)
    )
)

;; Initiate emergency recovery
(define-public (initiate-recovery (vault-id uint) (new-owner principal))
    (let (
        (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR_VAULT_NOT_FOUND))
        (guardian-data (unwrap! (map-get? vault-guardians { vault-id: vault-id, guardian: tx-sender }) ERR_NOT_AUTHORIZED))
        (recovery-id (var-get next-recovery-id))
        (current-block (get-current-block-height))
        (expiry-block (+ current-block (var-get recovery-period)))
        (guardian-count-data (get-guardian-count vault-id))
    )
        (asserts! (validate-vault-id vault-id) ERR_VAULT_NOT_FOUND)
        (asserts! (get is-active vault) ERR_VAULT_NOT_FOUND)
        (asserts! (get is-active guardian-data) ERR_NOT_AUTHORIZED)
        (asserts! (not (is-eq new-owner (get owner vault))) ERR_INVALID_GUARDIAN)
        (asserts! (is-none (map-get? recovery-requests { vault-id: vault-id })) ERR_RECOVERY_ALREADY_INITIATED)
        (asserts! (validate-recovery-threshold (get recovery-threshold vault) guardian-count-data) ERR_INVALID_RECOVERY_THRESHOLD)
        
        (map-set recovery-requests
            { vault-id: vault-id }
            {
                recovery-id: recovery-id,
                new-owner: new-owner,
                initiated-at: current-block,
                expires-at: expiry-block,
                signatures-count: u1,
                is-executed: false
            }
        )
        
        (map-set guardian-recovery-signatures
            { vault-id: vault-id, guardian: tx-sender, recovery-id: recovery-id }
            { signed-at: current-block }
        )
        
        (map-set vault-guardians
            { vault-id: vault-id, guardian: tx-sender }
            (merge guardian-data { has-signed-recovery: true })
        )
        
        (var-set next-recovery-id (+ recovery-id u1))
        (ok recovery-id)
    )
)

;; Sign recovery request as guardian
(define-public (sign-recovery (vault-id uint))
    (let (
        (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR_VAULT_NOT_FOUND))
        (guardian-data (unwrap! (map-get? vault-guardians { vault-id: vault-id, guardian: tx-sender }) ERR_NOT_AUTHORIZED))
        (recovery-data (unwrap! (map-get? recovery-requests { vault-id: vault-id }) ERR_RECOVERY_NOT_FOUND))
        (current-block (get-current-block-height))
    )
        (asserts! (validate-vault-id vault-id) ERR_VAULT_NOT_FOUND)
        (asserts! (get is-active vault) ERR_VAULT_NOT_FOUND)
        (asserts! (get is-active guardian-data) ERR_NOT_AUTHORIZED)
        (asserts! (not (get has-signed-recovery guardian-data)) ERR_NOT_AUTHORIZED)
        (asserts! (not (get is-executed recovery-data)) ERR_RECOVERY_NOT_FOUND)
        (asserts! (not (is-recovery-expired recovery-data)) ERR_RECOVERY_EXPIRED)
        (asserts! (is-none (map-get? guardian-recovery-signatures { vault-id: vault-id, guardian: tx-sender, recovery-id: (get recovery-id recovery-data) })) ERR_NOT_AUTHORIZED)
        
        (map-set guardian-recovery-signatures
            { vault-id: vault-id, guardian: tx-sender, recovery-id: (get recovery-id recovery-data) }
            { signed-at: current-block }
        )
        
        (map-set vault-guardians
            { vault-id: vault-id, guardian: tx-sender }
            (merge guardian-data { has-signed-recovery: true })
        )
        
        (map-set recovery-requests
            { vault-id: vault-id }
            (merge recovery-data { signatures-count: (+ (get signatures-count recovery-data) u1) })
        )
        
        (ok true)
    )
)

;; Execute recovery after sufficient signatures
(define-public (execute-recovery (vault-id uint))
    (let (
        (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR_VAULT_NOT_FOUND))
        (recovery-data (unwrap! (map-get? recovery-requests { vault-id: vault-id }) ERR_RECOVERY_NOT_FOUND))
        (current-block (get-current-block-height))
        (old-owner (get owner vault))
        (new-owner-principal (get new-owner recovery-data))
    )
        (asserts! (validate-vault-id vault-id) ERR_VAULT_NOT_FOUND)
        (asserts! (get is-active vault) ERR_VAULT_NOT_FOUND)
        (asserts! (not (get is-executed recovery-data)) ERR_RECOVERY_NOT_FOUND)
        (asserts! (not (is-recovery-expired recovery-data)) ERR_RECOVERY_EXPIRED)
        (asserts! (>= (get signatures-count recovery-data) (get recovery-threshold vault)) ERR_INSUFFICIENT_GUARDIAN_SIGNATURES)
        
        ;; Update vault owner
        (map-set vaults
            { vault-id: vault-id }
            (merge vault { 
                owner: new-owner-principal,
                last-activity: current-block
            })
        )
        
        ;; Update owner mapping
        (map-delete vault-owners { owner: old-owner })
        (map-set vault-owners
            { owner: new-owner-principal }
            { vault-id: vault-id }
        )
        
        ;; Mark recovery as executed
        (map-set recovery-requests
            { vault-id: vault-id }
            (merge recovery-data { is-executed: true })
        )
        
        (ok new-owner-principal)
    )
)

;; Update vault activity (heartbeat)
(define-public (update-activity (vault-id uint))
    (let (
        (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR_VAULT_NOT_FOUND))
        (current-block (get-current-block-height))
    )
        (asserts! (validate-vault-id vault-id) ERR_VAULT_NOT_FOUND)
        (asserts! (is-vault-owner vault-id tx-sender) ERR_NOT_AUTHORIZED)
        (asserts! (get is-active vault) ERR_VAULT_NOT_FOUND)
        
        (map-set vaults
            { vault-id: vault-id }
            (merge vault { last-activity: current-block })
        )
        (ok current-block)
    )
)

;; Beneficiary signs for multi-sig claim
(define-public (sign-for-claim (vault-id uint))
    (let (
        (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR_VAULT_NOT_FOUND))
        (beneficiary-data (unwrap! (map-get? vault-beneficiaries { vault-id: vault-id, beneficiary: tx-sender }) ERR_NOT_AUTHORIZED))
    )
        (asserts! (validate-vault-id vault-id) ERR_VAULT_NOT_FOUND)
        (asserts! (get is-active vault) ERR_VAULT_NOT_FOUND)
        (asserts! (not (get has-signed beneficiary-data)) ERR_NOT_AUTHORIZED)
        
        (map-set vault-beneficiaries
            { vault-id: vault-id, beneficiary: tx-sender }
            (merge beneficiary-data { has-signed: true })
        )
        (ok true)
    )
)

;; Claim STX inheritance
(define-public (claim-stx-inheritance (vault-id uint) (asset-id uint))
    (let (
        (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR_VAULT_NOT_FOUND))
        (beneficiary-data (unwrap! (map-get? vault-beneficiaries { vault-id: vault-id, beneficiary: tx-sender }) ERR_NOT_AUTHORIZED))
        (asset (unwrap! (map-get? vault-assets { vault-id: vault-id, asset-id: asset-id }) ERR_ASSET_NOT_FOUND))
        (asset-amount (get amount asset))
        (allocation-pct (get allocation-percentage beneficiary-data))
        (claimable-amount (/ (* asset-amount allocation-pct) u100))
    )
        (asserts! (validate-vault-id vault-id) ERR_VAULT_NOT_FOUND)
        (asserts! (validate-asset-id asset-id) ERR_ASSET_NOT_FOUND)
        (asserts! (get is-active vault) ERR_VAULT_NOT_FOUND)
        (asserts! (not (get is-claimed vault)) ERR_VAULT_ALREADY_CLAIMED)
        (asserts! (is-eq (get asset-type asset) ASSET_TYPE_STX) ERR_INVALID_ASSET_TYPE)
        (asserts! (get is-active asset) ERR_ASSET_NOT_FOUND)
        (asserts! (> claimable-amount u0) ERR_INSUFFICIENT_BALANCE)
        
        ;; Check if inactivity threshold is met OR early claim with signature
        (asserts! (or 
            (is-inactivity-threshold-met vault-id)
            (and (get can-claim-early beneficiary-data) (get has-signed beneficiary-data))
        ) ERR_TIMELOCK_NOT_EXPIRED)
        
        (try! (as-contract (stx-transfer? claimable-amount tx-sender tx-sender)))
        
        (let ((new-amount (- asset-amount claimable-amount)))
            (map-set vault-assets
                { vault-id: vault-id, asset-id: asset-id }
                (merge asset { 
                    amount: new-amount,
                    is-active: (> new-amount u0)
                })
            )
        )
        (ok claimable-amount)
    )
)

;; Read-only functions

;; Get vault information
(define-read-only (get-vault-info (vault-id uint))
    (map-get? vaults { vault-id: vault-id })
)

;; Get asset information
(define-read-only (get-asset-info (vault-id uint) (asset-id uint))
    (if (and (validate-vault-id vault-id) (validate-asset-id asset-id))
        (map-get? vault-assets { vault-id: vault-id, asset-id: asset-id })
        none
    )
)

;; Get beneficiary information
(define-read-only (get-beneficiary-info (vault-id uint) (beneficiary principal))
    (if (validate-vault-id vault-id)
        (map-get? vault-beneficiaries { vault-id: vault-id, beneficiary: beneficiary })
        none
    )
)

;; Get guardian information
(define-read-only (get-guardian-info (vault-id uint) (guardian principal))
    (if (validate-vault-id vault-id)
        (map-get? vault-guardians { vault-id: vault-id, guardian: guardian })
        none
    )
)

;; Get recovery request information
(define-read-only (get-recovery-info (vault-id uint))
    (if (validate-vault-id vault-id)
        (map-get? recovery-requests { vault-id: vault-id })
        none
    )
)

;; Check if guardian has signed recovery
(define-read-only (has-guardian-signed-recovery (vault-id uint) (guardian principal) (recovery-id uint))
    (if (validate-vault-id vault-id)
        (is-some (map-get? guardian-recovery-signatures { vault-id: vault-id, guardian: guardian, recovery-id: recovery-id }))
        false
    )
)

;; Check if vault can be claimed due to inactivity
(define-read-only (can-claim-due-to-inactivity (vault-id uint))
    (if (validate-vault-id vault-id)
        (is-inactivity-threshold-met vault-id)
        false
    )
)

;; Get vault owner's vault ID
(define-read-only (get-owner-vault-id (owner principal))
    (map-get? vault-owners { owner: owner })
)

;; Get remaining inactivity blocks
(define-read-only (get-remaining-inactivity-blocks (vault-id uint))
    (if (validate-vault-id vault-id)
        (match (map-get? vaults { vault-id: vault-id })
            vault 
            (let ((elapsed-blocks (calculate-inactivity-blocks (get last-activity vault)))
                  (threshold (get inactivity-threshold vault)))
                (if (>= elapsed-blocks threshold)
                    u0
                    (- threshold elapsed-blocks)
                )
            )
            u0
        )
        u0
    )
)

;; Get total number of beneficiaries for a vault
(define-read-only (get-vault-beneficiary-count (vault-id uint))
    (if (validate-vault-id vault-id)
        (get-beneficiary-count vault-id)
        u0
    )
)

;; Get total number of assets for a vault
(define-read-only (get-vault-asset-count (vault-id uint))
    (if (validate-vault-id vault-id)
        (get-asset-count vault-id)
        u0
    )
)

;; Get total number of guardians for a vault
(define-read-only (get-vault-guardian-count (vault-id uint))
    (if (validate-vault-id vault-id)
        (get-guardian-count vault-id)
        u0
    )
)

;; Check if recovery can be executed
(define-read-only (can-execute-recovery (vault-id uint))
    (if (validate-vault-id vault-id)
        (match (map-get? recovery-requests { vault-id: vault-id })
            recovery-data
            (match (map-get? vaults { vault-id: vault-id })
                vault
                (and 
                    (not (get is-executed recovery-data))
                    (not (is-recovery-expired recovery-data))
                    (>= (get signatures-count recovery-data) (get recovery-threshold vault))
                )
                false
            )
            false
        )
        false
    )
)