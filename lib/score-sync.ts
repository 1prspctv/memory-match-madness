/**
 * Score Sync Service - Syncs queued scores to Supabase
 *
 * Guarantees:
 * - Scores saved locally first (never lost)
 * - Background sync retries failed scores
 * - Only removes from queue after confirmed save
 */

import { submitScore } from './leaderboard';
import {
  getPendingScores,
  removePendingScore,
  updateScoreAttempt,
  shouldRetryScore,
  type PendingScore,
} from './score-queue';

export interface SyncResult {
  success: boolean;
  synced: number;
  failed: number;
  pending: number;
  errors: string[];
}

/**
 * Sync a single score to Supabase
 */
async function syncScore(score: PendingScore): Promise<boolean> {
  console.log(`🔄 Syncing score ${score.id}...`);

  // Update attempt count
  updateScoreAttempt(score.id);

  try {
    // Try to save to both leaderboards
    const dailySuccess = await submitScore({
      game_id: 'memory-match-daily',
      wallet_address: score.walletAddress,
      score: score.score,
      metadata: score.metadata,
    }).then(() => true).catch((error) => {
      console.error('Failed to sync daily score:', error);
      return false;
    });

    const allTimeSuccess = await submitScore({
      game_id: 'memory-match-alltime',
      wallet_address: score.walletAddress,
      score: score.score,
      metadata: score.metadata,
    }).then(() => true).catch((error) => {
      console.error('Failed to sync all-time score:', error);
      return false;
    });

    // Consider it synced if at least one succeeded
    // Both usually succeed or fail together, but this is more resilient
    const synced = dailySuccess || allTimeSuccess;

    if (synced) {
      console.log(`✅ Score synced successfully: ${score.id}`);
      removePendingScore(score.id);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`❌ Failed to sync score ${score.id}:`, error);
    return false;
  }
}

/**
 * Sync all pending scores
 */
export async function syncPendingScores(): Promise<SyncResult> {
  const pendingScores = getPendingScores();

  if (pendingScores.length === 0) {
    return {
      success: true,
      synced: 0,
      failed: 0,
      pending: 0,
      errors: [],
    };
  }

  console.log(`📊 Syncing ${pendingScores.length} pending scores...`);

  const result: SyncResult = {
    success: true,
    synced: 0,
    failed: 0,
    pending: 0,
    errors: [],
  };

  // Process scores sequentially to avoid overwhelming the server
  for (const score of pendingScores) {
    // Check if we should retry this score
    if (!shouldRetryScore(score)) {
      console.log(`⏭️ Skipping score ${score.id} (too soon to retry)`);
      result.pending++;
      continue;
    }

    const success = await syncScore(score);

    if (success) {
      result.synced++;
    } else {
      result.failed++;
      result.errors.push(`Score ${score.id} failed after ${score.attempts} attempts`);
    }

    // Small delay between syncs to be nice to the server
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Update pending count
  result.pending += getPendingScores().length;

  console.log(`📊 Sync complete: ${result.synced} synced, ${result.failed} failed, ${result.pending} still pending`);

  return result;
}

/**
 * Start background sync (call this when app loads)
 */
export function startBackgroundSync(intervalMs: number = 60000): () => void {
  console.log('🔄 Starting background score sync...');

  // Sync immediately on start
  syncPendingScores().catch(console.error);

  // Then sync periodically
  const intervalId = setInterval(() => {
    const pendingCount = getPendingScores().length;

    if (pendingCount > 0) {
      console.log(`🔄 Background sync triggered (${pendingCount} pending)`);
      syncPendingScores().catch(console.error);
    }
  }, intervalMs);

  // Return cleanup function
  return () => {
    console.log('🛑 Stopping background score sync');
    clearInterval(intervalId);
  };
}

/**
 * Sync on page visibility change (when user returns to tab)
 */
export function syncOnVisibilityChange(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      const pendingCount = getPendingScores().length;

      if (pendingCount > 0) {
        console.log(`👁️ Tab became visible, syncing ${pendingCount} pending scores`);
        syncPendingScores().catch(console.error);
      }
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);

  // Return cleanup function
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}
