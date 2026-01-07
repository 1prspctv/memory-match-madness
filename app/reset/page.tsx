'use client';

import { useState } from 'react';

export default function ResetUtility() {
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const resetScores = async (action: 'daily' | 'alltime' | 'both') => {
    if (!secret) {
      alert('Please enter the reset secret');
      return;
    }

    if (!confirm(`Are you sure you want to reset ${action} scores?`)) {
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/reset-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, secret }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Reset failed');
      }

      setResult(data);
      alert('✅ Reset successful! Check the results below.');
    } catch (error: any) {
      alert('❌ Reset failed: ' + error.message);
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">🔧 Reset Contract Scores</h1>

        <div className="bg-yellow-50 border-2 border-yellow-500 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800 font-semibold mb-2">
            ⚠️ This utility uses the backend wallet to reset corrupted contract scores.
          </p>
          <p className="text-xs text-yellow-700">
            You need the RESET_SECRET environment variable value to proceed.
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reset Secret:
          </label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Enter reset secret"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Set via RESET_SECRET env var in Vercel (default: "change-me-in-production")
          </p>
        </div>

        <div className="space-y-3 mb-6">
          <button
            onClick={() => resetScores('daily')}
            disabled={loading || !secret}
            className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Processing...' : 'Reset Daily High Score'}
          </button>

          <button
            onClick={() => resetScores('alltime')}
            disabled={loading || !secret}
            className="w-full bg-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Processing...' : 'Reset All-Time High Score'}
          </button>

          <button
            onClick={() => resetScores('both')}
            disabled={loading || !secret}
            className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Processing...' : '🚨 Reset BOTH Scores 🚨'}
          </button>
        </div>

        {result && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-bold mb-2">Result:</h3>
            <pre className="text-xs bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-bold mb-2 text-sm">How to use:</h3>
          <ol className="text-xs text-gray-700 space-y-1 list-decimal list-inside">
            <li>Get the RESET_SECRET from Vercel env vars (or use default)</li>
            <li>Enter the secret above</li>
            <li>Click the appropriate reset button</li>
            <li>Check the transaction hash in the result</li>
            <li>Verify on BaseScan that scores are reset</li>
          </ol>
        </div>

        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Game
          </a>
        </div>
      </div>
    </div>
  );
}
