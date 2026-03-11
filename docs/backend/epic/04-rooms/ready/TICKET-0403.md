# TICKET-0403: 로비 WebSocket 실시간 업데이트

> **Epic:** 04-rooms
> **커밋 메시지:** `feat: add lobby WebSocket for real-time room updates`

## 구현 범위

### WebSocket Gateway (Namespace: /lobby)
- 연결 시 JWT 인증

### 서버 → 클라이언트 이벤트
- `room:created` - 새 방 생성
- `room:updated` - 방 정보 변경 (참가/퇴장/상태)
- `room:deleted` - 방 삭제
- `room:member:joined` - 멤버 참가
- `room:member:left` - 멤버 퇴장

### 클라이언트 → 서버 이벤트
- `room:join` - 방 소켓 룸 참가 (방 상세 실시간 구독)
- `room:leave` - 방 소켓 룸 퇴장

### REST API와 연동
- 방 생성/참가/퇴장/삭제 시 WebSocket 이벤트 자동 발행
- 로비 전체 브로드캐스트 + 방 내부 브로드캐스트

## 완료 기준
- [ ] 방 목록 실시간 업데이트 동작
- [ ] 방 내부 멤버 변경 실시간 반영
- [ ] WebSocket JWT 인증 동작
