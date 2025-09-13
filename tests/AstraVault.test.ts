import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

// Error constants
const ERR_NOT_AUTHORIZED = types.uint(100);
const ERR_VAULT_NOT_FOUND = types.uint(101);
const ERR_INVALID_BENEFICIARY = types.uint(102);
const ERR_VAULT_ALREADY_EXISTS = types.uint(103);
const ERR_INSUFFICIENT_BALANCE = types.uint(104);
const ERR_TIMELOCK_NOT_EXPIRED = types.uint(105);
const ERR_INVALID_TIMELOCK = types.uint(106);
const ERR_BENEFICIARY_ALREADY_EXISTS = types.uint(107);
const ERR_MAX_BENEFICIARIES_REACHED = types.uint(108);
const ERR_INVALID_AMOUNT = types.uint(109);
const ERR_VAULT_ALREADY_CLAIMED = types.uint(110);
const ERR_INVALID_ASSET_TYPE = types.uint(111);
const ERR_UNSUPPORTED_BLOCKCHAIN = types.uint(112);
const ERR_INVALID_TOKEN_ID = types.uint(113);
const ERR_ASSET_NOT_FOUND = types.uint(114);
const ERR_INVALID_CONTRACT_ADDRESS = types.uint(115);
const ERR_GUARDIAN_ALREADY_EXISTS = types.uint(116);
const ERR_MAX_GUARDIANS_REACHED = types.uint(117);
const ERR_GUARDIAN_NOT_FOUND = types.uint(118);
const ERR_INSUFFICIENT_GUARDIAN_SIGNATURES = types.uint(119);
const ERR_RECOVERY_ALREADY_INITIATED = types.uint(120);
const ERR_RECOVERY_NOT_FOUND = types.uint(121);
const ERR_RECOVERY_EXPIRED = types.uint(122);
const ERR_INVALID_GUARDIAN = types.uint(123);

// Asset and blockchain constants
const ASSET_TYPE_STX = types.uint(1);
const ASSET_TYPE_SIP10 = types.uint(2);
const ASSET_TYPE_SIP09_NFT = types.uint(3);
const ASSET_TYPE_BTC = types.uint(4);
const ASSET_TYPE_EXTERNAL = types.uint(5);

const BLOCKCHAIN_STACKS = types.uint(1);
const BLOCKCHAIN_BITCOIN = types.uint(2);
const BLOCKCHAIN_ETHEREUM = types.uint(3);
const BLOCKCHAIN_POLYGON = types.uint(4);

Clarinet.test({
  name: "Test vault creation with recovery settings",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const owner = accounts.get('wallet_1')!;

    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144), // inactivity threshold (1 day)
        types.uint(1),   // required signatures
        types.uint(2),   // recovery threshold
      ], owner.address)
    ]);

    assertEquals(block.receipts.length, 1);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1));

    // Verify vault info
    let vaultInfo = chain.callReadOnlyFn('astravault', 'get-vault-info', [types.uint(1)], owner.address);
    const vault = vaultInfo.result.expectSome().expectTuple();
    
    assertEquals(vault['owner'], owner.address);
    assertEquals(vault['inactivity-threshold'], types.uint(144));
    assertEquals(vault['required-signatures'], types.uint(1));
    assertEquals(vault['recovery-threshold'], types.uint(2));
    assertEquals(vault['is-active'], types.bool(true));
    assertEquals(vault['is-claimed'], types.bool(false));
    assertEquals(vault['total-assets'], types.uint(0));
  },
});

Clarinet.test({
  name: "Test vault creation validation",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;

    // Test invalid inactivity threshold (too short)
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(100), // too short
        types.uint(1),
        types.uint(1),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_INVALID_TIMELOCK);

    // Test invalid inactivity threshold (too long)
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(60000), // too long
        types.uint(1),
        types.uint(1),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_INVALID_TIMELOCK);

    // Test invalid required signatures
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(0), // invalid
        types.uint(1),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_NOT_AUTHORIZED);

    // Test invalid recovery threshold
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(0), // invalid
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_NOT_AUTHORIZED);
  },
});

Clarinet.test({
  name: "Test duplicate vault creation prevention",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;

    // Create first vault
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(1),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1));

    // Try to create second vault with same owner
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(1),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_VAULT_ALREADY_EXISTS);
  },
});

