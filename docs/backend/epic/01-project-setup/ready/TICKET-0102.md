# TICKET-0102: 공통 모듈 (Guards, Filters, Interceptors, Pipes)

> **Epic:** 01-project-setup
> **커밋 메시지:** `feat: add common modules (guards, filters, interceptors, pipes)`

## 관련 태스크
- 1.7 공통 모듈 구현

## 구현 범위

### GlobalExceptionFilter
- HTTP 예외 통합 처리
- 에러 응답 포맷 통일: `{ statusCode, message, error, details }`
- Validation 에러 시 필드별 메시지 포함

### TransformInterceptor
- 성공 응답 래핑: `{ statusCode, message, data }`
- 일관된 응답 구조

### ValidationPipe (글로벌)
- `class-validator` 기반 DTO 자동 검증
- `whitelist: true` (DTO에 없는 필드 제거)
- `transform: true` (자동 타입 변환)

### CurrentUser Decorator
- JWT 페이로드에서 유저 정보 추출
- `@CurrentUser() user` 형태로 컨트롤러에서 사용

### JwtAuthGuard (기본 구조)
- `@nestjs/passport`의 `AuthGuard('jwt')` 확장
- Epic 02에서 전략 구현 후 완전 동작

## 완료 기준
- [ ] 유효하지 않은 요청 시 포맷된 에러 응답 반환
- [ ] 성공 응답이 `{ statusCode, message, data }` 형태
- [ ] DTO 유효성 검증 동작 (잘못된 필드 자동 제거)
- [ ] CurrentUser 데코레이터 타입 정의 완료
