# FE-AUTH-06: 로그인/회원가입/설정 검증 규칙 일원화

> **Epic:** frontend-auth
> **브랜치:** `fix/frontend-auth-validation-sync`
> **유형:** bugfix
> **선행 이슈:** 없음

## 배경

- 회원가입과 설정 화면의 비밀번호/닉네임 검증 규칙이 서로 다르다.
- 사용자는 한 화면에서는 통과하고 다른 화면에서는 실패하는 경험을 할 수 있다.

## 구현 범위

- 회원가입과 설정 화면의 닉네임 검증 규칙 일치
- 비밀번호 길이/복잡도 규칙 일치
- 사용자에게 보여주는 에러 메시지 톤과 내용 정리

## 권장 커밋 분해

1. `refactor: extract shared auth validation helpers`
   - 범위: 새 유틸 파일 예: `apps/frontend/src/utils/authValidation.ts`
   - 내용: 닉네임/비밀번호 규칙을 공통 함수로 분리

2. `fix: align register page validation with shared auth rules`
   - 범위: `apps/frontend/src/pages/Register.tsx`
   - 내용: 회원가입 화면이 공통 검증 함수를 사용하도록 변경

3. `fix: align settings page validation with shared auth rules`
   - 범위: `apps/frontend/src/pages/Settings.tsx`
   - 내용: 닉네임 변경, 비밀번호 변경 검증을 동일 규칙으로 맞춤

4. `copy: normalize auth validation error messages`
   - 범위: `Register.tsx`, `Settings.tsx`, 필요 시 Context
   - 내용: 사용자 입장에서 이해 가능한 문구로 에러 메시지 정리

## 완료 기준

- [ ] 회원가입과 설정 화면의 입력 검증 규칙이 일치함
- [ ] 에러 메시지가 사용자 관점에서 이해 가능하게 정리됨
- [ ] 프론트 검증과 서버 기대값의 불일치가 줄어듦
