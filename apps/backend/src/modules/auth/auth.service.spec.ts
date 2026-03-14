import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '@modules/users/users.service';
import { User } from '@modules/users/entities/user.entity';

jest.mock('bcrypt');

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: Record<string, jest.Mock>;
  let jwtService: Record<string, jest.Mock>;
  let configService: Record<string, jest.Mock>;

  const mockUser: User = {
    userid: 1,
    email: 'test@example.com',
    password: '$2b$12$hashedpassword',
    nickname: 'testuser',
    avatarUrl: 'https://example.com/avatar.png',
    intraId: null,
    wins: 0,
    loses: 0,
    elo: 1000,
    level: 1,
    xp: 0,
    streak: 0,
    maxStreak: 0,
    oauthProvider: null,
    oauthId: null,
    hashedRefreshToken: '$2b$10$hashedrefreshtoken',
    isPlaying: false,
    isOnline: false,
    lastSeenAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn(),
      findByNickname: jest.fn(),
      findById: jest.fn(),
      findByOAuthId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    jwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  // ─── register ────────────────────────────────────────────────────────

  describe('register', () => {
    const registerDto = {
      email: 'new@example.com',
      password: 'Password123!',
      nickname: 'newuser',
    };

    it('should register a new user successfully', async () => {
      usersService.findByEmail.mockResolvedValue(null as any);
      usersService.findByNickname.mockResolvedValue(null as any);
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashedpw');
      usersService.create.mockResolvedValue({
        ...mockUser,
        userid: 2,
        email: registerDto.email,
        nickname: registerDto.nickname,
      });

      const result = await authService.register(registerDto);

      expect(usersService.findByEmail).toHaveBeenCalledWith(registerDto.email);
      expect(usersService.findByNickname).toHaveBeenCalledWith(registerDto.nickname);
      expect(bcrypt.hash).toHaveBeenCalledWith(registerDto.password, 12);
      expect(usersService.create).toHaveBeenCalledWith({
        email: registerDto.email,
        password: 'hashedpw',
        nickname: registerDto.nickname,
      });
      expect(result).toEqual({
        userid: 2,
        email: registerDto.email,
        nickname: registerDto.nickname,
      });
    });

    it('should throw ConflictException when email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(authService.register(registerDto)).rejects.toThrow('이미 사용 중인 이메일입니다');
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when nickname already exists', async () => {
      usersService.findByEmail.mockResolvedValue(null as any);
      usersService.findByNickname.mockResolvedValue(mockUser);

      await expect(authService.register(registerDto)).rejects.toThrow(ConflictException);
      await expect(authService.register(registerDto)).rejects.toThrow('이미 사용 중인 닉네임입니다');
      expect(usersService.create).not.toHaveBeenCalled();
    });
  });

  // ─── validateUser ────────────────────────────────────────────────────

  describe('validateUser', () => {
    const email = 'test@example.com';
    const password = 'Password123!';

    it('should return the user when credentials are valid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.validateUser(email, password);

      expect(usersService.findByEmail).toHaveBeenCalledWith(email);
      expect(bcrypt.compare).toHaveBeenCalledWith(password, mockUser.password);
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      usersService.findByEmail.mockResolvedValue(null as any);

      await expect(authService.validateUser(email, password)).rejects.toThrow(UnauthorizedException);
      await expect(authService.validateUser(email, password)).rejects.toThrow(
        '이메일 또는 비밀번호가 올바르지 않습니다',
      );
    });

    it('should throw UnauthorizedException when user has no password (OAuth account)', async () => {
      usersService.findByEmail.mockResolvedValue({ ...mockUser, password: null });

      await expect(authService.validateUser(email, password)).rejects.toThrow(UnauthorizedException);
      await expect(authService.validateUser(email, password)).rejects.toThrow(
        'OAuth로 가입된 계정입니다. OAuth 로그인을 이용해주세요',
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      usersService.findByEmail.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.validateUser(email, password)).rejects.toThrow(UnauthorizedException);
      await expect(authService.validateUser(email, password)).rejects.toThrow(
        '이메일 또는 비밀번호가 올바르지 않습니다',
      );
    });
  });

  // ─── login ───────────────────────────────────────────────────────────

  describe('login', () => {
    it('should return access token, refresh token, and user info', async () => {
      jwtService.sign
        .mockReturnValueOnce('access-token')
        .mockReturnValueOnce('refresh-token');
      configService.get.mockReturnValue('7d');
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed-refresh');
      usersService.update.mockResolvedValue(undefined as any);

      const result = await authService.login(mockUser);

      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(jwtService.sign).toHaveBeenNthCalledWith(1, {
        sub: mockUser.userid,
        email: mockUser.email,
        nickname: mockUser.nickname,
      });
      expect(jwtService.sign).toHaveBeenNthCalledWith(
        2,
        { sub: mockUser.userid, email: mockUser.email, nickname: mockUser.nickname },
        { expiresIn: '7d' },
      );
      expect(bcrypt.hash).toHaveBeenCalledWith('refresh-token', 10);
      expect(usersService.update).toHaveBeenCalledWith(mockUser.userid, {
        hashedRefreshToken: 'hashed-refresh',
      });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: {
          userid: mockUser.userid,
          email: mockUser.email,
          nickname: mockUser.nickname,
          avatarUrl: mockUser.avatarUrl,
        },
      });
    });
  });

  // ─── refreshTokens ──────────────────────────────────────────────────

  describe('refreshTokens', () => {
    const oldRefreshToken = 'old-refresh-token';

    it('should return new tokens when refresh token is valid', async () => {
      jwtService.verify.mockReturnValue({ sub: 1, email: mockUser.email, nickname: mockUser.nickname });
      usersService.findById.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');
      configService.get.mockReturnValue('7d');
      (mockedBcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-refresh');
      usersService.update.mockResolvedValue(undefined as any);

      const result = await authService.refreshTokens(oldRefreshToken);

      expect(jwtService.verify).toHaveBeenCalledWith(oldRefreshToken);
      expect(usersService.findById).toHaveBeenCalledWith(1);
      expect(bcrypt.compare).toHaveBeenCalledWith(oldRefreshToken, mockUser.hashedRefreshToken);
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });

    it('should throw UnauthorizedException when token verification fails', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('invalid token');
      });

      await expect(authService.refreshTokens(oldRefreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(authService.refreshTokens(oldRefreshToken)).rejects.toThrow(
        '유효하지 않은 리프레시 토큰입니다',
      );
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      jwtService.verify.mockReturnValue({ sub: 999 });
      usersService.findById.mockResolvedValue(null as any);

      await expect(authService.refreshTokens(oldRefreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(authService.refreshTokens(oldRefreshToken)).rejects.toThrow(
        '유효하지 않은 리프레시 토큰입니다',
      );
    });

    it('should throw UnauthorizedException when user has no hashedRefreshToken', async () => {
      jwtService.verify.mockReturnValue({ sub: 1 });
      usersService.findById.mockResolvedValue({ ...mockUser, hashedRefreshToken: null });

      await expect(authService.refreshTokens(oldRefreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(authService.refreshTokens(oldRefreshToken)).rejects.toThrow(
        '유효하지 않은 리프레시 토큰입니다',
      );
    });

    it('should throw UnauthorizedException when token does not match hash', async () => {
      jwtService.verify.mockReturnValue({ sub: 1 });
      usersService.findById.mockResolvedValue(mockUser);
      (mockedBcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.refreshTokens(oldRefreshToken)).rejects.toThrow(UnauthorizedException);
      await expect(authService.refreshTokens(oldRefreshToken)).rejects.toThrow(
        '유효하지 않은 리프레시 토큰입니다',
      );
    });
  });

  // ─── logout ──────────────────────────────────────────────────────────

  describe('logout', () => {
    it('should clear the hashedRefreshToken', async () => {
      usersService.update.mockResolvedValue(undefined as any);

      await authService.logout(1);

      expect(usersService.update).toHaveBeenCalledWith(1, { hashedRefreshToken: null });
    });
  });

  // ─── validateOAuthUser ───────────────────────────────────────────────

  describe('validateOAuthUser', () => {
    const oauthProfile = {
      intraId: '12345',
      email: 'oauth@example.com',
      nickname: 'oauthuser',
      avatarUrl: 'https://cdn.42.fr/avatar.png',
    };

    it('should return existing OAuth user if found', async () => {
      const oauthUser = { ...mockUser, intraId: '12345', oauthProvider: '42', oauthId: '12345' };
      usersService.findByOAuthId.mockResolvedValue(oauthUser);

      const result = await authService.validateOAuthUser(oauthProfile);

      expect(usersService.findByOAuthId).toHaveBeenCalledWith('42', oauthProfile.intraId);
      expect(result).toEqual(oauthUser);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when email is already registered', async () => {
      usersService.findByOAuthId.mockResolvedValue(null as any);
      usersService.findByEmail.mockResolvedValue(mockUser);

      await expect(authService.validateOAuthUser(oauthProfile)).rejects.toThrow(ConflictException);
      await expect(authService.validateOAuthUser(oauthProfile)).rejects.toThrow(
        '이미 이메일로 가입된 계정입니다. 이메일/비밀번호로 로그인해주세요',
      );
    });

    it('should append _42 to nickname when it already exists and create user', async () => {
      usersService.findByOAuthId.mockResolvedValue(null as any);
      usersService.findByEmail.mockResolvedValue(null as any);
      usersService.findByNickname.mockResolvedValue(mockUser);
      const createdUser = {
        ...mockUser,
        userid: 3,
        email: oauthProfile.email,
        nickname: 'oauthuser_42',
        intraId: oauthProfile.intraId,
        oauthProvider: '42',
        oauthId: oauthProfile.intraId,
        avatarUrl: oauthProfile.avatarUrl,
      };
      usersService.create.mockResolvedValue(createdUser);

      const result = await authService.validateOAuthUser(oauthProfile);

      expect(usersService.create).toHaveBeenCalledWith({
        email: oauthProfile.email,
        nickname: 'oauthuser_42',
        intraId: oauthProfile.intraId,
        oauthProvider: '42',
        oauthId: oauthProfile.intraId,
        avatarUrl: oauthProfile.avatarUrl,
      });
      expect(result).toEqual(createdUser);
    });

    it('should create a new OAuth user when no conflicts exist', async () => {
      usersService.findByOAuthId.mockResolvedValue(null as any);
      usersService.findByEmail.mockResolvedValue(null as any);
      usersService.findByNickname.mockResolvedValue(null as any);
      const createdUser = {
        ...mockUser,
        userid: 4,
        email: oauthProfile.email,
        nickname: oauthProfile.nickname,
        intraId: oauthProfile.intraId,
        oauthProvider: '42',
        oauthId: oauthProfile.intraId,
        avatarUrl: oauthProfile.avatarUrl,
      };
      usersService.create.mockResolvedValue(createdUser);

      const result = await authService.validateOAuthUser(oauthProfile);

      expect(usersService.create).toHaveBeenCalledWith({
        email: oauthProfile.email,
        nickname: oauthProfile.nickname,
        intraId: oauthProfile.intraId,
        oauthProvider: '42',
        oauthId: oauthProfile.intraId,
        avatarUrl: oauthProfile.avatarUrl,
      });
      expect(result).toEqual(createdUser);
    });
  });
});
