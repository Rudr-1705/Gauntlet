# Smart Contract ABIs (Frontend)

## Required Files

Place the following ABI files in this folder:

1. **SponsorDAO.json** - Full ABI from contract compilation
2. **ValidatorDAO.json** - Full ABI from contract compilation

These should be the SAME files as in `backend/src/abis/`

## Usage

Once files are added:

1. Uncomment ABI imports in `src/services/contractService.js`:
   ```javascript
   import SponsorDAOAbi from '../abis/SponsorDAO.json';
   import ValidatorDAOAbi from '../abis/ValidatorDAO.json';
   ```

2. Uncomment contract interaction code in `contractService.js`

3. Add environment variables to `frontend/.env`:
   ```bash
   VITE_SPONSOR_DAO_ADDRESS="0x..."
   VITE_VALIDATOR_DAO_ADDRESS="0x..."
   VITE_RPC_URL="https://..."
   ```

4. Restart frontend dev server

## Integration Points

The contract service is used in:
- `CreateChallenge.jsx` - For creating challenges on-chain
- `JoinChallenge.jsx` - For staking PYUSD
- `SubmitAnswer.jsx` - For submitting proofs
