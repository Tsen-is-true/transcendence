# Epic 11: 백엔드 단위 테스트

> 모든 Service, Controller, Gateway, Guard에 대한 Jest 단위 테스트 작성

## 목표
- 모든 비즈니스 로직(Service) 단위 테스트
- 모든 엔드포인트(Controller) 라우팅·파라미터 검증 테스트
- WebSocket 이벤트(Gateway) 핸들링 테스트
- Guard 인증 흐름 테스트
- 테스트 커버리지 확인

---

## 테스트 대상

### Services (12개)
- AuthService, UsersService, RoomsService, PongEngineService
- GameResultService, TournamentsService, FriendsService
- ChatService, AchievementsService, ApiKeysService, MetricsService

### Controllers (11개)
- AuthController, UsersController, LeaderboardController
- RoomsController, TournamentsController, FriendsController
- ChatController, AchievementsController, ApiKeysController
- PublicApiController, MetricsController

### Gateways (4개)
- StatusGateway, LobbyGateway, GameGateway, ChatGateway

### Guards (2개)
- ApiKeyGuard, ApiKeyThrottleGuard

---

## 테스트 패턴
- **Service**: Repository mock → 비즈니스 로직 검증
- **Controller**: Service mock → 엔드포인트 라우팅·파라미터 검증
- **Gateway**: JwtService·Service mock → 소켓 이벤트 핸들링 검증
- **Guard**: ExecutionContext mock → 인증 흐름 검증

## 티켓 목록

| 티켓 | 제목 | 테스트 파일 수 |
|------|------|---------------|
| TICKET-1101 | Auth·Users 모듈 테스트 | 7 |
| TICKET-1102 | Friends·Chat 모듈 테스트 | 5 |
| TICKET-1103 | Rooms·Game 모듈 테스트 | 6 |
| TICKET-1104 | Tournaments·Achievements·ApiKeys 테스트 | 7 |
| TICKET-1105 | Monitoring 테스트 + 커버리지 검증 | 3 |
