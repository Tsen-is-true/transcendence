# TICKET-0202: JWT Access/Refresh Token 인증

> **Epic:** 02-auth
> **커밋 메시지:** `feat: implement JWT access/refresh token authentication`

## 구현 범위

### JWT 발급
- Access Token: 만료 15분, Payload `{ sub, email, nickname }`
- Refresh Token: 만료 7일
- 로그인 성공 시 양쪽 토큰 발급

### POST /auth/refresh
- Refresh Token으로 새 Access Token + Refresh Token 발급
- 기존 Refresh Token 무효화 (토큰 로테이션)

### POST /auth/logout
- Refresh Token 무효화

### JwtStrategy (Passport)
- Bearer Token 검증
- JwtAuthGuard 완성

### 보호 라우트
- `@UseGuards(JwtAuthGuard)` 적용
- `@CurrentUser()` 데코레이터로 유저 정보 접근

## 완료 기준
- [ ] 로그인 시 accessToken + refreshToken 반환
- [ ] 보호된 라우트에 유효한 토큰 필요
- [ ] 만료된 토큰 → 401 응답
- [ ] Refresh Token으로 갱신 동작
- [ ] 로그아웃 시 Refresh Token 무효화
