# Epic 04: 방(Room) 시스템

> 대기방 생성/참가/퇴장, Ready 상태 관리, 로비 WebSocket 실시간 업데이트

## 목표
- 1:1 / 토너먼트(4인) 방 생성 및 관리
- 방 목록 실시간 업데이트 (로비)
- 방 참가/퇴장/Ready 상태 WebSocket 이벤트
- 모든 멤버 Ready 시 게임 시작 트리거

---

## 엔티티

### Room
```typescript
@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn()
  roomId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'hostUserId' })
  host: User;

  @Column({ type: 'varchar', length: 100 })
  title: string;

  @Column({ type: 'enum', enum: ['waiting', 'playing', 'finished'], default: 'waiting' })
  status: string;

  @Column({ type: 'boolean', default: false })
  isTournament: boolean;

  @Column({ type: 'int', default: 0 })
  countPlayers: number;

  @Column({ type: 'int' })
  maxPlayers: number; // 1:1=2, 토너먼트=4

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### RoomMember
```typescript
@Entity('room_members')
export class RoomMember {
  @PrimaryGeneratedColumn()
  roomMemberId: number;

  @ManyToOne(() => Room)
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'boolean', default: false })
  isReady: boolean;

  @CreateDateColumn()
  joinedAt: Date;
}
```

---

## REST API 엔드포인트

### POST /rooms
방 생성

**Request Body:**
```json
{
  "title": "초보 환영 1:1",
  "isTournament": false
}
```

**로직:**
- `maxPlayers`: 1:1 → 2, 토너먼트 → 4
- 방장은 자동으로 room_members에 추가
- `countPlayers = 1`

---

### GET /rooms
방 목록 조회

**Query Parameters:**
- `status`: 'waiting' | 'playing' | 'all' (default: 'waiting')
- `isTournament`: boolean (선택)
- `page`, `limit`

**Response:**
```json
{
  "data": [
    {
      "roomId": 1,
      "title": "초보 환영 1:1",
      "host": { "userid": 1, "nickname": "player1", "avatarUrl": "..." },
      "status": "waiting",
      "isTournament": false,
      "countPlayers": 1,
      "maxPlayers": 2,
      "createdAt": "2026-03-10T12:00:00Z"
    }
  ],
  "meta": { "total": 15, "page": 1, "limit": 20 }
}
```

---

### GET /rooms/:roomId
방 상세 조회 (멤버 목록 포함)

---

### POST /rooms/:roomId/join
방 참가

**검증:**
- 방 status === 'waiting'
- countPlayers < maxPlayers
- 이미 참가 중이 아님
- 유저가 다른 방에 참가 중이 아님

---

### POST /rooms/:roomId/leave
방 퇴장

**로직:**
- 방장이 나가면 → 다음 멤버에게 방장 이전 (없으면 방 삭제)
- countPlayers 감소

---

### DELETE /rooms/:roomId
방 삭제 (방장만)

---

## WebSocket 이벤트 (Namespace: `/lobby`)

### 서버 → 클라이언트

| 이벤트 | 데이터 | 설명 |
|--------|--------|------|
| `room:created` | Room 객체 | 새 방 생성됨 |
| `room:updated` | Room 객체 | 방 정보 변경 (참가/퇴장/상태) |
| `room:deleted` | `{ roomId }` | 방 삭제됨 |
| `room:member:joined` | `{ roomId, user }` | 멤버 참가 |
| `room:member:left` | `{ roomId, userId }` | 멤버 퇴장 |
| `room:member:ready` | `{ roomId, userId, isReady }` | Ready 상태 변경 |
| `room:game:starting` | `{ roomId, matchId }` | 게임 시작 (3초 카운트다운) |

### 클라이언트 → 서버

| 이벤트 | 데이터 | 설명 |
|--------|--------|------|
| `room:join` | `{ roomId }` | 방 소켓 룸 참가 |
| `room:leave` | `{ roomId }` | 방 소켓 룸 퇴장 |
| `room:ready` | `{ roomId, isReady }` | Ready 토글 |
| `room:kick` | `{ roomId, userId }` | 강퇴 (방장만) |

---

## 게임 시작 로직

```
모든 멤버 Ready 확인
  ├─ 1:1 (2인 Ready)
  │   └─ Match 생성 → Game 시작
  └─ 토너먼트 (4인 Ready)
      └─ Tournament 생성 → 대진표 생성 → 첫 Match 시작
```

### 시작 플로우:
1. 마지막 멤버가 Ready → 서버에서 전체 Ready 확인
2. `room:game:starting` 이벤트 (3초 카운트다운)
3. Room status → 'playing'
4. Match 레코드 생성
5. 게임 WebSocket 네임스페이스로 전환

---

## 동시성 제어

- 방 참가: DB 트랜잭션으로 `countPlayers` 체크 + 증가 원자적 처리
- Ready 상태: 낙관적 잠금 또는 트랜잭션
- 방장 이전: 트랜잭션으로 방장 변경 + 멤버 삭제 원자적 처리

---

## 완료 기준
- [ ] 방 CRUD 동작
- [ ] 방 참가/퇴장 동작 (동시성 안전)
- [ ] WebSocket 로비 실시간 업데이트
- [ ] Ready 상태 토글 및 전파
- [ ] 전원 Ready 시 게임 시작 트리거
- [ ] 방장 퇴장 시 이전 또는 방 삭제

---

## 커밋 단위
1. `feat: add room CRUD REST API`
2. `feat: implement room join/leave with concurrency control`
3. `feat: add lobby WebSocket for real-time room updates`
4. `feat: implement ready system and game start trigger`
