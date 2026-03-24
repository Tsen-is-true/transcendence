import { Router } from 'express';
import { prisma } from '../../lib/prisma.js';

const router = Router();

// POST /api/games - 게임 결과 저장
router.post('/', async (req, res) => {
  try {
    const { player1Id, player2Id, score1, score2, winnerId, ballSpeed, paddleSize, winScore } = req.body;

    // 입력 검증
    if (!player1Id || !player2Id || score1 === undefined || score2 === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: player1Id, player2Id, score1, score2'
      });
    }

    // 게임 결과 저장
    const game = await prisma.game.create({
      data: {
        player1Id,
        player2Id,
        score1,
        score2,
        winnerId,
        status: 'finished',
        finishedAt: new Date(),
        ballSpeed: ballSpeed || 5,
        paddleSize: paddleSize || 100,
        winScore: winScore || 5,
      },
      include: {
        player1: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        player2: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      game,
    });
  } catch (error) {
    console.error('Error creating game:', error);
    res.status(500).json({
      error: 'Failed to save game result',
      details: error.message
    });
  }
});

// GET /api/games - 게임 기록 조회
router.get('/', async (req, res) => {
  try {
    const { userId, limit = '10', offset = '0' } = req.query;

    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);

    // 쿼리 조건 설정
    const where = userId
      ? {
          OR: [
            { player1Id: userId },
            { player2Id: userId },
          ],
          status: 'finished',
        }
      : {
          status: 'finished',
        };

    // 게임 목록 조회
    const games = await prisma.game.findMany({
      where,
      include: {
        player1: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        player2: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        finishedAt: 'desc',
      },
      take: limitNum,
      skip: offsetNum,
    });

    // 총 게임 수
    const total = await prisma.game.count({ where });

    res.json({
      success: true,
      games,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({
      error: 'Failed to fetch games',
      details: error.message
    });
  }
});

// GET /api/games/:id - 특정 게임 조회
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const game = await prisma.game.findUnique({
      where: { id },
      include: {
        player1: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
        player2: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    res.json({
      success: true,
      game,
    });
  } catch (error) {
    console.error('Error fetching game:', error);
    res.status(500).json({
      error: 'Failed to fetch game',
      details: error.message
    });
  }
});

export default router;
