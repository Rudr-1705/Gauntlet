/**
 * Generate a new validator wallet for the backend
 * Run: node generate-validator-wallet.js
 */

import { ethers } from 'ethers';

console.log('\n🔐 Generating Validator Wallet...\n');

// Create a new random wallet
const wallet = ethers.Wallet.createRandom();

console.log('✅ Wallet Generated Successfully!\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📍 Wallet Address:', wallet.address);
console.log('🔑 Private Key:', wallet.privateKey);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

console.log('📋 NEXT STEPS:\n');
console.log('1️⃣  Copy the Private Key above');
console.log('2️⃣  Open backend/src/.env file');
console.log('3️⃣  Replace VALIDATOR_PRIVATE_KEY="PENDING_WALLET_KEY"');
console.log('    with VALIDATOR_PRIVATE_KEY="' + wallet.privateKey + '"');
console.log('\n4️⃣  Ask your contract friend to grant VALIDATOR_ROLE to this address:');
console.log('    ' + wallet.address);
console.log('    (They need to call: ValidatorDAO.grantValidatorRole("' + wallet.address + '"))');
console.log('\n5️⃣  Fund this wallet with Sepolia ETH for gas fees:');
console.log('    - Go to: https://sepoliafaucet.com/');
console.log('    - Send 0.5 Sepolia ETH to: ' + wallet.address);
console.log('\n6️⃣  Restart the backend: cd backend/src && nodemon app.js');
console.log('\n⚠️  SECURITY WARNING:');
console.log('    - NEVER commit the private key to Git');
console.log('    - Keep .env file in .gitignore');
console.log('    - This wallet should ONLY be used by the backend server\n');
