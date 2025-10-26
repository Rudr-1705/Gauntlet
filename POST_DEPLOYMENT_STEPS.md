# Post-Deployment Integration Steps

## ✅ What's Already Done:
- Backend stores answer hashes securely (SHA-256)
- Participant join creates Submission with answer hash
- Event listeners match your exact contract signatures
- ValidatorDAO integration ready (calls `submitAnswer` with both hashes)
- **No escrow service** - SponsorDAO handles ALL PYUSD custody
- Frontend contract service has correct function calls
- Participant `walletAddress` stored (used as msg.sender)

## What You Need from Contract Developer:
1. **SPONSOR_DAO_ADDRESS** - Deployed SponsorDAO contract address
2. **VALIDATOR_DAO_ADDRESS** - Deployed ValidatorDAO contract address  
3. **RPC_URL** - Blockchain network RPC endpoint
4. **VALIDATOR_PRIVATE_KEY** - Wallet with VALIDATOR_ROLE (backend only needs this one key)
5. **SponsorDAO.json** - Compiled ABI file
6. **ValidatorDAO.json** - Compiled ABI file

## Steps to Activate (5 minutes):

### 1. Add to `.env` files:

**Backend** (`backend/src/.env`):
```env
RPC_URL="https://your-rpc-url.com"
SPONSOR_DAO_ADDRESS="0x..."
VALIDATOR_DAO_ADDRESS="0x..."
VALIDATOR_PRIVATE_KEY="0x..." # Wallet with VALIDATOR_ROLE granted
```

**Frontend** (create `frontend/.env`):
```env
VITE_RPC_URL="https://your-rpc-url.com"
VITE_SPONSOR_DAO_ADDRESS="0x..."
VITE_VALIDATOR_DAO_ADDRESS="0x..."
```

### 2. Add ABI Files:
- Copy `SponsorDAO.json` → `backend/src/abis/` AND `frontend/src/abis/`
- Copy `ValidatorDAO.json` → `backend/src/abis/` AND `frontend/src/abis/`

### 3. Uncomment Code:

**Backend** - `backend/src/services/validatorService.js` (line 18-38):
- Uncomment the ethers import and ValidatorDAO contract call
- Comment out the mock `txHash` line

**Frontend** - `frontend/src/services/contractService.js`:
- Line 32-59: Uncomment `createChallengeOnChain()` 
- Line 84-118: Uncomment `fundChallenge()`
- Line 110-123: Uncomment `submitAnswerOnChain()`

### 4. Run Prisma Migration:
```bash
cd backend/src
npx prisma migrate dev
npx prisma generate
```

## Complete Flow (How It Works):

### Creator Side:
1. **Frontend**: User creates challenge with answer → Backend stores SHA-256 hash
2. **Backend**: ML model approves → Sets status='funded' 
3. **Frontend**: Creator calls `SponsorDAO.createChallenge(stakeAmount, domain, "")` → Stakes PYUSD
4. **Smart Contract**: Emits `ChallengeCreated` event with `chainChallengeId`
5. **Backend Listener**: Updates DB with `chainChallengeId` → Sets status='live'

### Participant Side:
6. **Frontend**: User enters answer + stake amount → Backend hashes answer, stores in DB
7. **Frontend**: User approves PYUSD → Calls `SponsorDAO.fundChallenge(chainChallengeId, amount)`
8. **Smart Contract**: Emits `ChallengeFunded(id, participant, amount)` - **SponsorDAO holds PYUSD**
9. **Backend Listener**: Updates participant stake status
10. **Frontend**: Calls `SponsorDAO.submitAnswer(chainChallengeId, "")` 
11. **Smart Contract**: Emits `ChallengeSubmitted(id, participant, "")`

### Validation Side (The Magic 🎯):
12. **Backend Listener**: Hears `ChallengeSubmitted` → Fetches stored answer hash from DB
13. **Backend**: Calls `ValidatorDAO.submitAnswer(chainId, submittedHash, correctHash, participantAddress)` using VALIDATOR_PRIVATE_KEY
14. **ValidatorDAO Contract**: Compares hashes on-chain (`submittedHash == correctHash`)
15. **If Correct**: 
    - Emits `AnswerSubmitted(id, participant, true)`
    - Calls `SponsorDAO.verifyChallenge(id, true)`
    - Calls `SponsorDAO.completeChallenge(id, participant)`
    - Emits `WinnerFound(id, participant)`
    - Emits `ChallengeCompleted(id, participant, rewardAmount)`
    - **SponsorDAO transfers ALL staked PYUSD to winner wallet** 🎉
16. **If Wrong**:
    - Emits `AnswerSubmitted(id, participant, false)`
    - PYUSD stays in SponsorDAO (no payout)
17. **Backend Listeners**: Update DB with results → UI shows winner/failed status

## Key Architecture Points:
- ✅ Users sign their own transactions (no private keys stored for users)
- ✅ Backend needs ONE validator wallet with VALIDATOR_ROLE
- ✅ Answer hashes stored in backend DB, NOT on-chain (privacy + gas savings)
- ✅ **SponsorDAO handles ALL PYUSD custody** (no escrow contracts)
- ✅ Smart contracts execute all transfers automatically
- ✅ Event listeners keep backend DB synced with blockchain

## Minimal Changes After Deployment:
1. Add 4 env vars (3 addresses + 1 validator key)
2. Copy 2 ABI files to both backend + frontend
3. Uncomment 3 code blocks
4. Run `npx prisma migrate dev` + `npx prisma generate`
5. Grant VALIDATOR_ROLE to backend wallet on ValidatorDAO contract

**That's it!** Everything is already aligned with your deployed contracts.
