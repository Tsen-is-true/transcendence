import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const SALT_ROUNDS = 10;

// GET /api/users/:id - 유저 프로필 조회 (공개)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    // 게임 통계 계산
    const gamesAsPlayer1 = await prisma.game.findMany({
      where: { player1Id: id, status: 'finished' },
      select: { winnerId: true },
    });

    const gamesAsPlayer2 = await prisma.game.findMany({
      where: { player2Id: id, status: 'finished' },
      select: { winnerId: true },
    });

    const totalGames = gamesAsPlayer1.length + gamesAsPlayer2.length;
    const wins = [...gamesAsPlayer1, ...gamesAsPlayer2].filter(
      (game) => game.winnerId === id
    ).length;
    const losses = totalGames - wins;
    const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;

    res.json({
      success: true,
      user: {
        ...user,
        stats: {
          totalGames,
          wins,
          losses,
          winRate: parseFloat(winRate.toFixed(2)),
        },
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user',
      details: error.message,
    });
  }
});

// PUT /api/users/profile - 프로필 업데이트 (인증 필요)
router.put('/profile', requireAuth, async (req, res) => {
  try {
    const { username, avatar, currentPassword, newPassword } = req.body;
    const userId = req.session.userId;

    // 업데이트할 데이터 준비
    const updateData = {};

    // 유저명 변경
    if (username) {
      // 유저명 중복 체크
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: { id: userId },
        },
      });

      if (existingUser) {
        return res.status(409).json({
          error: 'Username already taken',
        });
      }

      updateData.username = username;
    }

    // 아바타 변경
    if (avatar) {
      updateData.avatar = avatar;
    }

    // 비밀번호 변경
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          error: 'Current password is required to change password',
        });
      }

      // 현재 비밀번호 확인
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      const isPasswordValid = await bcrypt.compare(
        currentPassword,
        user.password
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          error: 'Current password is incorrect',
        });
      }

      // 새 비밀번호 해싱
      updateData.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
    }

    // 변경사항이 없으면
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No changes provided',
      });
    }

    // 프로필 업데이트
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        updatedAt: true,
      },
    });

    // 세션 유저명 업데이트
    if (username) {
      req.session.username = username;
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      details: error.message,
    });
  }
});

// GET /api/users - 유저 목록 조회 (검색 기능 포함)
router.get('/', async (req, res) => {
  try {
    const { search, limit = '20', offset = '0' } = req.query;

    const limitNum = parseInt(limit, 10);
    const offsetNum = parseInt(offset, 10);

    const where = search
      ? {
          OR: [
            { username: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        avatar: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limitNum,
      skip: offsetNum,
    });

    const total = await prisma.user.count({ where });

    res.json({
      success: true,
      users,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      error: 'Failed to get users',
      details: error.message,
    });
  }
});

export default router;
