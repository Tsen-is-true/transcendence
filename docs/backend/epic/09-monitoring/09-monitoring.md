# Epic 09: 모니터링 (Prometheus + Grafana)

> Prometheus 메트릭 노출, Grafana 커스텀 대시보드, 알람 규칙

## 목표
- NestJS에서 Prometheus 메트릭 엔드포인트 (`/metrics`) 노출
- 커스텀 비즈니스 메트릭 수집
- Grafana 커스텀 대시보드 구성
- 알람 규칙 설정 (에러율, 지연, 다운)
- Grafana 접근 보안 (기본 인증)

---

## 아키텍처

```
NestJS Backend ──→ /metrics ──→ Prometheus (스크래핑) ──→ Grafana (시각화)
```

---

## NestJS 메트릭 설정

### 의존성
```
prom-client
@willsoto/nestjs-prometheus (또는 직접 구현)
```

### 기본 메트릭 (자동 수집)

| 메트릭 | 타입 | 설명 |
|--------|------|------|
| `http_requests_total` | Counter | 총 HTTP 요청 수 (method, path, status) |
| `http_request_duration_seconds` | Histogram | HTTP 요청 처리 시간 |
| `nodejs_heap_size_bytes` | Gauge | Node.js 힙 메모리 |
| `nodejs_active_handles_total` | Gauge | 활성 핸들 수 |
| `process_cpu_seconds_total` | Counter | CPU 사용 시간 |

### 커스텀 비즈니스 메트릭

| 메트릭 | 타입 | 라벨 | 설명 |
|--------|------|------|------|
| `game_active_matches` | Gauge | - | 현재 진행 중인 게임 수 |
| `game_active_tournaments` | Gauge | - | 현재 진행 중인 토너먼트 수 |
| `websocket_connections_total` | Gauge | namespace | WebSocket 연결 수 |
| `game_matches_total` | Counter | result(win/draw) | 총 완료된 매치 수 |
| `game_match_duration_seconds` | Histogram | type(1v1/tournament) | 매치 소요 시간 |
| `user_registrations_total` | Counter | method(email/oauth) | 총 회원가입 수 |
| `api_key_requests_total` | Counter | endpoint | API Key 요청 수 |
| `auth_login_total` | Counter | result(success/fail) | 로그인 시도 수 |
| `rooms_active_total` | Gauge | type(1v1/tournament) | 활성 방 수 |

### 구현 예시
```typescript
@Injectable()
export class MetricsService {
  private activeMatches: Gauge;
  private matchesTotal: Counter;
  private matchDuration: Histogram;

  constructor(@InjectMetric('game_active_matches') activeMatches: Gauge) {
    this.activeMatches = activeMatches;
  }

  onMatchStart() { this.activeMatches.inc(); }
  onMatchEnd(durationSec: number) {
    this.activeMatches.dec();
    this.matchesTotal.inc();
    this.matchDuration.observe(durationSec);
  }
}
```

### `/metrics` 엔드포인트
```
# HELP game_active_matches Current number of active matches
# TYPE game_active_matches gauge
game_active_matches 3

# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",path="/api/leaderboard",status="200"} 142
```

---

## Docker Compose 추가 서비스

```yaml
# docker-compose.yml에 추가
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./infra/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - app-network

  grafana:
    image: grafana/grafana:latest
    volumes:
      - grafana_data:/var/lib/grafana
      - ./infra/grafana/provisioning:/etc/grafana/provisioning
      - ./infra/grafana/dashboards:/var/lib/grafana/dashboards
    ports:
      - "3002:3000"
    environment:
      - GF_SECURITY_ADMIN_USER=${GRAFANA_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD:-changeme}
    networks:
      - app-network
```

### Prometheus 설정 (`infra/prometheus/prometheus.yml`)
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'nestjs-backend'
    metrics_path: /metrics
    static_configs:
      - targets: ['backend:3001']

  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

---

## Grafana 대시보드

### Dashboard 1: 서비스 개요
- HTTP 요청 수 (시간대별)
- HTTP 에러율 (4xx, 5xx)
- 평균 응답 시간
- WebSocket 연결 수
- CPU / 메모리 사용량

### Dashboard 2: 게임 메트릭
- 활성 게임 수 (실시간)
- 매치 완료 수 (시간대별)
- 평균 매치 시간
- 활성 토너먼트 수
- 활성 방 수

### Dashboard 3: 유저 메트릭
- 일별 신규 가입 수
- 로그인 성공/실패 비율
- API Key 사용량
- 동시 접속자 수

---

## 알람 규칙

### Prometheus Alert Rules (`infra/prometheus/alerts.yml`)

| 알람 | 조건 | 심각도 |
|------|------|--------|
| HighErrorRate | 5xx 비율 > 5% (5분간) | critical |
| HighLatency | P95 응답시간 > 2초 (5분간) | warning |
| ServiceDown | 타겟 다운 (1분간) | critical |
| HighMemoryUsage | 힙 메모리 > 512MB | warning |
| NoActiveGames | 활성 게임 0 (피크타임) | info |

### Grafana 알람 채널
- Grafana 내장 알람 → 대시보드에 시각적 표시

---

## Grafana 접근 보안

- 기본 인증: admin/password (환경변수로 설정)
- 리버스 프록시(Nginx) 뒤에 배치 가능
- 환경변수: `GRAFANA_USER`, `GRAFANA_PASSWORD`

---

## 파일 구조
```
infra/
├── prometheus/
│   ├── prometheus.yml
│   └── alerts.yml
├── grafana/
│   ├── provisioning/
│   │   ├── datasources/
│   │   │   └── prometheus.yml
│   │   └── dashboards/
│   │       └── dashboards.yml
│   └── dashboards/
│       ├── service-overview.json
│       ├── game-metrics.json
│       └── user-metrics.json
```

---

## 완료 기준
- [ ] `/metrics` 엔드포인트에서 Prometheus 메트릭 노출
- [ ] 커스텀 비즈니스 메트릭 5개+ 수집
- [ ] Prometheus 스크래핑 동작
- [ ] Grafana 대시보드 3개 구성
- [ ] 알람 규칙 3개+ 설정
- [ ] Grafana 접근 보안 (admin 인증)
- [ ] Docker Compose로 전체 스택 실행

---

## 커밋 단위
1. `feat: add Prometheus metrics endpoint with custom metrics`
2. `feat: configure Prometheus and Grafana Docker services`
3. `feat: create Grafana dashboards and alert rules`
