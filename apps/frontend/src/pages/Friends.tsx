import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../api/client';

interface Friend {
  id: string;
  username: string;
  avatar: string;
  friendshipId: string;
  status: string;
}

interface FriendRequest {
  id: string;
  username: string;
  avatar: string;
  friendshipId: string;
  status: string;
  type: 'sent' | 'received';
}

interface SearchUser {
  id: string;
  username: string;
  avatar: string;
  friendshipStatus: string;
  requestType: 'sent' | 'received' | null;
  friendshipId?: string;
}

export function Friends() {
  const { user } = useAuth();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<FriendRequest[]>([]);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!user) return null;

  // Fetch friends list
  const fetchFriends = async () => {
    try {
      setLoading(true);
      setError('');

      const friendsRes = await apiFetch('/api/friends?status=accepted');
      if (!friendsRes.ok) {
        throw new Error('Failed to fetch friends');
      }
      const friendsResult = await friendsRes.json();
      const friendsData = friendsResult.data || [];

      const pendingRes = await apiFetch('/api/friends?status=pending');
      if (!pendingRes.ok) {
        throw new Error('Failed to fetch requests');
      }
      const pendingResult = await pendingRes.json();
      const pendingData = pendingResult.data || [];

      const mappedFriends = friendsData.map((f: any) => ({
        id: String(f.user?.userid),
        username: f.user?.nickname,
        avatar: f.user?.avatarUrl || '👤',
        friendshipId: String(f.friendshipId),
        status: f.status
      }));

      const sent: FriendRequest[] = [];
      const received: FriendRequest[] = [];

      pendingData.forEach((p: any) => {
        if (!p.user) return;
        const item: FriendRequest = {
          id: String(p.user.userid),
          username: p.user.nickname,
          avatar: p.user.avatarUrl || '👤',
          friendshipId: String(p.friendshipId),
          status: p.status,
          type: p.requesterId === Number(user.id) ? 'sent' : 'received'
        };

        if (item.type === 'sent') sent.push(item);
        else received.push(item);
      });

      setFriends(mappedFriends);
      setSentRequests(sent);
      setReceivedRequests(received);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch friends');
    } finally {
      setLoading(false);
    }
  };

  // Search for users
  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      setError('Search query must be at least 2 characters');
      return;
    }

    try {
      setSearching(true);
      setError('');

      const response = await apiFetch(`/api/users?search=${encodeURIComponent(searchQuery)}`);

      if (!response.ok) {
        throw new Error('Failed to search users');
      }

      const result = await response.json();
      const data = result.data || {};
      
      const mappedUsers = (data.users || []).map((u: any) => {
        const uid = String(u.userid);
        let status = 'none';
        let type: 'sent' | 'received' | null = null;
        let fId: string | undefined = undefined;

        // Check if already friends
        const isFriend = friends.find(f => String(f.id) === uid);
        if (isFriend) {
          status = 'accepted';
          fId = isFriend.friendshipId;
        } else {
          // Check sent requests
          const sent = sentRequests.find(r => String(r.id) === uid);
          if (sent) {
            status = 'pending';
            type = 'sent';
            fId = sent.friendshipId;
          } else {
            // Check received requests
            const rec = receivedRequests.find(r => String(r.id) === uid);
            if (rec) {
              status = 'pending';
              type = 'received';
              fId = rec.friendshipId;
            }
          }
        }

        return {
          id: uid,
          username: u.nickname,
          avatar: u.avatarUrl || '👤',
          friendshipStatus: status,
          requestType: type,
          friendshipId: fId
        };
      });

      setSearchResults(mappedUsers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  // Send friend request
  const sendFriendRequest = async (userId: string) => {
    try {
      setError('');

      const response = await apiFetch(`/api/friends/${userId}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send friend request');
      }

      setSuccess('Friend request sent!');
      setTimeout(() => setSuccess(''), 3000);

      // Refresh friends list and search results
      await fetchFriends();
      if (searchQuery) {
        await handleSearch();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send friend request');
    }
  };

  // Accept friend request
  const acceptFriend = async (friendshipId: string) => {
    try {
      setError('');

      const response = await apiFetch(`/api/friends/${friendshipId}/accept`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept friend request');
      }

      setSuccess('Friend request accepted!');
      setTimeout(() => setSuccess(''), 3000);

      // Refresh friends list
      await fetchFriends();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept friend request');
    }
  };

  // Remove friend or cancel request
  const removeFriend = async (friendshipId: string, action: string) => {
    try {
      setError('');

      const response = await apiFetch(`/api/friends/${friendshipId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action}`);
      }

      setSuccess(`${action} successful!`);
      setTimeout(() => setSuccess(''), 3000);

      // Refresh friends list and search results
      await fetchFriends();
      if (searchQuery) {
        await handleSearch();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${action}`);
    }
  };

  // Load friends on mount
  useEffect(() => {
    fetchFriends();
  }, []);

  // Handle search on Enter key
  const handleSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading friends...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link to="/profile" className="text-blue-400 hover:text-blue-300">
            ← Back to Profile
          </Link>
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-white mb-8">Friends</h1>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-400">
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Friends List & Requests */}
          <div className="space-y-6">
            {/* Friend Requests Received */}
            {receivedRequests.length > 0 && (
              <div className="bg-gray-800 rounded-lg shadow-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Friend Requests ({receivedRequests.length})
                </h2>
                <div className="space-y-3">
                  {receivedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                    >
                      <Link
                        to={`/profile/${request.id}`}
                        className="flex items-center gap-3 hover:text-blue-400 transition-colors"
                      >
                        {request.avatar && (request.avatar.startsWith('http') || request.avatar.startsWith('/')) ? (
                          <img src={request.avatar} alt={request.username} className="w-8 h-8 rounded-full object-cover" onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(request.username); }} />
                        ) : (
                          <span className="text-3xl">{request.avatar || '👤'}</span>
                        )}
                        <span className="text-white font-semibold">{request.username}</span>
                      </Link>
                      <div className="flex gap-2">
                        <button
                          onClick={() => acceptFriend(request.friendshipId)}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => removeFriend(request.friendshipId, 'Reject request')}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Friends List */}
            <div className="bg-gray-800 rounded-lg shadow-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-4">
                My Friends ({friends.length})
              </h2>
              {friends.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  No friends yet. Search for users to add them!
                </p>
              ) : (
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <Link
                        to={`/profile/${friend.id}`}
                        className="flex items-center gap-3 hover:text-blue-400 transition-colors"
                      >
                        {friend.avatar && (friend.avatar.startsWith('http') || friend.avatar.startsWith('/')) ? (
                          <img src={friend.avatar} alt={friend.username} className="w-8 h-8 rounded-full object-cover" onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(friend.username); }} />
                        ) : (
                          <span className="text-3xl">{friend.avatar || '👤'}</span>
                        )}
                        <span className="text-white font-semibold">{friend.username}</span>
                      </Link>
                      <button
                        onClick={() => removeFriend(friend.friendshipId, 'Remove friend')}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Pending Sent Requests */}
            {sentRequests.length > 0 && (
              <div className="bg-gray-800 rounded-lg shadow-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Pending Requests ({sentRequests.length})
                </h2>
                <div className="space-y-3">
                  {sentRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                    >
                      <Link
                        to={`/profile/${request.id}`}
                        className="flex items-center gap-3 hover:text-blue-400 transition-colors"
                      >
                        {request.avatar && (request.avatar.startsWith('http') || request.avatar.startsWith('/')) ? (
                          <img src={request.avatar} alt={request.username} className="w-8 h-8 rounded-full object-cover" onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(request.username); }} />
                        ) : (
                          <span className="text-3xl">{request.avatar || '👤'}</span>
                        )}
                        <div>
                          <div className="text-white font-semibold">{request.username}</div>
                          <div className="text-gray-400 text-sm">Request sent</div>
                        </div>
                      </Link>
                      <button
                        onClick={() => removeFriend(request.friendshipId, 'Cancel request')}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Search */}
          <div>
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 sticky top-4">
              <h2 className="text-2xl font-bold text-white mb-4">Add Friends</h2>

              {/* Search Input */}
              <div className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    placeholder="Search by username..."
                    className="flex-1 px-4 py-3 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Search Results ({searchResults.length})
                  </h3>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="flex items-center justify-between p-4 bg-gray-700 rounded-lg"
                      >
                        <Link
                          to={`/profile/${result.id}`}
                          className="flex items-center gap-3 hover:text-blue-400 transition-colors"
                        >
                          {result.avatar && (result.avatar.startsWith('http') || result.avatar.startsWith('/')) ? (
                            <img src={result.avatar} alt={result.username} className="w-8 h-8 rounded-full object-cover" onError={(e) => { e.currentTarget.src = 'https://ui-avatars.com/api/?name=' + encodeURIComponent(result.username); }} />
                          ) : (
                            <span className="text-3xl">{result.avatar || '👤'}</span>
                          )}
                          <span className="text-white font-semibold">{result.username}</span>
                        </Link>

                        {/* Action button based on friendship status */}
                        {result.friendshipStatus === 'none' && (
                          <button
                            onClick={() => sendFriendRequest(result.id)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                          >
                            Add Friend
                          </button>
                        )}
                        {result.friendshipStatus === 'accepted' && (
                          <span className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">
                            Friends
                          </span>
                        )}
                        {result.friendshipStatus === 'pending' && result.requestType === 'sent' && (
                          <span className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm">
                            Pending
                          </span>
                        )}
                        {result.friendshipStatus === 'pending' && result.requestType === 'received' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => acceptFriend(result.friendshipId!)}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => removeFriend(result.friendshipId!, 'Reject')}
                              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !searching && (
                <p className="text-gray-400 text-center py-4">
                  No users found matching "{searchQuery}"
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
