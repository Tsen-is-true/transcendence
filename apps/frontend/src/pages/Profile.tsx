import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../api/client';

interface UserProfile {
  id: string;
  username: string;
  avatar: string;
  createdAt: string;
  stats: {
    totalGames: number;
    wins: number;
    losses: number;
    winRate: number;
  };
}

interface Game {
  matchId: string;
  result: 'win' | 'loss';
  type: '1v1' | 'tournament';
  opponent: {
    userId: number;
    nickname: string;
    avatarUrl: string;
  } | null;
  score: {
    my: number;
    opponent: number;
  } | null;
  startAt: string;
  finishAt: string;
}

export function Profile() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending-sent' | 'pending-received' | 'accepted'>('none');
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // 자신의 프로필 보기인지 확인
  const isOwnProfile = !id || (currentUser && id === currentUser.id);
  const profileId = id || currentUser?.id;

  // Fetch friendship status if viewing another user's profile
  const fetchFriendshipStatus = async () => {
    if (!currentUser || isOwnProfile || !profileId) return;

    try {
      const response = await apiFetch('/api/friends');

      if (response.ok) {
        const result = await response.json();
        const data = result.data || {}; // Unwrap `{ data: { ... } }`

        // Check if user is in friends list
        const isFriend = data.friends?.find((f: any) => String(f.id) === String(profileId));
        if (isFriend) {
          setFriendshipStatus('accepted');
          setFriendshipId(isFriend.friendshipId);
          return;
        }

        // Check if there's a sent request
        const sentRequest = data.requests?.sent?.find((r: any) => String(r.id) === String(profileId));
        if (sentRequest) {
          setFriendshipStatus('pending-sent');
          setFriendshipId(sentRequest.friendshipId);
          return;
        }

        // Check if there's a received request
        const receivedRequest = data.requests?.received?.find((r: any) => String(r.id) === String(profileId));
        if (receivedRequest) {
          setFriendshipStatus('pending-received');
          setFriendshipId(receivedRequest.friendshipId);
          return;
        }

        setFriendshipStatus('none');
        setFriendshipId(null);
      }
    } catch (err) {
      console.error('Failed to fetch friendship status:', err);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      if (!profileId) {
        setError('User not found');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        // 프로필 정보 가져오기
        const profileRes = await apiFetch(`/api/users/${profileId}`);

        if (!profileRes.ok) {
          throw new Error('Failed to load profile');
        }

        const profileData = await profileRes.json();
        const data = profileData.data; // Unwrap `{ data: { ... } }`
        
        if (!data) throw new Error('User not found');

        const wins = data.wins || 0;
        const loses = data.loses || 0;
        const totalGames = wins + loses;

        setProfile({
          id: String(data.userid || data.id),
          username: data.nickname || data.username,
          avatar: data.avatarUrl || '/avatars/default.png',
          createdAt: data.createdAt,
          stats: {
            totalGames: totalGames,
            wins: wins,
            losses: loses,
            winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0
          }
        });

        // 게임 히스토리 가져오기 (APIEndpoint.md: /users/:id/matches)
        const gamesRes = await apiFetch(`/api/users/${profileId}/matches`);

        if (gamesRes.ok) {
          const gamesData = await gamesRes.json();
          // Backend is nested twice: { data: { data: [...] } }
          setGames(gamesData.data?.data || gamesData.data || []);
        }

        // Fetch friendship status if viewing another user
        await fetchFriendshipStatus();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [profileId]);

  // Friend action handlers
  const handleSendFriendRequest = async () => {
    if (!profileId) return;

    try {
      setActionLoading(true);
      const response = await apiFetch(`/api/friends/${profileId}`, {
        method: 'POST',
      });

      if (response.ok) {
        await fetchFriendshipStatus();
      }
    } catch (err) {
      console.error('Failed to send friend request:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptFriendRequest = async () => {
    if (!friendshipId) return;

    try {
      setActionLoading(true);
      const response = await apiFetch(`/api/friends/${friendshipId}/accept`, {
        method: 'PATCH',
      });

      if (response.ok) {
        await fetchFriendshipStatus();
      }
    } catch (err) {
      console.error('Failed to accept friend request:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendshipId) return;

    try {
      setActionLoading(true);
      const response = await apiFetch(`/api/friends/${friendshipId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchFriendshipStatus();
      }
    } catch (err) {
      console.error('Failed to remove friend:', err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading profile...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Profile Not Found</h2>
          <p className="text-gray-300 mb-6">{error || 'User does not exist'}</p>
          <Link to="/" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <Link to="/" className="text-blue-400 hover:text-blue-300">
            ← Back to Home
          </Link>
          {isOwnProfile ? (
            <div className="flex gap-3">
              <Link
                to="/friends"
                className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Friends
              </Link>
              <Link
                to="/settings"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Edit Profile
              </Link>
            </div>
          ) : currentUser && (
            <div className="flex gap-3">
              {friendshipStatus === 'none' && (
                <button
                  onClick={handleSendFriendRequest}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {actionLoading ? 'Sending...' : 'Add Friend'}
                </button>
              )}
              {friendshipStatus === 'pending-sent' && (
                <button
                  onClick={handleRemoveFriend}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {actionLoading ? 'Cancelling...' : 'Request Sent'}
                </button>
              )}
              {friendshipStatus === 'pending-received' && (
                <>
                  <button
                    onClick={handleAcceptFriendRequest}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    {actionLoading ? 'Accepting...' : 'Accept Request'}
                  </button>
                  <button
                    onClick={handleRemoveFriend}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Reject
                  </button>
                </>
              )}
              {friendshipStatus === 'accepted' && (
                <button
                  onClick={handleRemoveFriend}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  {actionLoading ? 'Removing...' : 'Remove Friend'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Profile Card */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8 mb-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center text-4xl">
              {profile.avatar && (profile.avatar.startsWith('http') || profile.avatar.startsWith('/')) ? (
                <img 
                  src={profile.avatar} 
                  alt={profile.username} 
                  className="w-full h-full object-cover" 
                  onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.username); }} 
                />
              ) : (
                <span className="text-5xl">{profile.avatar || '👤'}</span>
              )}
            </div>

            {/* User Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl font-bold text-white mb-2">{profile.username}</h1>
              <p className="text-gray-400 mb-4">
                Member since {new Date(profile.createdAt).toLocaleDateString()}
              </p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-3xl font-bold text-white">{profile.stats.totalGames}</div>
                  <div className="text-gray-400 text-sm">Games Played</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-3xl font-bold text-green-400">{profile.stats.wins}</div>
                  <div className="text-gray-400 text-sm">Wins</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-3xl font-bold text-red-400">{profile.stats.losses}</div>
                  <div className="text-gray-400 text-sm">Losses</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-3xl font-bold text-blue-400">{profile.stats.winRate}%</div>
                  <div className="text-gray-400 text-sm">Win Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Match History */}
        <div className="bg-gray-800 rounded-lg shadow-xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6">Recent Matches</h2>

          {games.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No games played yet
            </div>
          ) : (
            <div className="space-y-3">
              {games.map((game) => {
                const won = game.result === 'win';
                const opponent = game.opponent;
                const score = game.score;

                if (!opponent) return null;

                return (
                  <div
                    key={game.matchId}
                    className={`p-4 rounded-lg ${
                      won ? 'bg-green-900/20 border border-green-700' : 'bg-red-900/20 border border-red-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`text-2xl font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
                          {won ? 'WIN' : 'LOSS'}
                        </div>
                        <div className="text-white flex items-center gap-2">
                          <span>vs</span>
                          <Link
                            to={`/profile/${opponent.userId}`}
                            className="text-blue-400 hover:text-blue-300 font-semibold"
                          >
                            {opponent.nickname}
                          </Link>
                          {opponent.avatarUrl && (opponent.avatarUrl.startsWith('http') || opponent.avatarUrl.startsWith('/')) ? (
                            <img 
                              src={opponent.avatarUrl} 
                              alt={opponent.nickname} 
                              className="w-6 h-6 rounded-full object-cover" 
                              onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(opponent.nickname); }} 
                            />
                          ) : (
                            <span>{opponent.avatarUrl || '👤'}</span>
                          )}
                        </div>
                      </div>
 
                      <div className="flex items-center gap-6">
                        <div className="text-2xl font-bold text-white">
                          {score ? `${score.my} - ${score.opponent}` : 'N/A'}
                        </div>
                        <div className="text-gray-400 text-sm">
                          {game.finishAt ? new Date(game.finishAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {games.length > 0 && games.length >= 10 && (
            <div className="mt-6 text-center">
              <button className="text-blue-400 hover:text-blue-300">
                Load More
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
