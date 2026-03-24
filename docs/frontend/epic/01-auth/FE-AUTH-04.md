# FE-AUTH-04: 42 OAuth 로그인 진입 UI 추가

> **Epic:** frontend-auth
> **브랜치:** `feat/frontend-oauth-entry`
> **유형:** feature
> **선행 이슈:** 없음

## 배경

- 백엔드에는 42 OAuth 엔드포인트가 있지만 프론트 로그인 화면에는 진입 버튼이 없다.
- 현재 사용자는 이메일 로그인만 시도할 수 있고 OAuth 플로우를 시작할 수 없다.

## 구현 범위

- 로그인 화면에 `42로 로그인` 버튼 추가
- `/api/auth/42`로 이동하도록 연결
- 기존 이메일 로그인 폼과 시각적으로 조화되게 배치

## 권장 커밋 분해

1. `feat: add 42 oauth entry button to login page`
   - 범위: `apps/frontend/src/pages/Login.tsx`
   - 내용: 이메일 로그인 폼과 분리된 42 로그인 버튼 추가

2. `feat: wire login page oauth button to auth endpoint`
   - 범위: `apps/frontend/src/pages/Login.tsx`
   - 내용: 버튼 클릭 시 `/api/auth/42`로 이동하는 핸들러 연결

3. `style: tune login layout for dual auth entry points`
   - 범위: `apps/frontend/src/pages/Login.tsx`
   - 내용: 구분선, 안내 문구, 버튼 배치를 정리해 시각적 충돌을 줄임

## 완료 기준

- [ ] 로그인 페이지에서 42 OAuth 진입 버튼이 노출됨
- [ ] 버튼 클릭 시 OAuth 로그인 플로우가 시작됨
- [ ] 이메일 로그인과 OAuth 진입이 함께 사용 가능함
