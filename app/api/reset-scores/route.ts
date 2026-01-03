/**
 * Reset Contract Scores API
 *
 * One-time API to reset corrupted contract high scores.
 * Uses the backend payout wallet to call admin functions.
 *
 * POST /api/reset-scores
 * Body: { action: 'daily' | 'alltime' | 'both', secret: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

const PRIZE_POOL_CONTRACT = process.env.NEXT_PUBLIC_PRIZE_POOL_CONTRACT as `0x${string}`;
const PAYOUT_PRIVATE_KEY = process.env.PAYOUT_PRIVATE_KEY as `0x${string}`;
const RESET_SECRET = process.env.RESET_SECRET || 'change-me-in-production';

const ADMIN_ABI = [
  {
    name: 'manualResetDaily',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'resetAllTimeHighScore',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const;

export async function POST(req: NextRequest) {
  console.log('=== RESET SCORES API CALLED ===');

  try {
    const body = await req.json();
    const { action, secret } = body;

    // Security check
    if (secret !== RESET_SECRET) {
      console.error('Invalid secret provided');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!['daily', 'alltime', 'both'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: daily, alltime, or both' },
        { status: 400 }
      );
    }

    if (!PAYOUT_PRIVATE_KEY) {
      console.error('PAYOUT_PRIVATE_KEY not configured');
      return NextResponse.json(
        { error: 'Backend wallet not configured' },
        { status: 500 }
      );
    }

    const account = privateKeyToAccount(PAYOUT_PRIVATE_KEY);
    const walletClient = createWalletClient({
      account,
      chain: base,
      transport: http(),
    });

    console.log('Calling from wallet:', account.address);

    const results: any = {};

    // Reset daily high score
    if (action === 'daily' || action === 'both') {
      console.log('Resetting daily high score...');
      try {
        const hash = await walletClient.writeContract({
          address: PRIZE_POOL_CONTRACT,
          abi: ADMIN_ABI,
          functionName: 'manualResetDaily',
        });
        console.log('✅ Daily reset TX:', hash);
        results.dailyResetTx = hash;
      } catch (error: any) {
        console.error('Failed to reset daily:', error.message);
        results.dailyError = error.message;
      }
    }

    // Reset all-time high score
    if (action === 'alltime' || action === 'both') {
      console.log('Resetting all-time high score...');
      try {
        const hash = await walletClient.writeContract({
          address: PRIZE_POOL_CONTRACT,
          abi: ADMIN_ABI,
          functionName: 'resetAllTimeHighScore',
        });
        console.log('✅ All-time reset TX:', hash);
        results.allTimeResetTx = hash;
      } catch (error: any) {
        console.error('Failed to reset all-time:', error.message);
        results.allTimeError = error.message;
      }
    }

    return NextResponse.json({
      success: true,
      action,
      wallet: account.address,
      results,
    });

  } catch (error: any) {
    console.error('Reset error:', error);
    return NextResponse.json(
      { error: error.message || 'Reset failed' },
      { status: 500 }
    );
  }
}
