// WebSocket 게임 핸들러
// 온라인 멀티플레이어 게임 로직

class GameRoom {
  constructor(roomId, player1, player2) {
    this.roomId = roomId;
    this.player1 = player1;
    this.player2 = player2;
    this.gameState = this.initializeGameState();
    this.lastUpdate = Date.now();
    this.gameLoop = null;
    // Track continuous input state for each player
    this.player1Input = { up: false, down: false };
    this.player2Input = { up: false, down: false };
  }

  initializeGameState() {
    const width = 800;
    const height = 600;

    return {
      canvas: { width, height },
      ball: {
        x: width / 2,
        y: height / 2,
        radius: 10,
        velocityX: 5,
        velocityY: 5,
        speed: 5,
      },
      paddle1: {
        x: 10,
        y: height / 2 - 50,
        width: 10,
        height: 100,
        score: 0,
      },
      paddle2: {
        x: width - 20,
        y: height / 2 - 50,
        width: 10,
        height: 100,
        score: 0,
      },
      winningScore: 5,
      winner: null,
      isPlaying: false,
    };
  }

  startGame() {
    this.gameState.isPlaying = true;
    this.resetBall();
  }

  resetBall() {
    const { canvas, ball } = this.gameState;
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.velocityX = (Math.random() > 0.5 ? 1 : -1) * ball.speed;
    ball.velocityY = (Math.random() * 2 - 1) * ball.speed;
  }

  update() {
    if (!this.gameState.isPlaying || this.gameState.winner) {
      return;
    }

    const { ball, paddle1, paddle2, canvas } = this.gameState;

    // Handle continuous paddle movement based on input state
    const paddleSpeed = 8;

    // Player 1 movement
    if (this.player1Input.up) {
      paddle1.y = Math.max(0, paddle1.y - paddleSpeed);
    }
    if (this.player1Input.down) {
      paddle1.y = Math.min(canvas.height - paddle1.height, paddle1.y + paddleSpeed);
    }

    // Player 2 movement
    if (this.player2Input.up) {
      paddle2.y = Math.max(0, paddle2.y - paddleSpeed);
    }
    if (this.player2Input.down) {
      paddle2.y = Math.min(canvas.height - paddle2.height, paddle2.y + paddleSpeed);
    }

    // 공 이동
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    // 위/아래 벽 충돌
    if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
      ball.velocityY = -ball.velocityY;
    }

    // 패들 충돌 감지
    const paddle = ball.x < canvas.width / 2 ? paddle1 : paddle2;

    if (this.collision(ball, paddle)) {
      // 충돌 지점에 따라 각도 변경
      const collidePoint = ball.y - (paddle.y + paddle.height / 2);
      const angleRad = (collidePoint / (paddle.height / 2)) * (Math.PI / 4);

      const direction = ball.x < canvas.width / 2 ? 1 : -1;
      ball.velocityX = direction * ball.speed * Math.cos(angleRad);
      ball.velocityY = ball.speed * Math.sin(angleRad);

      // 속도 증가
      ball.speed *= 1.05;
    }

    // 득점 처리
    if (ball.x - ball.radius < 0) {
      paddle2.score++;
      this.checkWinner();
      this.resetBall();
    } else if (ball.x + ball.radius > canvas.width) {
      paddle1.score++;
      this.checkWinner();
      this.resetBall();
    }
  }

  collision(ball, paddle) {
    return (
      ball.x - ball.radius < paddle.x + paddle.width &&
      ball.x + ball.radius > paddle.x &&
      ball.y - ball.radius < paddle.y + paddle.height &&
      ball.y + ball.radius > paddle.y
    );
  }

  checkWinner() {
    const { paddle1, paddle2, winningScore } = this.gameState;
    if (paddle1.score >= winningScore) {
      this.gameState.winner = 'player1';
      this.gameState.isPlaying = false;
    } else if (paddle2.score >= winningScore) {
      this.gameState.winner = 'player2';
      this.gameState.isPlaying = false;
    }
  }

  // Set input state for a player
  setPlayerInput(player, direction, isPressed) {
    const input = player === 1 ? this.player1Input : this.player2Input;

    if (direction === 'up') {
      input.up = isPressed;
      if (isPressed) input.down = false; // Don't allow both at once
    } else if (direction === 'down') {
      input.down = isPressed;
      if (isPressed) input.up = false; // Don't allow both at once
    }
  }

  // Legacy method - can be removed later
  movePaddle(player, direction) {
    const paddle = player === 1 ? this.gameState.paddle1 : this.gameState.paddle2;
    const speed = 20;

    if (direction === 'up') {
      paddle.y = Math.max(0, paddle.y - speed);
    } else if (direction === 'down') {
      paddle.y = Math.min(
        this.gameState.canvas.height - paddle.height,
        paddle.y + speed
      );
    }
  }
}

// 게임 매니저
class GameManager {
  constructor(io) {
    this.io = io;
    this.waitingPlayers = [];
    this.activeGames = new Map();
    this.playerToRoom = new Map();
  }

