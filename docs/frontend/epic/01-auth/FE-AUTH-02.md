# FE-AUTH-02: AuthContext 초기화/로그아웃 흐름 정리

> **Epic:** frontend-auth
> **브랜치:** `refactor/frontend-auth-context-flow`
> **유형:** refactor
> **선행 이슈:** `FE-AUTH-01`

## 배경

- 현재 `AuthContext`는 `checkAuth`, `login`, `logout` 흐름이 분산되어 있다.
- 인증 실패, 토큰 만료, 로그아웃 시 사용자 상태와 라우팅 전환이 일관되지 않다.

## 구현 범위

- 초기 앱 부팅 시 인증 상태 확인 흐름 정리
- `logout` 이후 상태 초기화와 이동 흐름 개선
- 에러 상태, loading 상태, 비인증 상태를 명확하게 분리

## 권장 커밋 분해

1. `refactor: extract auth bootstrap and user mapping in auth context`
   - 범위: `apps/frontend/src/contexts/AuthContext.tsx`
   - 내용: `checkAuth` 내부의 응답 파싱과 사용자 매핑을 헬퍼 수준으로 정리

2. `refactor: normalize login and logout state transitions`
   - 범위: `apps/frontend/src/contexts/AuthContext.tsx`
   - 내용: 로그인 성공, 로그아웃, 인증 실패 시 `user`와 `loading` 상태 전환을 명확히 정리

3. `refactor: separate auth loading from unauthenticated state`
   - 범위: `apps/frontend/src/contexts/AuthContext.tsx`, 필요 시 인증 의존 페이지 일부
   - 내용: 로딩 중과 비로그인 상태를 혼동하지 않도록 Context 반환값과 소비 방식 정리

## 완료 기준

- [ ] 앱 최초 진입 시 인증 상태 부트스트랩이 안정적으로 동작
- [ ] 로그아웃 후 사용자 상태가 즉시 초기화됨
- [ ] 인증 실패와 로딩 상태가 컴포넌트 전반에서 일관되게 처리됨
