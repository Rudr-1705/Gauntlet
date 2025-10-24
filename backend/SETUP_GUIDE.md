# 🕉️ Gauntlet Backend Setup & Migration Guide

## Overview
This guide walks you through setting up the new hash-based, blockchain-integrated Gauntlet backend system.

---

## 📋 Prerequisites

1. **Node.js** (v18+)
2. **PostgreSQL** database running
3. **RPC Provider** account (Infura, Alchemy, or local node)
4. **Deployed Smart Contracts** (SponsorDAO and ValidatorDAO)

---

## 🚀 Step-by-Step Setup

### Step 1: Install Dependencies

```bash
cd /Users/devanshsharma/Desktop/Gaunlet/backend
npm install
```

### Step 2: Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your values
nano .env
```

**Required Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `RPC_URL` - Blockchain RPC endpoint
- `SPONSOR_DAO_ADDRESS` - Deployed SponsorDAO contract address
- `VALIDATOR_DAO_ADDRESS` - Deployed ValidatorDAO contract address
- `PYUSD_TOKEN_ADDRESS` - PYUSD token address for your network

**Example .env:**
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/gauntlet_db?schema=public"
PORT=4444
RPC_URL="https://sepolia.infura.io/v3/YOUR_INFURA_KEY"
SPONSOR_DAO_ADDRESS="0x1234567890abcdef..."
VALIDATOR_DAO_ADDRESS="0xabcdef1234567890..."
PYUSD_TOKEN_ADDRESS="0x6c3ea9036406852006290770BEdFcAbA0e23A0e8"
```

### Step 3: Run Database Migration

This creates the new schema with:
- Removed `User` model
- Added `correctAnswerHash` to Challenge
- Added `answerHash` to Submission
- Added `stakeTxHash` to Participant
- New `ChallengeEvent` model for blockchain events

```bash
cd src
npx prisma migrate dev --name add_hash_and_blockchain_events
```

### Step 4: Generate Prisma Client

```bash
npx prisma generate
```

### Step 5: Replace Old App.js

```bash
# Backup the old app.js
mv app.js app_old.js

# Use the new app.js
mv app_new.js app.js
```

### Step 6: Remove Old Route Files (Optional)

```bash
# Backup old routes
mkdir -p routes/old_backup
mv routes/challenges.js routes/old_backup/
mv routes/participants.js routes/old_backup/

# The new files are:
# - routes/challenges_new.js
# - routes/participants_new.js
# - routes/submissions.js
```

### Step 7: Start the Server

```bash
# Development mode
npm run dev

# Or production mode
npm start
```

You should see:
```
🚀 Gauntlet Backend Server running on port 4444
📍 API Docs: http://localhost:4444/api
🕉️  Shree Ganeshai Namah, Jai Shiv Hanuman, Jai Shiv ShaniBaba

🔗 Initializing blockchain event listeners...
✅ Blockchain event listeners active
```

---

## 📊 Database Schema Changes

### Challenge Model
```prisma
model Challenge {
  id                    Int      @id @default(autoincrement())
  title                 String
  description           String
  domain                String
  difficulty            String   @default("medium")
  correctAnswerHash     String?  // NEW: SHA-256 hash of correct answer
  rewardAmount          Float
  status                String   @default("active")
  chainChallengeId      Int?     // NEW: On-chain challenge ID
  sponsorDaoAddress     String?  // NEW: Contract address
  validatorDaoAddress   String?  // NEW: Validator contract
  creator               String   // CHANGED: Now email instead of creatorId
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  participants          Participant[]
  submissions           Submission[]
  events                ChallengeEvent[] // NEW: Blockchain events
}
```

### Submission Model
```prisma
model Submission {
  id              Int      @id @default(autoincrement())
  challengeId     Int
  participantId   Int
  answerHash      String   // NEW: SHA-256 hash of submitted answer
  answerText      String?  // CHANGED: Now optional
  proofURI        String?  // NEW: IPFS/Arweave proof storage
  status          String   @default("PENDING") // CHANGED: Default to PENDING
  submittedAt     DateTime @default(now()) // CHANGED: Renamed from createdAt
  
  challenge       Challenge @relation(fields: [challengeId], references: [id])
  participant     Participant @relation(fields: [participantId], references: [id])
}
```

