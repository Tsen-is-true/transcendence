# TICKET-0903: Grafana 대시보드 및 알람 규칙

> **Epic:** 09-monitoring
> **커밋 메시지:** `feat: create Grafana dashboards and alert rules`

## 구현 범위

### 대시보드 3개 (JSON 프로비저닝)
1. **Service Overview** - HTTP 요청수, 에러율, 응답시간, 메모리, WebSocket 연결
2. **Game Metrics** - 활성 게임, 완료 매치, 평균 매치 시간, 활성 방
3. **User Metrics** - 일별 가입, 로그인 성공/실패, API Key 사용량

### 알람 규칙
- HighErrorRate: 5xx > 5% (5분간) → critical
- HighLatency: P95 > 2초 (5분간) → warning
- ServiceDown: 타겟 다운 (1분) → critical

### 파일 구조
```
infra/grafana/
├── provisioning/dashboards/dashboards.yml
└── dashboards/
    ├── service-overview.json
    ├── game-metrics.json
    └── user-metrics.json
```

## 완료 기준
- [ ] 3개 대시보드 자동 프로비저닝
- [ ] 대시보드 패널 정상 데이터 표시
- [ ] 알람 규칙 3개 설정 완료
