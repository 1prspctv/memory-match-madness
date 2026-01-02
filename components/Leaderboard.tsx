"use client";

import { useEffect, useState } from "react";
import { getTopScores, TopScore } from "@/lib/leaderboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface LeaderboardProps {
  gameId: string;
  limit?: number;
  currentPlayerAddress?: string;
}

export function Leaderboard({
  gameId,
  limit = 10,
  currentPlayerAddress,
}: LeaderboardProps) {
  const [scores, setScores] = useState<TopScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, [gameId, limit]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await getTopScores(gameId, limit);
      setScores(data);
    } catch (error) {
      console.error("Failed to load leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>🏆 Top Players</CardTitle>
      </CardHeader>
      <CardContent>
        {scores.length === 0 ? (
          <p className="text-muted-foreground">No scores yet. Be the first!</p>
        ) : (
          <div className="space-y-2">
            {scores.map((entry) => {
              const isCurrentPlayer =
                currentPlayerAddress?.toLowerCase() ===
                entry.wallet_address.toLowerCase();

              return (
                <div
                  key={`${entry.wallet_address}-${entry.created_at}`}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isCurrentPlayer
                      ? "bg-primary/10 border-2 border-primary"
                      : "bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        entry.rank === 1
                          ? "bg-yellow-500 text-white"
                          : entry.rank === 2
                          ? "bg-gray-400 text-white"
                          : entry.rank === 3
                          ? "bg-amber-700 text-white"
                          : "bg-muted-foreground/20"
                      }`}
                    >
                      {entry.rank}
                    </div>
                    <div>
                      <p className="font-medium">
                        {entry.player_name || formatAddress(entry.wallet_address)}
                      </p>
                      {isCurrentPlayer && (
                        <p className="text-xs text-primary font-semibold">You</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">{entry.score}</p>
                    <p className="text-xs text-muted-foreground">points</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
