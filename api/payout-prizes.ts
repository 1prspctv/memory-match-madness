/**
 * Automatic Prize Payout Service
 * 
 * This API endpoint watches for winners and automatically pays out prizes.
 * Deploy this as a Vercel serverless function or run as a cron job.
 * 
 * Setup:
 * 1. Set PAYOUT_PRIVATE_KEY in environment variables
 * 2. Fund that wallet with ETH on Base (~$10 for thousands of transactions)
 * 3. Call this endpoint via cron every 1 minute
 */

import { createWalletClient, http, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const PRIZE_POOL_CONTRACT = process.env.NEXT_PUBLIC_PRIZE_POOL_CONTRACT as `0x${string}`;
const PAYOUT_PRIVATE_KEY = process.env.PAYOUT_PRIVATE_KEY as `0x${string}`;

const PRIZE_POOL_ABI = [
  {
    name: 'submitScore',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'score', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getState',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'dailyPool', type: 'uint256' },
      { name: 'allTimePool', type: 'uint256' },
      { name: 'dailyHighScore', type: 'uint256' },
      { name: 'allTimeHighScore', type: 'uint256' },
      { name: 'dailyLeader', type: 'address' },
      { name: 'allTimeLeader', type: 'address' },
    ],
  },
] as const;

export default async function handler(req: any, res: any) {
  try {
    // 1. Get top scores from Supabase
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: dailyScores } = await supabase.rpc('get_top_scores', {
      game_name: 'memory-match-daily',
      limit_count: 1,
    });

    const { data: allTimeScores } = await supabase.rpc('get_top_scores', {
      game_name: 'memory-match-alltime',
      limit_count: 1,
    });

    if (!dailyScores?.[0] && !allTimeScores?.[0]) {
      return res.status(200).json({ message: 'No scores to process' });
    }

    // 2. Set up wallet client
    const account = privateKeyToAccount(PAYOUT_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(),
    });

    const results = [];

    // 3. Process daily winner if exists
    if (dailyScores?.[0]) {
      const topDaily = dailyScores[0];
      
      try {
        const hash = await walletClient.writeContract({
          address: PRIZE_POOL_CONTRACT,
          abi: PRIZE_POOL_ABI,
          functionName: 'submitScore',
          args: [BigInt(topDaily.score)],
        });
        
        results.push({
          type: 'daily',
          score: topDaily.score,
          wallet: topDaily.wallet_address,
          txHash: hash,
        });
      } catch (error: any) {
        console.error('Daily payout failed:', error);
      }
    }

    // 4. Process all-time winner if exists
    if (allTimeScores?.[0]) {
      const topAllTime = allTimeScores[0];
      
      try {
        const hash = await walletClient.writeContract({
          address: PRIZE_POOL_CONTRACT,
          abi: PRIZE_POOL_ABI,
          functionName: 'submitScore',
          args: [BigInt(topAllTime.score)],
        });
        
        results.push({
          type: 'alltime',
          score: topAllTime.score,
          wallet: topAllTime.wallet_address,
          txHash: hash,
        });
      } catch (error: any) {
        console.error('All-time payout failed:', error);
      }
    }

    return res.status(200).json({
      message: 'Payouts processed',
      results,
    });

  } catch (error: any) {
    console.error('Payout service error:', error);
    return res.status(500).json({ error: error.message });
  }
}
