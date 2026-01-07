/**
 * React hook for score synchronization
 * Automatically syncs pending scores in the background
 */

import { useEffect, useState } from 'react';
import { startBackgroundSync, syncOnVisibilityChange } from '@/lib/score-sync';
import { getPendingScoreCount } from '@/lib/score-queue';

export function useScoreSync() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Update pending count
    const updateCount = () => {
      const count = getPendingScoreCount();
      setPendingCount(count);
    };

    updateCount();

    // Start background sync (every 60 seconds)
    const stopBackgroundSync = startBackgroundSync(60000);

    // Sync when tab becomes visible
    const stopVisibilitySync = syncOnVisibilityChange();

    // Update count periodically
    const countInterval = setInterval(updateCount, 5000);

    // Cleanup on unmount
    return () => {
      stopBackgroundSync();
      stopVisibilitySync();
      clearInterval(countInterval);
    };
  }, []);

  return {
    pendingCount,
    isSyncing,
  };
}
