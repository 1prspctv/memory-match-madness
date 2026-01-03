/**
 * Immediate Prize Payout API
 *
 * Called immediately when a player finishes a game.
 * Uses SUPABASE as the single source of truth for high scores.
 * If player beats Supabase high score, triggers payout from backend wallet.
 * The submitScore() contract call updates the contract as a side effect.
 *
 * POST /api/trigger-payout
 * Body: { walletAddress: string, score: number }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http, createPublicClient } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { getTopScores } from '@/lib/leaderboard';

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

export async function POST(req: NextRequest) {
  console.log('=== PAYOUT API CALLED ===');
  
  try {
    const body = await req.json();
    const { walletAddress, score } = body;

    console.log('Request body:', { walletAddress, score });

    if (!walletAddress || score === undefined || score === null) {
      console.error('Missing required fields');
      return NextResponse.json(
        { error: 'Missing walletAddress or score' },
        { status: 400 }
      );
    }

    if (!PAYOUT_PRIVATE_KEY) {
      console.error('PAYOUT_PRIVATE_KEY not configured');
      return NextResponse.json(
        { error: 'Payout wallet not configured' },
        { status: 500 }
      );
    }

    // 1. Read current contract state (for prize pool amounts only)
    console.log('Reading contract state...');
    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    const contractState = await publicClient.readContract({
      address: PRIZE_POOL_CONTRACT,
      abi: PRIZE_POOL_ABI,
      functionName: 'getState',
    });

    const [dailyPool, allTimePool, dailyHighScore, allTimeHighScore] = contractState;

    console.log('Contract state (for reference):', {
      dailyPool: dailyPool.toString(),
      allTimePool: allTimePool.toString(),
      dailyHighScore: dailyHighScore.toString(),
      allTimeHighScore: allTimeHighScore.toString(),
    });

    // 2. Query Supabase for ACTUAL high scores (source of truth)
    console.log('Querying Supabase for actual high scores...');
    const dailyLeaderboard = await getTopScores('memory-match-daily', 1);
    const allTimeLeaderboard = await getTopScores('memory-match-alltime', 1);

    const supabaseDailyHigh = dailyLeaderboard[0]?.score || 0;
    const supabaseAllTimeHigh = allTimeLeaderboard[0]?.score || 0;

    console.log('Supabase high scores (SOURCE OF TRUTH):', {
      dailyHighScore: supabaseDailyHigh,
      allTimeHighScore: supabaseAllTimeHigh,
    });

    // 3. Determine if player won based on SUPABASE (not contract)
    const wonDaily = score > supabaseDailyHigh;
    const wonAllTime = score > supabaseAllTimeHigh;

    console.log('Win check (using Supabase as source of truth):', {
      playerScore: score,
      supabaseDailyHigh,
      supabaseAllTimeHigh,
      wonDaily,
      wonAllTime,
    });

    if (!wonDaily && !wonAllTime) {
      console.log('Player did not win');
      return NextResponse.json({
        winner: false,
        message: 'Score did not beat high scores',
      });
    }

    // 4. Player won! Submit score from backend wallet (this also updates contract)
    const account = privateKeyToAccount(PAYOUT_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(),
    });

    console.log(`🎉 Winner detected! ${walletAddress} scored ${score}`);
    console.log(`Won Daily: ${wonDaily}, Won All-Time: ${wonAllTime}`);

    const hash = await walletClient.writeContract({
      address: PRIZE_POOL_CONTRACT,
      abi: PRIZE_POOL_ABI,
      functionName: 'submitScore',
      args: [BigInt(score)],
    });

    // 4. Calculate prize amounts
    const dailyPrizeUSDC = wonDaily ? Number(dailyPool) / 1e6 : 0;
    const allTimePrizeUSDC = wonAllTime ? Number(allTimePool) / 1e6 : 0;

    console.log(`✅ Payout triggered! TX: ${hash}`);

    return NextResponse.json({
      winner: true,
      wonDaily,
      wonAllTime,
      dailyPrize: dailyPrizeUSDC.toFixed(2),
      allTimePrize: allTimePrizeUSDC.toFixed(2),
      transactionHash: hash,
    });

  } catch (error: any) {
    console.error('Payout trigger error:', error);
    return NextResponse.json(
      { error: error.message || 'Payout failed' },
      { status: 500 }
    );
  }
}