Clarinet.test({
  name: "Test adding STX assets to vault",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const amount = 1000000000; // 1000 STX in microSTX

    // Create vault first
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(1),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1));

    // Add STX asset
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-stx-asset', [
        types.uint(1), // vault-id
        types.uint(amount),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1)); // asset-id

    // Verify asset info
    let assetInfo = chain.callReadOnlyFn('astravault', 'get-asset-info', [
      types.uint(1), // vault-id
      types.uint(1)  // asset-id
    ], owner.address);
    
    const asset = assetInfo.result.expectSome().expectTuple();
    assertEquals(asset['asset-type'], ASSET_TYPE_STX);
    assertEquals(asset['blockchain-id'], BLOCKCHAIN_STACKS);
    assertEquals(asset['amount'], types.uint(amount));
    assertEquals(asset['is-active'], types.bool(true));
  },
});

Clarinet.test({
  name: "Test adding SIP-10 token assets",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const tokenContract = accounts.get('wallet_2')!; // Mock token contract
    const amount = 1000000;

    // Create vault
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(1),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1));

    // Add SIP-10 asset
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-sip10-asset', [
        types.uint(1), // vault-id
        types.principal(tokenContract.address),
        types.uint(amount),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1));

    // Verify asset info
    let assetInfo = chain.callReadOnlyFn('astravault', 'get-asset-info', [
      types.uint(1),
      types.uint(1)
    ], owner.address);
    
    const asset = assetInfo.result.expectSome().expectTuple();
    assertEquals(asset['asset-type'], ASSET_TYPE_SIP10);
    assertEquals(asset['contract-address'], types.some(types.principal(tokenContract.address)));
  },
});

Clarinet.test({
  name: "Test adding NFT assets",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const nftContract = accounts.get('wallet_2')!;
    const tokenId = 42;

    // Create vault
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(1),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1));

    // Add NFT asset
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-nft-asset', [
        types.uint(1), // vault-id
        types.principal(nftContract.address),
        types.uint(tokenId),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1));

    // Verify asset info
    let assetInfo = chain.callReadOnlyFn('astravault', 'get-asset-info', [
      types.uint(1),
      types.uint(1)
    ], owner.address);
    
    const asset = assetInfo.result.expectSome().expectTuple();
    assertEquals(asset['asset-type'], ASSET_TYPE_SIP09_NFT);
    assertEquals(asset['token-id'], types.some(types.uint(tokenId)));
    assertEquals(asset['amount'], types.uint(1)); // NFTs always have amount 1
  },
});

Clarinet.test({
  name: "Test adding external chain assets",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const ethereumAddress = "0x742d35Cc6634C0532925a3b8D401d7fdC47f6541";
    const amount = 1000000000000000000; // 1 ETH in wei

    // Create vault
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(1),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1));

    // Add external asset
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-external-asset', [
        types.uint(1), // vault-id
        BLOCKCHAIN_ETHEREUM,
        types.ascii(ethereumAddress),
        types.uint(amount),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1));

    // Verify asset info
    let assetInfo = chain.callReadOnlyFn('astravault', 'get-asset-info', [
      types.uint(1),
      types.uint(1)
    ], owner.address);
    
    const asset = assetInfo.result.expectSome().expectTuple();
    assertEquals(asset['asset-type'], ASSET_TYPE_EXTERNAL);
    assertEquals(asset['blockchain-id'], BLOCKCHAIN_ETHEREUM);
    assertEquals(asset['external-address'], types.some(types.ascii(ethereumAddress)));
  },
});

Clarinet.test({
  name: "Test adding beneficiaries",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const beneficiary1 = accounts.get('wallet_2')!;
    const beneficiary2 = accounts.get('wallet_3')!;

    // Create vault
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(1),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1));

    // Add first beneficiary
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-beneficiary', [
        types.uint(1), // vault-id
        types.principal(beneficiary1.address),
        types.uint(50), // 50% allocation
        types.bool(true), // can claim early
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.bool(true));

    // Add second beneficiary
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-beneficiary', [
        types.uint(1),
        types.principal(beneficiary2.address),
        types.uint(50),
        types.bool(false),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.bool(true));

    // Verify beneficiary info
    let beneficiaryInfo = chain.callReadOnlyFn('astravault', 'get-beneficiary-info', [
      types.uint(1),
      types.principal(beneficiary1.address)
    ], owner.address);
    
    const beneficiary = beneficiaryInfo.result.expectSome().expectTuple();
    assertEquals(beneficiary['allocation-percentage'], types.uint(50));
    assertEquals(beneficiary['can-claim-early'], types.bool(true));
    assertEquals(beneficiary['has-signed'], types.bool(false));

    // Verify beneficiary count
    let count = chain.callReadOnlyFn('astravault', 'get-vault-beneficiary-count', [
      types.uint(1)
    ], owner.address);
    assertEquals(count.result, types.uint(2));
  },
});

