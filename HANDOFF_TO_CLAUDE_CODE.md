# Memory Match Madness - Handoff to Claude Code

**Date:** January 2, 2026  
**Current Status:** Game functional on Vercel, stuck on Base.dev verification  
**Project:** Blockchain memory game with USDC prizes

---

## 🎯 Project Overview

**What it is:**
- Memory matching card game on Base blockchain
- Players pay $0.10 USDC per game
- Winners get prize pool payouts (60% daily, 20% all-time, 20% house)
- Deployed on Vercel: https://memory-match-madness.vercel.app

**Tech Stack:**
- Next.js 16 (App Router)
- React 19
- Wagmi 2.19.5 + Viem 2.43.4
- Supabase (leaderboard storage)
- Tailwind CSS v4
- Smart contract on Base Mainnet

---

## 🚨 Current Issues (Priority Order)

### 1. **Base.dev Verification Stuck** (HIGHEST PRIORITY)
**Problem:** Trying to verify ownership on Base.dev, wallet signature loops infinitely

**Symptoms:**
- Click "Verify" on Base.dev
- Wallet popup appears
- Click "Sign" 
- Nothing happens, can click Sign repeatedly
- Loop continues forever

**What we've tried:**
- ✅ Added `farcaster.json` at `public/.well-known/farcaster.json`
- ✅ Added Base meta tag: `'base:app_id': '69584622c63ad876c9081e30'`
- ✅ Removed Privy (was causing interference)
- ✅ Set `ownerAddress` to `0x17EceB5F8F44949913a7568284c3FF2d74766FCC`
- ❌ Still can't complete verification

**Next steps to try:**
1. Check if wallet needs to be Farcaster custody address
2. Try verifying with different wallet
3. Contact Base.dev support
4. Check browser console for specific error messages

**Files involved:**
- `public/.well-known/farcaster.json`
- `app/layout.tsx` (has base:app_id meta tag)

---

### 2. **Privy Integration Incomplete**
**Problem:** Privy installed but removed from layout due to verification issues

**Current state:**
- ✅ `@privy-io/react-auth@3.10.0` in package.json
- ✅ `PrivyProviderWrapper.tsx` component created
- ❌ NOT currently used (commented out in layout.tsx)
- ❌ `NEXT_PUBLIC_PRIVY_APP_ID` may not be set in Vercel

**Why we removed it:**
- Was interfering with Base.dev verification
- Caused wallet signing loop

**To re-enable after Base.dev verification:**
1. Uncomment Privy in `app/layout.tsx`
2. Add `NEXT_PUBLIC_PRIVY_APP_ID` to Vercel env vars
3. Get App ID from https://dashboard.privy.io
4. Test that wallet connection still works

**Files:**
- `components/PrivyProviderWrapper.tsx`
- `app/layout.tsx` (currently commented out)

---

### 3. **Score Syncing Works But Needs Monitoring**
**Problem:** Contract and Supabase can get out of sync

**Current solution (v1.9):**
- Score frozen when last pair matched
- Saved to Supabase immediately
- Backend API triggers payout if winner
- Works correctly now!

**Watch for:**
- Scores not appearing in leaderboard
- Final score mismatch between game/end screen
- Payout failures

**Files:**
- `app/simplified-page.tsx` (main game logic)
- `app/api/trigger-payout/route.ts` (automatic payouts)

---

## 📁 Project Structure

```
memory-match-madness/
├── app/
│   ├── layout.tsx              # Root layout, Tailwind, Providers
│   ├── page.tsx                # Unused (legacy)
│   ├── simplified-page.tsx     # MAIN GAME (v1.9)
│   ├── globals.css             # Tailwind directives
│   └── api/
│       └── trigger-payout/
│           └── route.ts        # Auto-payout API
├── components/
│   ├── Providers.tsx           # Wagmi + React Query
│   ├── PrivyProviderWrapper.tsx # Privy (currently unused)
│   └── WalletConnect.tsx       # Wallet connection UI
├── contracts/
│   └── SimplePrizePool_Clean.sol # Latest contract
├── public/
│   └── .well-known/
│       └── farcaster.json      # Base.dev verification
├── lib/
│   ├── leaderboard.ts          # Supabase queries
│   └── supabase.ts             # Supabase client
├── wagmi.config.ts             # Wagmi configuration
├── tailwind.config.ts          # Tailwind v4 config
├── postcss.config.js           # PostCSS for Tailwind
└── package.json
```

---

## 🔑 Environment Variables

