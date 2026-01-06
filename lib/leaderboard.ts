import { supabase } from './supabase';

export interface LeaderboardEntry {
  id?: string;
  game_id: string;
  wallet_address: string;
  player_name?: string;
  score: number;
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface TopScore {
  rank: number;
  wallet_address: string;
  player_name: string | null;
  score: number;
  created_at: string;
}

/**
 * Validate that Supabase is properly configured
 */
function validateSupabaseClient(): boolean {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error('❌ Supabase environment variables not configured');
    return false;
  }
  return true;
}

/**
 * Retry helper with exponential backoff for network resilience
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      if (isLastAttempt) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Submit a score to the leaderboard with retry logic and validation
 */
export async function submitScore(entry: LeaderboardEntry) {
  // Validate environment
  if (!validateSupabaseClient()) {
    throw new Error('Supabase not properly configured. Please check environment variables.');
  }

  // Retry logic for network resilience
  return retryWithBackoff(async () => {
    const { data, error } = await supabase
      .from('leaderboards')
      .insert([
        {
          game_id: entry.game_id,
          wallet_address: entry.wallet_address,
          player_name: entry.player_name,
          score: entry.score,
          metadata: entry.metadata,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Error submitting score:', error);
      throw error;
    }

    console.log(`✅ Score saved: ${entry.game_id} - ${entry.score}`);
    return data;
  }, 3, 1000); // 3 retries with 1s base delay
}

/**
 * Submit scores for both daily and all-time leaderboards
 * Returns status for each save attempt
 */
export async function submitScoreToBoth(
  walletAddress: string,
  score: number,
  metadata?: Record<string, any>
) {
  console.log('📊 Saving score to both leaderboards:', score);

  const results = {
    daily: false,
    allTime: false,
    errors: [] as string[],
  };

  // Try to save to daily
  try {
    await submitScore({
      game_id: 'memory-match-daily',
      wallet_address: walletAddress,
      score,
      metadata,
    });
    results.daily = true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.errors.push(`Daily save failed: ${errorMsg}`);
    console.error('❌ Failed to save daily score:', error);
  }

  // Try to save to all-time
  try {
    await submitScore({
      game_id: 'memory-match-alltime',
      wallet_address: walletAddress,
      score,
      metadata,
    });
    results.allTime = true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.errors.push(`All-time save failed: ${errorMsg}`);
    console.error('❌ Failed to save all-time score:', error);
  }

  return results;
}

/**
 * Get top scores for a specific game
 */
export async function getTopScores(
  gameId: string,
  limit: number = 10
): Promise<TopScore[]> {
  const { data, error } = await supabase.rpc('get_top_scores', {
    game_name: gameId,
    limit_count: limit,
  });

  if (error) {
    console.error('Error fetching top scores:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get player's best score for a game
 */
export async function getPlayerBestScore(
  gameId: string,
  walletAddress: string
) {
  const { data, error } = await supabase
    .from('top_scores')
    .select('*')
    .eq('game_id', gameId)
    .eq('wallet_address', walletAddress)
    .single();

  if (error && error.code !== 'PGRST116') {
    // PGRST116 is "no rows returned"
    console.error('Error fetching player score:', error);
    throw error;
  }

  return data;
}

/**
 * Get player's rank for a game
 */
export async function getPlayerRank(
  gameId: string,
  walletAddress: string
): Promise<number | null> {
  const { data, error } = await supabase.rpc('get_top_scores', {
    game_name: gameId,
    limit_count: 1000, // Get enough to find the player
  });

  if (error) {
    console.error('Error fetching player rank:', error);
    return null;
  }

  const playerIndex = data?.findIndex(
    (entry: TopScore) => entry.wallet_address === walletAddress
  );

  return playerIndex !== undefined && playerIndex >= 0 ? playerIndex + 1 : null;
}

/**
 * Get all scores for a player across all games
 */
export async function getPlayerScores(walletAddress: string) {
  const { data, error } = await supabase
    .from('top_scores')
    .select('*')
    .eq('wallet_address', walletAddress)
    .order('score', { ascending: false });

  if (error) {
    console.error('Error fetching player scores:', error);
    throw error;
  }

  return data;
}