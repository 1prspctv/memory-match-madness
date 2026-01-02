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
 * Submit a score to the leaderboard
 */
export async function submitScore(entry: LeaderboardEntry) {
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
    console.error('Error submitting score:', error);
    throw error;
  }

  return data;
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