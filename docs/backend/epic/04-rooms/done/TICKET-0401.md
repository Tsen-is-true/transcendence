# TICKET-0401: 방 CRUD REST API

> **Epic:** 04-rooms
> **커밋 메시지:** `feat: add room CRUD REST API`

## 구현 범위

### Room, RoomMember 엔티티
- `rooms` 테이블 (roomId, hostUserId, title, status, isTournament, countPlayers, maxPlayers)
- `room_members` 테이블 (roomMemberId, roomId, userId, isReady, joinedAt)
- status: ENUM('waiting', 'playing', 'finished')

### POST /rooms
- 방 생성 (title, isTournament)
- maxPlayers: 1:1→2, 토너먼트→4
- 방장 자동 room_members 추가

### GET /rooms
- 방 목록 조회
- 필터: status, isTournament
- 페이지네이션

### GET /rooms/:roomId
- 방 상세 (멤버 목록 포함)

### DELETE /rooms/:roomId
- 방 삭제 (방장만)

## 완료 기준
- [ ] 방 생성/목록/상세/삭제 API 동작
- [ ] 방장이 자동으로 멤버에 추가
- [ ] 1:1 / 토너먼트 모드 분기 동작