Clarinet.test({
  name: "Test beneficiary validation",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const beneficiary = accounts.get('wallet_2')!;

    // Create vault
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(1),
      ], owner.address)
    ]);

    // Test invalid allocation percentage (0%)
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-beneficiary', [
        types.uint(1),
        types.principal(beneficiary.address),
        types.uint(0), // invalid
        types.bool(true),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_INVALID_BENEFICIARY);

    // Test invalid allocation percentage (>100%)
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-beneficiary', [
        types.uint(1),
        types.principal(beneficiary.address),
        types.uint(101), // invalid
        types.bool(true),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_INVALID_BENEFICIARY);

    // Test owner as beneficiary
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-beneficiary', [
        types.uint(1),
        types.principal(owner.address), // invalid
        types.uint(50),
        types.bool(true),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_INVALID_BENEFICIARY);
  },
});

Clarinet.test({
  name: "Test guardian management",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const guardian1 = accounts.get('wallet_2')!;
    const guardian2 = accounts.get('wallet_3')!;
    const guardian3 = accounts.get('wallet_4')!;

    // Create vault
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(2), // recovery threshold
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1));

    // Add guardians
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian1.address),
      ], owner.address),
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian2.address),
      ], owner.address),
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian3.address),
      ], owner.address),
    ]);

    assertEquals(block.receipts[0].result.expectOk(), types.bool(true));
    assertEquals(block.receipts[1].result.expectOk(), types.bool(true));
    assertEquals(block.receipts[2].result.expectOk(), types.bool(true));

    // Verify guardian info
    let guardianInfo = chain.callReadOnlyFn('astravault', 'get-guardian-info', [
      types.uint(1),
      types.principal(guardian1.address)
    ], owner.address);
    
    const guardian = guardianInfo.result.expectSome().expectTuple();
    assertEquals(guardian['is-active'], types.bool(true));
    assertEquals(guardian['has-signed-recovery'], types.bool(false));

    // Verify guardian count
    let count = chain.callReadOnlyFn('astravault', 'get-vault-guardian-count', [
      types.uint(1)
    ], owner.address);
    assertEquals(count.result, types.uint(3));
  },
});

Clarinet.test({
  name: "Test guardian validation",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const guardian = accounts.get('wallet_2')!;

    // Create vault
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(1),
      ], owner.address)
    ]);

    // Test owner as guardian (invalid)
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(owner.address), // invalid
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_INVALID_GUARDIAN);

    // Add valid guardian first
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian.address),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.bool(true));

    // Test duplicate guardian
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian.address), // duplicate
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_GUARDIAN_ALREADY_EXISTS);
  },
});

Clarinet.test({
  name: "Test emergency recovery initiation",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const guardian1 = accounts.get('wallet_2')!;
    const guardian2 = accounts.get('wallet_3')!;
    const newOwner = accounts.get('wallet_4')!;

    // Create vault and add guardians
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(2), // recovery threshold
      ], owner.address),
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian1.address),
      ], owner.address),
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian2.address),
      ], owner.address),
    ]);

    // Guardian initiates recovery
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'initiate-recovery', [
        types.uint(1),
        types.principal(newOwner.address),
      ], guardian1.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1)); // recovery-id

    // Verify recovery info
    let recoveryInfo = chain.callReadOnlyFn('astravault', 'get-recovery-info', [
      types.uint(1)
    ], owner.address);
    
    const recovery = recoveryInfo.result.expectSome().expectTuple();
    assertEquals(recovery['recovery-id'], types.uint(1));
    assertEquals(recovery['new-owner'], types.principal(newOwner.address));
    assertEquals(recovery['signatures-count'], types.uint(1));
    assertEquals(recovery['is-executed'], types.bool(false));
  },
});

