import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface FtUserProfile {
  intraId: string;
  email: string;
  nickname: string;
  avatarUrl: string | null;
}

@Injectable()
export class FtOAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>('oauth.ft.clientId')!;
    this.clientSecret = this.configService.get<string>('oauth.ft.clientSecret')!;
    this.callbackUrl = this.configService.get<string>('oauth.ft.callbackUrl')!;
  }

  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      response_type: 'code',
    });
    return `https://api.intra.42.fr/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('https://api.intra.42.fr/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: this.callbackUrl,
      }),
    });

    if (!response.ok) {
      throw new UnauthorizedException('42 OAuth 토큰 교환에 실패했습니다');
    }

    const data = await response.json();
    return data.access_token;
  }

  async getUserInfo(accessToken: string): Promise<FtUserProfile> {
    const response = await fetch('https://api.intra.42.fr/v2/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new UnauthorizedException('42 사용자 정보 조회에 실패했습니다');
    }

    const data = await response.json();
    return {
      intraId: data.login,
      email: data.email,
      nickname: data.login,
      avatarUrl: data.image?.link || null,
    };
  }
}
