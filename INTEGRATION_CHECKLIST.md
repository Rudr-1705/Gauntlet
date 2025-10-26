# 🚀 SMART CONTRACT INTEGRATION CHECKLIST

## What You Need From Your Friend (Smart Contract Developer)

### ✅ **1. CONTRACT ADDRESSES** (After Deployment)
Once contracts are deployed, you need these addresses:

```bash
# Add to backend/src/.env
SPONSOR_DAO_ADDRESS="0x..."      # SponsorDAO contract address
VALIDATOR_DAO_ADDRESS="0x..."    # ValidatorDAO contract address
```

### ✅ **2. RPC URL** (Blockchain Network)
Which network are you deploying to?

```bash
# Add to backend/src/.env

# For Ethereum Mainnet:
RPC_URL="https://mainnet.infura.io/v3/YOUR_INFURA_KEY"

# For Ethereum Sepolia Testnet:
RPC_URL="https://sepolia.infura.io/v3/YOUR_INFURA_KEY"

# For Polygon Mainnet:
RPC_URL="https://polygon-mainnet.infura.io/v3/YOUR_INFURA_KEY"

# For Polygon Amoy Testnet:
RPC_URL="https://polygon-amoy.infura.io/v3/YOUR_INFURA_KEY"

# For Local Development (Hardhat/Ganache):
RPC_URL="http://127.0.0.1:8545"
```

### ✅ **3. CONTRACT ABIs** (Application Binary Interface)
You need the ABI JSON files for both contracts.

**Required Files:**
- `SponsorDAO.json` - Full ABI from compilation
- `ValidatorDAO.json` - Full ABI from compilation

**Where to put them:**
Create folder: `backend/src/abis/`

Then place:
- `backend/src/abis/SponsorDAO.json`
- `backend/src/abis/ValidatorDAO.json`

### ❌ **NO PRIVATE KEY NEEDED!**

**Important:** Backend does NOT need a private key!
- ✅ Users sign their OWN transactions from MetaMask
- ✅ Backend only LISTENS to events
- ✅ `msg.sender` in contracts = user's wallet address
- ✅ PYUSD deducted directly from user's wallet

⚠️ **SECURITY**: Backend is read-only, much more secure!

---

## Contract Requirements Checklist

### 📋 **SponsorDAO Contract Must Have:**

#### Events:
```solidity
✅ event ChallengeCreated(
    uint256 indexed id, 
    address indexed creator, 
    uint256 stakeAmount, 
    bytes32 domain, 
    string metadataURI, 
    uint256 startTime, 
    uint256 endTime
)

✅ event ChallengeFunded(
    uint256 indexed id, 
    address indexed participant, 
    uint256 amount
)

✅ event ParticipantJoined(
    uint256 indexed challengeId,
    address indexed participant,
    uint256 stakeAmount,
    bytes32 answerHash
)

✅ event ChallengeCompleted(
    uint256 indexed id, 
    address indexed winner, 
    uint256 rewardAmount
)
```

#### Functions:
```solidity
✅ function createChallenge(
    uint256 stakeAmount,
    bytes32 domain,
    string memory metadataURI,
    uint256 startTime,
    uint256 endTime,
    bytes32 correctAnswerHash
) external payable returns (uint256)

✅ function stakeOnChallenge(
    uint256 challengeId,
    uint256 stakeAmount,
    bytes32 answerHash
) external payable

✅ function releaseReward(
    uint256 challengeId,
    address participant
) external onlyValidator
```

### 📋 **ValidatorDAO Contract Must Have:**

#### Events:
```solidity
✅ event ChallengeReceived(uint256 indexed challengeId)

✅ event ValidationResultSubmitted(
    uint256 indexed challengeId,
    address indexed winner,
    bool success,
    string zkProofHash
)
```

#### Functions:
```solidity
✅ function verifyAnswer(
    uint256 challengeId,
    address participant,
    bytes32 answerHash
) external returns (bool)

✅ function getCorrectAnswerHash(
    uint256 challengeId
) external view returns (bytes32)
```

---

## Frontend Integration Requirements

### ✅ **1. Environment Variables**
Create `frontend/.env`:

