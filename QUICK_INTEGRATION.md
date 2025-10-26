# 🎯 QUICK INTEGRATION GUIDE

## 📋 What You Need (Copy & Send to Contract Developer)

```
Hi! I need 3 things to integrate:

1. Contract Addresses (after deployment):
   - SponsorDAO: 0x________________
   - ValidatorDAO: 0x________________

2. RPC URL:
   - Network: _____________ (Mainnet/Sepolia/Polygon/Amoy)
   - RPC URL: https://________________

3. ABI Files (JSON):
   - SponsorDAO.json
   - ValidatorDAO.json

Note: NO private key needed! Users sign their own transactions.
```

---

## ⚡ Once You Get Them - 5 Steps to Go Live

### Step 1: Update Backend .env
```bash
cd backend/src
nano .env
```

Add these lines:
```bash
RPC_URL="paste_rpc_url_here"
SPONSOR_DAO_ADDRESS="0xpaste_sponsor_address_here"
VALIDATOR_DAO_ADDRESS="0xpaste_validator_address_here"
```

**NO PRIVATE_KEY needed!** Backend only listens to events.

Save: `Ctrl+X`, `Y`, `Enter`

### Step 2: Add ABI Files

Copy ABI files:
```bash
# Backend
cp /path/to/SponsorDAO.json backend/src/abis/
cp /path/to/ValidatorDAO.json backend/src/abis/

# Frontend
cp /path/to/SponsorDAO.json frontend/src/abis/
cp /path/to/ValidatorDAO.json frontend/src/abis/
```

### Step 3: Update Frontend .env
```bash
cd frontend
nano .env
```

Add these lines:
```bash
VITE_SPONSOR_DAO_ADDRESS="0xpaste_sponsor_address_here"
VITE_VALIDATOR_DAO_ADDRESS="0xpaste_validator_address_here"
VITE_RPC_URL="paste_rpc_url_here"
VITE_CHAIN_ID="1"  # 1=Mainnet, 11155111=Sepolia, 137=Polygon
```

### Step 4: Uncomment Contract Code

**Backend** (`app.js` lines 59-79):
```bash
nano backend/src/app.js
```
Remove the `/*` and `*/` around lines 59-79

**Frontend** (`contractService.js`):
```bash
nano frontend/src/services/contractService.js
```
1. Uncomment import lines 5-6
2. In each function, comment out mock code, uncomment real code

### Step 5: Restart Everything
```bash
# Kill all running processes
pkill -f nodemon
pkill -f "npm run dev"

# Start ML Model
cd ml-model
python3 server.py &

# Start Backend
cd backend/src
nodemon app.js &

# Start Frontend
cd frontend
npm run dev
```

---

## ✅ Verification Checklist

After restart, check:

```bash
# 1. Backend logs should show:
✓ "Blockchain event listeners initialized"
✓ "Blockchain event listeners active"

# 2. No errors about missing ABIs

# 3. Test create challenge:
- Should show real transaction hash
- Check on blockchain explorer

# 4. Test join challenge:
- Should deduct PYUSD
- Should emit ParticipantJoined event
```

---

## 🚨 Troubleshooting

### Error: "Cannot find module './abis/SponsorDAO.json'"
✅ Solution: Check ABI files are in correct location and named correctly

### Error: "Invalid RPC URL"
✅ Solution: Test RPC URL with curl:
```bash
curl -X POST YOUR_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Error: "Insufficient funds"
✅ Solution: Users need ETH/MATIC in their MetaMask for gas fees

### Event listeners not showing "active"
✅ Solution: Check all 3 env vars are set (RPC_URL, SPONSOR_DAO_ADDRESS, VALIDATOR_DAO_ADDRESS)

---

## 📞 Ready to Test?

1. ✅ All 3 items received from contract dev
2. ✅ Added to .env files
3. ✅ ABI files in place
4. ✅ Code uncommented
5. ✅ Servers restarted
6. ✅ No errors in logs
7. ✅ **Users have MetaMask connected**

**You're ready to go! 🎉**

Test on testnet first, then deploy to mainnet when confident.

---

## 📁 Files You Modified

- `backend/src/.env` - Added 3 variables (no private key!)
- `frontend/.env` - Added 4 variables
- `backend/src/abis/` - Added 2 JSON files
- `frontend/src/abis/` - Added 2 JSON files
- `backend/src/app.js` - Uncommented lines 59-90
- `frontend/src/services/contractService.js` - Uncommented contract code

---

## 🔐 Security Benefits

- ✅ No private key on server = much more secure!
- ✅ Users control their own wallets
- ✅ Backend can't make unauthorized transactions
- ✅ Even if backend hacked, can't steal funds
