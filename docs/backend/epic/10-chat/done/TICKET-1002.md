# TICKET-1002: 실시간 채팅 WebSocket

> **Epic:** 10-chat
> **커밋 메시지:** `feat: implement real-time chat via WebSocket`

## 구현 범위

### WebSocket Gateway (Namespace: /chat)
- 연결 시 JWT 인증

### 클라이언트 → 서버
- `chat:send` → `{ receiverId, content }`

### 서버 → 클라이언트
- `chat:message` → Message 객체

### 메시지 전송 플로우
1. 차단 여부 확인 (FriendsService)
2. content 검증 (1~500자, XSS 이스케이프)
3. DB 저장
4. 수신자 온라인 → WebSocket 실시간 전달
5. 스팸 방지 (동일 유저에게 1초당 3개 제한)

## 완료 기준
- [ ] 실시간 메시지 전송/수신 동작
- [ ] 차단된 유저 메시지 차단
- [ ] XSS 방지 동작
- [ ] 스팸 방지 동작
