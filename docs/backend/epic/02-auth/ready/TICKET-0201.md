# TICKET-0201: 이메일/비밀번호 회원가입 및 로그인

> **Epic:** 02-auth
> **커밋 메시지:** `feat: add email/password registration and login`

## 구현 범위

### User 엔티티 생성
- `users` 테이블 매핑 (userid, email, password, nickname, avatarUrl 등)
- schema-changes.md 기준 전체 컬럼 포함

### POST /auth/register
- email, password, nickname 입력
- email 중복 검사, nickname 중복 검사
- bcrypt 해싱 (salt rounds: 12)
- 비밀번호 정책: 최소 8자, 대문자+소문자+숫자+특수문자

### POST /auth/login
- email + password 검증
- Passport LocalStrategy 사용
- 성공 시 유저 정보 반환 (JWT는 TICKET-0202에서)

### DTO
- `RegisterDto` (email, password, nickname)
- `LoginDto` (email, password)
- class-validator 데코레이터 적용

## 완료 기준
- [ ] 회원가입 시 유저 DB 저장 (비밀번호 해시)
- [ ] 로그인 시 이메일/비밀번호 검증 성공
- [ ] 중복 이메일/닉네임 에러 처리
- [ ] 비밀번호 정책 검증 동작
