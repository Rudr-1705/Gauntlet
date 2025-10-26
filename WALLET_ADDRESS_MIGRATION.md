# Wallet Address as User ID - Migration Complete ✅

## Overview
The system has been updated to use **wallet addresses** as the primary user identifier instead of email addresses. This makes the application blockchain-native and aligns with smart contract expectations.

## Changes Made

### Backend Changes

#### 1. `/backend/src/routes/participants.js`
- **Line 86-107**: Changed `userId` field from `email.toLowerCase()` to `walletAddress.toLowerCase()`
- **Impact**: All new participants are now identified by their wallet address in the database

```javascript
// BEFORE
userId: email.toLowerCase(),
walletAddress: walletAddress,

// AFTER
userId: walletAddress.toLowerCase(),
walletAddress: walletAddress,
```

### Frontend Changes

#### 2. `/frontend/src/pages/JoinChallenge.jsx`
- **Line 65**: Changed `userEmail` parameter from `email` to `address` (wallet address)
- **Impact**: When users join challenges, their wallet address is sent as the user identifier

```javascript
// BEFORE
userEmail: email,

// AFTER
userEmail: address, // Using wallet address as userEmail (will be userId in backend)
```

#### 3. `/frontend/src/pages/SubmitAnswer.jsx`
- **Line 46**: Changed `getByUserId()` call from `email` to `address`
- **Line 108**: Changed `participantEmail` parameter from `email` to `address`
- **Line 148**: Changed winner check from `email` to `address`
- **Impact**: Answer submission and participation verification now use wallet address

```javascript
// BEFORE
const participantsResponse = await participantsAPI.getByUserId(email);
participantEmail: email,
e.eventData?.participantEmail === email

// AFTER
const participantsResponse = await participantsAPI.getByUserId(address);
participantEmail: address, // Use wallet address as user identifier
e.eventData?.participantEmail === address // Use wallet address
```

#### 4. `/frontend/src/pages/MyParticipations.jsx`
- **Line 10**: Added `address` to destructured `useWallet()` return
- **Line 23**: Changed condition from `if (!email)` to `if (!address)`
- **Line 31**: Changed `getByUserId()` call from `email` to `address`
- **Impact**: User participation history now fetched using wallet address

```javascript
// BEFORE
const { email } = useWallet();
if (!email) {
  setLoading(false);
  return;
}
const response = await participantsAPI.getByUserId(email);

// AFTER
const { email, address } = useWallet();
if (!address) {
  setLoading(false);
  return;
}
const response = await participantsAPI.getByUserId(address);
```

## Database Schema

The `Participant` model now uses wallet address as the primary identifier:

```prisma
model Participant {
  id            String   @id @default(cuid())
  userId        String   // NOW: wallet address (e.g., "0x1234...")
  walletAddress String   // Same as userId
  challengeId   String
  status        String   // "PENDING" | "STAKED" | "WINNER" | "LOSER"
  stakeAmount   Float
  // ... other fields
}
```

## API Parameter Naming

**Important**: The frontend still sends `userEmail` and `participantEmail` as parameter names for backward compatibility, but these now contain **wallet addresses** instead of emails.

- `POST /api/participants/join` → `userEmail: "0x1234..."` (wallet address)
- `POST /api/submissions/submit` → `participantEmail: "0x1234..."` (wallet address)
- `GET /api/participants/user/:email` → `:email` is actually a wallet address

## Benefits

1. **Blockchain-Native**: Users are identified by the same address used in smart contracts
2. **No Email Required**: True decentralized authentication via wallet
3. **Consistency**: Same identifier across frontend, backend, and blockchain
4. **Security**: No email storage or verification needed

## Testing Checklist

- [ ] New participants can join challenges with wallet address as userId
- [ ] Existing participants can still be queried (if migrated)
- [ ] Answer submissions work with wallet address
- [ ] Participation history shows correctly
- [ ] Winner verification matches wallet addresses
- [ ] Event listeners properly track wallet addresses

## Migration Notes

### For Existing Database Records
If you have existing participants with email-based `userId`, you'll need to migrate them:

```sql
-- Update existing participants to use wallet address as userId
UPDATE "Participant"
SET "userId" = "walletAddress"
WHERE "userId" != "walletAddress";
```

### For New Users
All new users joining challenges will automatically use their wallet address as `userId`.

## Next Steps

1. **Update Event Data**: Ensure blockchain event listeners use wallet addresses
2. **Update Documentation**: API docs should reflect wallet address as identifier
3. **Clean Up Code**: Consider renaming `userEmail`/`participantEmail` parameters to `userAddress`/`participantAddress` for clarity
4. **Frontend Context**: The `email` field in `WalletContext` is still used for navigation guards but should be phased out

---

**Status**: ✅ Migration Complete
**Date**: Current Session
**Impact**: All user identification now blockchain-native with wallet addresses
