import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FtOAuthService } from './strategies/ft-oauth.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let ftOAuthService: jest.Mocked<FtOAuthService>;
  let configService: jest.Mocked<ConfigService>;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    validateOAuthUser: jest.fn(),
  };

  const mockFtOAuthService = {
    getAuthorizationUrl: jest.fn(),
    exchangeCodeForToken: jest.fn(),
    getUserInfo: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: FtOAuthService, useValue: mockFtOAuthService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    ftOAuthService = module.get(FtOAuthService);
    configService = module.get(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register with the dto and return the result', async () => {
      const dto: RegisterDto = {
        email: 'test@example.com',
        password: 'password123',
        nickname: 'tester',
      };
      const expected = { userid: 1, email: dto.email, nickname: dto.nickname };
      authService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('login', () => {
    it('should call authService.login with req.user and return tokens', async () => {
      const user = { userid: 1, email: 'test@example.com', nickname: 'tester' };
      const req = { user };
      const expected = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { userid: 1, email: 'test@example.com', nickname: 'tester', avatarUrl: null },
      };
      authService.login.mockResolvedValue(expected);

      const result = await controller.login({} as any, req);

      expect(authService.login).toHaveBeenCalledWith(user);
      expect(result).toEqual(expected);
    });
  });

  describe('refresh', () => {
    it('should call authService.refreshTokens with the refresh token', async () => {
      const dto: RefreshTokenDto = { refreshToken: 'old-refresh-token' };
      const expected = { accessToken: 'new-access', refreshToken: 'new-refresh' };
      authService.refreshTokens.mockResolvedValue(expected);

      const result = await controller.refresh(dto);

      expect(authService.refreshTokens).toHaveBeenCalledWith('old-refresh-token');
      expect(result).toEqual(expected);
    });
  });

  describe('logout', () => {
    it('should call authService.logout and return a success message', async () => {
      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(1);

      expect(authService.logout).toHaveBeenCalledWith(1);
      expect(result).toEqual({ message: '로그아웃되었습니다' });
    });
  });

  describe('ft42Auth', () => {
    it('should redirect to the 42 OAuth authorization URL', async () => {
      const authUrl = 'https://api.intra.42.fr/oauth/authorize?client_id=abc';
      ftOAuthService.getAuthorizationUrl.mockReturnValue(authUrl);

      const res = {
        redirect: jest.fn(),
      } as any;

      await controller.ft42Auth(res);

      expect(ftOAuthService.getAuthorizationUrl).toHaveBeenCalled();
      expect(res.redirect).toHaveBeenCalledWith(authUrl);
    });
  });

  describe('ft42Callback', () => {
    it('should complete the full OAuth flow and redirect with tokens', async () => {
      const code = 'oauth-code';
      const ftAccessToken = 'ft-access-token';
      const profile = {
        intraId: 'jdoe',
        email: 'jdoe@student.42.fr',
        nickname: 'jdoe',
        avatarUrl: 'https://cdn.intra.42.fr/avatar.jpg',
      };
      const user = {
        userid: 1,
        email: profile.email,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl,
      };
      const tokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user,
      };
      const frontendUrl = 'http://localhost:3000';

      ftOAuthService.exchangeCodeForToken.mockResolvedValue(ftAccessToken);
      ftOAuthService.getUserInfo.mockResolvedValue(profile);
      authService.validateOAuthUser.mockResolvedValue(user as any);
      authService.login.mockResolvedValue(tokens);
      configService.get.mockReturnValue(frontendUrl);

      const res = {
        redirect: jest.fn(),
      } as any;

      await controller.ft42Callback(code, res);

      expect(ftOAuthService.exchangeCodeForToken).toHaveBeenCalledWith(code);
      expect(ftOAuthService.getUserInfo).toHaveBeenCalledWith(ftAccessToken);
      expect(authService.validateOAuthUser).toHaveBeenCalledWith(profile);
      expect(authService.login).toHaveBeenCalledWith(user);
      expect(configService.get).toHaveBeenCalledWith('cors.origin');
      expect(res.redirect).toHaveBeenCalledWith(
        `${frontendUrl}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
      );
    });
  });
});
