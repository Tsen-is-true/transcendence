# FE-AUTH-05: 42 OAuth 콜백 페이지 및 토큰 저장 처리

> **Epic:** frontend-auth
> **브랜치:** `feat/frontend-oauth-callback`
> **유형:** feature
> **선행 이슈:** `FE-AUTH-04`

## 배경

- 백엔드는 OAuth 성공 후 프론트 `/auth/callback`으로 리다이렉트한다.
- 하지만 현재 프론트 라우트에는 콜백 페이지가 없어 OAuth 로그인이 완료되지 않는다.

## 구현 범위

- `/auth/callback` 라우트와 페이지 추가
- 전달받은 토큰 저장
- `checkAuth` 호출 후 홈 또는 적절한 화면으로 이동
- 실패 케이스에서 에러 노출 및 로그인 페이지 복귀

## 권장 커밋 분해

1. `feat: add oauth callback page route`
   - 범위: `apps/frontend/src/App.tsx`, `apps/frontend/src/pages/index.ts`
   - 내용: `/auth/callback` 라우트와 페이지 export 연결

2. `feat: implement token capture on oauth callback page`
   - 범위: 새 `apps/frontend/src/pages/AuthCallback.tsx` 같은 파일, 필요 시 `apps/frontend/src/api/client.ts`
   - 내용: 쿼리 파라미터에서 토큰을 읽고 저장하는 처리 구현

3. `feat: sync auth context after oauth callback`
   - 범위: 콜백 페이지, `apps/frontend/src/contexts/AuthContext.tsx`
   - 내용: `checkAuth()` 호출 후 홈 또는 의도한 경로로 이동

4. `fix: handle invalid oauth callback states gracefully`
   - 범위: 콜백 페이지
   - 내용: 토큰 누락, 실패 응답, 직접 접근 케이스에서 에러 메시지와 로그인 복귀 처리

## 완료 기준

- [ ] OAuth 콜백 경로가 프론트에 존재함
- [ ] 콜백 성공 시 토큰 저장과 사용자 상태 동기화가 완료됨
- [ ] 실패 케이스에서 무한 로딩 없이 복귀 가능함