Clarinet.test({
  name: "Test recovery signature collection",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const guardian1 = accounts.get('wallet_2')!;
    const guardian2 = accounts.get('wallet_3')!;
    const guardian3 = accounts.get('wallet_4')!;
    const newOwner = accounts.get('wallet_5')!;

    // Setup vault with guardians
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(2), // recovery threshold
      ], owner.address),
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian1.address),
      ], owner.address),
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian2.address),
      ], owner.address),
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian3.address),
      ], owner.address),
    ]);

    // Initiate recovery
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'initiate-recovery', [
        types.uint(1),
        types.principal(newOwner.address),
      ], guardian1.address)
    ]);

    // Second guardian signs recovery
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'sign-recovery', [
        types.uint(1),
      ], guardian2.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.bool(true));

    // Verify signature count increased
    let recoveryInfo = chain.callReadOnlyFn('astravault', 'get-recovery-info', [
      types.uint(1)
    ], owner.address);
    
    const recovery = recoveryInfo.result.expectSome().expectTuple();
    assertEquals(recovery['signatures-count'], types.uint(2));

    // Verify guardian signature status
    let hasSigned = chain.callReadOnlyFn('astravault', 'has-guardian-signed-recovery', [
      types.uint(1),
      types.principal(guardian2.address),
      types.uint(1)
    ], owner.address);
    assertEquals(hasSigned.result, types.bool(true));
  },
});

Clarinet.test({
  name: "Test recovery execution",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const guardian1 = accounts.get('wallet_2')!;
    const guardian2 = accounts.get('wallet_3')!;
    const newOwner = accounts.get('wallet_4')!;

    // Setup and initiate recovery
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(2),
      ], owner.address),
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian1.address),
      ], owner.address),
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian2.address),
      ], owner.address),
    ]);

    block = chain.mineBlock([
      Tx.contractCall('astravault', 'initiate-recovery', [
        types.uint(1),
        types.principal(newOwner.address),
      ], guardian1.address),
      Tx.contractCall('astravault', 'sign-recovery', [
        types.uint(1),
      ], guardian2.address)
    ]);

    // Mine blocks to pass recovery period (1008 blocks)
    chain.mineEmptyBlockUntil(1010);

    // Check if recovery can be executed
    let canExecute = chain.callReadOnlyFn('astravault', 'can-execute-recovery', [
      types.uint(1)
    ], owner.address);
    assertEquals(canExecute.result, types.bool(true));

    // Execute recovery
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'execute-recovery', [
        types.uint(1),
      ], guardian1.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.principal(newOwner.address));

    // Verify vault ownership changed
    let vaultInfo = chain.callReadOnlyFn('astravault', 'get-vault-info', [
      types.uint(1)
    ], newOwner.address);
    
    const vault = vaultInfo.result.expectSome().expectTuple();
    assertEquals(vault['owner'], types.principal(newOwner.address));

    // Verify recovery is marked as executed
    let recoveryInfo = chain.callReadOnlyFn('astravault', 'get-recovery-info', [
      types.uint(1)
    ], newOwner.address);
    
    const recovery = recoveryInfo.result.expectSome().expectTuple();
    assertEquals(recovery['is-executed'], types.bool(true));
  },
});

Clarinet.test({
  name: "Test recovery validation and error cases",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const guardian1 = accounts.get('wallet_2')!;
    const guardian2 = accounts.get('wallet_3')!;
    const nonGuardian = accounts.get('wallet_4')!;
    const newOwner = accounts.get('wallet_5')!;

    // Setup vault with guardians
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(2),
      ], owner.address),
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian1.address),
      ], owner.address),
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian2.address),
      ], owner.address),
    ]);

    // Test non-guardian trying to initiate recovery
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'initiate-recovery', [
        types.uint(1),
        types.principal(newOwner.address),
      ], nonGuardian.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_NOT_AUTHORIZED);

    // Test invalid new owner (same as current)
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'initiate-recovery', [
        types.uint(1),
        types.principal(owner.address), // same as current owner
      ], guardian1.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_INVALID_GUARDIAN);

    // Initiate valid recovery
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'initiate-recovery', [
        types.uint(1),
        types.principal(newOwner.address),
      ], guardian1.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1));

    // Test duplicate recovery initiation
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'initiate-recovery', [
        types.uint(1),
        types.principal(newOwner.address),
      ], guardian2.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_RECOVERY_ALREADY_INITIATED);

    // Test non-guardian signing recovery
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'sign-recovery', [
        types.uint(1),
      ], nonGuardian.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_NOT_AUTHORIZED);

    // Test guardian signing twice
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'sign-recovery', [
        types.uint(1),
      ], guardian1.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_NOT_AUTHORIZED); // Already signed during initiation
  },
});