```bash
VITE_SPONSOR_DAO_ADDRESS="0x..."
VITE_VALIDATOR_DAO_ADDRESS="0x..."
VITE_RPC_URL="https://..."
VITE_CHAIN_ID="1"  # 1=Mainnet, 11155111=Sepolia, 137=Polygon, 80002=Amoy
```

### ✅ **2. ABI Files for Frontend**
Copy the same ABIs to frontend:
- `frontend/src/abis/SponsorDAO.json`
- `frontend/src/abis/ValidatorDAO.json`

### ✅ **3. Contract Interaction Service**
Already prepared location: `frontend/src/services/contractService.js`

---

## Testing Before Going Live

### 🧪 **Phase 1: Without Smart Contracts (Current)**
✅ You can test NOW with mock transactions:
1. Create challenge
2. Join challenge with answer
3. Call `/api/participants/:id/verify-answer`
4. Check if reward released

### 🧪 **Phase 2: With Smart Contracts (After Deployment)**

#### Step 1: Add to `.env`
```bash
RPC_URL="..."
SPONSOR_DAO_ADDRESS="0x..."
VALIDATOR_DAO_ADDRESS="0x..."
PRIVATE_KEY="0x..."
```

#### Step 2: Create ABI folder
```bash
mkdir -p backend/src/abis
```

#### Step 3: Add ABI files
Place `SponsorDAO.json` and `ValidatorDAO.json` in `backend/src/abis/`

#### Step 4: Update app.js
Uncomment blockchain initialization (already in code):
```javascript
// Lines 59-79 in app.js are ready, just uncomment when you have ABIs
```

#### Step 5: Restart backend
```bash
cd backend/src
nodemon app.js
```

You should see:
```
Initializing blockchain event listeners...
Blockchain event listeners active
```

---

## Integration Code (Ready to Uncomment)

### Backend (`app.js` lines 59-79)

Already written, just needs ABIs and .env:
```javascript
import { ethers } from "ethers";

export const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
export const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

import sponsorAbi from "./abis/SponsorDAO.json" assert { type: "json" };
import validatorAbi from "./abis/ValidatorDAO.json" assert { type: "json" };

export const sponsorDAO = new ethers.Contract(
  process.env.SPONSOR_DAO_ADDRESS,
  sponsorAbi,
  wallet
);

export const validatorDAO = new ethers.Contract(
  process.env.VALIDATOR_DAO_ADDRESS,
  validatorAbi,
  wallet
);
```

### Frontend Integration

Create `frontend/src/services/contractService.js`:

```javascript
import { ethers } from 'ethers';
import SponsorDAOAbi from '../abis/SponsorDAO.json';
import ValidatorDAOAbi from '../abis/ValidatorDAO.json';

const SPONSOR_DAO_ADDRESS = import.meta.env.VITE_SPONSOR_DAO_ADDRESS;
const VALIDATOR_DAO_ADDRESS = import.meta.env.VITE_VALIDATOR_DAO_ADDRESS;

export async function stakeOnChallenge(signer, challengeId, stakeAmount, answerHash) {
  const contract = new ethers.Contract(SPONSOR_DAO_ADDRESS, SponsorDAOAbi, signer);
  
  const tx = await contract.stakeOnChallenge(
    challengeId,
    ethers.parseEther(stakeAmount.toString()),
    answerHash,
    { value: ethers.parseEther(stakeAmount.toString()) }
  );
  
  return await tx.wait();
}

export async function createChallenge(signer, challengeData) {
  const contract = new ethers.Contract(SPONSOR_DAO_ADDRESS, SponsorDAOAbi, signer);
  
  const tx = await contract.createChallenge(
    ethers.parseEther(challengeData.stakeAmount.toString()),
    ethers.encodeBytes32String(challengeData.domain),
    challengeData.metadataURI,
    challengeData.startTime,
    challengeData.endTime,
    challengeData.correctAnswerHash,
    { value: ethers.parseEther(challengeData.stakeAmount.toString()) }
  );
  
  return await tx.wait();
}
```

Update `JoinChallenge.jsx` to use real transactions:
```javascript
// Replace mock transaction with:
const receipt = await stakeOnChallenge(
  signer,
  challenge.chainChallengeId,
  stakeAmount,
  response.data.submission.answerHash
);

setTxHash(receipt.transactionHash);
```

