"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { submitScore } from "@/lib/leaderboard";
import { Leaderboard } from "@/components/Leaderboard";
import { Button } from "@/components/ui/button";

export function ExampleGame() {
  const { address } = useAccount();
  const [score, setScore] = useState(0);
  const [playerName, setPlayerName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleGameEnd = async (finalScore: number) => {
    if (!address) {
      alert("Please connect your wallet first!");
      return;
    }

    try {
      setSubmitting(true);
      
      await submitScore({
        game_id: "example-game", // Unique game identifier
        wallet_address: address,
        player_name: playerName || undefined,
        score: finalScore,
        metadata: {
          // Optional: store additional game data
          timestamp: new Date().toISOString(),
          level: 5,
        },
      });

      alert("Score submitted successfully!");
    } catch (error) {
      console.error("Failed to submit score:", error);
      alert("Failed to submit score. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Game Area */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Game</h2>
        <div className="space-y-4">
          <input
            type="text"
            placeholder="Your name (optional)"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full p-2 border rounded"
          />
          
          <div className="text-center">
            <p className="text-4xl font-bold mb-4">{score}</p>
            <Button
              onClick={() => setScore(score + 10)}
              className="mr-2"
            >
              +10 Points
            </Button>
            <Button
              onClick={() => handleGameEnd(score)}
              disabled={submitting || !address}
            >
              {submitting ? "Submitting..." : "Submit Score"}
            </Button>
          </div>
        </div>
      </div>

      {/* Leaderboard Area */}
      <div>
        <Leaderboard
          gameId="example-game"
          limit={10}
          currentPlayerAddress={address}
        />
      </div>
    </div>
  );
}