Clarinet.test({
  name: "Test recovery execution validation",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const guardian1 = accounts.get('wallet_2')!;
    const guardian2 = accounts.get('wallet_3')!;
    const guardian3 = accounts.get('wallet_4')!;
    const newOwner = accounts.get('wallet_5')!;

    // Setup vault with 3 guardians, threshold 2
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(2), // threshold 2
      ], owner.address),
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian1.address),
      ], owner.address),
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian2.address),
      ], owner.address),
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian3.address),
      ], owner.address),
    ]);

    // Initiate recovery with only 1 signature
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'initiate-recovery', [
        types.uint(1),
        types.principal(newOwner.address),
      ], guardian1.address)
    ]);

    // Mine blocks to pass recovery period
    chain.mineEmptyBlockUntil(1010);

    // Try to execute with insufficient signatures
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'execute-recovery', [
        types.uint(1),
      ], guardian1.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_INSUFFICIENT_GUARDIAN_SIGNATURES);

    // Get second signature
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'sign-recovery', [
        types.uint(1),
      ], guardian2.address)
    ]);

    // Now execution should work
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'execute-recovery', [
        types.uint(1),
      ], guardian1.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.principal(newOwner.address));
  },
});

Clarinet.test({
  name: "Test activity heartbeat system",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;

    // Create vault
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144), // 1 day threshold
        types.uint(1),
        types.uint(1),
      ], owner.address)
    ]);

    // Get initial activity
    let vaultInfo = chain.callReadOnlyFn('astravault', 'get-vault-info', [
      types.uint(1)
    ], owner.address);
    const initialActivity = vaultInfo.result.expectSome().expectTuple()['last-activity'];

    // Mine some blocks
    chain.mineEmptyBlock(50);

    // Update activity
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'update-activity', [
        types.uint(1),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk().expectUint() > initialActivity.expectUint(), true);

    // Verify activity updated
    vaultInfo = chain.callReadOnlyFn('astravault', 'get-vault-info', [
      types.uint(1)
    ], owner.address);
    const newActivity = vaultInfo.result.expectSome().expectTuple()['last-activity'];
    assertEquals(newActivity.expectUint() > initialActivity.expectUint(), true);
  },
});

Clarinet.test({
  name: "Test inactivity detection",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;

    // Create vault with short inactivity threshold for testing
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144), // 144 blocks threshold
        types.uint(1),
        types.uint(1),
      ], owner.address)
    ]);

    // Initially should not be claimable due to inactivity
    let canClaim = chain.callReadOnlyFn('astravault', 'can-claim-due-to-inactivity', [
      types.uint(1)
    ], owner.address);
    assertEquals(canClaim.result, types.bool(false));

    // Check remaining inactivity blocks
    let remainingBlocks = chain.callReadOnlyFn('astravault', 'get-remaining-inactivity-blocks', [
      types.uint(1)
    ], owner.address);
    assertEquals(remainingBlocks.result.expectUint(), 144);

    // Mine blocks to exceed threshold
    chain.mineEmptyBlockUntil(150);

    // Now should be claimable due to inactivity
    canClaim = chain.callReadOnlyFn('astravault', 'can-claim-due-to-inactivity', [
      types.uint(1)
    ], owner.address);
    assertEquals(canClaim.result, types.bool(true));

    // Remaining blocks should be 0
    remainingBlocks = chain.callReadOnlyFn('astravault', 'get-remaining-inactivity-blocks', [
      types.uint(1)
    ], owner.address);
    assertEquals(remainingBlocks.result, types.uint(0));
  },
});

