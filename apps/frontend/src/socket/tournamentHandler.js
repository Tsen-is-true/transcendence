// 토너먼트 시스템
// Single Elimination Tournament (싱글 엘리미네이션 토너먼트)

import GameManager from './gameHandler.js';

class Tournament {
  constructor(tournamentId, minPlayers = 4) {
    this.tournamentId = tournamentId;
    this.minPlayers = minPlayers;
    this.maxPlayers = minPlayers; // For now, exact number required
    this.players = []; // { socket, userData }
    this.bracket = []; // Tournament bracket structure
    this.currentRound = 0;
    this.activeMatches = new Map(); // matchId -> GameRoom
    this.matchResults = []; // History of all matches
    this.status = 'waiting'; // waiting, in_progress, completed
    this.winner = null;
    this.createdAt = Date.now();

    // Rankings
    this.rankings = {
      first: null,   // Winner
      second: null,  // Finalist
      third: null,   // 3rd place winner
      fourth: null   // 3rd place loser
    };
    this.semiFinalsLosers = []; // Track semi-final losers for 3rd place match
    this.thirdPlaceMatch = null; // 3rd place match
  }

  // Add player to tournament
  addPlayer(socket, userData) {
    if (this.players.length >= this.maxPlayers) {
      return { success: false, message: 'Tournament is full' };
    }

    if (this.status !== 'waiting') {
      return { success: false, message: 'Tournament already started' };
    }

    // Check if player already joined
    if (this.players.find(p => p.socket.id === socket.id)) {
      return { success: false, message: 'Already joined' };
    }

    this.players.push({ socket, userData });
    console.log(`👤 ${userData.username} joined tournament ${this.tournamentId} (${this.players.length}/${this.maxPlayers})`);

    return {
      success: true,
      position: this.players.length,
      playersNeeded: this.maxPlayers - this.players.length
    };
  }

  // Remove player from tournament
  removePlayer(socketId) {
    const index = this.players.findIndex(p => p.socket.id === socketId);
    if (index !== -1) {
      const player = this.players[index];
      this.players.splice(index, 1);
      console.log(`👋 ${player.userData.username} left tournament ${this.tournamentId}`);
      return true;
    }
    return false;
  }

  // Check if tournament can start
  canStart() {
    return this.players.length === this.maxPlayers && this.status === 'waiting';
  }

  // Generate tournament bracket
  generateBracket() {
    const numPlayers = this.players.length;
    const numRounds = Math.ceil(Math.log2(numPlayers));

    console.log(`🏆 Generating bracket for ${numPlayers} players, ${numRounds} rounds`);

    // Round 1: Pair up all players
    const round1Matches = [];
    for (let i = 0; i < numPlayers; i += 2) {
      round1Matches.push({
        matchId: `${this.tournamentId}_r1_m${i/2}`,
        round: 1,
        player1: this.players[i],
        player2: this.players[i + 1],
        winner: null,
        status: 'pending' // pending, in_progress, completed
      });
    }

    this.bracket.push(round1Matches);

    // Generate subsequent rounds (placeholders)
    for (let round = 2; round <= numRounds; round++) {
      const prevRoundMatches = this.bracket[round - 2].length;
      const currentRoundMatches = [];

      for (let i = 0; i < prevRoundMatches / 2; i++) {
        currentRoundMatches.push({
          matchId: `${this.tournamentId}_r${round}_m${i}`,
          round,
          player1: null, // TBD from previous round
          player2: null, // TBD from previous round
          winner: null,
          status: 'pending'
        });
      }

      this.bracket.push(currentRoundMatches);
    }

    console.log('🗂️ Bracket structure:', this.bracket.map(round => round.length));
  }

  // Start the tournament
  start() {
    if (!this.canStart()) {
      return { success: false, message: 'Cannot start tournament' };
    }

    this.status = 'in_progress';
    this.generateBracket();

    console.log(`🎮 Tournament ${this.tournamentId} started!`);

    return { success: true };
  }

  // Get current round matches
  getCurrentRoundMatches() {
    if (this.currentRound >= this.bracket.length) {
      return [];
    }
    return this.bracket[this.currentRound];
  }

  // Get pending matches in current round
  getPendingMatches() {
    const currentMatches = this.getCurrentRoundMatches();
    return currentMatches.filter(m => m.status === 'pending' && m.player1 && m.player2);
  }

