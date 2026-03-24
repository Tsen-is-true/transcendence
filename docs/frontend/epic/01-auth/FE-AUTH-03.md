# FE-AUTH-03: 보호 라우트 공통 가드 도입

> **Epic:** frontend-auth
> **브랜치:** `feat/frontend-protected-routes`
> **유형:** feature
> **선행 이슈:** `FE-AUTH-02`

## 배경

- 현재 인증이 필요한 페이지들은 각 페이지마다 `navigate('/login')`와 `if (!user) return null` 패턴을 반복한다.
- 이 구조는 페이지가 늘어날수록 중복과 누락 가능성을 키운다.

## 구현 범위

- `ProtectedRoute` 또는 동등한 공통 가드 컴포넌트 추가
- 로그인 화면 등 비로그인 전용 페이지에는 guest-only 처리 검토
- 기존 인증 필요 페이지를 공통 가드로 치환

## 권장 커밋 분해

1. `feat: add protected route component for authenticated pages`
   - 범위: `apps/frontend/src/components` 또는 `apps/frontend/src/routes`
   - 내용: 인증/로딩/리다이렉트 책임을 가지는 공통 가드 컴포넌트 추가

2. `refactor: wrap protected pages with shared auth guard`
   - 범위: `apps/frontend/src/App.tsx`
   - 내용: `Settings`, `Friends`, `LobbyList`, `RoomView`, `OnlineGame` 같은 보호 페이지를 공통 가드로 연결

3. `chore: remove duplicated page-level login redirects`
   - 범위: 각 보호 페이지
   - 내용: 기존 `navigate('/login')`, `if (!user) return null` 패턴 제거 또는 최소화

4. `feat: add guest-only guard for login and register pages`
   - 범위: `apps/frontend/src/App.tsx`, 로그인/회원가입 라우트 주변
   - 내용: 로그인된 사용자가 `/login`, `/register`에 들어올 때 리다이렉트 처리

## 완료 기준

- [ ] 보호 페이지의 인증 검사 로직이 공통 컴포넌트로 통합됨
- [ ] 중복 `navigate('/login')` 로직이 줄어듦
- [ ] 비로그인 상태에서 보호 페이지 접근 시 일관된 UX 제공
