# TICKET-0804: Public API 엔드포인트

> **Epic:** 08-public-api
> **커밋 메시지:** `feat: add public API endpoints (matches, leaderboard, stats)`

## 구현 범위

### GET /api/matches (API Key 인증)
- 매치 히스토리 조회
- 필터: userId, type
- 페이지네이션

### GET /api/leaderboard (API Key 인증)
- 리더보드 조회
- type: elo, wins, level

### GET /api/users/:id/stats (API Key 인증)
- 특정 유저 통계 조회

### 기존 서비스 재활용
- MatchesService, LeaderboardService, UsersService 활용
- Public API 전용 컨트롤러에서 ApiKeyGuard + ThrottlerGuard 적용

## 완료 기준
- [ ] 3개 Public 엔드포인트 동작
- [ ] API Key 인증 필수
- [ ] Rate Limiting 적용