  // Record match result
  recordMatchResult(matchId, winnerId) {
    console.log(`🔍 Recording match result: matchId=${matchId}, winnerId=${winnerId}`);

    // Find the match
    let match = null;
    let roundIndex = -1;
    let matchIndex = -1;

    for (let r = 0; r < this.bracket.length; r++) {
      const idx = this.bracket[r].findIndex(m => m.matchId === matchId);
      if (idx !== -1) {
        match = this.bracket[r][idx];
        roundIndex = r;
        matchIndex = idx;
        break;
      }
    }

    if (!match) {
      console.log('❌ Match not found:', matchId);
      return { success: false, message: 'Match not found' };
    }

    console.log(`🔍 Found match at round ${roundIndex}, index ${matchIndex}`);
    console.log(`🔍 Match player1: ${match.player1?.userData?.username}, player2: ${match.player2?.userData?.username}`);

    // Determine winner and loser
    const winner = match.player1.socket.id === winnerId ? match.player1 : match.player2;
    const loser = match.player1.socket.id === winnerId ? match.player2 : match.player1;
    match.winner = winner;
    match.loser = loser;
    match.status = 'completed';

    console.log(`✅ Match ${matchId} completed. Winner: ${winner.userData.username}`);

    // Add to match history
    this.matchResults.push({
      matchId,
      round: match.round,
      player1: match.player1.userData.username,
      player2: match.player2.userData.username,
      winner: winner.userData.username,
      loser: loser.userData.username,
      completedAt: Date.now()
    });

    // Track semi-final losers (round 0 = semi-finals for 4-player tournament)
    if (roundIndex === 0 && this.bracket.length === 2) {
      this.semiFinalsLosers.push(loser);
      console.log(`📝 Semi-final loser tracked: ${loser.userData.username}`);
    }

    // Advance winner to next round
    if (roundIndex < this.bracket.length - 1) {
      const nextRoundIndex = roundIndex + 1;
      const nextMatchIndex = Math.floor(matchIndex / 2);
      const nextMatch = this.bracket[nextRoundIndex][nextMatchIndex];

      if (matchIndex % 2 === 0) {
        nextMatch.player1 = winner;
      } else {
        nextMatch.player2 = winner;
      }

      console.log(`➡️ ${winner.userData.username} advances to round ${nextRoundIndex + 1}`);
    } else {
      // Finals completed - set 1st and 2nd place
      this.rankings.first = winner;
      this.rankings.second = loser;
      console.log(`🥇 1st place: ${winner.userData.username}`);
      console.log(`🥈 2nd place: ${loser.userData.username}`);

      // Don't mark tournament as completed yet - need 3rd place match
      if (this.semiFinalsLosers.length === 2) {
        console.log(`🏅 Finals complete. 3rd place match will be created.`);
      } else {
        this.winner = winner;
        this.status = 'completed';
        console.log(`🏆 Tournament completed! Winner: ${winner.userData.username}`);
      }
    }

    return { success: true, winner };
  }

  // Check if current round is complete
  isCurrentRoundComplete() {
    const currentMatches = this.getCurrentRoundMatches();
    return currentMatches.every(m => m.status === 'completed');
  }

  // Advance to next round
  advanceToNextRound() {
    if (!this.isCurrentRoundComplete()) {
      return { success: false, message: 'Current round not complete' };
    }

    if (this.currentRound >= this.bracket.length - 1) {
      return { success: false, message: 'Tournament already completed' };
    }

    this.currentRound++;
    console.log(`📊 Advanced to round ${this.currentRound + 1}`);

    return { success: true, round: this.currentRound + 1 };
  }