---

## Quick Start Commands

### 1. Create ABI folder:
```bash
mkdir -p backend/src/abis
mkdir -p frontend/src/abis
```

### 2. Add environment variables:
```bash
# Backend
echo 'RPC_URL="..."' >> backend/src/.env
echo 'SPONSOR_DAO_ADDRESS="0x..."' >> backend/src/.env
echo 'VALIDATOR_DAO_ADDRESS="0x..."' >> backend/src/.env
echo 'PRIVATE_KEY="0x..."' >> backend/src/.env

# Frontend
echo 'VITE_SPONSOR_DAO_ADDRESS="0x..."' >> frontend/.env
echo 'VITE_VALIDATOR_DAO_ADDRESS="0x..."' >> frontend/.env
echo 'VITE_RPC_URL="..."' >> frontend/.env
```

### 3. Copy ABI files:
```bash
# From your friend's contracts/artifacts folder
cp path/to/SponsorDAO.json backend/src/abis/
cp path/to/ValidatorDAO.json backend/src/abis/
cp path/to/SponsorDAO.json frontend/src/abis/
cp path/to/ValidatorDAO.json frontend/src/abis/
```

### 4. Restart servers:
```bash
# Backend
cd backend/src
nodemon app.js

# Frontend
cd frontend
npm run dev
```

---

## ⚠️ IMPORTANT NOTES

### Security:
- ✅ `.env` is already in `.gitignore` - DON'T commit it!
- ✅ Never share PRIVATE_KEY
- ✅ Use testnet first (Sepolia/Amoy)
- ✅ Test with small amounts

### Answer Hash Format:
- ✅ Backend already hashes answers correctly
- ✅ Format: `0x` + 64 hex characters (SHA-256)
- ✅ Example: `0xa1b2c3d4e5f6...` (66 chars total)

### Event Listeners:
- ✅ Already implemented in `blockchainEventService.js`
- ✅ Will auto-start when .env is configured
- ✅ Listens 24/7 for blockchain events

---

## What Happens When Everything is Connected

### Challenge Creation Flow:
1. User creates challenge in frontend
2. Frontend calls `SponsorDAO.createChallenge()`
3. Event `ChallengeCreated` emitted
4. Backend listens, updates database with `chainChallengeId`
5. Challenge goes live

### Participant Join Flow:
1. User joins challenge with answer
2. Backend hashes answer → `answerHash`
3. Frontend calls `SponsorDAO.stakeOnChallenge(answerHash)`
4. PYUSD deducted from user wallet
5. Event `ParticipantJoined` emitted
6. Backend listens, updates participant with `stakeTxHash`
7. ValidatorDAO automatically verifies answer
8. If correct → SponsorDAO releases reward
9. If incorrect → Stake forfeited

---

## Summary: What to Ask Your Friend For

### 📧 Email Template:

```
Hey! I need these 4 things for integration:

1. **Contract Addresses** (after deployment):
   - SponsorDAO address: 0x...
   - ValidatorDAO address: 0x...

2. **RPC URL**: 
   - Which network? (Mainnet/Sepolia/Polygon/etc)
   - RPC endpoint URL

3. **ABI Files**:
   - SponsorDAO.json (full ABI)
   - ValidatorDAO.json (full ABI)

4. **Private Key** (for backend):
   - A wallet with some gas tokens
   - For signing backend transactions

Also confirm contracts have these events:
- ParticipantJoined (with answerHash)
- ChallengeCompleted (with winner)
- ValidationResultSubmitted

Thanks!
```

---

## Testing Checklist

Before going live:

- [ ] Contract addresses added to .env
- [ ] RPC URL working (test with `curl`)
- [ ] ABI files in correct folders
- [ ] Private key added (with gas tokens)
- [ ] Backend starts without errors
- [ ] Event listeners show "active"
- [ ] Create test challenge
- [ ] Join test challenge
- [ ] Verify answer hash matches
- [ ] Check reward released correctly
- [ ] Test incorrect answer (loses stake)

---

🎉 **You're all set!** As soon as you get the 4 items above, just plug them in and everything will work!
