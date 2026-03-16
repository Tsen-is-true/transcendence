# TICKET-0805: Swagger 문서화

> **Epic:** 08-public-api
> **커밋 메시지:** `feat: configure Swagger documentation`

## 구현 범위

### Swagger 설정 (main.ts)
- DocumentBuilder: 타이틀, 설명, 버전
- API Key 스키마 (X-API-Key 헤더)
- Bearer Auth 스키마

### DTO 데코레이터
- `@ApiProperty()` 모든 DTO 필드에 적용
- `@ApiResponse()` 각 엔드포인트 응답 문서화
- `@ApiTags()` 모듈별 그룹핑

### 접근 URL
- Swagger UI: `/api/docs`
- OpenAPI JSON: `/api/docs-json`

## 완료 기준
- [ ] `/api/docs`에서 Swagger UI 접근 가능
- [ ] 모든 Public API 엔드포인트 문서화
- [ ] API Key 인증 방식 문서화
- [ ] 요청/응답 스키마 정확성
