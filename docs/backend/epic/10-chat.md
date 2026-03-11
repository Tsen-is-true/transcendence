# Epic 10: 채팅 시스템

> 유저 간 1:1 메시지, 실시간 WebSocket 채팅, 프로필 조회 연동

## 목표
- 유저 간 1:1 실시간 채팅 (send/receive)
- 채팅 히스토리 저장 및 조회
- 읽음 표시
- 차단된 유저 메시지 필터링
- 프로필 조회 연동

---

## 엔티티

### Message
```typescript
@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn()
  messageId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'senderId' })
  sender: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'receiverId' })
  receiver: User;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

## REST API 엔드포인트

### GET /chat/conversations
내 대화 목록

**Response:**
```json
{
  "data": [
    {
      "user": {
        "userid": 2,
        "nickname": "player2",
        "avatarUrl": "...",
        "isOnline": true
      },
      "lastMessage": {
        "content": "게임 한판 하자!",
        "createdAt": "2026-03-10T15:30:00Z",
        "isRead": false
      },
      "unreadCount": 3
    }
  ]
}
```

---

### GET /chat/messages/:userId
특정 유저와의 대화 내역

**Query Parameters:**
- `page`, `limit` (default: 50)
- `before`: timestamp (커서 기반 페이지네이션)

**Response:**
```json
{
  "data": [
    {
      "messageId": 100,
      "senderId": 1,
      "receiverId": 2,
      "content": "안녕!",
      "isRead": true,
      "createdAt": "2026-03-10T15:25:00Z"
    },
    {
      "messageId": 101,
      "senderId": 2,
      "receiverId": 1,
      "content": "게임 한판 하자!",
      "isRead": false,
      "createdAt": "2026-03-10T15:30:00Z"
    }
  ],
  "meta": { "hasMore": true }
}
```

---

### POST /chat/messages/:userId/read
메시지 읽음 처리

---

## WebSocket 이벤트 (Namespace: `/chat`)

### 클라이언트 → 서버

| 이벤트 | 데이터 | 설명 |
|--------|--------|------|
| `chat:send` | `{ receiverId, content }` | 메시지 전송 |
| `chat:read` | `{ senderId }` | 읽음 처리 |
| `chat:typing` | `{ receiverId, isTyping }` | 타이핑 상태 |

### 서버 → 클라이언트

| 이벤트 | 데이터 | 설명 |
|--------|--------|------|
| `chat:message` | Message 객체 | 새 메시지 수신 |
| `chat:read` | `{ senderId, readAt }` | 읽음 확인 |
| `chat:typing` | `{ userId, isTyping }` | 상대방 타이핑 |

---

## 메시지 전송 플로우

```typescript
async sendMessage(senderId: number, receiverId: number, content: string) {
  // 1. 차단 여부 확인
  const blocked = await this.friendService.isBlocked(senderId, receiverId);
  if (blocked) throw new ForbiddenException('차단된 유저입니다');

  // 2. 메시지 저장
  const message = await this.messageRepo.save({
    sender: { userid: senderId },
    receiver: { userid: receiverId },
    content: content.trim(),
  });

  // 3. 수신자가 온라인이면 WebSocket으로 전송
  const receiverSocket = this.getSocketByUserId(receiverId);
  if (receiverSocket) {
    receiverSocket.emit('chat:message', {
      messageId: message.messageId,
      senderId,
      content: message.content,
      createdAt: message.createdAt,
    });
  }

  return message;
}
```

---

## 입력값 검증 및 보안

- **content 길이**: 최소 1자, 최대 500자
- **XSS 방지**: HTML 태그 이스케이프
- **스팸 방지**: 동일 유저에게 연속 메시지 제한 (1초에 3개 이하)
- **차단 유저**: 차단된 유저에게 메시지 전송 불가, 차단된 유저의 메시지 필터링

---

## 완료 기준
- [ ] 1:1 메시지 전송/수신 동작
- [ ] WebSocket 실시간 메시지 전달
- [ ] 대화 목록 조회 (최근 메시지, 안 읽은 수)
- [ ] 대화 내역 페이지네이션
- [ ] 읽음 처리
- [ ] 차단 유저 메시지 필터링
- [ ] XSS 방지

---

## 커밋 단위
1. `feat: add chat message REST API (conversations, history)`
2. `feat: implement real-time chat via WebSocket`
3. `feat: add read receipts and typing indicators`