Clarinet.test({
  name: "Test beneficiary signing and STX inheritance claiming",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const beneficiary = accounts.get('wallet_2')!;
    const amount = 1000000000; // 1000 STX

    // Setup vault with STX asset and beneficiary
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(1),
      ], owner.address),
      Tx.contractCall('astravault', 'add-stx-asset', [
        types.uint(1),
        types.uint(amount),
      ], owner.address),
      Tx.contractCall('astravault', 'add-beneficiary', [
        types.uint(1),
        types.principal(beneficiary.address),
        types.uint(100), // 100% allocation
        types.bool(true), // can claim early
      ], owner.address),
    ]);

    // Beneficiary signs for claim
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'sign-for-claim', [
        types.uint(1),
      ], beneficiary.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.bool(true));

    // Verify beneficiary signed
    let beneficiaryInfo = chain.callReadOnlyFn('astravault', 'get-beneficiary-info', [
      types.uint(1),
      types.principal(beneficiary.address)
    ], owner.address);
    const beneficiaryData = beneficiaryInfo.result.expectSome().expectTuple();
    assertEquals(beneficiaryData['has-signed'], types.bool(true));

    // Claim inheritance (early claim with signature)
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'claim-stx-inheritance', [
        types.uint(1), // vault-id
        types.uint(1), // asset-id
      ], beneficiary.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(amount));

    // Verify asset amount reduced
    let assetInfo = chain.callReadOnlyFn('astravault', 'get-asset-info', [
      types.uint(1),
      types.uint(1)
    ], owner.address);
    const asset = assetInfo.result.expectSome().expectTuple();
    assertEquals(asset['amount'], types.uint(0));
    assertEquals(asset['is-active'], types.bool(false));
  },
});

Clarinet.test({
  name: "Test inheritance claiming after inactivity",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const beneficiary = accounts.get('wallet_2')!;
    const amount = 2000000000; // 2000 STX

    // Setup vault with beneficiary who cannot claim early
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144), // 144 blocks threshold
        types.uint(1),
        types.uint(1),
      ], owner.address),
      Tx.contractCall('astravault', 'add-stx-asset', [
        types.uint(1),
        types.uint(amount),
      ], owner.address),
      Tx.contractCall('astravault', 'add-beneficiary', [
        types.uint(1),
        types.principal(beneficiary.address),
        types.uint(50), // 50% allocation
        types.bool(false), // cannot claim early
      ], owner.address),
    ]);

    // Try to claim before inactivity threshold
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'claim-stx-inheritance', [
        types.uint(1),
        types.uint(1),
      ], beneficiary.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_TIMELOCK_NOT_EXPIRED);

    // Mine blocks to exceed inactivity threshold
    chain.mineEmptyBlockUntil(150);

    // Now claim should work
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'claim-stx-inheritance', [
        types.uint(1),
        types.uint(1),
      ], beneficiary.address)
    ]);
    // Should get 50% of 2000 STX = 1000 STX
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1000000000));

    // Verify remaining asset amount
    let assetInfo = chain.callReadOnlyFn('astravault', 'get-asset-info', [
      types.uint(1),
      types.uint(1)
    ], owner.address);
    const asset = assetInfo.result.expectSome().expectTuple();
    assertEquals(asset['amount'], types.uint(1000000000)); // 50% remaining
    assertEquals(asset['is-active'], types.bool(true)); // Still active with remaining balance
  },
});

Clarinet.test({
  name: "Test asset validation and authorization",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const nonOwner = accounts.get('wallet_2')!;

    // Create vault
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(1),
      ], owner.address)
    ]);

    // Test unauthorized asset addition
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-stx-asset', [
        types.uint(1),
        types.uint(1000000000),
      ], nonOwner.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_NOT_AUTHORIZED);

    // Test invalid amount
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-stx-asset', [
        types.uint(1),
        types.uint(0), // invalid amount
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_INVALID_AMOUNT);

    // Test invalid vault ID
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-stx-asset', [
        types.uint(999), // non-existent vault
        types.uint(1000000000),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_VAULT_NOT_FOUND);

    // Test invalid token ID for NFT
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-nft-asset', [
        types.uint(1),
        types.principal(nonOwner.address),
        types.uint(0), // invalid token ID
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_INVALID_TOKEN_ID);

    // Test invalid blockchain ID for external asset
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-external-asset', [
        types.uint(1),
        types.uint(999), // invalid blockchain
        types.ascii("0x123"),
        types.uint(1000),
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectErr(), ERR_UNSUPPORTED_BLOCKCHAIN);
  },
});

