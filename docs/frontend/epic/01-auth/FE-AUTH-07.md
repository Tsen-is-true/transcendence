# FE-AUTH-07: 레거시 세션 인증 코드 제거

> **Epic:** frontend-auth
> **브랜치:** `chore/frontend-auth-legacy-cleanup`
> **유형:** chore
> **선행 이슈:** 없음

## 배경

- `apps/frontend/src/api/routes/auth.js`와 관련 middleware에는 세션/Prisma 기반 인증 코드가 남아 있다.
- 현재 프론트 앱은 JWT 기반 흐름을 사용하고 있어, 이 코드는 유지보수 중 혼선을 만든다.

## 구현 범위

- 현재 런타임에 사용되지 않는 세션 기반 인증 코드 식별
- 제거 가능한 파일 정리 또는 명확한 분리
- 실제 사용하는 인증 진입점만 남기도록 구조 단순화

## 권장 커밋 분해

1. `chore: audit legacy session auth files in frontend app`
   - 범위: 문서 또는 주석 수준의 식별 작업
   - 내용: 실제 미사용 파일 목록과 영향 범위를 먼저 확정

2. `chore: remove unused legacy auth routes and middleware`
   - 범위: `apps/frontend/src/api/routes/auth.js`, `apps/frontend/src/api/middleware/auth.js`, 관련 미사용 route
   - 내용: JWT 흐름과 무관한 세션 인증 코드를 제거

3. `chore: delete leftover session-based auth references`
   - 범위: 관련 import, dead code, 주석
   - 내용: 제거 후 남는 참조나 문서 흔적을 정리

## 완료 기준

- [ ] 사용되지 않는 세션 인증 코드 범위가 정리됨
- [ ] 프론트 인증 구조를 읽을 때 혼선이 줄어듦
- [ ] JWT 기반 현재 흐름과 무관한 코드가 분리 또는 제거됨
