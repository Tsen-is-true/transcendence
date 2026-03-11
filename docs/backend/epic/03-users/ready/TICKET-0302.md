# TICKET-0302: 친구 시스템 (요청/수락/차단)

> **Epic:** 03-users
> **커밋 메시지:** `feat: implement friend system (request, accept, block)`

## 구현 범위

### Friend 엔티티
- `friends` 테이블 (friendshipId, requesterId, addresseeId, status, createdAt)
- status: 'pending', 'accepted', 'blocked'
- UNIQUE(requesterId, addresseeId)

### POST /friends/:userId
- 친구 요청 보내기
- 중복 요청 방지, 자기 자신 요청 방지

### PATCH /friends/:friendshipId/accept
- 친구 요청 수락 (addressee만 가능)

### DELETE /friends/:friendshipId
- 친구 삭제 / 요청 거절

### GET /friends
- 내 친구 목록
- Query: status ('pending' | 'accepted')
- 각 친구의 isOnline, isPlaying 상태 포함

### POST /friends/:userId/block
- 유저 차단 (기존 친구 관계 → blocked)
- 차단된 유저는 메시지/친구 요청 불가

## 완료 기준
- [ ] 친구 요청/수락/삭제 플로우 동작
- [ ] 친구 목록에서 온라인 상태 확인
- [ ] 유저 차단 동작
- [ ] 중복 요청/자기 자신 요청 에러 처리
