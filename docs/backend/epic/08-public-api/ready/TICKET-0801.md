# TICKET-0801: API Key CRUD 엔드포인트

> **Epic:** 08-public-api
> **커밋 메시지:** `feat: add API Key CRUD endpoints`

## 구현 범위

### ApiKey 엔티티
- api_keys 테이블 (apiKeyId, userId, keyHash, keyPrefix, name, isActive, lastUsedAt, expiresAt)

### POST /api/api-keys (JWT 인증)
- 랜덤 키 생성 (`tk_{32자 hex}`)
- SHA-256 해시 → DB 저장
- 원본 키 1회만 응답에 포함

### GET /api/api-keys (JWT 인증)
- 내 API Key 목록 (keyPrefix만 표시)

### PUT /api/api-keys/:id (JWT 인증)
- name, isActive 수정

### DELETE /api/api-keys/:id (JWT 인증)
- API Key 삭제

## 완료 기준
- [ ] API Key 생성 시 원본 키 반환
- [ ] 목록/수정/삭제 동작
- [ ] 본인 키만 관리 가능
