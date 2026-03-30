import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/AuthContext';

const getSocketUrl = () =>
  (import.meta as any).env?.VITE_SOCKET_URL ||
  (typeof window !== 'undefined'
    ? window.location.origin
    : 'http://localhost:3000');

export interface RoomMember {
  id: number;
  userId: number;
  roomId: number;
  isReady: boolean;
  user: {
    nickname: string;
    avatarUrl: string;
  };
}

export interface Room {
  roomId: number;
  title: string;
  isTournament: boolean;
  status: string;
  hostUserId: number;
  members: RoomMember[];
  countPlayers: number;
  maxPlayers: number;
  currentMatchId?: number | null;
  tournamentId?: number | null;
}

export interface TournamentRankings {
  first: { id: string; username: string; avatar: string } | null;
  second: { id: string; username: string; avatar: string } | null;
  third: { id: string; username: string; avatar: string } | null;
  fourth: { id: string; username: string; avatar: string } | null;
}

export function useLobbySocket() {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 방 전체 목록 업데이트용 (옵션)
  const [lastRoomUpdated, setLastRoomUpdated] = useState<number>(0);
  
  // 특정 방 상태
  const [currentRoomId, setCurrentRoomId] = useState<number | null>(null);
  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  
  // 게임 시작 시넘어오는 matchId
  const [startingMatchId, setStartingMatchId] = useState<number | null>(null);

  // 토너먼트 상태
  const [tournamentUpdate, setTournamentUpdate] = useState<any>(null);
  const [tournamentEnd, setTournamentEnd] = useState<any>(null);
  const [lastEndedMatchId, setLastEndedMatchId] = useState<number | null>(null);

  const [isKicked, setIsKicked] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('accessToken');
    if (!token) return;

    console.log('🔌 Connecting to /lobby namespace...');
    const newSocket = io(`${getSocketUrl()}/lobby`, {
      auth: { token },
      query: { token },
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to lobby socket');
      setIsConnected(true);
      setError(null);
    });

    newSocket.on('disconnect', () => {
      console.log('🔴 Disconnected from lobby socket');
      setIsConnected(false);
    });

    newSocket.on('error', (err: any) => {
      console.error('Socket error:', err);
      setError(err.message || '소켓 연결 오류');
    });

    // Global Events
    newSocket.on('room:created', () => setLastRoomUpdated(Date.now()));
    newSocket.on('room:updated', () => setLastRoomUpdated(Date.now()));
    newSocket.on('room:deleted', () => setLastRoomUpdated(Date.now()));

    // Room specific events
    newSocket.on('room:member:joined', (data: { roomId: number; user: any }) => {
      console.log('room:member:joined', data);
      setLastRoomUpdated(Date.now()); // to refresh lobby list if needed
    });

    newSocket.on('room:member:left', (data: { roomId: number; userId: number }) => {
      console.log('room:member:left', data);
      setLastRoomUpdated(Date.now());
    });

    newSocket.on('room:kicked', (data: { roomId: number; userId: number }) => {
      console.log('room:kicked', data);
      if (user && data.userId === Number(user.id)) {
        setIsKicked(true);
      }
      setLastRoomUpdated(Date.now());
    });

    newSocket.on('room:member:ready', (data: { roomId: number; userId: number; isReady: boolean }) => {
      console.log('room:member:ready', data);
      setLastRoomUpdated(Date.now());
    });

    newSocket.on('room:game:starting', (data: { roomId: number; matchId: number; player1Id?: number; player2Id?: number }) => {
      console.log('🚀 Game starting!', data);
      
      // 토너먼트 등 다중 매치 동발 시 자신의 매치에만 안착하도록 방어막 설정
      if (data.player1Id && data.player2Id && user) {
        const currentUserId = Number(user.id);
        const p1 = Number(data.player1Id);
        const p2 = Number(data.player2Id);
        if (p1 !== currentUserId && p2 !== currentUserId) {
          console.log('👀 Not my match, ignoring general game starting trigger.');
          return;
        }
      }
      
      setStartingMatchId((prev) => prev || data.matchId);
    });

    // Tournament Events
    newSocket.on('tournament:update', (data) => {
      console.log('🏆 tournament:update', data);
      setTournamentUpdate(data);
    });

    newSocket.on('tournament:match:start', (data: { matchId: number; player1Id: number; player2Id: number }) => {
      console.log('🏆 tournament:match:start', data);
      
      // 주석: 자신이 속한 토너먼트 매치에만 자동으로 입장하도록 방어막 설정
      if (data.matchId && user) {
        const currentUserId = Number(user.id);
        const p1 = Number(data.player1Id);
        const p2 = Number(data.player2Id);
        
        if (p1 === currentUserId || p2 === currentUserId) {
          setStartingMatchId(data.matchId);
        } else {
          console.log('👀 Spectator / Waiting for next round for match:', data.matchId);
        }
      }
    });

    newSocket.on('tournament:match:end', (data: { matchId: number }) => {
      console.log('🏆 tournament:match:end', data);
      setLastEndedMatchId(data.matchId);
    });

    newSocket.on('tournament:end', (data) => {
      console.log('🏆 tournament:end', data);
      setTournamentEnd(data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]); // user 의존성 추가

  // Actions
  const joinRoom = useCallback((roomId: number) => {
    if (socket && isConnected) {
      setCurrentRoomId(roomId);
      setStartingMatchId(null);
      setTournamentUpdate(null);
      setTournamentEnd(null);
      socket.emit('room:join', { roomId });
    }
  }, [socket, isConnected]);

  const leaveRoom = useCallback((roomId: number) => {
    if (socket && isConnected) {
      socket.emit('room:leave', { roomId });
      setCurrentRoomId(null);
      setStartingMatchId(null);
    }
  }, [socket, isConnected]);

  const toggleReady = useCallback((roomId: number, isReady: boolean) => {
    if (socket && isConnected) {
      socket.emit('room:ready', { roomId, isReady });
    }
  }, [socket, isConnected]);

  const kickMember = useCallback((roomId: number, userId: number) => {
    if (socket && isConnected) {
      socket.emit('room:kick', { roomId, userId });
    }
  }, [socket, isConnected]);

  return {
    socket,
    isConnected,
    error,
    currentRoomId,
    startingMatchId,
    lastEndedMatchId,
    lastRoomUpdated,
    tournamentUpdate,
    tournamentEnd,
    isKicked,
    actions: {
      joinRoom,
      leaveRoom,
      toggleReady,
      kickMember,
      clearStartingMatch: () => setStartingMatchId(null),
      clearLastEndedMatch: () => setLastEndedMatchId(null),
      setIsKicked,
    }
  };
}
