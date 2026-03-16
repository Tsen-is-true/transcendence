# TICKET-1001: 채팅 REST API (대화목록/내역)

> **Epic:** 10-chat
> **커밋 메시지:** `feat: add chat message REST API (conversations, history)`

## 구현 범위

### Message 엔티티
- messages 테이블 (messageId, senderId, receiverId, content, isRead, createdAt)

### GET /chat/conversations
- 내 대화 상대 목록
- 각 상대: 마지막 메시지, 안 읽은 수, 온라인 상태

### GET /chat/messages/:userId
- 특정 유저와의 대화 내역
- 커서 기반 페이지네이션 (before timestamp)
- 최신순 정렬

### POST /chat/messages/:userId/read
- 해당 유저의 미읽 메시지 일괄 읽음 처리

## 완료 기준
- [ ] 대화 목록 조회 동작 (unreadCount 포함)
- [ ] 대화 내역 페이지네이션 동작
- [ ] 읽음 처리 동작