### Participant Model
```prisma
model Participant {
  id              Int      @id @default(autoincrement())
  challengeId     Int
  email           String   // CHANGED: Removed userId, now email-based
  stakeAmount     Float
  stakeTxHash     String?  // NEW: Transaction hash of stake
  status          String   @default("active")
  joinedAt        DateTime @default(now()) // CHANGED: Renamed from createdAt
  
  challenge       Challenge @relation(fields: [challengeId], references: [id])
  submissions     Submission[]
}
```

### ChallengeEvent Model (NEW)
```prisma
model ChallengeEvent {
  id              Int      @id @default(autoincrement())
  challengeId     Int
  chainChallengeId Int?
  eventType       String   // CREATED, FUNDED, VERIFIED, COMPLETED, SUBMITTED
  txHash          String?
  blockNumber     Int?
  eventData       String?  // JSON data from event
  timestamp       DateTime @default(now())
  
  challenge       Challenge @relation(fields: [challengeId], references: [id])
}
```

---

## 🔗 API Endpoints

### Challenges

**Create Challenge**
```http
POST /api/challenges/create
Content-Type: application/json

{
  "title": "Solve the Riemann Hypothesis",
  "description": "Provide a valid proof...",
  "domain": "mathematics",
  "difficulty": "hard",
  "correctAnswer": "The answer is 42",  // Will be hashed automatically
  "rewardAmount": 1000,
  "creator": "einstein@physics.com"
}

Response: {
  "success": true,
  "challenge": { id: 1, ... },
  "blockchainParams": {
    "functionToCall": "createChallenge",
    "args": ["ipfs://...", 1000000000],
    "nextStep": "Call createChallenge() on SponsorDAO with these params"
  }
}
```

**Get All Challenges**
```http
GET /api/challenges?domain=mathematics&status=active&difficulty=hard
```

**Get Challenge Events**
```http
GET /api/challenges/1/events
Response: [
  { eventType: "CREATED", txHash: "0x...", timestamp: "..." },
  { eventType: "FUNDED", txHash: "0x...", timestamp: "..." }
]
```

### Participants

**Join Challenge**
```http
POST /api/participants/join
Content-Type: application/json

{
  "challengeId": 1,
  "email": "newton@physics.com",
  "stakeAmount": 100  // Must be > 0 (in PYUSD)
}

Response: {
  "success": true,
  "participant": { id: 5, ... },
  "blockchainParams": {
    "functionToCall": "fundChallenge",
    "args": [1, 100000000],  // challengeId, amount in PYUSD decimals (6)
    "nextStep": "Approve PYUSD, then call fundChallenge()"
  }
}
```

**Confirm Stake**
```http
PATCH /api/participants/5/confirm-stake
Content-Type: application/json

{
  "stakeTxHash": "0x1234567890abcdef..."
}
```

### Submissions

**Submit Answer**
```http
POST /api/submissions/submit
Content-Type: application/json

{
  "challengeId": 1,
  "participantId": 5,
  "answer": "The answer is 42",  // Will be hashed and compared
  "proofURI": "ipfs://QmProofHash..."  // Optional
}

Response: {
  "success": true,
  "submission": { id: 10, ... },
  "isCorrect": true,  // Based on hash comparison
  "blockchainParams": {
    "functionToCall": "submitAnswer",
    "args": [1, 5, "ipfs://..."],
    "nextStep": "Call submitAnswer() on SponsorDAO"
  }
}
```

**Get Challenge Submissions (Creator Only)**
```http
GET /api/submissions/challenge/1?creatorEmail=einstein@physics.com
```

### Dashboard

**Get Platform Stats**
```http
GET /api/dashboard/overview

Response: {
  "totalUsers": 150,
  "totalChallenges": 42,
  "totalRewards": 50000,
  "activeParticipants": 89,
  "topDomains": [
    { name: "mathematics", count: 15, percentage: 35.7 }
  ],
  "recentActivity": [
    { type: "challenge", title: "New Challenge", ... }
  ]
}
```

---

## 🔐 Security Features

