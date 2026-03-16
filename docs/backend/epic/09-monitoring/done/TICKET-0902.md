# TICKET-0902: Prometheus + Grafana Docker 서비스

> **Epic:** 09-monitoring
> **커밋 메시지:** `feat: configure Prometheus and Grafana Docker services`

## 구현 범위

### docker-compose.yml 서비스 추가
- `prometheus` 서비스 (prom/prometheus:latest, 포트 9090)
- `grafana` 서비스 (grafana/grafana:latest, 포트 3002)

### Prometheus 설정
- `infra/prometheus/prometheus.yml`
- scrape_interval: 15s
- job: nestjs-backend (target: backend:3001)

### Grafana 설정
- 환경변수: GF_SECURITY_ADMIN_USER, GF_SECURITY_ADMIN_PASSWORD
- Datasource 자동 프로비저닝 (Prometheus)

### 파일 구조
```
infra/
├── prometheus/
│   └── prometheus.yml
└── grafana/
    └── provisioning/
        └── datasources/
            └── prometheus.yml
```

## 완료 기준
- [ ] docker compose up으로 Prometheus + Grafana 실행
- [ ] Prometheus에서 backend 메트릭 스크래핑
- [ ] Grafana에서 Prometheus 데이터소스 자동 연결
- [ ] Grafana 로그인 (admin 인증) 동작
