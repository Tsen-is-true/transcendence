import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../api/client';

interface LeaderboardEntry {
  rank: number;
  userId: number;
  nickname: string;
  avatarUrl?: string;
  elo: number;
  wins: number;
  loses: number;
  level: number;
}

export function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await apiFetch('/api/leaderboard?limit=50');

        if (!response.ok) {
          throw new Error('Failed to load leaderboard');
        }

        const result = await response.json();
        setLeaderboard(result.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading leaderboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <Link to="/" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link to="/" className="text-purple-400 hover:text-purple-300 mb-4 inline-block">
            ← Back to Home
          </Link>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">🏆 Leaderboard</h1>
          <p className="text-gray-400">Top players ranked by win rate</p>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              No players yet. Be the first to play!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr className="text-left text-gray-400 text-sm">
                    <th className="px-6 py-4 font-semibold">Rank</th>
                    <th className="px-6 py-4 font-semibold">Player</th>
                    <th className="px-6 py-4 font-semibold text-center">Games</th>
                    <th className="px-6 py-4 font-semibold text-center">Wins</th>
                    <th className="px-6 py-4 font-semibold text-center">Losses</th>
                    <th className="px-6 py-4 font-semibold text-center">Win Rate</th>
                    <th className="px-6 py-4 font-semibold text-center">Level (ELO)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {leaderboard.map((entry) => {
                    const isCurrentUser = user && Number(entry.userId) === Number(user.id);
                    const totalGames = entry.wins + entry.loses;
                    const winRate = totalGames > 0 ? Math.round((entry.wins / totalGames) * 100) : 0;
                    const medalEmoji = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : '';

                    return (
                      <tr
                        key={entry.userId}
                        className={`transition-colors ${
                          isCurrentUser
                            ? 'bg-blue-900/30 border-l-4 border-blue-500'
                            : 'hover:bg-gray-700/50'
                        }`}
                      >
                        {/* Rank */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-white">
                              {medalEmoji || `#${entry.rank}`}
                            </span>
                          </div>
                        </td>

                        {/* Player */}
                        <td className="px-6 py-4">
                          <Link
                            to={`/profile/${entry.userId}`}
                            className="flex items-center gap-3 hover:text-blue-400 transition-colors"
                          >
                            {entry.avatarUrl && (entry.avatarUrl.startsWith('http') || entry.avatarUrl.startsWith('/')) ? (
                              <img
                                src={entry.avatarUrl}
                                alt={entry.nickname}
                                className="w-10 h-10 rounded-full object-cover border border-gray-600"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(entry.nickname);
                                }}
                              />
                            ) : entry.avatarUrl ? (
                              <span className="text-2xl">{entry.avatarUrl}</span>
                            ) : (
                              <img src="/logo.png" className="w-10 h-10 rounded-full object-contain border border-gray-600" alt="Logo" />
                            )}
                            <div>
                              <div className="text-white font-semibold">
                                {entry.nickname}
                                {isCurrentUser && (
                                  <span className="ml-2 text-xs bg-blue-600 px-2 py-1 rounded">YOU</span>
                                )}
                              </div>
                            </div>
                          </Link>
                        </td>

                        {/* Games */}
                        <td className="px-6 py-4 text-center">
                          <div className="text-white font-semibold">{totalGames}</div>
                        </td>

                        {/* Wins */}
                        <td className="px-6 py-4 text-center">
                          <div className="text-green-400 font-semibold">{entry.wins}</div>
                        </td>

                        {/* Losses */}
                        <td className="px-6 py-4 text-center">
                          <div className="text-red-400 font-semibold">{entry.loses}</div>
                        </td>

                        {/* Win Rate */}
                        <td className="px-6 py-4 text-center">
                          <div className="inline-block">
                            <div className="text-white font-bold text-lg">{winRate}%</div>
                            <div className="w-full bg-gray-700 rounded-full h-2 mt-1">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
                                style={{ width: `${Math.min(winRate, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>

                        {/* ELO / Level */}
                        <td className="px-6 py-4 text-center">
                          <div className="font-semibold text-blue-400">
                             Lv.{entry.level}
                             <span className="text-xs text-gray-400 ml-1">({entry.elo})</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 bg-gray-800 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-2">Ranking System</h3>
          <div className="text-gray-400 text-sm space-y-1">
            <p>• Players are ranked by <strong>Win Rate</strong> (primary)</p>
            <p>• Ties are broken by <strong>Total Wins</strong> (secondary)</p>
            <p>• Further ties are broken by <strong>Score Differential</strong> (tertiary)</p>
            <p>• Score Diff = Total Points Scored - Total Points Conceded</p>
          </div>
        </div>
      </div>
    </div>
  );
}
