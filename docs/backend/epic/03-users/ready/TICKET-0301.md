# TICKET-0301: 유저 프로필 CRUD 및 아바타 업로드

> **Epic:** 03-users
> **커밋 메시지:** `feat: add user profile CRUD and avatar upload`

## 구현 범위

### GET /users/me
- JWT 인증 필수
- 내 프로필 전체 정보 반환

### PATCH /users/me
- nickname 수정 (중복 검사)
- UpdateProfileDto

### POST /users/me/avatar
- multipart/form-data 파일 업로드
- 지원 타입: jpg, png, gif, webp
- 최대 크기: 5MB
- 서버 저장 경로: `/uploads/avatars/{userId}.{ext}`

### GET /users/:id
- 특정 유저 프로필 조회 (공개 정보만)

### GET /users?search={query}
- 닉네임 부분 일치 검색
- 페이지네이션 (page, limit)

### 기본 아바타
- 아바타 미설정 시 기본 이미지 URL 제공

## 완료 기준
- [ ] 내 프로필 조회/수정 동작
- [ ] 아바타 업로드 및 조회 동작
- [ ] 유저 검색 (페이지네이션) 동작
- [ ] 기본 아바타 표시
