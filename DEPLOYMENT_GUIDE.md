# SimplePrizePool - Fixed Contract Deployment Guide

## Critical Fix Implemented

**Problem:** Backend wallet was receiving all prizes instead of players
**Solution:** New `submitScoreForPlayer(address player, uint256 score)` function that pays the correct winner

---

## Pre-Deployment Checklist

### 1. Verify Current Situation
- [ ] Confirm payout wallet address has accumulated prize USDC
- [ ] Check how much USDC needs to be migrated to new contract
- [ ] Document all current winners who didn't receive prizes

### 2. Prepare New Contract
- [ ] Review `contracts/SimplePrizePool_Fixed.sol`
- [ ] Note the three addresses needed for constructor:
  - USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (Base Mainnet)
  - House Wallet: `0xfaeEbcE10141813133fCA340d9E3DEFd6417529e`
  - Backend Wallet: [Get from PAYOUT_PRIVATE_KEY]
  - Owner: `0x17eceb5f8f44949913a7568284c3ff2d74766fcc` (your smart wallet)

---

## Deployment Steps

### Step 1: Deploy New Contract

**Using Remix IDE:**

1. Go to https://remix.ethereum.org
2. Upload `SimplePrizePool_Fixed.sol`
3. Install OpenZeppelin dependencies:
   - @openzeppelin/contracts@5.0.0 (or compatible version)
4. Compile with Solidity 0.8.20+
5. Deploy to Base Mainnet:
   - Network: Base (Chain ID: 8453)
   - Constructor parameters:
     ```
     _usdc: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
     _houseWallet: 0xfaeEbcE10141813133fCA340d9E3DEFd6417529e
     _backendWallet: [YOUR_PAYOUT_WALLET_ADDRESS]
     ```
   - Deploy with your smart wallet (0x17eceb...)

6. **SAVE THE NEW CONTRACT ADDRESS!**

### Step 2: Verify Contract on BaseScan

1. Go to https://basescan.org
2. Find your newly deployed contract
3. Click "Contract" → "Verify and Publish"
4. Enter:
   - Compiler: v0.8.20+
   - Optimization: Yes (200 runs recommended)
   - Constructor arguments (ABI-encoded)
5. Paste contract source code
6. Verify

### Step 3: Fund New Contract

**Transfer USDC from old sources:**

1. **From Old Contract** (if it has funds):
   ```solidity
   // Call emergencyWithdraw() on old contract
   // Sends all USDC to owner (you)
   ```

2. **From Payout Wallet** (accumulated prizes):
   - Calculate total amount that should have gone to winners
   - Transfer that amount to new contract
   - Keep detailed records

3. **Fresh Funding** (if starting clean):
   - Deposit initial prize pool amount (e.g., $20 USDC)
   - This seeds the initial pools

**Example USDC Transfer:**
```javascript
// Use USDC contract
const usdcContract = new ethers.Contract(
  "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  USDC_ABI,
  signer
);

await usdcContract.transfer(
  NEW_CONTRACT_ADDRESS,
  ethers.utils.parseUnits("20", 6) // $20 USDC
);
```

### Step 4: Update Environment Variables

**In Vercel Dashboard:**

1. Go to Project Settings → Environment Variables
2. Update `NEXT_PUBLIC_PRIZE_POOL_CONTRACT`:
   - Old: `0x9716414f48C866A41473fF5C8419834A09a7391B`
   - New: `[YOUR_NEW_CONTRACT_ADDRESS]`
3. Redeploy the application

**In Local .env.local:**

```bash
NEXT_PUBLIC_PRIZE_POOL_CONTRACT=[YOUR_NEW_CONTRACT_ADDRESS]
NEXT_PUBLIC_SUPABASE_URL=[unchanged]
NEXT_PUBLIC_SUPABASE_ANON_KEY=[unchanged]
PAYOUT_PRIVATE_KEY=[unchanged]
```

### Step 5: Test Thoroughly

**Before going live:**

1. **Test with small amounts:**
   ```
   - Play game with $0.10
   - Verify pools update correctly
   - Score a winning score
   - CHECK: Did player wallet receive USDC?
   - CHECK: Does BaseScan show transfer to player?
   ```

2. **Verify contract state:**
   ```javascript
   // Call getState()
   - dailyLeader should be PLAYER address, not backend
   - Pools should deplete after payout
   ```

