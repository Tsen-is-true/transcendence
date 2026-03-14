# TICKET-0901: Prometheus 메트릭 엔드포인트 + 커스텀 메트릭

> **Epic:** 09-monitoring
> **커밋 메시지:** `feat: add Prometheus metrics endpoint with custom metrics`

## 구현 범위

### 의존성
- `prom-client`, `@willsoto/nestjs-prometheus`

### /metrics 엔드포인트
- 기본 메트릭 자동 수집 (HTTP 요청, Node.js 힙, CPU)

### 커스텀 비즈니스 메트릭
- `game_active_matches` (Gauge) - 활성 게임 수
- `game_active_tournaments` (Gauge) - 활성 토너먼트 수
- `websocket_connections_total` (Gauge) - WebSocket 연결 수
- `game_matches_total` (Counter) - 완료 매치 수
- `game_match_duration_seconds` (Histogram) - 매치 소요 시간
- `user_registrations_total` (Counter) - 가입 수
- `auth_login_total` (Counter) - 로그인 시도 수
- `api_key_requests_total` (Counter) - API Key 요청 수
- `rooms_active_total` (Gauge) - 활성 방 수

### MetricsService
- 각 이벤트 발생 시 메트릭 업데이트 호출

## 완료 기준
- [ ] `/metrics`에서 Prometheus 형식 메트릭 출력
- [ ] 커스텀 메트릭 9개+ 수집 동작
- [ ] 게임 시작/종료 시 메트릭 자동 갱신
