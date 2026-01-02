'use client';

import { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { WalletConnect } from '@/components/WalletConnect';

const PRIZE_POOL_CONTRACT = process.env.NEXT_PUBLIC_PRIZE_POOL_CONTRACT as `0x${string}`;

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
  {
    name: 'resetPools',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'resetEverything',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
] as const;

export default function AdminPage() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [loading, setLoading] = useState(false);

  const resetDaily = async () => {
    if (!confirm('Reset daily high score and pay out pool to current leader?')) return;
    setLoading(true);
    try {
      await writeContractAsync({
        address: PRIZE_POOL_CONTRACT,
        abi: ADMIN_ABI,
        functionName: 'manualResetDaily',
      });
      alert('✅ Daily reset complete!');
    } catch (error) {
      console.error(error);
      alert('❌ Failed to reset daily');
    } finally {
      setLoading(false);
    }
  };

  const resetAllTime = async () => {
    if (!confirm('Reset all-time high score to 0? This cannot be undone!')) return;
    setLoading(true);
    try {
      await writeContractAsync({
        address: PRIZE_POOL_CONTRACT,
        abi: ADMIN_ABI,
        functionName: 'resetAllTimeHighScore',
      });
      alert('✅ All-time high score reset!');
    } catch (error) {
      console.error(error);
      alert('❌ Failed to reset all-time');
    } finally {
      setLoading(false);
    }
  };

  const resetPoolsOnly = async () => {
    if (!confirm('⚠️ WARNING: Zero out prize pools without paying anyone? This should only be used for testing!')) return;
    setLoading(true);
    try {
      await writeContractAsync({
        address: PRIZE_POOL_CONTRACT,
        abi: ADMIN_ABI,
        functionName: 'resetPools',
      });
      alert('✅ Pools reset to $0!');
    } catch (error) {
      console.error(error);
      alert('❌ Failed to reset pools');
    } finally {
      setLoading(false);
    }
  };

  const resetEverything = async () => {
    if (!confirm('🚨 DANGER: Reset EVERYTHING (scores + pools) to 0? This cannot be undone!')) return;
    if (!confirm('Are you ABSOLUTELY sure? This will wipe all high scores and pools!')) return;
    setLoading(true);
    try {
      await writeContractAsync({
        address: PRIZE_POOL_CONTRACT,
        abi: ADMIN_ABI,
        functionName: 'resetEverything',
      });
      alert('✅ Everything reset!');
    } catch (error) {
      console.error(error);
      alert('❌ Failed to reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 via-orange-800 to-yellow-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-red-600 mb-6">🔧 Admin Panel</h1>
        
        <div className="mb-6">
          <WalletConnect />
        </div>

        {!address ? (
          <p className="text-gray-600">Connect your wallet to access admin functions.</p>
        ) : (
          <div className="space-y-4">
            <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800 font-semibold">
                ⚠️ These functions are ONLY for the contract owner. Anyone else will get a transaction error.
              </p>
            </div>

            <button
              onClick={resetDaily}
              disabled={loading}
              className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              Reset Daily High Score (pays out to leader)
            </button>

            <button
              onClick={resetAllTime}
              disabled={loading}
              className="w-full bg-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50"
            >
              Reset All-Time High Score
            </button>

            <button
              onClick={resetPoolsOnly}
              disabled={loading}
              className="w-full bg-orange-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-orange-700 transition-all disabled:opacity-50"
            >
              Reset Pools to $0 (dangerous!)
            </button>

            <button
              onClick={resetEverything}
              disabled={loading}
              className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-red-700 transition-all disabled:opacity-50"
            >
              🚨 RESET EVERYTHING 🚨
            </button>

            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-bold mb-2">What each button does:</h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li><strong>Reset Daily:</strong> Pays remaining daily pool to current leader, resets daily score to 0</li>
                <li><strong>Reset All-Time:</strong> Sets all-time high score to 0 (pool stays)</li>
                <li><strong>Reset Pools:</strong> Sets both pools to $0 without paying anyone (testing only!)</li>
                <li><strong>Reset Everything:</strong> Resets all scores and pools to 0</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
