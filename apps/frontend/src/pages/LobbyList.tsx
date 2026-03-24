import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../api/client';
import { useLobbySocket, Room } from '../hooks/useLobbySocket';

export function LobbyList() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { lastRoomUpdated } = useLobbySocket();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [isTournament, setIsTournament] = useState(false);
  const [creating, setCreating] = useState(false);

  const fetchRooms = async () => {
    try {
      setError('');
      const res = await apiFetch('/api/rooms?status=all');
      const result = await res.json();
      if (res.ok) {
        // Backend double wraps: { statusCode: 200, message: "success", data: { data: [...] } }
        const data = result.data;
        setRooms(data?.data || []);
      } else {
        throw new Error('Failed to fetch rooms');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, [lastRoomUpdated]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomTitle.trim()) return;

    try {
      setCreating(true);
      const res = await apiFetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newRoomTitle.trim(),
          isTournament,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const newRoom = result.data || {};
        const rId = newRoom.roomId || newRoom.id;
        navigate(`/rooms/${rId}`);
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to create room');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
      setShowCreateModal(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <p>Loading lobby...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <Link to="/" className="text-blue-400 hover:text-blue-300">
            ← Back to Home
          </Link>
          <div className="flex gap-4">
            <button
              onClick={() => {
                setIsTournament(false);
                setShowCreateModal(true);
              }}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
            >
              Create Game Room
            </button>
            <button
              onClick={() => {
                setIsTournament(true);
                setShowCreateModal(true);
              }}
              className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors"
            >
              Create Tournament
            </button>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">🎮 Game Lobby</h1>
          <p className="text-gray-400">Join a room to start playing</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Room List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full text-center py-12 text-gray-400">Loading rooms...</div>
          ) : rooms.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-gray-800 rounded-lg text-gray-400">
              No active rooms. Create one to get started!
            </div>
          ) : (
            rooms.map((room) => (
              <div key={room.roomId} className="bg-gray-800 rounded-lg shadow-xl p-6 border border-gray-700 hover:border-blue-500 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-white truncate pr-2">
                    {room.title}
                  </h3>
                  {room.isTournament ? (
                    <span className="px-2 py-1 text-xs bg-purple-600 text-white rounded shadow">Tournament</span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-blue-600 text-white rounded shadow">1vs1</span>
                  )}
                </div>
                
                <div className="text-gray-400 text-sm mb-6">
                  Status:{' '}
                  <span className={`font-semibold capitalize ${
                    room.status === 'finished' ? 'text-gray-500' :
                    room.status === 'playing' ? 'text-green-500' : 'text-cyan-400'
                  }`}>
                    {room.status}
                  </span>
                  <br />
                  Players: {room.countPlayers || 0} / {room.isTournament ? 4 : 2}
                </div>

                <Link
                  to={`/rooms/${room.roomId}`}
                  className="block w-full text-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                >
                  Join Room
                </Link>
              </div>
            ))
          )}
        </div>

        {/* Create Room Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-4">
                Create {isTournament ? 'Tournament' : 'Game Room'}
              </h2>
              <form onSubmit={handleCreateRoom}>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Room Title
                  </label>
                  <input
                    type="text"
                    value={newRoomTitle}
                    onChange={(e) => setNewRoomTitle(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                    placeholder="Enter room title..."
                    autoFocus
                    required
                    maxLength={100}
                  />
                </div>
                <div className="flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !newRoomTitle.trim()}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                  >
                    {creating ? 'Creating...' : 'Create Room'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
