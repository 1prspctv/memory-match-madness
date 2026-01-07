'use client';

import { useState, useEffect } from 'react';
import { submitScoreWithQueue, getTopScores, TopScore } from '@/lib/leaderboard';
import { useScoreSync } from '@/hooks/useScoreSync';

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
  const { pendingCount } = useScoreSync(); // Initialize background score sync
  const [screen, setScreen] = useState<'start' | 'game' | 'end'>('start');
  const [playerName, setPlayerName] = useState<string>('');
  const [gameState, setGameState] = useState<any>(null);
  const [dailyLeaderboard, setDailyLeaderboard] = useState<TopScore[]>([]);
  const [alltimeLeaderboard, setAlltimeLeaderboard] = useState<TopScore[]>([]);
  const [submittingScore, setSubmittingScore] = useState(false);
  const [lastPlayedScore, setLastPlayedScore] = useState<number | null>(null);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [currentGameScore, setCurrentGameScore] = useState<number>(0);

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    try {
      const daily = await getTopScores('memory-free-daily', 10);
      const alltime = await getTopScores('memory-free-alltime', 10);
      setDailyLeaderboard(daily);
      setAlltimeLeaderboard(alltime);
    } catch (error) {
      console.error('Failed to load leaderboards:', error);
    }
  };

  const handleStartGame = () => {
    if (!playerName.trim()) {
      alert('Please enter your name first!');
      return;
    }

    startGame();
  };

  // Helper function to check if two positions are adjacent in 4x4 grid
  const areCardsAdjacent = (index1: number, index2: number): boolean => {
    const row1 = Math.floor(index1 / 4);
    const col1 = index1 % 4;
    const row2 = Math.floor(index2 / 4);
    const col2 = index2 % 4;

    // Adjacent if: same row and columns differ by 1, OR same column and rows differ by 1
    return (row1 === row2 && Math.abs(col1 - col2) === 1) ||
           (col1 === col2 && Math.abs(row1 - row2) === 1);
  };

  // Check if any matching pairs are adjacent
  const hasAdjacentPairs = (cards: typeof CARDS): boolean => {
    for (let i = 0; i < cards.length; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        if (cards[i].id === cards[j].id && areCardsAdjacent(i, j)) {
          return true; // Found adjacent matching pair
        }
      }
    }
    return false; // All pairs are safe
  };

  // Fallback deterministic placement if random shuffling fails
  const createNonAdjacentLayout = (selectedCards: typeof CARDS) => {
    // Checkerboard-style placement to guarantee no adjacency
    // Place pairs in positions that are never adjacent
    const positions = [
      [0, 6],   // pair 1: top-left, middle-right
      [2, 8],   // pair 2: top-right-ish, bottom-left-ish
      [5, 11],  // pair 3: middle, bottom-right-ish
      [7, 12],  // pair 4: middle-right-ish, bottom-left
      [1, 10],  // pair 5: top, bottom
      [3, 13],  // pair 6: top-right, bottom
      [4, 15],  // pair 7: middle-left, bottom-right
      [9, 14],  // pair 8: middle, bottom
    ];

    const layout = new Array(16);
    selectedCards.forEach((card, idx) => {
      layout[positions[idx][0]] = { ...card, uid: positions[idx][0] };
      layout[positions[idx][1]] = { ...card, uid: positions[idx][1] };
    });

    return layout;
  };

  const startGame = () => {
    const MAX_SHUFFLE_ATTEMPTS = 1000;
    const selected = [...CARDS].sort(() => Math.random() - 0.5).slice(0, 8);

    let gameCards = null;
    let attempts = 0;

    // Try to find valid random shuffle (no adjacent pairs)
    while (attempts < MAX_SHUFFLE_ATTEMPTS) {
      const shuffled = [...selected, ...selected]
        .map((card, i) => ({ ...card, uid: i }))
        .sort(() => Math.random() - 0.5);

      if (!hasAdjacentPairs(shuffled)) {
        gameCards = shuffled;
        console.log(`✅ Valid shuffle found in ${attempts + 1} attempt(s)`);
        break;
      }
      attempts++;
    }

    // Fallback if no valid shuffle found (extremely rare)
    if (!gameCards) {
      console.warn(`⚠️ Failed to find valid shuffle in ${MAX_SHUFFLE_ATTEMPTS} attempts, using deterministic layout`);
      gameCards = createNonAdjacentLayout(selected);
    }

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

  const saveScore = async (score: number) => {
    if (!playerName) return;

    console.log('💾 Saving score:', score);
    setSubmittingScore(true);
    setLastPlayedScore(score);

    try {
      // Save using queue system - GUARANTEED to never lose the score
      const result = await submitScoreWithQueue(
        playerName,
        score,
        { time: calcScore().elapsed, wrong: gameState?.wrong || 0 }
      );

      if (result.queued) {
        console.log('✅ Score saved!');
        if (result.synced) {
          console.log('✅ Score immediately synced to leaderboard');
        } else {
          console.log('⏳ Score will sync in background');
        }
      }

      // Reload leaderboards
      await loadLeaderboards();

    } catch (error) {
      console.error('Failed to save score:', error);
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
    
    if (won && playerName && scoreToUse > 0) {
      console.log('Calling saveScore with score:', scoreToUse);
      await saveScore(scoreToUse);
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
          if (playerName) {
            await saveScore(newScore);
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

  const VERSION = "1.9";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-teal-800 to-cyan-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        
        {screen === 'start' && (
          <div className="bg-white/95 backdrop-blur rounded-3xl p-8 shadow-2xl text-center">
            <div className="text-6xl mb-4">💎🏔️</div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-cyan-600 bg-clip-text text-transparent mb-2">
              Memory Match - Free
            </h1>
            <p className="text-gray-600 mb-6">Test your memory skills!</p>

            <div className="mb-6">
              <input
                type="text"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-emerald-500 focus:outline-none text-gray-900"
                maxLength={20}
              />
            </div>

            <div className="bg-gradient-to-r from-emerald-50 to-cyan-50 rounded-2xl p-6 mb-6 text-left">
              <h2 className="font-semibold text-gray-800 mb-3">How to Play:</h2>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>🎮 Match all 8 pairs of cards</li>
                <li>⏱️ Complete as fast as possible</li>
                <li>💯 Fewer mistakes = higher score</li>
                <li>🏆 Compete for the high score!</li>
              </ul>
            </div>

            <button
              onClick={handleStartGame}
              disabled={!playerName.trim()}
              className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold py-4 px-8 rounded-xl hover:from-emerald-700 hover:to-cyan-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!playerName.trim() ? '📝 Enter Name to Play' : '🎮 Start Game'}
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
                      const isLastPlayed = lastPlayedScore !== null && entry.score === lastPlayedScore && entry.player_name.toLowerCase() === playerName?.toLowerCase();
                      return (
                        <div key={`${entry.player_name}-${entry.created_at}`} className={`flex justify-between items-center text-sm p-2 rounded ${
                          isLastPlayed
                            ? 'bg-yellow-200 border-2 border-yellow-500 animate-pulse'
                            : entry.player_name.toLowerCase() === playerName?.toLowerCase()
                            ? 'bg-emerald-100 border-2 border-emerald-500'
                            : entry.rank === 1
                            ? 'bg-gradient-to-r from-yellow-100 to-amber-100'
                            : 'bg-gray-50'
                        }`}>
                          <span className="font-medium text-gray-900">{entry.rank === 1 ? '👑' : `#${entry.rank}`}</span>
                          <span className="text-xs text-gray-900">{entry.player_name}</span>
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
                      const isLastPlayed = lastPlayedScore !== null && entry.score === lastPlayedScore && entry.player_name.toLowerCase() === playerName?.toLowerCase();
                      return (
                        <div key={`${entry.player_name}-${entry.created_at}`} className={`flex justify-between items-center text-sm p-2 rounded ${
                          isLastPlayed
                            ? 'bg-yellow-200 border-2 border-yellow-500 animate-pulse'
                            : entry.player_name.toLowerCase() === playerName?.toLowerCase()
                            ? 'bg-emerald-100 border-2 border-emerald-500'
                            : entry.rank === 1 
                            ? 'bg-gradient-to-r from-purple-100 to-pink-100' 
                            : 'bg-gray-50'
                        }`}>
                          <span className="font-medium text-gray-900">{entry.rank === 1 ? '👑' : `#${entry.rank}`}</span>
                          <span className="text-xs text-gray-900">{entry.player_name}</span>
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

        {screen === 'end' && (
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
              <p className="text-gray-500 mb-6">Saving score...</p>
            )}

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="text-left">
                <h3 className="font-bold text-lg mb-3 text-gray-900">🏆 Today's Top 10</h3>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {dailyLeaderboard.length === 0 ? (
                    <p className="text-gray-500 text-sm text-center py-4">No scores today!</p>
                  ) : (
                    dailyLeaderboard.map((entry) => {
                      const isLastPlayed = lastPlayedScore !== null && entry.score === lastPlayedScore && entry.player_name.toLowerCase() === playerName?.toLowerCase();
                      return (
                        <div key={`${entry.player_name}-${entry.created_at}`} className={`flex justify-between items-center text-sm p-2 rounded ${
                          isLastPlayed
                            ? 'bg-yellow-200 border-2 border-yellow-500 animate-pulse'
                            : entry.player_name.toLowerCase() === playerName?.toLowerCase()
                            ? 'bg-emerald-100 border-2 border-emerald-500'
                            : entry.rank === 1
                            ? 'bg-gradient-to-r from-yellow-100 to-amber-100'
                            : 'bg-gray-50'
                        }`}>
                          <span className="font-medium text-gray-900">{entry.rank === 1 ? '👑' : `#${entry.rank}`}</span>
                          <span className="text-xs text-gray-900">{entry.player_name}</span>
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
                      const isLastPlayed = lastPlayedScore !== null && entry.score === lastPlayedScore && entry.player_name.toLowerCase() === playerName?.toLowerCase();
                      return (
                        <div key={`${entry.player_name}-${entry.created_at}`} className={`flex justify-between items-center text-sm p-2 rounded ${
                          isLastPlayed
                            ? 'bg-yellow-200 border-2 border-yellow-500 animate-pulse'
                            : entry.player_name.toLowerCase() === playerName?.toLowerCase()
                            ? 'bg-emerald-100 border-2 border-emerald-500'
                            : entry.rank === 1 
                            ? 'bg-gradient-to-r from-purple-100 to-pink-100' 
                            : 'bg-gray-50'
                        }`}>
                          <span className="font-medium text-gray-900">{entry.rank === 1 ? '👑' : `#${entry.rank}`}</span>
                          <span className="text-xs text-gray-900">{entry.player_name}</span>
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
                onClick={handleStartGame}
                disabled={!playerName.trim()}
                className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 text-white font-bold py-3 px-6 rounded-xl hover:from-emerald-700 hover:to-cyan-700 transition-all disabled:opacity-50"
              >
                🎮 Play Again
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
