# TICKET-0303: 온라인 상태 관리 (WebSocket)

> **Epic:** 03-users
> **커밋 메시지:** `feat: add online status management via WebSocket`

## 구현 범위

### WebSocket 연결 기반 상태 관리
- 소켓 연결 시 → `user.isOnline = true`
- 소켓 끊김 시 → 30초 대기 후 `user.isOnline = false`
- `user.lastSeenAt` 업데이트

### 상태 변경 브로드캐스트
- 친구 목록에 있는 유저들에게 상태 변경 알림
- 이벤트: `user:status` → `{ userId, isOnline, isPlaying }`

### 유저-소켓 매핑
- Map<userId, socketId> 관리
- 다중 탭 지원 (한 유저 여러 소켓)
- 모든 소켓 끊김 시에만 오프라인 처리

## 완료 기준
- [ ] WebSocket 연결 시 온라인 상태 변경
- [ ] 30초 grace period 후 오프라인 전환
- [ ] 친구에게 상태 변경 실시간 알림
- [ ] lastSeenAt 업데이트
