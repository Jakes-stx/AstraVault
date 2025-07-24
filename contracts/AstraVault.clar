;; AstraVault - Secure Bitcoin Inheritance Protocol
;; A decentralized inheritance system for Bitcoin wealth preservation

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

;; Data Variables
(define-data-var next-vault-id uint u1)
(define-data-var max-beneficiaries-per-vault uint u10)
(define-data-var min-inactivity-period uint u144) ;; ~1 day in blocks
(define-data-var max-inactivity-period uint u52560) ;; ~1 year in blocks

;; Data Maps
(define-map vaults
    { vault-id: uint }
    {
        owner: principal,
        balance: uint,
        created-at: uint,
        last-activity: uint,
        inactivity-threshold: uint,
        is-active: bool,
        is-claimed: bool,
        required-signatures: uint
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

;; Private Functions
(define-private (get-current-block-height)
    stacks-block-height
)

(define-private (is-vault-owner (vault-id uint) (user principal))
    (if (> vault-id u0)
        (match (map-get? vaults { vault-id: vault-id })
            vault (is-eq (get owner vault) user)
            false
        )
        false
    )
)

(define-private (calculate-inactivity-blocks (last-activity uint))
    (- (get-current-block-height) last-activity)
)

(define-private (is-inactivity-threshold-met (vault-id uint))
    (if (> vault-id u0)
        (match (map-get? vaults { vault-id: vault-id })
            vault 
            (let ((inactivity-blocks (calculate-inactivity-blocks (get last-activity vault))))
                (>= inactivity-blocks (get inactivity-threshold vault))
            )
            false
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

(define-private (validate-allocation-percentage (percentage uint))
    (and (> percentage u0) (<= percentage u100))
)

;; Public Functions

;; Create a new inheritance vault
(define-public (create-vault (initial-deposit uint) (inactivity-threshold uint) (required-signatures uint))
    (let (
        (vault-id (var-get next-vault-id))
        (current-block (get-current-block-height))
    )
        (asserts! (> initial-deposit u0) ERR_INVALID_AMOUNT)
        (asserts! (and (>= inactivity-threshold (var-get min-inactivity-period))
                      (<= inactivity-threshold (var-get max-inactivity-period))) ERR_INVALID_TIMELOCK)
        (asserts! (> required-signatures u0) ERR_NOT_AUTHORIZED)
        (asserts! (is-none (map-get? vault-owners { owner: tx-sender })) ERR_VAULT_ALREADY_EXISTS)
        
        (try! (stx-transfer? initial-deposit tx-sender (as-contract tx-sender)))
        
        (map-set vaults
            { vault-id: vault-id }
            {
                owner: tx-sender,
                balance: initial-deposit,
                created-at: current-block,
                last-activity: current-block,
                inactivity-threshold: inactivity-threshold,
                is-active: true,
                is-claimed: false,
                required-signatures: required-signatures
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
        
        (var-set next-vault-id (+ vault-id u1))
        (ok vault-id)
    )
)

;; Add a beneficiary to a vault
(define-public (add-beneficiary (vault-id uint) (beneficiary principal) (allocation-percentage uint) (can-claim-early bool))
    (let (
        (current-count (get-beneficiary-count vault-id))
        (current-block (get-current-block-height))
    )
        (asserts! (is-vault-owner vault-id tx-sender) ERR_NOT_AUTHORIZED)
        (asserts! (is-some (map-get? vaults { vault-id: vault-id })) ERR_VAULT_NOT_FOUND)
        (asserts! (< current-count (var-get max-beneficiaries-per-vault)) ERR_MAX_BENEFICIARIES_REACHED)
        (asserts! (validate-allocation-percentage allocation-percentage) ERR_INVALID_BENEFICIARY)
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
        (ok true)
    )
)

;; Update vault activity (heartbeat)
(define-public (update-activity (vault-id uint))
    (let (
        (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR_VAULT_NOT_FOUND))
        (current-block (get-current-block-height))
    )
        (asserts! (is-vault-owner vault-id tx-sender) ERR_NOT_AUTHORIZED)
        (asserts! (get is-active vault) ERR_VAULT_NOT_FOUND)
        
        (map-set vaults
            { vault-id: vault-id }
            (merge vault { last-activity: current-block })
        )
        (ok current-block)
    )
)

;; Add funds to existing vault
(define-public (deposit-to-vault (vault-id uint) (amount uint))
    (let (
        (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR_VAULT_NOT_FOUND))
    )
        (asserts! (is-vault-owner vault-id tx-sender) ERR_NOT_AUTHORIZED)
        (asserts! (> amount u0) ERR_INVALID_AMOUNT)
        (asserts! (get is-active vault) ERR_VAULT_NOT_FOUND)
        
        (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
        
        (map-set vaults
            { vault-id: vault-id }
            (merge vault { 
                balance: (+ (get balance vault) amount),
                last-activity: (get-current-block-height)
            })
        )
        (ok true)
    )
)

;; Beneficiary signs for multi-sig claim
(define-public (sign-for-claim (vault-id uint))
    (let (
        (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR_VAULT_NOT_FOUND))
        (beneficiary-data (unwrap! (map-get? vault-beneficiaries { vault-id: vault-id, beneficiary: tx-sender }) ERR_NOT_AUTHORIZED))
    )
        (asserts! (> vault-id u0) ERR_VAULT_NOT_FOUND)
        (asserts! (get is-active vault) ERR_VAULT_NOT_FOUND)
        (asserts! (not (get has-signed beneficiary-data)) ERR_NOT_AUTHORIZED)
        
        (map-set vault-beneficiaries
            { vault-id: vault-id, beneficiary: tx-sender }
            (merge beneficiary-data { has-signed: true })
        )
        (ok true)
    )
)

;; Claim inheritance (after inactivity period or with required signatures)
(define-public (claim-inheritance (vault-id uint))
    (let (
        (vault (unwrap! (map-get? vaults { vault-id: vault-id }) ERR_VAULT_NOT_FOUND))
        (beneficiary-data (unwrap! (map-get? vault-beneficiaries { vault-id: vault-id, beneficiary: tx-sender }) ERR_NOT_AUTHORIZED))
        (claimable-amount (/ (* (get balance vault) (get allocation-percentage beneficiary-data)) u100))
    )
        (asserts! (> vault-id u0) ERR_VAULT_NOT_FOUND)
        (asserts! (get is-active vault) ERR_VAULT_NOT_FOUND)
        (asserts! (not (get is-claimed vault)) ERR_VAULT_ALREADY_CLAIMED)
        (asserts! (> claimable-amount u0) ERR_INSUFFICIENT_BALANCE)
        
        ;; Check if inactivity threshold is met OR early claim with signature
        (asserts! (or 
            (and (is-some (map-get? vaults { vault-id: vault-id })) (is-inactivity-threshold-met vault-id))
            (and (get can-claim-early beneficiary-data) (get has-signed beneficiary-data))
        ) ERR_TIMELOCK_NOT_EXPIRED)
        
        (try! (as-contract (stx-transfer? claimable-amount tx-sender tx-sender)))
        
        (map-set vaults
            { vault-id: vault-id }
            (merge vault { 
                balance: (- (get balance vault) claimable-amount),
                is-claimed: (is-eq (- (get balance vault) claimable-amount) u0)
            })
        )
        (ok claimable-amount)
    )
)

;; Read-only functions

;; Get vault information
(define-read-only (get-vault-info (vault-id uint))
    (map-get? vaults { vault-id: vault-id })
)

;; Get beneficiary information
(define-read-only (get-beneficiary-info (vault-id uint) (beneficiary principal))
    (map-get? vault-beneficiaries { vault-id: vault-id, beneficiary: beneficiary })
)

;; Check if vault can be claimed due to inactivity
(define-read-only (can-claim-due-to-inactivity (vault-id uint))
    (and 
        (> vault-id u0)
        (is-some (map-get? vaults { vault-id: vault-id }))
        (is-inactivity-threshold-met vault-id)
    )
)

;; Get vault owner's vault ID
(define-read-only (get-owner-vault-id (owner principal))
    (map-get? vault-owners { owner: owner })
)

;; Get remaining inactivity blocks
(define-read-only (get-remaining-inactivity-blocks (vault-id uint))
    (if (and (> vault-id u0) (is-some (map-get? vaults { vault-id: vault-id })))
        (match (map-get? vaults { vault-id: vault-id })
            vault 
            (let ((elapsed-blocks (calculate-inactivity-blocks (get last-activity vault))))
                (if (>= elapsed-blocks (get inactivity-threshold vault))
                    u0
                    (- (get inactivity-threshold vault) elapsed-blocks)
                )
            )
            u0
        )
        u0
    )
)

;; Get total number of beneficiaries for a vault
(define-read-only (get-vault-beneficiary-count (vault-id uint))
    (get-beneficiary-count vault-id)
)