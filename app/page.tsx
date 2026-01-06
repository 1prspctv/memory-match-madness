'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
import { submitScoreWithQueue, getTopScores, TopScore } from '@/lib/leaderboard';
import { useScoreSync } from '@/hooks/useScoreSync';
import { WalletConnect } from '@/components/WalletConnect';

// Contract addresses (update these after deployment)
const PRIZE_POOL_CONTRACT = process.env.NEXT_PUBLIC_PRIZE_POOL_CONTRACT as `0x${string}`;
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`; // Base Mainnet USDC

const GAME_COST = '0.10';

// Simplified ABIs
const USDC_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

const PRIZE_POOL_ABI = [
  {
    name: 'playGame',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
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

const CARDS = [
  { id: 1, emoji: '🏔️' }, { id: 2, emoji: '🌴' }, { id: 3, emoji: '🌊' },
  { id: 4, emoji: '🌸' }, { id: 5, emoji: '🦋' }, { id: 6, emoji: '🌅' },
  { id: 7, emoji: '🌙' }, { id: 8, emoji: '🗼' }, { id: 9, emoji: '🏰' },
  { id: 10, emoji: '🗽' }, { id: 11, emoji: '🕌' }, { id: 12, emoji: '🏛️' },
  { id: 13, emoji: '🗿' }, { id: 14, emoji: '⛩️' }, { id: 15, emoji: '🎡' },
  { id: 16, emoji: '💎' }, { id: 17, emoji: '👑' }, { id: 18, emoji: '🏎️' },
  { id: 19, emoji: '⛵' }, { id: 20, emoji: '⌚' }, { id: 21, emoji: '💍' },
  { id: 22, emoji: '🛩️' }, { id: 23, emoji: '🥂' }
];

export default function MemoryMatchGame() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { pendingCount } = useScoreSync(); // Initialize background score sync
  const [screen, setScreen] = useState<'start' | 'game' | 'end'>('start');
  const [gameState, setGameState] = useState<any>(null);
  const [dailyLeaderboard, setDailyLeaderboard] = useState<TopScore[]>([]);
  const [alltimeLeaderboard, setAlltimeLeaderboard] = useState<TopScore[]>([]);
  const [paying, setPaying] = useState(false);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [prizeWon, setPrizeWon] = useState<{ daily?: string; alltime?: string } | null>(null);
  const [lastPlayedScore, setLastPlayedScore] = useState<number | null>(null);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [currentGameScore, setCurrentGameScore] = useState<number>(0);
  const [prizeStatus, setPrizeStatus] = useState<{ wonDaily: boolean; wonAllTime: boolean; dailyAmount: string; allTimeAmount: string; txHash?: string } | null>(null);

  // Read contract state
  const { data: contractState, refetch: refetchContractState } = useReadContract({
    address: PRIZE_POOL_CONTRACT,
    abi: PRIZE_POOL_ABI,
    functionName: 'getState',
  });

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    try {
      const daily = await getTopScores('memory-match-daily', 10);
      const alltime = await getTopScores('memory-match-alltime', 10);
      setDailyLeaderboard(daily);
      setAlltimeLeaderboard(alltime);
    } catch (error) {
      console.error('Failed to load leaderboards:', error);
    }
  };

  const handlePayAndStart = async () => {
    if (!address) {
      alert('Please connect your wallet first!');
      return;
    }

    setPaying(true);
    try {
      const amount = parseUnits(GAME_COST, 6);

      // Step 1: Approve exact amount needed for this game
      await writeContractAsync({
        address: USDC_ADDRESS,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [PRIZE_POOL_CONTRACT, amount],
      });

      // Step 2: Pay for game
      await writeContractAsync({
        address: PRIZE_POOL_CONTRACT,
        abi: PRIZE_POOL_ABI,
        functionName: 'playGame',
        args: [amount],
      });

      startGame();
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setPaying(false);
    }
  };

  const startGame = () => {
    const selected = [...CARDS].sort(() => Math.random() - 0.5).slice(0, 8);
    const gameCards = [...selected, ...selected]
      .map((card, i) => ({ ...card, uid: i }))
      .sort(() => Math.random() - 0.5);

    setGameState({
      cards: gameCards,
      flipped: [],
      matched: [],
      wrong: 0,
      timeLeft: 90,
      startTime: Date.now(),
    });
    setCurrentGameScore(1000000); // Initialize with max score (8 pairs * 125k)
    setFinalScore(0); // Reset final score
    setGameComplete(false); // Reset completion flag
    setScreen('game');
    setPrizeWon(null);
  };

  const handleCardClick = (uid: number) => {
    if (!gameState) return;
    const { flipped, matched } = gameState;
    
    if (flipped.length === 2 || flipped.includes(uid) || matched.includes(uid)) return;

    const newFlipped = [...flipped, uid];
    setGameState({ ...gameState, flipped: newFlipped });

    if (newFlipped.length === 2) {
      const [a, b] = newFlipped;
      const cardA = gameState.cards.find((c: any) => c.uid === a);
      const cardB = gameState.cards.find((c: any) => c.uid === b);

      if (cardA?.id === cardB?.id) {
        setTimeout(() => {
          setGameState((prev: any) => prev ? {
            ...prev,
            matched: [...prev.matched, a, b],
            flipped: []
          } : prev);
        }, 300);
      } else {
        setTimeout(() => {
          setGameState((prev: any) => prev ? {
            ...prev,
            wrong: prev.wrong + 1,
            flipped: []
          } : prev);
        }, 800);
      }
    }
  };

  const calcScore = () => {
    if (!gameState) return { final: 0, pairScore: 0, wrongPenalty: 0, timePenalty: 0, elapsed: 0 };
    
    const pairScore = (gameState.matched.length / 2) * 125000;
    const wrongPenalty = gameState.wrong * 25000;
    const elapsed = Date.now() - gameState.startTime;
    const timePenalty = elapsed > 10000 ? (elapsed - 10000) * 10 : 0;
    const final = Math.max(0, pairScore - wrongPenalty - timePenalty);
    
    return { final, pairScore, wrongPenalty, timePenalty, elapsed };
  };

  const saveScoreAndCheckPrize = async (score: number) => {
    if (!address) return;

    console.log('=== SAVE SCORE START ===');
    console.log('Score parameter received:', score);
    console.log('finalScore state:', finalScore);
    console.log('currentGameScore state:', currentGameScore);

    setSubmittingScore(true);
    setLastPlayedScore(score);

    try {
      // Refetch contract state to get updated pool amounts after playGame transaction
      await refetchContractState();

      console.log('💾 Saving score with queue system (guaranteed persistence)...');

      // Save using queue system - GUARANTEED to never lose the score
      const result = await submitScoreWithQueue(
        address,
        score,
        { time: calcScore().elapsed, wrong: gameState?.wrong || 0 }
      );

      if (result.queued) {
        console.log('✅ Score saved to local queue (guaranteed safe!)');
        if (result.synced) {
          console.log('✅ Score immediately synced to Supabase');
        } else {
          console.log('⏳ Score will sync in background');
          console.log('Sync errors:', result.errors);
        }
      } else {
        console.error('❌ Failed to queue score:', result.errors);
        // Even if queuing fails, we continue to try prize check
      }

      // Reload leaderboards
      await loadLeaderboards();

      console.log('=== PRIZE CHECK START ===');
      console.log('Player address:', address);
      console.log('Player score:', score);

      // Check Supabase leaderboards (what UI shows)
      const supabaseDailyTop = dailyLeaderboard[0]?.score || 0;
      const supabaseAllTimeTop = alltimeLeaderboard[0]?.score || 0;
      
      const beatsDailyInSupabase = score > supabaseDailyTop;
      const beatsAllTimeInSupabase = score > supabaseAllTimeTop;

      console.log('Supabase state:', {
        dailyTopScore: supabaseDailyTop,
        allTimeTopScore: supabaseAllTimeTop,
        beatsDailyInSupabase,
        beatsAllTimeInSupabase,
      });

      // ALWAYS trigger payout API to keep contract in sync
      // The API will check contract state and decide if they actually get paid
      console.log('Triggering payout API to sync contract...');
      
      const payoutResponse = await fetch('/api/trigger-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: address,
          score: score,
          supabaseWinner: beatsDailyInSupabase || beatsAllTimeInSupabase,
        }),
      });

      console.log('Payout API response status:', payoutResponse.status);
      
      if (!payoutResponse.ok) {
        console.error('Payout API error:', payoutResponse.status, payoutResponse.statusText);
        const errorText = await payoutResponse.text();
        console.error('Error details:', errorText);
      } else {
        const payoutResult = await payoutResponse.json();
        console.log('Payout result:', payoutResult);
        
        // Show prize screen if they won according to contract
        if (payoutResult.winner) {
          console.log('🎉 CONTRACT CONFIRMED WINNER!');
          console.log('Won Daily:', payoutResult.wonDaily);
          console.log('Won All-Time:', payoutResult.wonAllTime);
          console.log('Daily Prize:', payoutResult.dailyPrize);
          console.log('All-Time Prize:', payoutResult.allTimePrize);
          console.log('TX Hash:', payoutResult.transactionHash);
          
          // Show prize celebration screen
          setPrizeStatus({
            wonDaily: payoutResult.wonDaily,
            wonAllTime: payoutResult.wonAllTime,
            dailyAmount: payoutResult.dailyPrize || "0",
            allTimeAmount: payoutResult.allTimePrize || "0",
            txHash: payoutResult.transactionHash,
          });
        } else {
          console.log('Contract says: Not a winner');
          if (beatsDailyInSupabase || beatsAllTimeInSupabase) {
            console.warn('⚠️ SYNC ISSUE: Supabase shows winner but contract does not!');
            console.warn('This means contract has stale/incorrect high scores');
          }
        }
      }
      
      console.log('=== PRIZE CHECK END ===');

    } catch (error) {
      console.error('Failed to save score or trigger payout:', error);
    } finally {
      setSubmittingScore(false);
    }
  };

  const endGame = async (won: boolean, scoreOverride?: number) => {
    console.log('=== END GAME START ===');
    console.log('Game won:', won);
    console.log('scoreOverride:', scoreOverride);
    console.log('finalScore state:', finalScore);
    
    // Use override score if provided (from the useEffect), otherwise use finalScore state
    const scoreToUse = scoreOverride || finalScore;
    console.log('Using score:', scoreToUse);
    
    if (won && address && scoreToUse > 0) {
      console.log('Calling saveScoreAndCheckPrize with score:', scoreToUse);
      await saveScoreAndCheckPrize(scoreToUse);
    } else if (scoreToUse === 0) {
      console.error('⚠️ WARNING: Score is 0! This should not happen.');
    }
    
    console.log('=== END GAME END ===');
    setScreen('end');
  };

  useEffect(() => {
    if (gameState && gameState.matched.length === gameState.cards.length) {
      setTimeout(() => endGame(true), 500);
    }
  }, [gameState?.matched]);

  const [gameComplete, setGameComplete] = useState(false);

  useEffect(() => {
    if (gameState && screen === 'game') {
      // Update score during gameplay
      const newScore = calcScore().final;
      setCurrentGameScore(newScore);
      
      // If all pairs matched, freeze the final score immediately
      if (gameState.matched.length === gameState.cards.length && !gameComplete) {
        console.log('🎯 All pairs matched! Freezing final score:', newScore);
        setFinalScore(newScore);
        setCurrentGameScore(newScore); // Also update current so it displays
        setGameComplete(true);
        
        // Auto-advance to end screen after 1 second
        setTimeout(async () => {
          if (address) {
            await saveScoreAndCheckPrize(newScore);
          }
          setScreen('end');
        }, 1000);
      }
    }
  }, [gameState?.matched, gameState?.wrong, gameState?.timeLeft, screen, gameComplete]);

  useEffect(() => {
    if (gameState && screen === 'game' && gameState.matched.length < gameState.cards.length) {
      const timer = setInterval(() => {
        setGameState((prev: any) => {
          if (!prev) return prev;
          
          // Don't update time if all pairs matched
          if (prev.matched.length === prev.cards.length) {
            return prev;
          }
          
          const newTimeLeft = prev.timeLeft - 1;
          if (newTimeLeft <= 0) {
            endGame(false);
            return prev;
          }
          return { ...prev, timeLeft: newTimeLeft };
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [screen, gameState?.timeLeft, gameState?.matched.length]);

  const score = calcScore();
  const formatWallet = (wallet: string) => `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
  const formatUSDC = (value: string) => {
    if (!value) return "0";
    return (Number(value) / 1e6).toFixed(2);
  };

  const dailyPool = contractState ? formatUSDC(contractState[0].toString()) : "0";
  const allTimePool = contractState ? formatUSDC(contractState[1].toString()) : "0";

  const VERSION = "1.9";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        
        {screen === 'start' && (
          <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl text-center">
            <div className="text-6xl mb-4">💎🏔️</div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              Memory Match Madness
            </h1>
            <p className="text-gray-600 mb-6">Test your skill to win prizes! Beat the high score and win instantly!</p>

            {address ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-6 flex flex-col items-center">
                <p className="text-sm text-emerald-800 mb-3 text-center">
                  ✅ Wallet Connected: {formatWallet(address)}
                </p>
                <WalletConnect />
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 mb-6 flex flex-col items-center">
                <p className="text-sm text-amber-800 font-semibold mb-3 text-center">
                  ⚠️ Please connect your wallet to play
                </p>
                <WalletConnect />
              </div>
            )}

            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-6 mb-6 border-2 border-yellow-500">
              <h2 className="text-xl font-bold text-amber-900 mb-4">💰 Prize Pools</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center bg-white/50 rounded-lg p-3">
                  <span className="font-semibold text-amber-900">🏆 Daily Pool</span>
                  <span className="text-xl font-bold text-amber-800">${dailyPool} USDC</span>
                </div>
                <div className="flex justify-between items-center bg-white/50 rounded-lg p-3">
                  <span className="font-semibold text-amber-900">👑 All-Time Pool</span>
                  <span className="text-xl font-bold text-amber-800">${allTimePool} USDC</span>
                </div>
              </div>
              <p className="text-xs text-amber-700 mt-3 font-semibold">
                🎯 Beat the high score → WIN INSTANTLY!
              </p>
            </div>

            <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-2xl p-6 mb-6 text-left">
              <h2 className="font-semibold text-gray-800 mb-3">How It Works:</h2>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>💰 $0.10 per game (6¢ → daily prize pool, 2¢ → all-time prize pool)</li>
                <li>🎯 Beat daily high score → Win entire daily pool!</li>
                <li>👑 Beat all-time record → Win entire all-time pool!</li>
                <li>🕛 Daily pool pays out at midnight GMT</li>
                <li>⚡ Have fun!</li>
              </ul>
            </div>

            <button
              onClick={handlePayAndStart}
              disabled={paying || !address}
              className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold py-4 px-8 rounded-xl hover:from-emerald-700 hover:to-cyan-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paying ? '⏳ Processing Payment...' : !address ? '🔒 Connect Wallet to Play' : `💳 Play Game - $${GAME_COST} USDC`}
            </button>

            {/* Leaderboards on Main Menu */}
            <div className="grid md:grid-cols-2 gap-6 mt-8">
              <div className="text-left">
                <h3 className="font-bold text-lg mb-3 text-gray-900">🏆 Today's Top 10</h3>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {dailyLeaderboard.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No scores today!</p>
                  ) : (
                    dailyLeaderboard.map((entry) => {
                      const isLastPlayed = lastPlayedScore !== null && entry.score === lastPlayedScore && entry.wallet_address.toLowerCase() === address?.toLowerCase();
                      return (
                        <div key={`${entry.wallet_address}-${entry.created_at}`} className={`flex justify-between items-center text-sm p-2 rounded ${
                          isLastPlayed
                            ? 'bg-yellow-200 border-2 border-yellow-500 animate-pulse'
                            : entry.wallet_address.toLowerCase() === address?.toLowerCase() 
                            ? 'bg-emerald-100 border-2 border-emerald-500'
                            : entry.rank === 1 
                            ? 'bg-gradient-to-r from-yellow-100 to-amber-100' 
                            : 'bg-gray-50'
                        }`}>
                          <span className="font-medium text-gray-900">{entry.rank === 1 ? '👑' : `#${entry.rank}`}</span>
                          <span className="text-xs font-mono text-gray-900">{formatWallet(entry.wallet_address)}</span>
                          <span className="font-bold text-emerald-600">{entry.score.toLocaleString()}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="text-left">
                <h3 className="font-bold text-lg mb-3 text-gray-900">👑 All-Time Top 10</h3>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {alltimeLeaderboard.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No scores yet!</p>
                  ) : (
                    alltimeLeaderboard.map((entry) => {
                      const isLastPlayed = lastPlayedScore !== null && entry.score === lastPlayedScore && entry.wallet_address.toLowerCase() === address?.toLowerCase();
                      return (
                        <div key={`${entry.wallet_address}-${entry.created_at}`} className={`flex justify-between items-center text-sm p-2 rounded ${
                          isLastPlayed
                            ? 'bg-yellow-200 border-2 border-yellow-500 animate-pulse'
                            : entry.wallet_address.toLowerCase() === address?.toLowerCase() 
                            ? 'bg-emerald-100 border-2 border-emerald-500'
                            : entry.rank === 1 
                            ? 'bg-gradient-to-r from-purple-100 to-pink-100' 
                            : 'bg-gray-50'
                        }`}>
                          <span className="font-medium text-gray-900">{entry.rank === 1 ? '👑' : `#${entry.rank}`}</span>
                          <span className="text-xs font-mono text-gray-900">{formatWallet(entry.wallet_address)}</span>
                          <span className="font-bold text-emerald-600">{entry.score.toLocaleString()}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {screen === 'game' && gameState && (
          <div>
            <div className="bg-white/95 backdrop-blur rounded-2xl p-4 mb-4 flex justify-between items-center shadow-lg">
              <div className="font-bold text-xl text-gray-900">
                ⏱️ {Math.floor(gameState.timeLeft / 60)}:{(gameState.timeLeft % 60).toString().padStart(2, '0')}
              </div>
              <div className="font-bold text-xl text-gray-900">💰 {(finalScore > 0 ? finalScore : currentGameScore).toLocaleString()}</div>
              <div className="font-semibold text-red-600">❌ {gameState.wrong}</div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
              {gameState.cards.map((card: any) => {
                const isFlipped = gameState.flipped.includes(card.uid);
                const isMatched = gameState.matched.includes(card.uid);
                
                return (
                  <button
                    key={card.uid}
                    onClick={() => handleCardClick(card.uid)}
                    disabled={isMatched}
                    className={`aspect-square rounded-xl transition-all duration-300 text-7xl ${
                      isMatched
                        ? 'bg-gradient-to-br from-emerald-200 to-cyan-200 opacity-50'
                        : isFlipped
                        ? 'bg-white shadow-lg'
                        : 'bg-gradient-to-br from-emerald-400 to-cyan-400 hover:from-emerald-500 hover:to-cyan-500 shadow-md hover:scale-105'
                    }`}
                  >
                    <div className={`transition-all duration-300 ${isFlipped || isMatched ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
                      {card.emoji}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="bg-white/95 backdrop-blur rounded-xl p-3 shadow-lg">
              <div className="flex justify-between text-sm text-gray-900 mb-2">
                <span>Progress</span>
                <span>{gameState.matched.length / 2} / 8 pairs</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-full transition-all duration-500"
                  style={{ width: `${(gameState.matched.length / gameState.cards.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {prizeStatus && (
          <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl text-center max-h-[90vh] overflow-y-auto">
            <div className="text-9xl mb-6 animate-bounce">🎉🎊</div>
            
            {prizeStatus.wonAllTime ? (
              <>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent mb-4">
                  ALL-TIME LEGEND!
                </h1>
                <p className="text-xl text-gray-700 mb-8">
                  You set a NEW all-time record! You're going down in history! 📜
                </p>
                <div className="bg-gradient-to-br from-purple-100 to-pink-100 border-4 border-purple-500 rounded-2xl p-8 mb-8">
                  <div className="text-9xl mb-3">👑</div>
                  <h3 className="text-2xl font-bold text-purple-900 mb-3">All-Time Prize</h3>
                  <p className="text-5xl font-bold text-purple-800">${prizeStatus.allTimeAmount} USDC</p>
                </div>
                {prizeStatus.wonDaily && Number(prizeStatus.dailyAmount) > 0 && (
                  <div className="bg-gradient-to-br from-yellow-100 to-amber-100 border-2 border-yellow-400 rounded-xl p-4 mb-6">
                    <p className="text-lg font-semibold text-amber-900">
                      Plus Daily Prize: ${prizeStatus.dailyAmount} USDC
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent mb-4">
                  DAILY CHAMPION!
                </h1>
                <p className="text-xl text-gray-700 mb-8">
                  Congratulations! You beat today's high score! 🎯
                </p>
                <div className="bg-gradient-to-br from-yellow-100 to-amber-100 border-4 border-yellow-500 rounded-2xl p-8 mb-8">
                  <div className="text-9xl mb-3">⭐</div>
                  <h3 className="text-2xl font-bold text-amber-900 mb-3">Daily Prize</h3>
                  <p className="text-5xl font-bold text-amber-800">${prizeStatus.dailyAmount} USDC</p>
                </div>
              </>
            )}

            <div className="bg-green-50 border-2 border-green-500 rounded-xl p-4 mb-6">
              <p className="text-sm text-green-800 font-semibold">
                ✅ Prize has been sent to your wallet automatically!
              </p>
              <p className="text-xs text-green-700 mt-1">
                Check your USDC balance - it should update in ~30 seconds.
              </p>
              {prizeStatus.txHash && (
                <a
                  href={`https://basescan.org/tx/${prizeStatus.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 underline mt-2 block"
                >
                  View USDC payout transaction on BaseScan →
                </a>
              )}
            </div>

            <button
              onClick={() => setPrizeStatus(null)}
              className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold py-4 px-8 rounded-xl hover:from-emerald-700 hover:to-cyan-700 transition-all transform hover:scale-105 shadow-lg text-xl"
            >
              Continue →
            </button>
          </div>
        )}

        {!prizeStatus && screen === 'end' && (
          <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl text-center max-h-[90vh] overflow-y-auto">
            <div className="text-6xl mb-4">{gameState?.matched.length === gameState?.cards.length ? ['🎉', '🎊', '🥳', '🏆', '⭐', '✨', '🌟', '💫', '🎈', '🔥'][Math.floor(Math.random() * 10)] : '⏰'}</div>
            <h1 className="text-3xl font-bold text-emerald-600 mb-2">
              {gameState?.matched.length === gameState?.cards.length ? '' : "Time's Up!"}
            </h1>

            <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-2xl p-6 mb-6 space-y-3">
              <div className="flex justify-between items-center border-b-2 border-emerald-200 pb-3">
                <span className="text-gray-700 font-medium">Final Score:</span>
                <span className="text-3xl font-bold text-emerald-600">{finalScore.toLocaleString()}</span>
              </div>
              
              {/* Score Breakdown */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">✅ Pairs Found ({gameState?.matched.length / 2}/8):</span>
                  <span className="font-semibold text-green-600">+{((gameState?.matched.length / 2) * 125000).toLocaleString()}</span>
                </div>
                {gameState?.wrong > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">❌ Wrong Attempts ({gameState?.wrong}):</span>
                    <span className="font-semibold text-red-600">-{(gameState?.wrong * 25000).toLocaleString()}</span>
                  </div>
                )}
                {calcScore().timePenalty > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">⏱️ Time Penalty:</span>
                    <span className="font-semibold text-orange-600">-{Math.floor(calcScore().timePenalty).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs text-gray-500 pt-1">
                  <span>Time: {Math.floor(calcScore().elapsed / 1000)}s</span>
                  <span>Penalty after 10s</span>
                </div>
              </div>
            </div>

            {submittingScore && (
              <p className="text-gray-500 mb-6">Checking for prizes...</p>
            )}

            {/* Prize Pools Display - Compact */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-300 rounded-lg p-2.5 text-center">
                <div className="text-xs text-amber-700 font-medium mb-0.5">🏆 Daily Pool</div>
                <div className="text-lg font-bold text-amber-900">${dailyPool}</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-300 rounded-lg p-2.5 text-center">
                <div className="text-xs text-purple-700 font-medium mb-0.5">👑 All-Time Pool</div>
                <div className="text-lg font-bold text-purple-900">${allTimePool}</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="text-left">
                <h3 className="font-bold text-lg mb-3 text-gray-900">🏆 Today's Top 10</h3>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {dailyLeaderboard.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No scores today!</p>
                  ) : (
                    dailyLeaderboard.map((entry) => {
                      const isLastPlayed = lastPlayedScore !== null && entry.score === lastPlayedScore && entry.wallet_address.toLowerCase() === address?.toLowerCase();
                      return (
                        <div key={`${entry.wallet_address}-${entry.created_at}`} className={`flex justify-between items-center text-sm p-2 rounded ${
                          isLastPlayed
                            ? 'bg-yellow-200 border-2 border-yellow-500 animate-pulse'
                            : entry.wallet_address.toLowerCase() === address?.toLowerCase() 
                            ? 'bg-emerald-100 border-2 border-emerald-500'
                            : entry.rank === 1 
                            ? 'bg-gradient-to-r from-yellow-100 to-amber-100' 
                            : 'bg-gray-50'
                        }`}>
                          <span className="font-medium text-gray-900">{entry.rank === 1 ? '👑' : `#${entry.rank}`}</span>
                          <span className="text-xs font-mono text-gray-900">{formatWallet(entry.wallet_address)}</span>
                          <span className="font-bold text-emerald-600">{entry.score.toLocaleString()}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="text-left">
                <h3 className="font-bold text-lg mb-3 text-gray-900">👑 All-Time Top 10</h3>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {alltimeLeaderboard.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No scores yet!</p>
                  ) : (
                    alltimeLeaderboard.map((entry) => {
                      const isLastPlayed = lastPlayedScore !== null && entry.score === lastPlayedScore && entry.wallet_address.toLowerCase() === address?.toLowerCase();
                      return (
                        <div key={`${entry.wallet_address}-${entry.created_at}`} className={`flex justify-between items-center text-sm p-2 rounded ${
                          isLastPlayed
                            ? 'bg-yellow-200 border-2 border-yellow-500 animate-pulse'
                            : entry.wallet_address.toLowerCase() === address?.toLowerCase() 
                            ? 'bg-emerald-100 border-2 border-emerald-500'
                            : entry.rank === 1 
                            ? 'bg-gradient-to-r from-purple-100 to-pink-100' 
                            : 'bg-gray-50'
                        }`}>
                          <span className="font-medium text-gray-900">{entry.rank === 1 ? '👑' : `#${entry.rank}`}</span>
                          <span className="text-xs font-mono text-gray-900">{formatWallet(entry.wallet_address)}</span>
                          <span className="font-bold text-emerald-600">{entry.score.toLocaleString()}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handlePayAndStart}
                disabled={paying}
                className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold py-3 px-6 rounded-xl hover:from-emerald-700 hover:to-cyan-700 transition-all disabled:opacity-50"
              >
                {paying ? '⏳ Processing...' : `💳 Play Again - $${GAME_COST} USDC`}
              </button>
              <button
                onClick={() => setScreen('start')}
                className="w-full bg-gray-100 text-gray-700 font-semibold py-3 px-6 rounded-xl hover:bg-gray-200 transition-all"
              >
                Main Menu
              </button>
            </div>
          </div>
        )}
        
        {/* Version Number */}
        <div className="text-center mt-4">
          <p className="text-xs text-white/70 font-semibold">v{VERSION}</p>
        </div>
      </div>
    </div>
  );
}
