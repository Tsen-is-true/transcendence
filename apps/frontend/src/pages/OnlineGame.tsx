import { useEffect, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameSocket, GameResultPayload } from '../hooks/useGameSocket';
import { OnlineGameCanvas } from '../components/Game/OnlineGameCanvas';
import { useAuth } from '../contexts/AuthContext';
import { useLobbySocket } from '../hooks/useLobbySocket';
import { apiFetch } from '../api/client';

// Result screen shown after each match ends
function TournamentResultScreen({
  isWinner,
  result,
  isTournamentMatch,
  navigate,
  startingMatchId,
  tournamentEnd,
  currentMatchId,
}: {
  isWinner: boolean;
  result: GameResultPayload;
  isTournamentMatch: boolean;
  navigate: (path: string) => void;
  startingMatchId: number | null;
  tournamentEnd: any;
  currentMatchId: string | undefined;
}) {
  const [bracket, setBracket] = useState<any>(null);

  useEffect(() => {
    if (isTournamentMatch && result?.roomId) {
      apiFetch(`/api/rooms/${result.roomId}`)
        .then(res => res.json())
        .then(data => {
            const room = data.data || data;
            if (room?.tournamentId) {
                return apiFetch(`/api/tournaments/${room.tournamentId}`);
            }
            throw new Error('No tournament ID');
        })
        .then(res => res.json())
        .then(data => setBracket(data.data || data))
        .catch(console.error);
    }
  }, [isTournamentMatch, result]);

  // If the tournament completely finished, show ranking instead of match outcome
  if (tournamentEnd) {
    const ranks = tournamentEnd.rankings || {};
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center bg-gray-800/90 p-10 rounded-3xl shadow-[0_0_50px_rgba(234,179,8,0.2)] border border-yellow-500/20 backdrop-blur-md max-w-md w-full xerath-card">
          <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-amber-200 to-yellow-500 mb-8 animate-pulse">
            🏆 Tournament Over!
          </h2>
          
          <div className="space-y-3 mb-8 text-left">
            <div className="p-3 bg-yellow-900/30 border border-yellow-500/20 rounded-xl flex items-center justify-between">
              <span className="text-yellow-300 font-bold">🥇 1st Place</span>
              <span className="text-white font-semibold">{ranks.first?.username || '-'}</span>
            </div>
            <div className="p-3 bg-gray-700/30 border border-gray-500/20 rounded-xl flex items-center justify-between">
              <span className="text-gray-300 font-bold">🥈 2nd Place</span>
              <span className="text-white font-semibold">{ranks.second?.username || '-'}</span>
            </div>
            <div className="p-3 bg-amber-900/30 border border-amber-500/20 rounded-xl flex items-center justify-between">
              <span className="text-amber-200 font-bold">🥉 3rd Place</span>
              <span className="text-white font-semibold">{ranks.third?.username || '-'}</span>
            </div>
            <div className="p-3 bg-gray-800/40 border border-gray-700/30 rounded-xl flex items-center justify-between">
              <span className="text-gray-400 font-bold">🏅 4th Place</span>
              <span className="text-gray-200 font-semibold">{ranks.fourth?.username || '-'}</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={async () => {
                const rId = result?.roomId;
                if (rId) {
                  await apiFetch(`/api/rooms/${rId}/leave`, { method: 'POST' }).catch(() => {});
                }
                navigate('/lobby');
              }}
              className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl transition-all border border-gray-600"
            >
              로비로 나가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${
        isWinner ? 'from-gray-900 via-green-900' : 'from-gray-900 via-red-900'
      } to-gray-900 flex items-center justify-center p-4 pt-12`}>
      <div className="text-center w-full max-w-4xl flex flex-col items-center">
        <h2 className="text-5xl sm:text-6xl font-bold text-white mb-6 drop-shadow-lg">
          {isWinner ? '🎉 Victory!' : '😔 Defeat'}
        </h2>

        <div className="mb-4 inline-block px-12 py-3 bg-gray-900/80 rounded-2xl border border-gray-700/50 shadow-2xl backdrop-blur-md">
          <p className="text-sm text-gray-400 mb-1 font-semibold uppercase tracking-wider">Final Score</p>
          <div className="flex items-center justify-center gap-8">
            <p className="text-4xl font-bold text-white">{result.finalScore?.player1Score || 0}</p>
            <div className="text-gray-500 text-2xl font-light">-</div>
            <p className="text-4xl font-bold text-white">{result.finalScore?.player2Score || 0}</p>
          </div>
        </div>

        {isTournamentMatch ? (
          <div className="w-full mt-6">
            {startingMatchId && currentMatchId && startingMatchId !== parseInt(currentMatchId, 10) && (
              <p className="text-green-400 text-lg mb-2 font-bold animate-pulse">새로운 매치 준비 완료! 이동합니다...</p>
            )}
            
            {bracket ? (
              <div className="bg-transparent mt-8 p-4 w-full flex flex-col items-center">
                <h3 className="text-2xl font-bold text-gray-400 mb-8 font-mono tracking-[0.3em] uppercase">Tournament Tree</h3>
                
                <div className="relative w-full max-w-[640px] h-[480px] mx-auto mt-4">
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

                    // If Semi winners exist, this card should fade in AFTER float animation (1s fade in)
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
                    
                    const hasAnim = m?.winnerId; // float anim to Champ card

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
            ) : (
              <div className="text-gray-400 mt-8 mb-4 animate-pulse">Loading tournament bracket...</div>
            )}
          </div>
        ) : (
          null
        )}
      </div>
    </div>
  );
}

export function OnlineGame() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const {
    isConnected,
    error,
    status,
    gameState,
    countdown,
    result,
    playerNumber,
    actions: { movePaddle, surrenderGame }
  } = useGameSocket(matchId ? parseInt(matchId, 10) : null);

  const {
    isConnected: isLobbyConnected,
    startingMatchId,
    tournamentEnd,
    actions: { joinRoom: lobbyJoinRoom }
  } = useLobbySocket();

  const handleSurrenderClick = () => {
    if (confirm('정말로 항복하시겠습니까?')) {
      surrenderGame();
    }
  };

  // Connect implicitly to Lobby socket if tournament
  useEffect(() => {
    const rId = result?.roomId;
    if (isLobbyConnected && rId) {
      console.log(`📡 OnlineGame: implicitly rejoining room ${rId} for socket updates`);
      
      // Hit HTTP join to ensure we are in RoomMember table so LobbyGateway lets socket join the room namespace
      apiFetch(`/api/rooms/${rId}/join`, { method: 'POST' })
        .catch(err => console.error('Failed HTTP join in OnlineGame re-entry:', err))
        .finally(() => {
          lobbyJoinRoom(rId);
        });
    }
  }, [isLobbyConnected, result?.roomId, lobbyJoinRoom]);

  // Handle automatic tournament match jump forward
  useEffect(() => {
    if (startingMatchId && startingMatchId !== parseInt(matchId!, 10)) {
      console.log(`⏭️ Advancing tournament match -> ${startingMatchId}`);
      navigate(`/game/${startingMatchId}`);
    }
  }, [startingMatchId, matchId, result, navigate]);

  // Key event listeners
  useEffect(() => {
    if (status !== 'playing') return;

    const keysPressed = new Set<string>();
    const gameKeys = new Set(['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S']);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameKeys.has(e.key)) e.preventDefault();
      if (keysPressed.has(e.key)) return;
      keysPressed.add(e.key);

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        movePaddle('up');
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        movePaddle('down');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (gameKeys.has(e.key)) e.preventDefault();
      keysPressed.delete(e.key);

      // Only stop if the other key isn't still pressed
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (!keysPressed.has('ArrowDown') && !keysPressed.has('s') && !keysPressed.has('S')) {
          movePaddle('stop');
        } else {
          movePaddle('down');
        }
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        if (!keysPressed.has('ArrowUp') && !keysPressed.has('w') && !keysPressed.has('W')) {
          movePaddle('stop');
        } else {
          movePaddle('up');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [status, movePaddle]);

  // Touch controls
  const handleTouchStartUp = useCallback(() => movePaddle('up'), [movePaddle]);
  const handleTouchEndUp = useCallback(() => movePaddle('stop'), [movePaddle]);
  const handleTouchStartDown = useCallback(() => movePaddle('down'), [movePaddle]);
  const handleTouchEndDown = useCallback(() => movePaddle('stop'), [movePaddle]);

  if (!user) return null;

  if (error || status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-3xl font-bold text-white mb-4">Connection Error</h2>
          <p className="text-lg text-gray-300 mb-8">{error || 'Failed to connect to game'}</p>
          <button
            onClick={() => navigate('/lobby')}
            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-4">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mb-4"></div>
        <p className="text-white text-xl font-semibold">Connecting to Match...</p>
      </div>
    );
  }

  if (status === 'countdown') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex flex-col items-center justify-center p-4">
        <h2 className="text-4xl text-white font-bold mb-8">Game is starting!</h2>
        <div className="text-9xl font-extrabold text-blue-400 animate-pulse">
          {countdown}
        </div>
      </div>
    );
  }

  if (status === 'ended' && result) {
    const isWinner = result && user ? Number(result.winnerId) === Number(user.id) : false;
    const isTournamentMatch = !!result.isTournament;

    return (
      <TournamentResultScreen
        isWinner={isWinner}
        result={result}
        isTournamentMatch={isTournamentMatch}
        navigate={navigate}
        startingMatchId={startingMatchId}
        tournamentEnd={tournamentEnd}
        currentMatchId={matchId}
      />
    );
  }

  if (status === 'paused') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-yellow-900 to-gray-900 flex flex-col items-center justify-center p-4">
        <h2 className="text-4xl text-white font-bold mb-4">Game Paused</h2>
        <p className="text-xl text-yellow-200">Waiting for opponent to reconnect...</p>
      </div>
    );
  }

  // Playing status
  if (gameState) {
    // Determine which player the user is to highlight their score
    // GameState doesn't contain user IDs, but we can assume the user is one of them.
    // It's just visual, so we will just display scores.
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex flex-col items-center justify-center p-4">
        <div className="mb-6 w-full max-w-4xl flex justify-between items-center px-8 py-4 bg-gray-800/30 rounded-xl backdrop-blur-md shadow-2xl border border-cyan-500/30 xerath-card">
          <div className="text-center">
            <p className="text-sm text-cyan-400 font-semibold uppercase tracking-wider mb-1">Player 1</p>
            <p className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(0,242,255,0.5)]">
              {gameState.paddle1.score}
            </p>
          </div>
          
          <div className="flex flex-col items-center">
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-2 font-semibold">Match {matchId}</div>
            <div className="px-4 py-1 bg-gray-900/80 rounded-full text-sm text-cyan-300 border border-cyan-500/20 shadow-[0_0_10px_rgba(0,242,255,0.1)]">
              First to {gameState.winningScore || 5}
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-yellow-400 font-semibold uppercase tracking-wider mb-1">Player 2</p>
            <p className="text-4xl font-bold text-white drop-shadow-[0_0_10px_rgba(255,170,0,0.5)]">
              {gameState.paddle2.score}
            </p>
          </div>
        </div>

        <div className="shadow-2xl shadow-cyan-900/30 rounded-xl overflow-hidden border border-cyan-500/30 backdrop-blur-sm">
          <OnlineGameCanvas gameState={gameState} playerNumber={playerNumber || 1} />
        </div>

        <div className="mt-8 flex gap-4 sm:hidden">
          <button
            onTouchStart={handleTouchStartUp}
            onTouchEnd={handleTouchEndUp}
            className="w-24 h-24 bg-blue-600/80 active:bg-blue-500 text-white font-bold rounded-full text-2xl shadow-lg border-2 border-blue-400/50 backdrop-blur"
          >
            ↑
          </button>
          <button
            onTouchStart={handleTouchStartDown}
            onTouchEnd={handleTouchEndDown}
            className="w-24 h-24 bg-red-600/80 active:bg-red-500 text-white font-bold rounded-full text-2xl shadow-lg border-2 border-red-400/50 backdrop-blur"
          >
            ↓
          </button>
        </div>

        <div className="mt-8 flex flex-col items-center gap-4">
          <p className="text-gray-500 text-sm hidden sm:block tracking-widest font-mono">
            [ W / S ] OR [ UP / DOWN ] TO MOVE
          </p>
          <button
            onClick={handleSurrenderClick}
            className="px-6 py-2 bg-red-900/40 hover:bg-red-800/80 border border-red-500/50 text-red-200 text-sm tracking-widest uppercase rounded-lg transition-all shadow-[0_0_10px_rgba(255,0,0,0.2)] hover:shadow-[0_0_15px_rgba(255,0,0,0.5)]"
          >
            Surrender (항복)
          </button>
        </div>
      </div>
    );
  }

  return null;
}
