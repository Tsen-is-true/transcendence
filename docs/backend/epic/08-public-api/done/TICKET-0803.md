# TICKET-0803: Rate Limiting (Throttler)

> **Epic:** 08-public-api
> **커밋 메시지:** `feat: add rate limiting with throttler`

## 구현 범위

### ThrottlerModule 설정
- ttl: 60초, limit: 60회 (분당 60회)
- Public API 엔드포인트에 적용

### 응답 헤더
- `X-RateLimit-Limit`: 60
- `X-RateLimit-Remaining`: 남은 횟수
- `X-RateLimit-Reset`: 리셋 타임스탬프

### 429 Too Many Requests
- 한도 초과 시 에러 응답 + 재시도 가능 시간 안내

## 완료 기준
- [ ] 분당 60회 초과 시 429 응답
- [ ] Rate Limit 헤더 포함
- [ ] API Key별 독립 카운팅
