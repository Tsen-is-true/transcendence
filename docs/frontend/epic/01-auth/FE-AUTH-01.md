# FE-AUTH-01: refresh 응답 파싱 및 토큰 재시도 복구

> **Epic:** frontend-auth
> **브랜치:** `fix/frontend-auth-refresh-parse`
> **유형:** bugfix
> **선행 이슈:** 없음

## 배경

- 프론트 `apiFetch`는 `/api/auth/refresh` 응답을 최상위에서 읽고 있다.
- 실제 응답 포맷은 `data.accessToken`, `data.refreshToken` 구조라서 access token 만료 후 자동 복구가 깨진다.

## 구현 범위

- refresh 성공 응답을 올바른 구조로 파싱
- 새 access token으로 Authorization 헤더를 교체하고 원요청 1회 재시도
- refresh 실패 시 토큰 정리와 인증 해제 처리

## 권장 커밋 분해

1. `fix: parse wrapped refresh payload in api client`
   - 범위: `apps/frontend/src/api/client.ts`
   - 내용: `refreshRes.json()` 결과에서 `data.accessToken`, `data.refreshToken`을 읽도록 수정

2. `refactor: centralize refresh token update and request retry`
   - 범위: `apps/frontend/src/api/client.ts`
   - 내용: 토큰 갱신, Authorization 헤더 교체, 원요청 1회 재시도 흐름을 중복 없이 정리

3. `fix: clear auth tokens on refresh failure paths`
   - 범위: `apps/frontend/src/api/client.ts`
   - 내용: refresh 실패, 응답 포맷 이상, 토큰 누락 케이스에서 정리 로직을 일관화

## 완료 기준

- [ ] access token 만료 후 보호 API가 자동 복구됨
- [ ] refresh 실패 시 토큰과 사용자 상태가 정리됨
- [ ] 원요청 재시도 로직이 중복 호출되지 않음
