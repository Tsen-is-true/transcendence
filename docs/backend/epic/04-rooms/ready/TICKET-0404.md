# TICKET-0404: Ready 시스템 및 게임 시작 트리거

> **Epic:** 04-rooms
> **커밋 메시지:** `feat: implement ready system and game start trigger`

## 구현 범위

### Ready 상태 관리
- WebSocket 이벤트: `room:ready` → `{ roomId, isReady }`
- 서버에서 room_members.isReady 업데이트
- 브로드캐스트: `room:member:ready` → `{ roomId, userId, isReady }`

### 전원 Ready 감지
- Ready 이벤트 수신 시 전체 멤버 Ready 상태 확인
- 1:1: 2명 모두 Ready
- 토너먼트: 4명 모두 Ready

### 게임 시작 트리거
- 전원 Ready 확인 → `room:game:starting` 이벤트 (3초 카운트다운)
- Room status → 'playing'
- 1:1: Match 레코드 생성 → Game 시작
- 토너먼트: Tournament 생성 → 대진표 → 첫 Match 시작

### 강퇴 (방장 전용)
- WebSocket 이벤트: `room:kick` → `{ roomId, userId }`

## 완료 기준
- [ ] Ready 토글 및 실시간 전파 동작
- [ ] 전원 Ready 시 게임 시작 트리거
- [ ] 3초 카운트다운 후 게임 시작
- [ ] 1:1 / 토너먼트 분기 동작
- [ ] 방장 강퇴 기능 동작
