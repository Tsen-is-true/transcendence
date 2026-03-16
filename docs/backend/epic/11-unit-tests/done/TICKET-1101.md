# TICKET-1101: Auth·Users 모듈 테스트

> **Epic:** 11-unit-tests
> **커밋 메시지:** `test: add unit tests for auth and users modules`

## 생성 파일
- `modules/auth/auth.service.spec.ts`
- `modules/auth/auth.controller.spec.ts`
- `modules/users/users.service.spec.ts`
- `modules/users/users.controller.spec.ts`
- `modules/users/leaderboard.controller.spec.ts`
- `modules/users/gateways/status.gateway.spec.ts`
- `common/guards/api-key.guard.spec.ts`

## 테스트 항목
- AuthService: register, login, refresh, logout, validateOAuth
- AuthController: 각 엔드포인트 호출 확인
- UsersService: getUserStats, getMatchHistory, getLeaderboard, search
- UsersController: 프로필 조회/수정, NotFoundException
- LeaderboardController: getLeaderboard 호출
- StatusGateway: JWT 인증, 연결/해제, 온라인 상태 브로드캐스트
- ApiKeyGuard: API Key 검증, 만료/비활성 거부