### SHA-256 Hash Validation
Answers are never stored in plaintext:
```javascript
// Creating challenge
const hash = generateSHA256Hash("The answer is 42");
// Stores: "3d4f2bf07dc1be38b20cd6e46949a1071f9d0e3d7..."

// Submitting answer
const submittedHash = generateSHA256Hash("The answer is 42");
const isCorrect = compareHashes(submittedHash, correctAnswerHash);
```

### Staking Requirement
All participants must stake PYUSD (amount > 0) to submit answers:
```javascript
if (stakeAmount <= 0) {
  return res.status(400).json({
    success: false,
    error: "Stake amount must be greater than 0"
  });
}
```

---

## 🎯 Blockchain Event Listeners

The backend automatically listens for events from both DAOs:

### SponsorDAO Events
- `ChallengeCreated(uint256 challengeId, string metadataURI, uint256 rewardAmount)`
- `ChallengeFunded(uint256 challengeId, address participant, uint256 amount)`
- `ChallengeVerified(uint256 challengeId, uint256[] winners)`
- `ChallengeCompleted(uint256 challengeId)`
- `ChallengeSubmitted(uint256 challengeId, address participant, string proofURI)`

### ValidatorDAO Events
- `ChallengeReceived(uint256 challengeId, string metadataURI)`
- `ValidationResultSubmitted(uint256 challengeId, uint256[] winners, string proofURI)`

When events are detected:
1. Database is updated automatically
2. Events are logged in `ChallengeEvent` table
3. Challenge/Participant statuses are updated
4. Frontend can poll for updates

---

## 🧪 Testing the Flow

### 1. Create a Challenge
```bash
curl -X POST http://localhost:4444/api/challenges/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Challenge",
    "description": "Solve 2+2",
    "domain": "mathematics",
    "difficulty": "easy",
    "correctAnswer": "4",
    "rewardAmount": 100,
    "creator": "test@example.com"
  }'
```

### 2. Deploy to Blockchain
Use returned `blockchainParams` to call `createChallenge()` on SponsorDAO.

### 3. Join Challenge
```bash
curl -X POST http://localhost:4444/api/participants/join \
  -H "Content-Type: application/json" \
  -d '{
    "challengeId": 1,
    "email": "participant@example.com",
    "stakeAmount": 50
  }'
```

### 4. Stake PYUSD
Use returned `blockchainParams`:
1. Approve PYUSD: `approve(SPONSOR_DAO_ADDRESS, 50000000)`
2. Fund challenge: `fundChallenge(1, 50000000)`

### 5. Submit Answer
```bash
curl -X POST http://localhost:4444/api/submissions/submit \
  -H "Content-Type: application/json" \
  -d '{
    "challengeId": 1,
    "participantId": 1,
    "answer": "4"
  }'
```

### 6. Check Events
```bash
curl http://localhost:4444/api/challenges/1/events
```

---

## 🐛 Troubleshooting

### Event Listeners Not Starting
```
⚠️ Blockchain configuration incomplete - event listeners disabled
```
**Solution:** Ensure `RPC_URL`, `SPONSOR_DAO_ADDRESS`, and `VALIDATOR_DAO_ADDRESS` are set in `.env`

### Migration Errors
```
Error: Unique constraint failed on the fields: (`email`)
```
**Solution:** Clear database and re-run migration:
```bash
npx prisma migrate reset
npx prisma migrate dev --name add_hash_and_blockchain_events
```

### Hash Comparison Fails
```javascript
// Answers are case-sensitive and whitespace-sensitive
generateSHA256Hash("4") !== generateSHA256Hash(" 4 ")
```
**Solution:** Normalize answers before hashing (trim, lowercase if needed)

---

## 📚 Next Steps

1. **Deploy Smart Contracts**: Get `SPONSOR_DAO_ADDRESS` and `VALIDATOR_DAO_ADDRESS`
2. **Frontend Integration**: Create submission page at `/frontend/src/pages/SubmitAnswer.jsx`
3. **Update API Service**: Add `submissionsAPI` to `/frontend/src/services/api.js`
4. **Test Complete Flow**: End-to-end testing from challenge creation to reward distribution

---

## 🕉️ May Lord Ganesha guide your debugging journey!

Shree Ganeshai Namah 🙏
Jai Shiv Hanuman 🔱
Jai Shiv ShaniBaba 🪔