Clarinet.test({
  name: "Test read-only function edge cases",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;

    // Test functions with non-existent vault
    let result = chain.callReadOnlyFn('astravault', 'get-vault-info', [
      types.uint(999)
    ], owner.address);
    assertEquals(result.result, types.none());

    result = chain.callReadOnlyFn('astravault', 'get-asset-info', [
      types.uint(999),
      types.uint(1)
    ], owner.address);
    assertEquals(result.result, types.none());

    result = chain.callReadOnlyFn('astravault', 'get-beneficiary-info', [
      types.uint(999),
      types.principal(owner.address)
    ], owner.address);
    assertEquals(result.result, types.none());

    result = chain.callReadOnlyFn('astravault', 'get-guardian-info', [
      types.uint(999),
      types.principal(owner.address)
    ], owner.address);
    assertEquals(result.result, types.none());

    result = chain.callReadOnlyFn('astravault', 'get-recovery-info', [
      types.uint(999)
    ], owner.address);
    assertEquals(result.result, types.none());

    result = chain.callReadOnlyFn('astravault', 'can-claim-due-to-inactivity', [
      types.uint(999)
    ], owner.address);
    assertEquals(result.result, types.bool(false));

    result = chain.callReadOnlyFn('astravault', 'get-remaining-inactivity-blocks', [
      types.uint(999)
    ], owner.address);
    assertEquals(result.result, types.uint(0));

    result = chain.callReadOnlyFn('astravault', 'get-vault-beneficiary-count', [
      types.uint(999)
    ], owner.address);
    assertEquals(result.result, types.uint(0));

    result = chain.callReadOnlyFn('astravault', 'get-vault-asset-count', [
      types.uint(999)
    ], owner.address);
    assertEquals(result.result, types.uint(0));

    result = chain.callReadOnlyFn('astravault', 'get-vault-guardian-count', [
      types.uint(999)
    ], owner.address);
    assertEquals(result.result, types.uint(0));

    result = chain.callReadOnlyFn('astravault', 'can-execute-recovery', [
      types.uint(999)
    ], owner.address);
    assertEquals(result.result, types.bool(false));
  },
});

Clarinet.test({
  name: "Test maximum limits and boundaries",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const accounts_array = Array.from(accounts.values());

    // Create vault
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(1),
      ], owner.address)
    ]);

    // Test adding maximum number of beneficiaries (10)
    let addBeneficiaryTxs = [];
    for (let i = 1; i <= 10; i++) {
      if (accounts_array[i]) {
        addBeneficiaryTxs.push(
          Tx.contractCall('astravault', 'add-beneficiary', [
            types.uint(1),
            types.principal(accounts_array[i].address),
            types.uint(10), // 10% each
            types.bool(false),
          ], owner.address)
        );
      }
    }

    block = chain.mineBlock(addBeneficiaryTxs);
    
    // All should succeed
    for (let receipt of block.receipts) {
      assertEquals(receipt.result.expectOk(), types.bool(true));
    }

    // Try to add one more (should fail)
    if (accounts_array[11]) {
      block = chain.mineBlock([
        Tx.contractCall('astravault', 'add-beneficiary', [
          types.uint(1),
          types.principal(accounts_array[11].address),
          types.uint(10),
          types.bool(false),
        ], owner.address)
      ]);
      assertEquals(block.receipts[0].result.expectErr(), ERR_MAX_BENEFICIARIES_REACHED);
    }

    // Test adding maximum number of guardians (5)
    let addGuardianTxs = [];
    for (let i = 1; i <= 5; i++) {
      if (accounts_array[i + 10]) {
        addGuardianTxs.push(
          Tx.contractCall('astravault', 'add-guardian', [
            types.uint(1),
            types.principal(accounts_array[i + 10].address),
          ], owner.address)
        );
      }
    }

    block = chain.mineBlock(addGuardianTxs);
    
    // All should succeed
    for (let receipt of block.receipts) {
      assertEquals(receipt.result.expectOk(), types.bool(true));
    }

    // Try to add one more guardian (should fail)
    if (accounts_array[16]) {
      block = chain.mineBlock([
        Tx.contractCall('astravault', 'add-guardian', [
          types.uint(1),
          types.principal(accounts_array[16].address),
        ], owner.address)
      ]);
      assertEquals(block.receipts[0].result.expectErr(), ERR_MAX_GUARDIANS_REACHED);
    }
  },
});

