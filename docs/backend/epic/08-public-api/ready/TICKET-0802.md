# TICKET-0802: API Key 인증 Guard

> **Epic:** 08-public-api
> **커밋 메시지:** `feat: implement API Key authentication guard`

## 구현 범위

### ApiKeyGuard
- `X-API-Key` 헤더에서 키 추출
- SHA-256 해시 후 DB 조회
- isActive 확인, 만료일 확인
- lastUsedAt 업데이트
- request.apiKeyUser에 유저 정보 설정

### 에러 처리
- 키 없음 → 401 'API Key required'
- 키 유효하지 않음 → 401 'Invalid API Key'
- 키 만료 → 401 'API Key expired'

## 완료 기준
- [ ] X-API-Key 헤더 인증 동작
- [ ] 비활성/만료 키 거부
- [ ] lastUsedAt 자동 갱신