  // Get tournament state for clients
  getState() {
    return {
      tournamentId: this.tournamentId,
      status: this.status,
      currentRound: this.currentRound + 1,
      totalRounds: this.bracket.length,
      players: this.players.map(p => ({
        id: p.socket.id,
        username: p.userData.username,
        avatar: p.userData.avatar
      })),
      bracket: this.bracket.map(round =>
        round.map(match => ({
          matchId: match.matchId,
          round: match.round,
          player1: match.player1 ? {
            id: match.player1.socket.id,
            username: match.player1.userData.username,
            avatar: match.player1.userData.avatar
          } : null,
          player2: match.player2 ? {
            id: match.player2.socket.id,
            username: match.player2.userData.username,
            avatar: match.player2.userData.avatar
          } : null,
          winner: match.winner ? {
            id: match.winner.socket.id,
            username: match.winner.userData.username,
            avatar: match.winner.userData.avatar
          } : null,
          status: match.status
        }))
      ),
      winner: this.winner ? {
        id: this.winner.socket.id,
        username: this.winner.userData.username,
        avatar: this.winner.userData.avatar
      } : null,
      playersNeeded: this.maxPlayers - this.players.length,
      rankings: {
        first: this.rankings.first ? {
          id: this.rankings.first.socket.id,
          username: this.rankings.first.userData.username,
          avatar: this.rankings.first.userData.avatar
        } : null,
        second: this.rankings.second ? {
          id: this.rankings.second.socket.id,
          username: this.rankings.second.userData.username,
          avatar: this.rankings.second.userData.avatar
        } : null,
        third: this.rankings.third ? {
          id: this.rankings.third.socket.id,
          username: this.rankings.third.userData.username,
          avatar: this.rankings.third.userData.avatar
        } : null,
        fourth: this.rankings.fourth ? {
          id: this.rankings.fourth.socket.id,
          username: this.rankings.fourth.userData.username,
          avatar: this.rankings.fourth.userData.avatar
        } : null
      },
      thirdPlaceMatch: this.thirdPlaceMatch ? {
        matchId: this.thirdPlaceMatch.matchId,
        player1: this.thirdPlaceMatch.player1 ? {
          id: this.thirdPlaceMatch.player1.socket.id,
          username: this.thirdPlaceMatch.player1.userData.username,
          avatar: this.thirdPlaceMatch.player1.userData.avatar
        } : null,
        player2: this.thirdPlaceMatch.player2 ? {
          id: this.thirdPlaceMatch.player2.socket.id,
          username: this.thirdPlaceMatch.player2.userData.username,
          avatar: this.thirdPlaceMatch.player2.userData.avatar
        } : null,
        winner: this.thirdPlaceMatch.winner ? {
          id: this.thirdPlaceMatch.winner.socket.id,
          username: this.thirdPlaceMatch.winner.userData.username,
          avatar: this.thirdPlaceMatch.winner.userData.avatar
        } : null,
        status: this.thirdPlaceMatch.status
      } : null
    };
  }
}

class TournamentManager {
  constructor(io, gameManager) {
    this.io = io;
    this.gameManager = gameManager;
    this.tournaments = new Map(); // tournamentId -> Tournament
    this.playerToTournament = new Map(); // socketId -> tournamentId
  }

