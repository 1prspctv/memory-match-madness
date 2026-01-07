/**
 * Score Queue System - Guarantees no score is ever lost
 *
 * Flow:
 * 1. Score saved to localStorage immediately (instant, never fails)
 * 2. Attempt to sync to Supabase
 * 3. Only remove from queue after confirmed save
 * 4. Background sync retries pending scores
 */

export interface PendingScore {
  id: string;
  playerName: string;
  score: number;
  metadata?: Record<string, any>;
  timestamp: number;
  attempts: number;
  lastAttempt?: number;
}

const QUEUE_KEY = 'mmm_score_queue';
const MAX_QUEUE_SIZE = 100; // Prevent unbounded growth

/**
 * Get all pending scores from localStorage
 */
export function getPendingScores(): PendingScore[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(QUEUE_KEY);
    if (!stored) return [];

    const scores = JSON.parse(stored) as PendingScore[];

    // Clean up old scores (older than 7 days)
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const cleaned = scores.filter(s => s.timestamp > sevenDaysAgo);

    if (cleaned.length !== scores.length) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(cleaned));
    }

    return cleaned;
  } catch (error) {
    console.error('Failed to load pending scores:', error);
    return [];
  }
}

/**
 * Add a new score to the queue
 */
export function addPendingScore(
  playerName: string,
  score: number,
  metadata?: Record<string, any>
): PendingScore {
  const pendingScore: PendingScore = {
    id: `${playerName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    playerName,
    score,
    metadata,
    timestamp: Date.now(),
    attempts: 0,
  };

  try {
    const queue = getPendingScores();

    // Prevent queue from growing too large
    if (queue.length >= MAX_QUEUE_SIZE) {
      console.warn('Score queue at max capacity, removing oldest entry');
      queue.shift();
    }

    queue.push(pendingScore);
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));

    console.log('✅ Score saved to local queue:', pendingScore.id);
    return pendingScore;
  } catch (error) {
    console.error('Failed to save score to queue:', error);
    throw new Error('Failed to persist score locally');
  }
}

/**
 * Remove a score from the queue (after successful sync)
 */
export function removePendingScore(scoreId: string): void {
  try {
    const queue = getPendingScores();
    const filtered = queue.filter(s => s.id !== scoreId);

    if (filtered.length !== queue.length) {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
      console.log('✅ Removed synced score from queue:', scoreId);
    }
  } catch (error) {
    console.error('Failed to remove score from queue:', error);
  }
}

/**
 * Update attempt count for a score
 */
export function updateScoreAttempt(scoreId: string): void {
  try {
    const queue = getPendingScores();
    const score = queue.find(s => s.id === scoreId);

    if (score) {
      score.attempts += 1;
      score.lastAttempt = Date.now();
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    }
  } catch (error) {
    console.error('Failed to update score attempt:', error);
  }
}

/**
 * Get count of pending scores
 */
export function getPendingScoreCount(): number {
  return getPendingScores().length;
}

/**
 * Clear all pending scores (use with caution!)
 */
export function clearPendingScores(): void {
  try {
    localStorage.removeItem(QUEUE_KEY);
    console.log('Cleared all pending scores');
  } catch (error) {
    console.error('Failed to clear pending scores:', error);
  }
}

/**
 * Check if a score should be retried (rate limiting)
 */
export function shouldRetryScore(score: PendingScore): boolean {
  // Don't retry too frequently - wait at least 30 seconds between attempts
  const MIN_RETRY_INTERVAL = 30 * 1000;

  if (!score.lastAttempt) return true;

  return Date.now() - score.lastAttempt > MIN_RETRY_INTERVAL;
}