### **Required in Vercel:**
```bash
NEXT_PUBLIC_PRIZE_POOL_CONTRACT=0x47313eEd90a88a2cC4436aCC00b84E847679dD16
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_supabase_anon_key>
PAYOUT_PRIVATE_KEY=0x<your_private_key>  # For automatic payouts
```

### **Optional (for Privy):**
```bash
NEXT_PUBLIC_PRIVY_APP_ID=<privy_app_id>  # Currently not set
```

### **Local .env.local:**
Same as above

---

## 💎 Smart Contract Details

**Address:** `0x47313eEd90a88a2cC4436aCC00b84E847679dD16` (Base Mainnet)

**Distribution:**
- 60% → Daily pool (6¢ per game)
- 20% → All-time pool (2¢ per game)
- 20% → House wallet (2¢ per game)

**Key Functions:**
- `playGame()` - Player pays $0.10 USDC
- `submitScore(uint256 score)` - Backend submits winner's score, pays prize
- `getState()` - Returns pool amounts and high scores
- `emergencyWithdraw()` - Owner only, resets pools

**House Wallet:** `0xfaeEbcE10141813133fCA340d9E3DEFd6417529e`

**USDC (Base):** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

**Contract file:** `contracts/SimplePrizePool_Clean.sol`

---

## 🗄️ Supabase Schema

**Table:** `leaderboards`

```sql
CREATE TABLE leaderboards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  score INTEGER NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_leaderboards_game_score ON leaderboards(game_id, score DESC);
```

**RPC Functions:**
- `get_top_scores(game_name TEXT, limit_count INT)`
- Returns top scores with rank

**Game IDs:**
- `memory-match-daily` - Resets daily at midnight
- `memory-match-alltime` - Never resets

---

## 🎮 Game Flow

### **Normal Game:**
1. Player connects wallet (Wagmi)
2. Clicks "Start Game ($0.10)"
3. Frontend calls `playGame()` on contract
4. Player pays $0.10 USDC
5. Game starts (90 seconds, 8 pairs)
6. Player matches cards
7. Score calculated: `baseScore - (wrong * penalty) - (timeUsed * timePenalty)`
8. When all pairs matched:
   - `finalScore` frozen (v1.9 fix)
   - Auto-advances to end screen after 1 second
   - `saveScoreAndCheckPrize()` called
9. Score saved to Supabase
10. API checks if winner (`/api/trigger-payout`)
11. If winner: Backend calls `submitScore()`, prize sent automatically
12. End screen shows final score + leaderboards

### **Prize Flow:**
1. Backend API reads contract state
2. Compares player score to high scores
3. If winner:
   - Backend wallet calls `submitScore(score)`
   - Contract sends USDC to player
   - Prize screen shows
4. If not winner:
   - Just saves to Supabase
   - No prize screen

---

## 🐛 Known Issues & Fixes

### **Issue 1: Score Shows as 0**
**Status:** ✅ FIXED in v1.9

**Solution:**
- Don't rely on React state (async)
- Capture score when calculated
- Pass directly to save function

**File:** `app/simplified-page.tsx` lines 330-350

---

### **Issue 2: Contract & Supabase Out of Sync**
**Status:** ⚠️ MITIGATED

**Current approach:**
- Supabase = source of truth for leaderboard display
- Contract = source of truth for prizes
- Backend API syncs them on each game

**Watch for:**
- Contract having stale high scores
- Prizes not paying out when they should

**Long-term fix:**
- Deploy fresh contract with $20 USDC
- Clear Supabase
- Both start at 0

**Guide:** `CONTRACT_SUPABASE_SYNC.md`

---

### **Issue 3: Privy Dependency Conflicts**
**Status:** ⚠️ WORKAROUND

**Error:**
```
npm error ERESOLVE could not resolve
npm error ox@0.11.1 vs ox@0.8.9
```

**Workaround:**
```bash
npm install @privy-io/react-auth@latest --legacy-peer-deps
```

**Files:**
- `package.json` - has Privy as dependency
- Currently works with `--legacy-peer-deps`

---

## 📝 Version History

**v1.9** (Latest) - January 2, 2026
- ✅ Fixed score being 0 bug
- ✅ Score freezes when last pair matched
- ✅ Auto-advances to end screen
- ✅ All three score displays match

**v1.8** - Score display improvements

**v1.7** - Added extensive logging

**v1.6** - API validation fixes

**v1.5** - Transaction hash links

**v1.4** - Sync logging

**v1.3-** - Earlier iterations

**Version shown in game:** Bottom of screen (small text)

---

## 🚀 Deployment

