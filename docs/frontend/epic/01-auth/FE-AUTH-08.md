# FE-AUTH-08: 프론트 인증 회귀 테스트 기반 추가

> **Epic:** frontend-auth
> **브랜치:** `test/frontend-auth-regression`
> **유형:** test
> **선행 이슈:** `FE-AUTH-01`, `FE-AUTH-02`, `FE-AUTH-05`

## 배경

- 현재 프론트 패키지에는 auth 흐름을 지켜주는 테스트 기반이 사실상 없다.
- 로그인/토큰 갱신/OAuth 콜백 수정이 잦아지면 회귀 버그가 반복될 가능성이 높다.

## 구현 범위

- 프론트 테스트 도구 도입 여부 검토
- 최소한 auth context 또는 핵심 페이지 흐름 테스트 추가
- 로그인 성공/실패, refresh 복구, callback 처리 시나리오 포함

## 권장 커밋 분해

1. `test: add frontend test runtime for auth flows`
   - 범위: `apps/frontend/package.json`, 테스트 설정 파일
   - 내용: Vitest 또는 동등 도구, jsdom, 테스트 스크립트 기반 추가

2. `test: cover auth context bootstrap and login flow`
   - 범위: `AuthContext` 관련 테스트 파일
   - 내용: 초기 인증 확인, 로그인 성공/실패 흐름 검증

3. `test: cover refresh recovery behavior in api client`
   - 범위: `api/client.ts` 관련 테스트 파일
   - 내용: 401 이후 refresh 성공/실패 시나리오 검증

4. `test: cover oauth callback page success and failure cases`
   - 범위: OAuth callback 페이지 테스트
   - 내용: 토큰 저장 성공, 누락, 실패 복귀 케이스 검증

## 완료 기준

- [ ] 프론트 auth 테스트 기반이 추가됨
- [ ] 최소 핵심 인증 흐름 회귀 테스트가 생김
- [ ] 이후 auth 수정 시 자동 검증 포인트가 확보됨