  addPlayerToQueue(socket, userData) {
    // 이미 대기 중이거나 게임 중인지 확인
    if (this.playerToRoom.has(socket.id)) {
      return { success: false, message: 'Already in a game or queue' };
    }

    // 대기열에 추가
    this.waitingPlayers.push({ socket, userData });
    socket.emit('queue:joined', { position: this.waitingPlayers.length });

    // 매칭 시도
    this.tryMatchmaking();

    return { success: true, message: 'Added to queue' };
  }

  tryMatchmaking() {
    // 2명 이상 대기 중이면 매칭
    if (this.waitingPlayers.length >= 2) {
      const player1 = this.waitingPlayers.shift();
      const player2 = this.waitingPlayers.shift();

      this.createGame(player1, player2);
    }
  }

  createGame(player1, player2) {
    const roomId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 방 생성
    player1.socket.join(roomId);
    player2.socket.join(roomId);

    // 게임 룸 생성
    const gameRoom = new GameRoom(roomId, player1.userData, player2.userData);
    this.activeGames.set(roomId, gameRoom);

    // 플레이어-룸 매핑
    this.playerToRoom.set(player1.socket.id, { roomId, playerNumber: 1 });
    this.playerToRoom.set(player2.socket.id, { roomId, playerNumber: 2 });

    // 플레이어들에게 매칭 완료 알림
    player1.socket.emit('game:matched', {
      roomId,
      playerNumber: 1,
      opponent: { username: player2.userData.username, avatar: player2.userData.avatar },
    });

    player2.socket.emit('game:matched', {
      roomId,
      playerNumber: 2,
      opponent: { username: player1.userData.username, avatar: player1.userData.avatar },
    });

    // 게임 시작
    setTimeout(() => {
      gameRoom.startGame();
      this.startGameLoop(roomId);
    }, 3000); // 3초 후 시작
  }

  // Create game for tournament match
  createGameForTournament(player1, player2, tournamentId, matchId) {
    const roomId = `tournament_match_${matchId}`;
    console.log(`🎮 Creating tournament game: roomId=${roomId}, matchId=${matchId}`);

    // 방 생성
    player1.socket.join(roomId);
    player2.socket.join(roomId);

    // 게임 룸 생성 with tournament metadata
    const gameRoom = new GameRoom(roomId, player1.userData, player2.userData);
    gameRoom.tournamentId = tournamentId;
    gameRoom.matchId = matchId;
    this.activeGames.set(roomId, gameRoom);
    console.log(`✅ Game room ${roomId} added to activeGames. Total rooms: ${this.activeGames.size}`);

    // 플레이어-룸 매핑
    this.playerToRoom.set(player1.socket.id, { roomId, playerNumber: 1, tournamentId, matchId });
    this.playerToRoom.set(player2.socket.id, { roomId, playerNumber: 2, tournamentId, matchId });

    // 플레이어들에게 매칭 완료 알림
    player1.socket.emit('game:matched', {
      roomId,
      playerNumber: 1,
      opponent: { username: player2.userData.username, avatar: player2.userData.avatar },
      isTournament: true,
      tournamentId,
      matchId
    });

    player2.socket.emit('game:matched', {
      roomId,
      playerNumber: 2,
      opponent: { username: player1.userData.username, avatar: player1.userData.avatar },
      isTournament: true,
      tournamentId,
      matchId
    });

    // 게임 시작
    setTimeout(() => {
      gameRoom.startGame();
      this.startGameLoop(roomId);
    }, 3000);

    return gameRoom;
  }

  startGameLoop(roomId) {
    const gameRoom = this.activeGames.get(roomId);
    if (!gameRoom) return;

    const FPS = 60;
    const interval = 1000 / FPS;

    gameRoom.gameLoop = setInterval(() => {
      gameRoom.update();

      // 모든 플레이어에게 게임 상태 전송
      this.io.to(roomId).emit('game:update', gameRoom.gameState);

      // 게임 종료 확인
      if (gameRoom.gameState.winner) {
        this.endGame(roomId);
      }
    }, interval);
  }

  // Handle key press/release for smooth movement
  handleKeyState(socket, direction, isPressed) {
    const playerInfo = this.playerToRoom.get(socket.id);
    if (!playerInfo) return;

    const gameRoom = this.activeGames.get(playerInfo.roomId);
    if (!gameRoom) return;

    gameRoom.setPlayerInput(playerInfo.playerNumber, direction, isPressed);
  }