### **Current Setup:**
- **Platform:** Vercel
- **URL:** https://memory-match-madness.vercel.app
- **Auto-deploy:** On push to `main` branch
- **Build command:** `npm run build`
- **Framework:** Next.js 16

### **Deploy Process:**
```bash
git add .
git commit -m "Description"
git push
```
Vercel auto-deploys in ~2 minutes

### **If Build Fails:**
1. Check Vercel deployment logs
2. Common issues:
   - Missing env vars
   - TypeScript errors
   - Tailwind config issues
3. Test locally first: `npm run build`

---

## 🎯 Immediate Next Steps (for Claude Code)

### **Priority 1: Fix Base.dev Verification**
```bash
# Check what wallet is Farcaster custody address
# Options:
# 1. Use different wallet for verification
# 2. Link current wallet to Farcaster
# 3. Contact Base.dev support

# Test current setup:
curl https://memory-match-madness.vercel.app/.well-known/farcaster.json
```

### **Priority 2: Re-enable Privy (After Verification)**
```bash
# 1. Get Privy App ID from dashboard.privy.io
# 2. Add to Vercel env vars
# 3. Uncomment in app/layout.tsx
# 4. Test wallet connection
# 5. Deploy
```

### **Priority 3: Test Everything**
```bash
# Local testing
npm run dev

# Test:
# - Wallet connection
# - Game play
# - Score saving
# - Leaderboard display
# - Prize payouts (use test wallet)
```

---

## 📚 Important Documentation

**In Project:**
- `BASE_DEV_DEPLOYMENT.md` - Base.dev deployment guide
- `CONTRACT_SUPABASE_SYNC.md` - Syncing guide
- `PRIZE_PAYOUT_SCENARIOS.md` - All prize scenarios
- `DEPLOYMENT_FIX.md` - Recent deployment fixes

**External:**
- Base docs: https://docs.base.org
- Privy docs: https://docs.privy.io
- Wagmi docs: https://wagmi.sh
- Vercel docs: https://vercel.com/docs

---

## 🔍 Debugging Tips

### **Score Issues:**
```javascript
// Check console logs in game:
console.log('🎯 All pairs matched! Freezing final score:', newScore);
console.log('=== SAVE SCORE START ===');
console.log('Score parameter received:', score);
```

### **Payout Issues:**
```javascript
// Check Vercel Runtime Logs for API:
console.log('=== PAYOUT API CALLED ===');
console.log('Contract state:', {...});
console.log('Win check:', {...});
```

### **Build Issues:**
```bash
# Local build
npm run build

# Check specific errors
# Common: Tailwind config, TypeScript, missing deps
```

---

## 💡 Feature Ideas (Future)

- [ ] Daily reset automation (Chainlink Keepers)
- [ ] Multiple game modes
- [ ] NFT rewards for top players
- [ ] Social sharing
- [ ] Tournament mode
- [ ] Custom card themes
- [ ] Sound effects
- [ ] Mobile app version

---

## 📞 Key Contacts & Resources

**Wallets:**
- Player wallet: `0x17EceB5F8F44949913a7568284c3FF2d74766FCC`
- House wallet: `0xfaeEbcE10141813133fCA340d9E3DEFd6417529e`
- Payout wallet: (configured in Vercel env)

**Farcaster:**
- User has Farcaster account
- FID: (check Warpcast)
- Custody address: (needs verification)

**Support:**
- Base Discord: https://discord.gg/buildonbase
- Privy Support: support@privy.io
- Vercel Support: vercel.com/support

---

## 🎬 Quick Start for Claude Code

1. **Open project in Claude Code**
   ```bash
   cd memory-match-madness
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Add your env vars
   ```

4. **Run locally**
   ```bash
   npm run dev
   ```

5. **Start with Priority 1**
   - Fix Base.dev verification
   - Check farcaster.json
   - Test wallet signing

---

## ✅ What's Working Well

- ✅ Game mechanics (matching, scoring, timer)
- ✅ Wallet connection (Wagmi + Coinbase Wallet)
- ✅ Smart contract on Base
- ✅ Automatic payouts
- ✅ Supabase leaderboards
- ✅ Vercel deployment
- ✅ Score syncing (v1.9)
- ✅ Prize pool display
- ✅ Responsive UI

---

## 🆘 If You Get Stuck

**Check these first:**
1. Vercel deployment logs
2. Browser console errors
3. Vercel Runtime Logs (for API)
4. Contract on BaseScan
5. Supabase query logs

**Common fixes:**
- Clear browser cache
- Redeploy on Vercel
- Check env vars
- Test locally first

---

**Good luck! The game is 90% done - just need to nail the Base.dev verification! 🚀**
