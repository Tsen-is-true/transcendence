import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../api/client';
import { useLobbySocket, Room } from '../hooks/useLobbySocket';
import { TournamentEndOverlay } from '../components/Game/TournamentEndOverlay';

export function RoomView() {
  const { id } = useParams<{ id: string }>();
  const roomId = parseInt(id || '0', 10);
  const { user } = useAuth();
  const navigate = useNavigate();

  const {
    isConnected,
    lastRoomUpdated,
    startingMatchId,
    lastEndedMatchId,
    tournamentUpdate,
    tournamentEnd,
    isKicked,
    actions: { joinRoom, leaveRoom, toggleReady, kickMember, clearStartingMatch, clearLastEndedMatch, setIsKicked }
  } = useLobbySocket();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bracket, setBracket] = useState<any>(null);

  useEffect(() => {
    if (error) {
      alert(error);
      navigate('/lobby');
    }
  }, [error, navigate]);

  const fetchBracket = async (tournamentId: number) => {
    try {
      console.log('🔄 [fetchBracket] Fetching ID:', tournamentId);
      const res = await apiFetch(`/api/tournaments/${tournamentId}`);
      if (res.ok) {
        const result = await res.json();
        console.log('✅ [fetchBracket] Loaded:', result);
        setBracket(result.data || result);
      } else {
        const errText = await res.text().catch(() => '');
        console.error(`❌ [fetchBracket] HTTP Error ${res.status}:`, errText);
      }
    } catch (err) {
      console.error('❌ [fetchBracket] Exception:', err);
    }
  };

  const leaveTimerRef = useRef<any>(null);

  // 1. Fetch Room Info
  const fetchRoom = async () => {
    try {
      const res = await apiFetch(`/api/rooms/${roomId}`);
      if (res.ok) {
        const result = await res.json();
        const roomData = result.data || null;
        setRoom(roomData);
        // Auto-load bracket when returning to a tournament-in-progress room
        if (roomData?.isTournament && (roomData?.status === 'playing' || roomData?.status === 'finished') && roomData?.tournamentId) {
          fetchBracket(roomData.tournamentId);
        }
      } else {
        const errData = await res.json();
        setError(errData.message || 'Failed to load room');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. HTTP Join & Socket Join
  useEffect(() => {
    if (!roomId || !user) return;

    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }

    const init = async () => {
      try {
        const res = await apiFetch(`/api/rooms/${roomId}`);
        if (res.ok) {
          const result = await res.json();
          const roomData = result.data || null;
          setRoom(roomData);
          
          if (roomData?.isTournament && (roomData?.status === 'playing' || roomData?.status === 'finished') && roomData?.tournamentId) {
            fetchBracket(roomData.tournamentId);
          }
          
          const isMember = roomData?.members?.some((m: any) => m.userId === Number(user.id));
          if (!isMember) {
            const joinRes = await apiFetch(`/api/rooms/${roomId}/join`, { method: 'POST' });
            if (!joinRes.ok) {
              if (joinRes.status === 409) {
                // Already a member (race condition/StrictMode), it's fine
              } else {
                const errData = await joinRes.json();
                setError(errData.message || 'Failed to join room');
                setLoading(false);
                return;
              }
            }
            fetchRoom(); // Refresh after joining
          }
        } else {
          const errData = await res.json();
          setError(errData.message || 'Failed to load room');
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }

      joinRoom(roomId);
    };

    init();

    return () => {
      leaveTimerRef.current = setTimeout(() => {
        if (isMovingToGame.current) return;
        
        // Leave via HTTP
        apiFetch(`/api/rooms/${roomId}/leave`, { method: 'POST' }).catch(() => {});
        leaveRoom(roomId);
      }, 500); // 500ms delay to withstand Strict Mode unmounts
    };
  }, [roomId, user, joinRoom, leaveRoom]);
  
  // 3. Socket Channel Subscription when connected
  useEffect(() => {
    if (isConnected && roomId && user) {
      joinRoom(roomId);
    }
  }, [isConnected, roomId, user, joinRoom]);

  // Refresh room on socket events
  useEffect(() => {
    if (lastRoomUpdated > 0) {
      fetchRoom();
    }
  }, [lastRoomUpdated]);

  // Handle Game Start
  useEffect(() => {
    if (startingMatchId) {
      if (room?.isTournament) {
        if (bracket && user) {
          const match = bracket.matches?.find((m: any) => m.matchId === startingMatchId);
          if (match) {
            const myId = Number(user.id);
            const p1 = match.player1?.userId ?? match.player1?.userid;
            const p2 = match.player2?.userId ?? match.player2?.userid;
            
            if (p1 === myId || p2 === myId) {
              isMovingToGame.current = true;
              clearStartingMatch();
              navigate(`/game/${startingMatchId}`);
            } else if (p1 && p2) {
              clearStartingMatch();
            }
          }
        }
      } else {
        isMovingToGame.current = true;
        clearStartingMatch();
        navigate(`/game/${startingMatchId}`);
      }
    }
  }, [startingMatchId, room, bracket, user, navigate, clearStartingMatch]);

  // Handle Forfeit / Match End Forwarding
  useEffect(() => {
    console.log('🔄 Forfeit Redirect Check:', { lastEndedMatchId, hasBracket: !!bracket, user });
    if (lastEndedMatchId && bracket && user) {
      const match = bracket.matches.find((m: any) => m.matchId === lastEndedMatchId);
      console.log('🔎 Found match for redirect:', match);
      if (match) {
        const currentUserId = Number(user.id);
        const p1 = match.player1?.userId ?? match.player1?.userid;
        const p2 = match.player2?.userId ?? match.player2?.userid;
        console.log('👥 Match Players:', { p1, p2, currentUserId });
        
        if (p1 === currentUserId || p2 === currentUserId) {
          console.log('🚀 NAVIGATING TO MATCH RESULT:', lastEndedMatchId);
          isMovingToGame.current = true;
          navigate(`/game/${lastEndedMatchId}`);
          clearLastEndedMatch();
        }
      }
    }
  }, [lastEndedMatchId, bracket, user, navigate, clearLastEndedMatch]);

  // Auto-redirect Back-Navigators for finished/playing games into result canvases
  useEffect(() => {
    console.log('🔄 [Static Forward] Check triggered', { 
      hasRoom: !!room, 
      isTournament: room?.isTournament, 
      roomStatus: room?.status, 
      hasBracket: !!bracket,
      matchCount: bracket?.matches?.length
    });

    if (!room || !user) return;

    // 1. Regular 1vs1 logic
    if (!room.isTournament && (room.status === 'finished' || room.status === 'playing') && room.currentMatchId) {
      isMovingToGame.current = true;
      navigate(`/game/${room.currentMatchId}`);
      return;
    }

    // 2. Tournament Back-nav Forfeit Support
    if (room.isTournament && room.status === 'playing' && bracket?.matches) {
      const myId = Number(user.id);
      const myMatches = bracket.matches.filter((m: any) => {
        const p1 = m.player1?.userId ?? m.player1?.userid;
        const p2 = m.player2?.userId ?? m.player2?.userid;
        return p1 === myId || p2 === myId;
      });

      console.log('🔍 [Static Forward] My Matches found:', myMatches);

      const unSeenMatch = myMatches.find((m: any) => {
        const isFinished = m.status === 'finished' || m.status === 'walkover' || m.status === 'FINISHED' || m.status === 'WALKOVER';
        console.log(`🔎 [Static Forward] Match ${m.matchId} status check:`, { status: m.status, isFinished });
        
        if (!isFinished) return false;
        const hasSeen = localStorage.getItem(`seen_match_${m.matchId}_result`);
        console.log(`🔎 [Static Forward] Match ${m.matchId} hasSeen:`, hasSeen ? 'yes' : 'no');
        return !hasSeen;
      });

      if (unSeenMatch) {
         console.log('🚀 [Static Forward] FORWARDING TO:', unSeenMatch.matchId);
         isMovingToGame.current = true;
         navigate(`/game/${unSeenMatch.matchId}`);
      }
    }
  }, [room, bracket, user, navigate]);

  // Handle Tournament Bracket Updates
  useEffect(() => {
    if (tournamentUpdate && tournamentUpdate.tournamentId) {
      fetchBracket(tournamentUpdate.tournamentId);
    }
  }, [tournamentUpdate]);

  // Missed Socket Race Condition Fallback: Periodically poll bracket if inside an active match
  useEffect(() => {
    let interval: any = null;

    if (room?.isTournament && room.status === 'playing' && bracket?.matches) {
      const myId = Number(user?.id);
      const myMatches = bracket.matches.filter((m: any) => {
        const p1 = m.player1?.userId ?? m.player1?.userid;
        const p2 = m.player2?.userId ?? m.player2?.userid;
        return p1 === myId || p2 === myId;
      });

      const activeMatch = myMatches.find((m: any) => 
        m.status === 'playing' || m.status === 'PLAYING' || m.status === 'waiting' || m.status === 'WAITING'
      );

      // Poll as long as I'm in an active looking match in case socket end broadcasts were missed during mounts
      if (activeMatch) {
        interval = setInterval(() => {
          console.log('🔄 Missed Socket Race Check: Polling Bracket...');
          if (room.tournamentId) fetchBracket(room.tournamentId);
        }, 1500);
      }
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [room, bracket, user]);

  // Handle Kick Eviction
  useEffect(() => {
    if (isKicked) {
      alert('방장에 의해 강퇴되었습니다.');
      setIsKicked(false);
      navigate('/lobby');
    }
  }, [isKicked, navigate, setIsKicked]);

  // Initial Bracket Load on Mount if playing
  useEffect(() => {
    if (room && room.isTournament && room.status === 'playing') {
      // Since room node might not hold tournamentId directly, we rely on tournamentUpdate socket pushed triggers or fetch all active.
      // We will let the useEffect above handle it reactively.
    }
  }, [room]);

  const isMovingToGame = useRef(false);

  // Auto-rejoin if a match is waiting/playing for me and both players are present
  useEffect(() => {
    if (room && user && room.status === 'playing' && bracket?.matches) {
      const myId = Number(user.id);
      const myMatch = bracket.matches.find(
        (m: any) => {
          const p1id = m.player1?.userId ?? m.player1?.userid ?? null;
          const p2id = m.player2?.userId ?? m.player2?.userid ?? null;
          return (
            (p1id === myId || p2id === myId) &&
            p1id && p2id &&
            (m.status === 'WAITING' || m.status === 'waiting' || m.status === 'PLAYING' || m.status === 'playing')
          );
        }
      );
      if (myMatch && !startingMatchId) {
        isMovingToGame.current = true;
        navigate(`/game/${myMatch.matchId}`);
      }
    }
  }, [room, user, bracket, startingMatchId, navigate]);

  if (loading) {
    return <div className="text-white text-center mt-20">Loading...</div>;
  }

  if (!user) return null;



  if (!room) return null;

  const isHost = room.hostUserId === Number(user.id);
  const myMember = room.members?.find((m) => m.userId === Number(user.id));
  const isReady = myMember?.isReady || false;

  const handleToggleReady = () => {
    toggleReady(roomId, !isReady);
  };

  const handleLeave = () => {
    navigate('/lobby');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 p-4">
      <TournamentEndOverlay 
        tournamentEnd={tournamentEnd} 
        onClose={() => navigate('/lobby')} 
      />
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <button onClick={handleLeave} className="text-blue-400 hover:text-blue-300 font-semibold">
            ← Leave Room
          </button>
          <div className="text-gray-400 text-sm">
            Socket: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700">
          <div className="flex justify-between items-start mb-8 border-b border-gray-700 pb-6">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{room.title}</h1>
              <p className="text-gray-400">
                {room.isTournament ? '🏆 Tournament Mode (4 Players)' : '⚔️ 1vs1 Mode (2 Players)'}
              </p>
            </div>
            
            {room.status !== 'finished' && (
              <button
                onClick={handleToggleReady}
                className={`px-8 py-3 rounded-lg font-bold text-xl transition-all shadow-lg ${
                  isReady 
                    ? 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/50' 
                    : 'bg-gray-600 hover:bg-gray-500 text-white'
                }`}
              >
                {isReady ? 'READY!' : 'Click to Ready'}
              </button>
            )}
            {room.status === 'finished' && (
              <span className="px-6 py-2 bg-gray-700/50 text-gray-300 font-bold rounded-lg border border-gray-600">
                Match Concluded
              </span>
            )}
          </div>

          {room.status !== 'finished' && !(room.isTournament && room.status === 'playing') && (
            <>
              <h2 className="text-2xl font-bold text-white mb-6">Players</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {room.members?.map((member) => (
                  <div 
                    key={member.userId} 
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      member.isReady ? 'bg-green-900/20 border-green-500/50' : 'bg-gray-700 border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center overflow-hidden">
                        {member.user?.avatarUrl && (member.user.avatarUrl.startsWith('http') || member.user.avatarUrl.startsWith('/')) ? (
                          <img src={member.user.avatarUrl} alt={member.user.nickname} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-2xl">{member.user?.avatarUrl || '👤'}</span>
                        )}
                      </div>
                      <div>
                        <div className="text-white font-semibold flex items-center gap-2">
                          {member.user?.nickname || 'Unknown'}
                          {member.userId === room.hostUserId && <span className="text-yellow-500 text-sm">👑</span>}
                        </div>
                        <div className={`text-sm ${member.isReady ? 'text-green-400' : 'text-gray-400'}`}>
                          {member.isReady ? 'Ready' : 'Not Ready'}
                        </div>
                      </div>
                    </div>
                    
                    {isHost && member.userId !== Number(user.id) && (
                      <button 
                        onClick={() => kickMember(roomId, member.userId)}
                        className="text-red-400 hover:text-red-300 text-sm px-3 py-1 bg-red-900/30 rounded"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                ))}

                {/* Empty slots placeholders */}
                {Array.from({ length: Math.max(0, (room.isTournament ? 4 : 2) - (room.members?.length || 0)) }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center justify-center p-4 rounded-lg border border-dashed border-gray-600 bg-gray-800/50 text-gray-500">
                    Waiting for player...
                  </div>
                ))}
              </div>
            </>
          )}
          
          {/* Tournament Display if active */}
          {room.isTournament && bracket && (
            <div className="mt-8 p-8 bg-gray-900/50 border border-indigo-500/30 rounded-3xl backdrop-blur-md shadow-[0_0_40px_rgba(79,70,229,0.1)] flex flex-col items-center overflow-x-auto w-full">
              <h3 className="text-2xl font-bold text-gray-400 mb-8 font-mono tracking-[0.3em] uppercase">Tournament Tree</h3>
              
              <div className="relative w-full min-w-[640px] max-w-[640px] h-[480px] mx-auto mt-4">
                {/* SVG Animated Connecting Lines */}
                {(() => {
                  const m1 = bracket.matches?.find((m:any) => m.round === 1 && m.matchOrder === 1);
                  const m2 = bracket.matches?.find((m:any) => m.round === 1 && m.matchOrder === 2);
                  const finalMatch = bracket.matches?.find((m:any) => m.round === 2 && m.matchOrder === 1);
                  
                  const p1_1 = m1?.player1;
                  const p1_2 = m1?.player2;
                  const p2_1 = m2?.player1;
                  const p2_2 = m2?.player2;

                  const isP1_1Win = m1?.winnerId === (p1_1?.userId ?? p1_1?.userid);
                  const isP1_2Win = m1?.winnerId === (p1_2?.userId ?? p1_2?.userid);
                  const isP2_1Win = m2?.winnerId === (p2_1?.userId ?? p2_1?.userid);
                  const isP2_2Win = m2?.winnerId === (p2_2?.userId ?? p2_2?.userid);

                  const isF1Win = finalMatch?.winnerId === (finalMatch?.player1?.userId ?? finalMatch?.player1?.userid);
                  const isF2Win = finalMatch?.winnerId === (finalMatch?.player2?.userId ?? finalMatch?.player2?.userid);

                  return (
                    <>
                      <svg className="absolute inset-0 w-full h-[480px] pointer-events-none z-0" viewBox="0 0 640 480">
                        {/* Dimmed Paths (Background Centered) */}
                        <path d="M 73 392 L 73 310 L 146 310 L 146 222" fill="none" stroke="#1f2937" strokeWidth="2" />
                        <path d="M 219 392 L 219 310 L 146 310 L 146 222" fill="none" stroke="#1f2937" strokeWidth="2" />
                        <path d="M 421 392 L 421 310 L 494 310 L 494 222" fill="none" stroke="#1f2937" strokeWidth="2" />
                        <path d="M 567 392 L 567 310 L 494 310 L 494 222" fill="none" stroke="#1f2937" strokeWidth="2" />
                        <path d="M 146 222 L 146 130 L 320 130 L 320 62" fill="none" stroke="#1f2937" strokeWidth="2" />
                        <path d="M 494 222 L 494 130 L 320 130 L 320 62" fill="none" stroke="#1f2937" strokeWidth="2" />

                        {/* Animated Highlight Paths */}
                        {isP1_1Win && (
                          <path d="M 73 392 L 73 310 L 146 310 L 146 222" fill="none" stroke="#818cf8" strokeWidth="4" 
                            className="animate-[dash_1s_ease-in-out_forwards]" style={{strokeDasharray: 200, strokeDashoffset: 200}} />
                        )}
                        {isP1_2Win && (
                          <path d="M 219 392 L 219 310 L 146 310 L 146 222" fill="none" stroke="#818cf8" strokeWidth="4" 
                            className="animate-[dash_1s_ease-in-out_forwards]" style={{strokeDasharray: 200, strokeDashoffset: 200}} />
                        )}
                        {isP2_1Win && (
                          <path d="M 421 392 L 421 310 L 494 310 L 494 222" fill="none" stroke="#818cf8" strokeWidth="4" 
                            className="animate-[dash_1s_ease-in-out_forwards]" style={{strokeDasharray: 200, strokeDashoffset: 200}} />
                        )}
                        {isP2_2Win && (
                          <path d="M 567 392 L 567 310 L 494 310 L 494 222" fill="none" stroke="#818cf8" strokeWidth="4" 
                            className="animate-[dash_1s_ease-in-out_forwards]" style={{strokeDasharray: 200, strokeDashoffset: 200}} />
                        )}

                        {isF1Win && (
                          <path d="M 146 222 L 146 130 L 320 130 L 320 62" fill="none" stroke="#eab308" strokeWidth="4" 
                            className="animate-[dash_1s_ease-in-out_forwards_1s]" style={{strokeDasharray: 200, strokeDashoffset: 200}} />
                        )}
                        {isF2Win && (
                          <path d="M 494 222 L 494 130 L 320 130 L 320 62" fill="none" stroke="#eab308" strokeWidth="4" 
                            className="animate-[dash_1s_ease-in-out_forwards_1s]" style={{strokeDasharray: 200, strokeDashoffset: 200}} />
                        )}
                      </svg>
                      <style>{`
                        @keyframes dash { to { stroke-dashoffset: 0; } }
                        @keyframes moveCard {
                          from { offset-distance: 0%; transform: translate(-50%, -50%) scale(0.9); opacity: 0; }
                          10% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                          to { offset-distance: 100%; transform: translate(-50%, -50%) scale(1); opacity: 1; }
                        }
                        @keyframes fadeInNode {
                          from { opacity: 0; transform: scale(0.9); }
                          to { opacity: 1; transform: scale(1); }
                        }
                      `}</style>

                                        </>
                  );
                })()}

                {/* Round 1 (Semi-finals) - Stationary */}
                {(() => {
                  const m1 = bracket.matches?.find((m:any) => m.round === 1 && m.matchOrder === 1);
                  const m2 = bracket.matches?.find((m:any) => m.round === 1 && m.matchOrder === 2);
                  const isP1_1Win = m1?.winnerId && m1.winnerId === (m1.player1?.userId ?? m1.player1?.userid);
                  const isP1_2Win = m1?.winnerId && m1.winnerId === (m1.player2?.userId ?? m1.player2?.userid);
                  const isP2_1Win = m2?.winnerId && m2.winnerId === (m2.player1?.userId ?? m2.player1?.userid);
                  const isP2_2Win = m2?.winnerId && m2.winnerId === (m2.player2?.userId ?? m2.player2?.userid);

                  return (
                    <>
                      <div className={`absolute top-[370px] left-[8px] w-[130px] h-[44px] z-10 flex items-center justify-center bg-gray-900 border ${isP1_1Win ? 'border-indigo-400' : 'border-gray-800'} rounded-lg shadow-md`}>
                        <span className={`text-xs truncate px-2 ${isP1_1Win ? 'text-indigo-300 font-bold' : m1?.winnerId ? 'text-gray-600' : 'text-gray-300'}`}>{m1?.player1?.nickname || 'TBD'}</span>
                      </div>
                      <div className={`absolute top-[370px] left-[154px] w-[130px] h-[44px] z-10 flex items-center justify-center bg-gray-900 border ${isP1_2Win ? 'border-indigo-400' : 'border-gray-800'} rounded-lg shadow-md`}>
                        <span className={`text-xs truncate px-2 ${isP1_2Win ? 'text-indigo-300 font-bold' : m1?.winnerId ? 'text-gray-600' : 'text-gray-300'}`}>{m1?.player2?.nickname || 'TBD'}</span>
                      </div>
                      <div className={`absolute top-[370px] right-[154px] w-[130px] h-[44px] z-10 flex items-center justify-center bg-gray-900 border ${isP2_1Win ? 'border-indigo-400' : 'border-gray-800'} rounded-lg shadow-md`}>
                        <span className={`text-xs truncate px-2 ${isP2_1Win ? 'text-indigo-300 font-bold' : m2?.winnerId ? 'text-gray-600' : 'text-gray-300'}`}>{m2?.player1?.nickname || 'TBD'}</span>
                      </div>
                      <div className={`absolute top-[370px] right-[8px] w-[130px] h-[44px] z-10 flex items-center justify-center bg-gray-900 border ${isP2_2Win ? 'border-indigo-400' : 'border-gray-800'} rounded-lg shadow-md`}>
                        <span className={`text-xs truncate px-2 ${isP2_2Win ? 'text-indigo-300 font-bold' : m2?.winnerId ? 'text-gray-600' : 'text-gray-300'}`}>{m2?.player2?.nickname || 'TBD'}</span>
                      </div>
                    </>
                  );
                })()}

                {/* Round 2 (Finals) - Stationary Fades In */}
                {(() => {
                  const m1 = bracket.matches?.find((m:any) => m.round === 1 && m.matchOrder === 1);
                  const m2 = bracket.matches?.find((m:any) => m.round === 1 && m.matchOrder === 2);
                  const finalMatch = bracket.matches?.find((m:any) => m.round === 2 && m.matchOrder === 1);
                  const isF1Win = finalMatch?.winnerId && finalMatch.winnerId === (finalMatch.player1?.userId ?? finalMatch.player1?.userid);
                  const isF2Win = finalMatch?.winnerId && finalMatch.winnerId === (finalMatch.player2?.userId ?? finalMatch.player2?.userid);
                  const isPlaying = finalMatch?.status === 'playing' || finalMatch?.status === 'starting';

                  const hasAnim1 = m1?.winnerId && finalMatch?.player1;
                  const hasAnim2 = m2?.winnerId && finalMatch?.player2;

                  return (
                    <>
                      <div className={`absolute top-[200px] left-[81px] w-[130px] h-[44px] z-10 flex items-center justify-center bg-gray-900 border ${isF1Win ? 'border-yellow-400' : isPlaying ? 'border-indigo-400 animate-pulse' : 'border-gray-800'} rounded-lg shadow-lg opacity-100`}>
                        <span className={`text-xs truncate px-2 ${isF1Win ? 'text-yellow-300 font-bold' : finalMatch?.winnerId ? 'text-gray-600' : 'text-indigo-200'}`}>{finalMatch?.player1?.nickname || 'TBD'}</span>
                      </div>
                      <div className={`absolute top-[200px] right-[81px] w-[130px] h-[44px] z-10 flex items-center justify-center bg-gray-900 border ${isF2Win ? 'border-yellow-400' : isPlaying ? 'border-indigo-400 animate-pulse' : 'border-gray-800'} rounded-lg shadow-lg opacity-100`}>
                        <span className={`text-xs truncate px-2 ${isF2Win ? 'text-yellow-300 font-bold' : finalMatch?.winnerId ? 'text-gray-600' : 'text-indigo-200'}`}>{finalMatch?.player2?.nickname || 'TBD'}</span>
                      </div>
                    </>
                  );
                })()}

                {/* Champion - Stationary Fades In */}
                {(() => {
                  const m = bracket.matches?.find((m:any) => m.round === 2 && m.matchOrder === 1);
                  const isP1Win = m?.winnerId && m.winnerId === (m.player1?.userId ?? m.player1?.userid);
                  const isP2Win = m?.winnerId && m.winnerId === (m.player2?.userId ?? m.player2?.userid);
                  
                  const hasAnim = m?.winnerId;

                  let championName = 'CHAMPION';
                  if (isP1Win) championName = m?.player1?.nickname;
                  if (isP2Win) championName = m?.player2?.nickname;

                  return (
                    <div className={`absolute top-[40px] left-1/2 -translate-x-1/2 w-[140px] h-[44px] z-10 flex items-center justify-center bg-gradient-to-b from-gray-900 to-black border-2 border-yellow-500 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.3)] backdrop-blur-md opacity-100`}>
                      <span className={`text-sm font-black italic tracking-widest text-center truncate px-2 ${m?.winnerId ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'text-gray-500 opacity-60'}`}>
                        {m?.winnerId && '👑 '}{championName}
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {bracket && bracket.isFinish && (
            <div className="mt-8 p-6 bg-yellow-900/40 border border-yellow-500/50 rounded-xl text-center shadow-2xl backdrop-blur-sm">
              <h3 className="text-3xl font-bold text-yellow-400 mb-2 animate-pulse">🏆 Tournament Winner!</h3>
              <p className="text-4xl font-extrabold text-white mb-4 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">
                 {bracket.winner?.nickname || 'Unknown Winner'}
              </p>
              <p className="text-gray-400 text-sm">Congratulations to all players and participants!</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