  // Create a new tournament
  createTournament(minPlayers = 4) {
    const tournamentId = `tournament_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tournament = new Tournament(tournamentId, minPlayers);
    this.tournaments.set(tournamentId, tournament);

    console.log(`🏆 Created tournament ${tournamentId} (${minPlayers} players)`);

    return { success: true, tournamentId, tournament };
  }

  // Join a tournament
  joinTournament(socket, userData, tournamentId) {
    const tournament = this.tournaments.get(tournamentId);

    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    const result = tournament.addPlayer(socket, userData);

    if (result.success) {
      this.playerToTournament.set(socket.id, tournamentId);
      socket.join(tournamentId);

      // Broadcast updated tournament state
      this.io.to(tournamentId).emit('tournament:update', tournament.getState());

      // Check if tournament can start
      if (tournament.canStart()) {
        setTimeout(() => this.startTournament(tournamentId), 3000);
      }
    }

    return result;
  }

  // Leave tournament
  leaveTournament(socket) {
    const tournamentId = this.playerToTournament.get(socket.id);

    if (!tournamentId) {
      return { success: false, message: 'Not in a tournament' };
    }

    const tournament = this.tournaments.get(tournamentId);

    if (tournament && tournament.status === 'waiting') {
      tournament.removePlayer(socket.id);
      this.playerToTournament.delete(socket.id);
      socket.leave(tournamentId);

      // Broadcast updated state
      this.io.to(tournamentId).emit('tournament:update', tournament.getState());

      return { success: true };
    }

    return { success: false, message: 'Cannot leave tournament in progress' };
  }

  // Start tournament
  startTournament(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);

    if (!tournament) {
      return { success: false, message: 'Tournament not found' };
    }

    const result = tournament.start();

    if (result.success) {
      // Broadcast tournament started
      this.io.to(tournamentId).emit('tournament:started', tournament.getState());

      // Start first round matches
      this.startNextMatches(tournamentId);
    }

    return result;
  }

  // Start next available matches in current round (ALL pending matches simultaneously)
  startNextMatches(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    const pendingMatches = tournament.getPendingMatches();

    if (pendingMatches.length === 0) {
      // No more matches in current round
      if (tournament.isCurrentRoundComplete()) {
        const advanceResult = tournament.advanceToNextRound();

        if (advanceResult.success) {
          // Notify round completion and start next round
          this.io.to(tournamentId).emit('tournament:round-complete', {
            round: tournament.currentRound,
            nextRound: tournament.currentRound + 1
          });

          console.log(`⏳ Round ${advanceResult.round - 1} complete. Starting round ${advanceResult.round} in 5 seconds...`);
          setTimeout(() => this.startNextMatches(tournamentId), 5000);
        } else {
          // Check if we need to create 3rd place match
          if (tournament.rankings.first && tournament.rankings.second &&
              tournament.semiFinalsLosers.length === 2 &&
              !tournament.thirdPlaceMatch) {
            console.log('🏅 Creating 3rd place match...');
            this.createThirdPlaceMatch(tournamentId);
          } else if (tournament.status === 'completed') {
            // Tournament finished
            console.log('🏆 Tournament finished!');
            this.io.to(tournamentId).emit('tournament:completed', tournament.getState());
          }
        }
      }
      return;
    }

    // Start ALL pending matches simultaneously
    console.log(`🎮 Starting ${pendingMatches.length} matches simultaneously in round ${tournament.currentRound + 1}`);

    pendingMatches.forEach((match) => {
      match.status = 'in_progress';

      // Create game room for this match
      const gameRoom = this.gameManager.createGameForTournament(
        match.player1,
        match.player2,
        tournamentId,
        match.matchId
      );

      console.log(`  📍 Match ${match.matchId}: ${match.player1.userData.username} vs ${match.player2.userData.username}`);

      // Broadcast match started to participants
      this.io.to(tournamentId).emit('tournament:match-started', {
        matchId: match.matchId,
        round: match.round,
        player1: match.player1.userData,
        player2: match.player2.userData
      });
    });
  }

  // Create 3rd place match
  createThirdPlaceMatch(tournamentId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    const [player1, player2] = tournament.semiFinalsLosers;
    const matchId = `${tournamentId}_3rd_place`;

    tournament.thirdPlaceMatch = {
      matchId,
      round: 'third_place',
      player1,
      player2,
      winner: null,
      loser: null,
      status: 'pending'
    };

    console.log(`🥉 3rd place match created: ${player1.userData.username} vs ${player2.userData.username}`);

    // Notify players
    this.io.to(tournamentId).emit('tournament:third-place-match', {
      matchId,
      player1: player1.userData,
      player2: player2.userData
    });

    // Start the match after delay
    setTimeout(() => {
      tournament.thirdPlaceMatch.status = 'in_progress';

      this.gameManager.createGameForTournament(
        player1,
        player2,
        tournamentId,
        matchId
      );

      this.io.to(tournamentId).emit('tournament:match-started', {
        matchId,
        round: 'third_place',
        player1: player1.userData,
        player2: player2.userData
      });
    }, 5000);
  }

  // Handle 3rd place match completion
  handleThirdPlaceMatchComplete(tournamentId, winnerId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament || !tournament.thirdPlaceMatch) return;

    const match = tournament.thirdPlaceMatch;
    const winner = match.player1.socket.id === winnerId ? match.player1 : match.player2;
    const loser = match.player1.socket.id === winnerId ? match.player2 : match.player1;

    match.winner = winner;
    match.loser = loser;
    match.status = 'completed';

    tournament.rankings.third = winner;
    tournament.rankings.fourth = loser;

    console.log(`🥉 3rd place: ${winner.userData.username}`);
    console.log(`4️⃣ 4th place: ${loser.userData.username}`);

    // Tournament is now complete
    tournament.winner = tournament.rankings.first;
    tournament.status = 'completed';

    // Broadcast final results
    this.io.to(tournamentId).emit('tournament:completed', tournament.getState());
  }

  // Handle match completion
  handleMatchComplete(tournamentId, matchId, winnerId) {
    console.log(`📢 handleMatchComplete called: tournament=${tournamentId}, match=${matchId}, winner=${winnerId}`);

    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      console.log('❌ Tournament not found:', tournamentId);
      return;
    }

    // Check if this is the 3rd place match
    if (matchId.endsWith('_3rd_place')) {
      console.log(`🥉 3rd place match completed`);
      this.handleThirdPlaceMatchComplete(tournamentId, winnerId);
      return;
    }

    console.log(`🏆 Tournament found, recording match result...`);
    const result = tournament.recordMatchResult(matchId, winnerId);

    if (result.success) {
      // Broadcast match result
      this.io.to(tournamentId).emit('tournament:match-complete', {
        matchId,
        winner: result.winner.userData,
        tournamentState: tournament.getState()
      });

      // Check if all matches in current round are complete
      const isComplete = tournament.isCurrentRoundComplete();
      const currentMatches = tournament.getCurrentRoundMatches();
      console.log(`🔍 Round ${tournament.currentRound + 1} completion check:`);
      console.log(`   Total matches: ${currentMatches.length}`);
      currentMatches.forEach((m, i) => {
        console.log(`   Match ${i}: ${m.matchId} - status: ${m.status}, winner: ${m.winner?.userData?.username || 'none'}`);
      });
      console.log(`   Is complete: ${isComplete}`);

      if (isComplete) {
        console.log(`✅ All matches in round ${tournament.currentRound + 1} complete!`);
        // Start next round after delay
        setTimeout(() => this.startNextMatches(tournamentId), 5000);
      } else {
        console.log(`⏳ Waiting for other matches in round ${tournament.currentRound + 1} to complete...`);
      }
    }
  }

  // Handle player disconnect
  handleDisconnect(socket) {
    const tournamentId = this.playerToTournament.get(socket.id);

    if (!tournamentId) return;

    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return;

    // If tournament is waiting, just remove player
    if (tournament.status === 'waiting') {
      this.leaveTournament(socket);
      return;
    }

    // If tournament is in progress, handle forfeit
    if (tournament.status === 'in_progress') {
      console.log(`⚠️ Player ${socket.id} disconnected during tournament ${tournamentId}`);

      // Find if player is in an active match
      const currentMatches = tournament.getCurrentRoundMatches();
      for (const match of currentMatches) {
        if (match.status === 'in_progress') {
          const isPlayer1 = match.player1?.socket.id === socket.id;
          const isPlayer2 = match.player2?.socket.id === socket.id;

          if (isPlayer1 || isPlayer2) {
            // Player forfeits - opponent wins
            const opponent = isPlayer1 ? match.player2 : match.player1;
            const winnerPlayerNumber = isPlayer1 ? 2 : 1;
            const winnerSocketId = opponent.socket.id;

            console.log(`🚫 ${socket.id} forfeited. ${opponent.userData.username} (${winnerSocketId}) wins by forfeit!`);

            // Notify players of forfeit
            this.io.to(tournamentId).emit('tournament:player-forfeited', {
              matchId: match.matchId,
              forfeiter: isPlayer1 ? match.player1.userData : match.player2.userData,
              winner: opponent.userData
            });

            // End the game properly (this will trigger handleMatchComplete via gameManager)
            const roomId = `tournament_match_${match.matchId}`;
            console.log(`🔍 Attempting to forfeit game. RoomId: ${roomId}`);
            console.log(`🔍 Active games:`, Array.from(this.gameManager.activeGames.keys()));
            this.gameManager.forfeitGame(roomId, winnerPlayerNumber, winnerSocketId);
            break;
          }
        }
      }

      // Clean up player mapping
      this.playerToTournament.delete(socket.id);
    }
  }

  // Get available tournaments
  getAvailableTournaments() {
    const available = [];

    for (const [id, tournament] of this.tournaments) {
      if (tournament.status === 'waiting') {
        available.push({
          tournamentId: id,
          playersJoined: tournament.players.length,
          playersNeeded: tournament.maxPlayers,
          createdAt: tournament.createdAt
        });
      }
    }

    return available;
  }
}

export default TournamentManager;
