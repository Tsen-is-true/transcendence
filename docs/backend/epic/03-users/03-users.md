# Epic 03: 유저 관리

> 유저 프로필 CRUD, 아바타 업로드, 친구 시스템, 온라인 상태 관리

## 목표
- 유저 프로필 조회/수정
- 아바타 이미지 업로드 (기본 아바타 제공)
- 친구 추가/삭제/목록/온라인 상태 확인
- 유저 검색

---

## 엔티티

### User (프로필 관련 필드)
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  userid: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  nickname: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl: string;

  @Column({ type: 'int', default: 0 })
  wins: number;

  @Column({ type: 'int', default: 0 })
  loses: number;

  @Column({ type: 'int', default: 1000 })
  elo: number;

  @Column({ type: 'int', default: 1 })
  level: number;

  @Column({ type: 'int', default: 0 })
  xp: number;

  @Column({ type: 'int', default: 0 })
  streak: number;

  @Column({ type: 'int', default: 0 })
  maxStreak: number;

  @Column({ type: 'boolean', default: false })
  isPlaying: boolean;

  @Column({ type: 'boolean', default: false })
  isOnline: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastSeenAt: Date;
}
```

### Friend
```typescript
@Entity('friends')
export class Friend {
  @PrimaryGeneratedColumn()
  friendshipId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'requesterId' })
  requester: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'addresseeId' })
  addressee: User;

  @Column({ type: 'enum', enum: ['pending', 'accepted', 'blocked'] })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
```

---

## API 엔드포인트

### GET /users/me
내 프로필 조회

**Headers:** `Authorization: Bearer {token}`

**Response (200):**
```json
{
  "data": {
    "userid": 1,
    "email": "user@example.com",
    "nickname": "player1",
    "avatarUrl": "/uploads/avatars/1.jpg",
    "wins": 5,
    "loses": 3,
    "elo": 1050,
    "level": 2,
    "xp": 350,
    "streak": 2,
    "isPlaying": false,
    "isOnline": true,
    "createdAt": "2026-03-01T00:00:00Z"
  }
}
```

---

### PATCH /users/me
내 프로필 수정

**Request Body:**
```json
{
  "nickname": "newNickname"
}
```

**Validation:**
- nickname: 2~20자, 영문/숫자/한글, 중복 불가

---

### POST /users/me/avatar
아바타 업로드

**Request:** `multipart/form-data` (file 필드)

**Validation:**
- 파일 타입: jpg, png, gif, webp
- 최대 크기: 5MB
- 서버에서 리사이즈 (200x200)

**기본 아바타:**
- 아바타 미설정 시 닉네임 기반 기본 아바타 URL 제공

---

### GET /users/:id
특정 유저 프로필 조회

---

### GET /users?search={query}
유저 검색 (닉네임 기준)

**Query Parameters:**
- `search`: 검색어 (닉네임 부분 일치)
- `page`: 페이지 (default: 1)
- `limit`: 개수 (default: 20, max: 50)

---

## 친구 API

### POST /friends/:userId
친구 요청 보내기

### PATCH /friends/:friendshipId/accept
친구 요청 수락

### DELETE /friends/:friendshipId
친구 삭제 / 요청 거절

### GET /friends
내 친구 목록

**Query Parameters:**
- `status`: 'pending' | 'accepted' (default: 'accepted')

**Response (200):**
```json
{
  "data": [
    {
      "friendshipId": 1,
      "user": {
        "userid": 2,
        "nickname": "player2",
        "avatarUrl": "/uploads/avatars/2.jpg",
        "isOnline": true,
        "isPlaying": false
      },
      "createdAt": "2026-03-01T00:00:00Z"
    }
  ]
}
```

### POST /friends/:userId/block
유저 차단

---

## 온라인 상태 관리

WebSocket 연결 기반:
1. 소켓 연결 시 → `isOnline = true`
2. 소켓 끊김 시 → 30초 대기 후 `isOnline = false`, `lastSeenAt = now()`
3. 친구 목록에서 실시간 상태 확인 가능

---

## 완료 기준
- [ ] 프로필 조회/수정 동작
- [ ] 아바타 업로드 및 기본 아바타 동작
- [ ] 친구 요청/수락/삭제/차단 동작
- [ ] 친구 목록에서 온라인 상태 확인
- [ ] 유저 검색 동작

---

## 커밋 단위
1. `feat: add user profile CRUD and avatar upload`
2. `feat: implement friend system (request, accept, block)`
3. `feat: add online status management via WebSocket`