  // Legacy paddle move handler - kept for compatibility
  handlePaddleMove(socket, direction) {
    const playerInfo = this.playerToRoom.get(socket.id);
    if (!playerInfo) {
      console.log('❌ handlePaddleMove: Player info not found for socket:', socket.id);
      return;
    }

    const gameRoom = this.activeGames.get(playerInfo.roomId);
    if (!gameRoom) {
      console.log('❌ handlePaddleMove: Game room not found:', playerInfo.roomId);
      return;
    }

    console.log(`🎮 handlePaddleMove: Player ${playerInfo.playerNumber}, direction: ${direction}`);
    const paddle = playerInfo.playerNumber === 1 ? gameRoom.gameState.paddle1 : gameRoom.gameState.paddle2;
    console.log(`📍 Before move: paddle${playerInfo.playerNumber}.y = ${paddle.y}`);

    gameRoom.movePaddle(playerInfo.playerNumber, direction);

    console.log(`📍 After move: paddle${playerInfo.playerNumber}.y = ${paddle.y}`);
  }

  endGame(roomId) {
    const gameRoom = this.activeGames.get(roomId);
    if (!gameRoom) return;

    // 게임 루프 중지
    if (gameRoom.gameLoop) {
      clearInterval(gameRoom.gameLoop);
    }

    // 승자 결정
    const winnerId = gameRoom.gameState.winner === 'player1'
      ? Array.from(this.playerToRoom.entries()).find(([id, info]) => info.roomId === roomId && info.playerNumber === 1)?.[0]
      : Array.from(this.playerToRoom.entries()).find(([id, info]) => info.roomId === roomId && info.playerNumber === 2)?.[0];

    // 승자 알림
    this.io.to(roomId).emit('game:end', {
      winner: gameRoom.gameState.winner,
      finalScore: {
        player1: gameRoom.gameState.paddle1.score,
        player2: gameRoom.gameState.paddle2.score,
      },
    });

    // If this is a tournament match, notify tournament manager
    if (gameRoom.tournamentId && gameRoom.matchId && winnerId) {
      // Tournament manager will be notified via callback
      if (this.tournamentManager) {
        this.tournamentManager.handleMatchComplete(
          gameRoom.tournamentId,
          gameRoom.matchId,
          winnerId
        );
      }
    }

    // 정리
    setTimeout(() => {
      this.cleanupGame(roomId);
    }, 5000);
  }

  // Set tournament manager reference
  setTournamentManager(tournamentManager) {
    this.tournamentManager = tournamentManager;
  }

  cleanupGame(roomId) {
    const gameRoom = this.activeGames.get(roomId);
    if (!gameRoom) return;

    // 플레이어-룸 매핑 제거
    for (const [socketId, info] of this.playerToRoom.entries()) {
      if (info.roomId === roomId) {
        this.playerToRoom.delete(socketId);
      }
    }

    // 게임 룸 제거
    this.activeGames.delete(roomId);
  }

  // Forfeit a game (for tournament disconnections)
  forfeitGame(roomId, winnerPlayerNumber, winnerSocketId) {
    const gameRoom = this.activeGames.get(roomId);
    if (!gameRoom) {
      console.log(`⚠️ Game room ${roomId} not found for forfeit`);
      return;
    }

    // Stop the game loop first
    if (gameRoom.gameLoop) {
      clearInterval(gameRoom.gameLoop);
      gameRoom.gameLoop = null;
    }

    // Set game state
    gameRoom.gameState.isPlaying = false;
    gameRoom.gameState.winner = winnerPlayerNumber === 1 ? 'player1' : 'player2';

    console.log(`🚫 Game ${roomId} forfeited. Winner: player${winnerPlayerNumber} (${winnerSocketId})`);

    // Notify all players in room
    this.io.to(roomId).emit('game:end', {
      winner: gameRoom.gameState.winner,
      finalScore: {
        player1: gameRoom.gameState.paddle1.score,
        player2: gameRoom.gameState.paddle2.score,
      },
      forfeit: true
    });

    // If this is a tournament match, notify tournament manager directly
    if (gameRoom.tournamentId && gameRoom.matchId && winnerSocketId) {
      console.log(`🏆 Notifying tournament manager: match ${gameRoom.matchId}, winner ${winnerSocketId}`);
      if (this.tournamentManager) {
        this.tournamentManager.handleMatchComplete(
          gameRoom.tournamentId,
          gameRoom.matchId,
          winnerSocketId
        );
      }
    }

    // Clean up after delay
    setTimeout(() => {
      this.cleanupGame(roomId);
    }, 5000);
  }

  handleDisconnect(socket) {
    // 대기열에서 제거
    const queueIndex = this.waitingPlayers.findIndex((p) => p.socket.id === socket.id);
    if (queueIndex !== -1) {
      this.waitingPlayers.splice(queueIndex, 1);
    }

    // 게임 중이었다면 확인
    const playerInfo = this.playerToRoom.get(socket.id);
    if (playerInfo) {
      const { roomId, tournamentId } = playerInfo;

      // 토너먼트 게임이면 tournament manager가 처리하도록 넘김
      if (tournamentId) {
        console.log(`🏆 Tournament game disconnect - letting tournament manager handle it`);
        return;
      }

      // 일반 게임만 여기서 정리
      socket.to(roomId).emit('game:opponent-disconnected');
      this.cleanupGame(roomId);
    }
  }
}

export default GameManager;
