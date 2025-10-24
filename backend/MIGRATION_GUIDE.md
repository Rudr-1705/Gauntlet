# Database Migration Guide

## Steps to update the database schema:

1. **Generate migration**:
```bash
cd backend/src
npx prisma migrate dev --name add_hash_and_events
```

2. **Generate Prisma client**:
```bash
npx prisma generate
```

3. **Apply migration**:
The migration will be applied automatically when you run `migrate dev`.

## What changed:

### Challenge model:
- Added `correctAnswerHash` (String?) - SHA-256 hash of correct answer
- Added `chainChallengeId` (Int?) - Blockchain challenge ID
- Added `sponsorDaoAddress` (String?) - SponsorDAO contract address
- Added `validatorDaoAddress` (String?) - ValidatorDAO contract address
- Changed `creatorId` to `creator` (String) - Now stores email instead of User ID
- Removed `Creator` relation (we use email-based auth now)

### Participant model:
- Changed `createdAt` to `joinedAt`
- Added `stakeTxHash` (String?) - Transaction hash of stake
- Removed `User` relation

### Submission model:
- Added `answerHash` (String) - SHA-256 hash of participant's answer
- Changed `answerText` to optional (String?)
- Added `proofURI` (String?) - IPFS or URL to submission details
- Changed `status` default from "PROOF_PENDING" to "PENDING"
- Changed `createdAt` to `submittedAt`

### New ChallengeEvent model:
- `id` (String) - Unique ID
- `challengeId` (String) - Reference to Challenge
- `eventType` (String) - CREATED | FUNDED | VERIFIED | COMPLETED | SUBMITTED
- `txHash` (String) - Transaction hash
- `blockNumber` (Int?) - Block number
- `eventData` (String?) - JSON string of event data
- `timestamp` (DateTime)

### Removed:
- User model (we use email-based authentication)

## Environment Variables Needed:

Add these to your `.env` file:

```env
# Blockchain Configuration
RPC_URL=your_blockchain_rpc_url
SPONSOR_DAO_ADDRESS=0x...
VALIDATOR_DAO_ADDRESS=0x...
PRIVATE_KEY=your_private_key_for_backend_wallet

# PYUSD Token (if needed)
PYUSD_TOKEN_ADDRESS=0x...
```

## Notes:

- All emails are stored in lowercase for consistency
- Hashes are stored as hex strings (64 characters for SHA-256)
- The blockchain event listener will update the database automatically when events are emitted
- Participants must stake >0 PYUSD to join a challenge
- Submissions include both the answer hash and can optionally include the encrypted answer text
