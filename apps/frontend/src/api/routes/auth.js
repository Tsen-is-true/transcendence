import { Router } from 'express';
import bcrypt from 'bcrypt';
import { prisma } from '../../lib/prisma.js';

const router = Router();
const SALT_ROUNDS = 10;

// POST /api/auth/register - 회원가입
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, avatar } = req.body;

    // 입력 검증
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields: username, email, password',
      });
    }

    // 이메일/유저명 중복 체크
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(409).json({
        error: existingUser.email === email
          ? 'Email already exists'
          : 'Username already exists',
      });
    }

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 유저 생성
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        avatar: avatar || '👤',
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });

    // 세션에 유저 정보 저장
    req.session.userId = user.id;
    req.session.username = user.username;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Failed to register user',
      details: error.message,
    });
  }
});

// POST /api/auth/login - 로그인
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // 입력 검증
    if (!email || !password) {
      return res.status(400).json({
        error: 'Missing required fields: email, password',
      });
    }

    // 유저 찾기
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: 'Invalid email or password',
      });
    }

    // 세션에 유저 정보 저장
    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({
      success: true,
      message: 'Logged in successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Failed to login',
      details: error.message,
    });
  }
});

// POST /api/auth/logout - 로그아웃
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        error: 'Failed to logout',
        details: err.message,
      });
    }

    res.clearCookie('connect.sid');
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  });
});

// GET /api/auth/me - 현재 로그인한 유저 정보
router.get('/me', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({
        error: 'Not authenticated',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.session.userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to get user information',
      details: error.message,
    });
  }
});

// GET /api/auth/check - 인증 상태 확인
router.get('/check', (req, res) => {
  res.json({
    authenticated: !!req.session.userId,
    userId: req.session.userId || null,
    username: req.session.username || null,
  });
});

export default router;
