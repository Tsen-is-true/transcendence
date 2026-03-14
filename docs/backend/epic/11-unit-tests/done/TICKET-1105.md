# TICKET-1105: Monitoring 테스트 + 커버리지 검증

> **Epic:** 11-unit-tests
> **커밋 메시지:** `test: add monitoring tests and verify coverage`

## 생성 파일
- `modules/monitoring/metrics.service.spec.ts`
- `modules/monitoring/metrics.controller.spec.ts`
- `common/guards/api-key-throttle.guard.spec.ts`

## 테스트 항목
- MetricsService: inc/set/observe 메서드, getMetrics
- MetricsController: GET /metrics, Content-Type 확인
- ApiKeyThrottleGuard: getTracker(API Key별 트래킹)

## 커버리지 검증
- `npm run test:cov` 실행
- 모든 테스트 통과 확인
