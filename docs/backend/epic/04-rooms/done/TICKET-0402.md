# TICKET-0402: 방 참가/퇴장 + 동시성 제어

> **Epic:** 04-rooms
> **커밋 메시지:** `feat: implement room join/leave with concurrency control`

## 구현 범위

### POST /rooms/:roomId/join
- 참가 검증: status===waiting, countPlayers < maxPlayers, 중복 방지
- DB 트랜잭션으로 countPlayers 체크+증가 원자적 처리
- 다른 방에 이미 참가 중인지 확인

### POST /rooms/:roomId/leave
- 일반 멤버: room_member 삭제, countPlayers 감소
- 방장 퇴장: 다음 멤버에게 방장 이전 (없으면 방 삭제)
- 트랜잭션으로 원자적 처리

### 동시성 제어
- 방 참가: 비관적 잠금 또는 트랜잭션 격리 수준 활용
- 동시에 여러 유저가 참가해도 maxPlayers 초과 방지

## 완료 기준
- [ ] 방 참가/퇴장 API 동작
- [ ] 동시 참가 시 maxPlayers 초과 방지
- [ ] 방장 퇴장 시 이전 또는 삭제 동작
- [ ] 다른 방 참가 중일 때 에러 처리
