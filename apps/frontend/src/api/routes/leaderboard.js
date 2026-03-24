import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';

const router = Router();

// GET /api/leaderboard - 리더보드 조회
router.get('/', async (req, res) => {
  try {
    const { limit = '10' } = req.query;
    const limitNum = parseInt(limit, 10);

    // 모든 유저의 게임 통계 계산
    const users = await prisma.user.findMany({
      include: {
        gamesAsPlayer1: {
          where: { status: 'finished' },
          select: {
            score1: true,
            score2: true,
            winnerId: true,
          },
        },
        gamesAsPlayer2: {
          where: { status: 'finished' },
          select: {
            score1: true,
            score2: true,
            winnerId: true,
          },
        },
      },
    });

    // 각 유저의 통계 계산
    const leaderboard = users.map(user => {
      let wins = 0;
      let losses = 0;
      let totalScore = 0;
      let totalOpponentScore = 0;

      // Player1으로 참가한 게임
      user.gamesAsPlayer1.forEach(game => {
        totalScore += game.score1;
        totalOpponentScore += game.score2;
        if (game.winnerId === user.id) {
          wins++;
        } else if (game.winnerId) {
          losses++;
        }
      });

      // Player2로 참가한 게임
      user.gamesAsPlayer2.forEach(game => {
        totalScore += game.score2;
        totalOpponentScore += game.score1;
        if (game.winnerId === user.id) {
          wins++;
        } else if (game.winnerId) {
          losses++;
        }
      });

      const totalGames = wins + losses;
      const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
      const scoreDiff = totalScore - totalOpponentScore;

      return {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        wins,
        losses,
        totalGames,
        winRate: parseFloat(winRate.toFixed(2)),
        totalScore,
        totalOpponentScore,
        scoreDiff,
      };
    });

    // 승률 > 승수 > 점수차 순으로 정렬
    leaderboard.sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.scoreDiff - a.scoreDiff;
    });

    // 순위 추가
    const rankedLeaderboard = leaderboard.slice(0, limitNum).map((entry, index) => ({
      rank: index + 1,
      ...entry,
    }));

    res.json({
      success: true,
      leaderboard: rankedLeaderboard,
      total: users.length,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({
      error: 'Failed to fetch leaderboard',
      details: error.message
    });
  }
});

// GET /api/leaderboard/:userId - 특정 유저의 랭킹 조회
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // 해당 유저 찾기
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        gamesAsPlayer1: {
          where: { status: 'finished' },
          select: {
            score1: true,
            score2: true,
            winnerId: true,
          },
        },
        gamesAsPlayer2: {
          where: { status: 'finished' },
          select: {
            score1: true,
            score2: true,
            winnerId: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 유저의 통계 계산
    let wins = 0;
    let losses = 0;
    let totalScore = 0;
    let totalOpponentScore = 0;

    user.gamesAsPlayer1.forEach(game => {
      totalScore += game.score1;
      totalOpponentScore += game.score2;
      if (game.winnerId === userId) wins++;
      else if (game.winnerId) losses++;
    });

    user.gamesAsPlayer2.forEach(game => {
      totalScore += game.score2;
      totalOpponentScore += game.score1;
      if (game.winnerId === userId) wins++;
      else if (game.winnerId) losses++;
    });

    const totalGames = wins + losses;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
    const scoreDiff = totalScore - totalOpponentScore;

    // 전체 유저 중에서 순위 계산
    const allUsers = await prisma.user.findMany({
      include: {
        gamesAsPlayer1: { where: { status: 'finished' } },
        gamesAsPlayer2: { where: { status: 'finished' } },
      },
    });

    const allStats = allUsers.map(u => {
      let w = 0, l = 0;
      u.gamesAsPlayer1.forEach(g => { if (g.winnerId === u.id) w++; else if (g.winnerId) l++; });
      u.gamesAsPlayer2.forEach(g => { if (g.winnerId === u.id) w++; else if (g.winnerId) l++; });
      const tg = w + l;
      const wr = tg > 0 ? (w / tg) * 100 : 0;
      return { userId: u.id, wins: w, winRate: wr };
    });

    allStats.sort((a, b) => {
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return b.wins - a.wins;
    });

    const rank = allStats.findIndex(s => s.userId === userId) + 1;

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar,
        rank,
        wins,
        losses,
        totalGames,
        winRate: parseFloat(winRate.toFixed(2)),
        totalScore,
        totalOpponentScore,
        scoreDiff,
      },
    });
  } catch (error) {
    console.error('Error fetching user rank:', error);
    res.status(500).json({
      error: 'Failed to fetch user rank',
      details: error.message
    });
  }
});

export default router;
