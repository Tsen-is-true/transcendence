# TICKET-0203: 42 OAuth 로그인 연동

> **Epic:** 02-auth
> **커밋 메시지:** `feat: add 42 OAuth login integration`

## 구현 범위

### GET /auth/42
- 42 인트라넷 OAuth 페이지로 리다이렉트

### GET /auth/42/callback
- 42에서 콜백 수신
- Authorization Code → Access Token 교환
- 유저 정보 조회 (intraId, login, image)

### 자동 회원가입/로그인
- oauthId로 기존 유저 검색
- 신규: 자동 회원가입 (intraId, nickname=login, avatarUrl=image)
- 기존: 로그인 처리
- JWT 토큰 발급

### 환경변수
- `OAUTH_42_CLIENT_ID`
- `OAUTH_42_CLIENT_SECRET`
- `OAUTH_42_CALLBACK_URL`

### 프론트엔드 연동
- 콜백 후 프론트엔드로 리다이렉트 (토큰 전달)

## 완료 기준
- [ ] 42 OAuth 로그인 플로우 동작
- [ ] 신규 유저 자동 회원가입
- [ ] 기존 유저 로그인 처리
- [ ] JWT 토큰 발급 후 프론트엔드 리다이렉트