3. **Test multiple scenarios:**
   - First winner (no previous leader)
   - Second winner (beats previous score)
   - Non-winner (score too low)
   - Daily reset (midnight GMT)

### Step 6: Monitor First Live Payouts

**After deployment:**

1. Watch Vercel logs for first few payouts
2. Verify BaseScan transactions
3. Confirm winners receive USDC
4. Check contract state updates correctly

---

## Migration Checklist

### Handle Previous Winners (If Applicable)

If players won but didn't receive prizes:

**Option A: Manual Refunds**
```javascript
// Send USDC directly to previous winners
for (const winner of previousWinners) {
  await usdcContract.transfer(
    winner.address,
    winner.prizeAmount
  );
}
```

**Option B: Let Them Win Again**
- Reset both contract and Supabase
- Give them free game credits
- Let them win properly with new contract

### Clean Supabase Data (Optional)

If starting fresh:

```sql
-- Clear old scores
DELETE FROM leaderboards WHERE game_id = 'memory-match-daily';
DELETE FROM leaderboards WHERE game_id = 'memory-match-alltime';
```

---

## Rollback Plan (If Issues Arise)

If new contract has problems:

1. **Immediate:** Stop accepting game payments
2. **Emergency withdraw:** Call `emergencyWithdraw()` to recover funds
3. **Revert env var:** Point back to old contract (if it works)
4. **Communicate:** Notify players of maintenance

---

## Post-Deployment Verification

### ✅ Success Criteria

- [ ] New contract deployed and verified on BaseScan
- [ ] Contract funded with USDC
- [ ] Environment variable updated in Vercel
- [ ] Test player received prize in their wallet
- [ ] BaseScan shows USDC transfer to player (not backend)
- [ ] `dailyLeader` shows player address, not backend
- [ ] Multiple consecutive winners work correctly
- [ ] Pools deplete after payout

### 🔍 Monitoring

**First 24 Hours:**
- Check every payout transaction
- Verify winner addresses
- Monitor contract balance
- Watch for any reverts

**First Week:**
- Daily balance checks
- Verify daily reset works
- Confirm no USDC stuck in contract

---

## Key Differences in New Contract

### What Changed:

1. **Function Signature:**
   ```solidity
   // OLD (BROKEN)
   function submitScore(uint256 score)

   // NEW (FIXED)
   function submitScoreForPlayer(address player, uint256 score)
   ```

2. **Who Gets Paid:**
   ```solidity
   // OLD (BROKEN)
   dailyLeader = msg.sender; // Backend wallet!
   usdc.safeTransfer(msg.sender, dailyPrize); // Backend wallet!

   // NEW (FIXED)
   dailyLeader = player; // Player wallet!
   usdc.safeTransfer(player, dailyPrize); // Player wallet!
   ```

3. **Access Control:**
   ```solidity
   // NEW: Only backend wallet can call submitScoreForPlayer
   modifier onlyBackend() {
       require(msg.sender == backendWallet, "Only backend wallet");
       _;
   }
   ```

4. **Backend Wallet Management:**
   ```solidity
   // NEW: Owner can update backend wallet if needed
   function setBackendWallet(address _newBackend) external onlyOwner
   ```

---

## Troubleshooting

### Contract Call Reverts

**Error: "Only backend wallet can call this"**
- Check `PAYOUT_PRIVATE_KEY` matches `backendWallet` in contract
- Use `setBackendWallet()` if needed

**Error: "Insufficient balance"**
- Contract needs more USDC
- Check `getContractBalance()`

### No USDC Transferred

**Check:**
1. Transaction succeeded on BaseScan?
2. Player address correct in logs?
3. Contract has USDC balance?
4. `wonDaily` or `wonAllTime` was true?

### Wrong Address Shows as Leader

**Check:**
1. Are you using `submitScoreForPlayer` (not `submitScore`)?
2. Is player address being passed as first argument?
3. Check transaction input data on BaseScan

---

## Support & Documentation

**Contract Source:** `contracts/SimplePrizePool_Fixed.sol`
**API Implementation:** `app/api/trigger-payout/route.ts`
**BaseScan:** https://basescan.org
**USDC Contract:** 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

---

**Questions or Issues?**

Check the contract events on BaseScan:
- `DailyHighScore(player, score, prize)` ← Verify player address
- `AllTimeHighScore(player, score, prize)` ← Verify prize amount