Clarinet.test({
  name: "Test comprehensive vault lifecycle",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const owner = accounts.get('wallet_1')!;
    const beneficiary = accounts.get('wallet_2')!;
    const guardian1 = accounts.get('wallet_3')!;
    const guardian2 = accounts.get('wallet_4')!;
    const guardian3 = accounts.get('wallet_5')!;
    const newOwner = accounts.get('wallet_6')!;

    // 1. Create comprehensive vault
    let block = chain.mineBlock([
      Tx.contractCall('astravault', 'create-vault', [
        types.uint(144),
        types.uint(1),
        types.uint(2), // need 2 guardians for recovery
      ], owner.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1));

    // 2. Add multiple assets
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-stx-asset', [
        types.uint(1),
        types.uint(5000000000), // 5000 STX
      ], owner.address),
      Tx.contractCall('astravault', 'add-external-asset', [
        types.uint(1),
        BLOCKCHAIN_ETHEREUM,
        types.ascii("0x742d35Cc6634C0532925a3b8D401d7fdC47f6541"),
        types.uint(2000000000000000000), // 2 ETH
      ], owner.address),
    ]);

    // 3. Add beneficiary and guardians
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'add-beneficiary', [
        types.uint(1),
        types.principal(beneficiary.address),
        types.uint(100),
        types.bool(false), // cannot claim early
      ], owner.address),
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian1.address),
      ], owner.address),
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian2.address),
      ], owner.address),
      Tx.contractCall('astravault', 'add-guardian', [
        types.uint(1),
        types.principal(guardian3.address),
      ], owner.address),
    ]);

    // 4. Verify vault state
    let vaultInfo = chain.callReadOnlyFn('astravault', 'get-vault-info', [types.uint(1)], owner.address);
    const vault = vaultInfo.result.expectSome().expectTuple();
    assertEquals(vault['total-assets'], types.uint(2));

    let assetCount = chain.callReadOnlyFn('astravault', 'get-vault-asset-count', [types.uint(1)], owner.address);
    assertEquals(assetCount.result, types.uint(2));

    let beneficiaryCount = chain.callReadOnlyFn('astravault', 'get-vault-beneficiary-count', [types.uint(1)], owner.address);
    assertEquals(beneficiaryCount.result, types.uint(1));

    let guardianCount = chain.callReadOnlyFn('astravault', 'get-vault-guardian-count', [types.uint(1)], owner.address);
    assertEquals(guardianCount.result, types.uint(3));

    // 5. Test heartbeat system
    let initialActivity = vault['last-activity'];
    chain.mineEmptyBlock(20);
    
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'update-activity', [types.uint(1)], owner.address)
    ]);
    
    vaultInfo = chain.callReadOnlyFn('astravault', 'get-vault-info', [types.uint(1)], owner.address);
    const updatedVault = vaultInfo.result.expectSome().expectTuple();
    assertEquals(updatedVault['last-activity'].expectUint() > initialActivity.expectUint(), true);

    // 6. Test emergency recovery process
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'initiate-recovery', [
        types.uint(1),
        types.principal(newOwner.address),
      ], guardian1.address),
      Tx.contractCall('astravault', 'sign-recovery', [types.uint(1)], guardian2.address)
    ]);

    // 7. Mine blocks for recovery period and execute
    chain.mineEmptyBlockUntil(1010);
    
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'execute-recovery', [types.uint(1)], guardian1.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.principal(newOwner.address));

    // 8. Verify ownership transfer
    vaultInfo = chain.callReadOnlyFn('astravault', 'get-vault-info', [types.uint(1)], newOwner.address);
    const recoveredVault = vaultInfo.result.expectSome().expectTuple();
    assertEquals(recoveredVault['owner'], types.principal(newOwner.address));

    // 9. Test inheritance after long inactivity
    chain.mineEmptyBlockUntil(1200); // Exceed inactivity threshold
    
    let canClaim = chain.callReadOnlyFn('astravault', 'can-claim-due-to-inactivity', [types.uint(1)], newOwner.address);
    assertEquals(canClaim.result, types.bool(true));

    // 10. Beneficiary claims inheritance
    block = chain.mineBlock([
      Tx.contractCall('astravault', 'claim-stx-inheritance', [
        types.uint(1), // vault-id
        types.uint(1), // asset-id (STX asset)
      ], beneficiary.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(5000000000)); // Full amount since 100% allocation
  },
});