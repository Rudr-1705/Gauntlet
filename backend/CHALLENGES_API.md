# 🕉️ Challenges API Documentation

## Overview
Merged challenges API with both legacy and new hash-based endpoints.

---

## Endpoints

### 1. POST /api/challenges/create
**NEW ENDPOINT**: Create a challenge with hash-based answer validation

**Request Body:**
```json
{
  "title": "Solve the Riemann Hypothesis",
  "description": "Provide a valid proof...",
  "domain": "mathematics",
  "reward": 1000,
  "creator": "einstein@physics.com",
  "correctAnswer": "The answer is 42",
  "judgingCriteria": "Mathematical proof",
  "fundibility": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Challenge created! Waiting for blockchain confirmation...",
  "challenge": {
    "id": "uuid",
    "title": "...",
    "status": "pending",
    "hasCorrectAnswer": true
  },
  "nextStep": {
    "action": "FUND_ON_BLOCKCHAIN",
    "sponsorDaoAddress": "0x...",
    "parameters": {
      "stakeAmount": 1000,
      "domain": "mathematics",
      "metadataURI": "ipfs://..."
    }
  }
}
```

**Features:**
- ✅ SHA-256 hashes the correct answer
- ✅ Stores hash securely (never exposed in responses)
- ✅ Returns blockchain parameters for frontend
- ✅ Email-based creator tracking

---

### 2. POST /api/challenges/propose
**LEGACY ENDPOINT**: For backward compatibility

**Request Body:**
```json
{
  "title": "Challenge Title",
  "description": "Description",
  "reward": 100,
  "domain": "general",
  "creatorEmail": "user@example.com",
  "walletAddress": "0x..."
}
```

**Response:**
```json
{
  "message": "Challenge proposed and sent to Sponsor DAO!",
  "challenge": {...},
  "sponsorTxHash": "0xMOCKTXHASH"
}
```

**Notes:**
- No hash validation
- Mock blockchain integration
- Kept for backward compatibility

---

### 3. GET /api/challenges
**Get all challenges with filters**

**Query Parameters:**
- `status` - Filter by status (pending, funded, live, completed)
- `domain` - Filter by domain
- `creator` - Filter by creator email

**Example:**
```
GET /api/challenges?status=funded&domain=mathematics
```

**Response:**
```json
{
  "success": true,
  "challenges": [
    {
      "id": "uuid",
      "title": "...",
      "status": "funded",
      "participantCount": 5,
      "submissionCount": 3
    }
  ]
}
```

**Features:**
- ✅ Hides `correctAnswerHash`
- ✅ Includes participant/submission counts
- ✅ Ordered by creation date (newest first)

---

### 4. GET /api/challenges/:id
**Get specific challenge details**

**Response:**
```json
{
  "success": true,
  "challenge": {
    "id": "uuid",
    "title": "...",
    "Participants": [...],
    "Events": [...],
    "submissionCount": 3
  }
}
```

**Features:**
- ✅ Includes participants list
- ✅ Last 10 blockchain events
- ✅ Submission count
- ✅ Hash is hidden

---

### 5. GET /api/challenges/live
**LEGACY**: Get all funded challenges

**Response:**
```json
[
  {
    "id": "uuid",
    "status": "funded",
    "participantCount": 5,
    "submissionCount": 3
  }
]
```

**Notes:**
- Legacy format without `success` wrapper
- Only returns funded challenges

---

### 6. GET /api/challenges/creator/:email
**Get all challenges by a specific creator**

**Example:**
```
GET /api/challenges/creator/einstein@physics.com
```

**Response:**
```json
{
  "success": true,
  "challenges": [...]
}
```

**Features:**
- ✅ Case-insensitive email matching
- ✅ Ordered by creation date
- ✅ Includes participant/submission counts

---

### 7. PATCH /api/challenges/:id/blockchain-confirm
**Confirm challenge on blockchain**

**Request Body:**
```json
{
  "txHash": "0x1234567890abcdef...",
  "chainChallengeId": 123
}
```

**Response:**
```json
{
  "success": true,
  "message": "Challenge confirmed on blockchain",
  "challenge": {...}
}
```

**Features:**
- Updates `sponsorTxHash`
- Sets `chainChallengeId`
- Changes status to 'funded'

---

### 8. PATCH /api/challenges/status/:id
**Update challenge status**

**Request Body:**
```json
{
  "status": "completed",
  "txHash": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Challenge status updated to completed",
  "challenge": {...}
}
```

**Features:**
- Updates challenge status
- Optionally updates `validatorTxHash` for live/completed status

---

### 9. GET /api/challenges/:id/events
**Get all blockchain events for a challenge**

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "id": "uuid",
      "eventType": "CREATED",
      "txHash": "0x...",
      "timestamp": "2025-10-21T..."
    }
  ]
}
```

**Event Types:**
- `CREATED` - Challenge created on blockchain
- `FUNDED` - Participant staked PYUSD
- `VERIFIED` - Challenge verified by validators
- `COMPLETED` - Challenge completed
- `SUBMITTED` - Answer submitted

---

## Security Features

### Hash Protection
All endpoints hide the `correctAnswerHash` field:
```javascript
correctAnswerHash: undefined // Never exposed to clients
```

### Email Normalization
Creator emails are always stored lowercase:
```javascript
creator: email.toLowerCase()
```

### Safe Responses
Responses include:
- `participantCount` instead of full participant data
- `submissionCount` instead of all submissions
- `hasCorrectAnswer: true` instead of the actual hash

---

## Migration Notes

### Old vs New
- **Old**: `/propose` - No hash validation, User model
- **New**: `/create` - SHA-256 hash, email-based, blockchain params

### Backward Compatibility
All legacy endpoints (`/propose`, `/live`, `/my/:email`) still work!

### Database Changes
- ✅ `creator` field (email) instead of `creatorId`
- ✅ `correctAnswerHash` for SHA-256 validation
- ✅ `chainChallengeId` for blockchain sync
- ✅ `sponsorDaoAddress` and `validatorDaoAddress`

---

## Usage Flow

### Creating a Challenge (New Way)
1. Frontend calls `POST /api/challenges/create` with `correctAnswer`
2. Backend hashes answer, stores in DB, returns blockchain params
3. Frontend calls `createChallenge()` on SponsorDAO contract
4. Blockchain event triggers automatic status update via event listener
5. Frontend can confirm with `PATCH /:id/blockchain-confirm`

### Viewing Challenges
1. List all: `GET /api/challenges?status=funded`
2. View one: `GET /api/challenges/:id`
3. My challenges: `GET /api/challenges/creator/myemail@example.com`
4. Check events: `GET /api/challenges/:id/events`

---

## Testing

```bash
# Create a challenge
curl -X POST http://localhost:4444/api/challenges/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Challenge",
    "description": "Solve 2+2",
    "domain": "mathematics",
    "reward": 100,
    "creator": "test@example.com",
    "correctAnswer": "4"
  }'

# Get all funded challenges
curl http://localhost:4444/api/challenges?status=funded

# Get challenge events
curl http://localhost:4444/api/challenges/[UUID]/events
```

---

🕉️ **Shree Ganeshai Namah** - May Lord Ganesha bless your API calls!
