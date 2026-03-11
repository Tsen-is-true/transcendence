# TICKET-1003: 읽음 표시 및 타이핑 표시기

> **Epic:** 10-chat
> **커밋 메시지:** `feat: add read receipts and typing indicators`

## 구현 범위

### 읽음 표시
- 클라이언트 → 서버: `chat:read` → `{ senderId }`
- 서버 → 클라이언트: `chat:read` → `{ senderId, readAt }`
- DB 업데이트: isRead = true

### 타이핑 표시기
- 클라이언트 → 서버: `chat:typing` → `{ receiverId, isTyping }`
- 서버 → 클라이언트: `chat:typing` → `{ userId, isTyping }`
- DB 저장 불필요 (실시간 전달만)

## 완료 기준
- [ ] 읽음 표시 실시간 전달
- [ ] 타이핑 표시 실시간 전달
- [ ] 대화 목록에서 unreadCount 감소 반영
