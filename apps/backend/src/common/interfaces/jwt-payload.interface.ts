export interface JwtPayload {
  sub: number;
  email: string;
  nickname: string;
  iat?: number;
  exp?: number;
}
