# 스키마 보완 사항 (v1 → v2)

> 기존 `schemes/v1.erd.json` 대비 PRD 및 subject.pdf 요구사항을 충족하기 위해 필요한 변경 사항

---

## 1. `users` 테이블 컬럼 추가

| 컬럼명 | 타입 | 기본값 | NOT NULL | 설명 |
|--------|------|--------|----------|------|
| `email` | VARCHAR(255) | - | YES | 이메일+PW 인증용 (subject 필수: email/password 인증) |
| `password` | VARCHAR(255) | - | NO | bcrypt 해시 (OAuth 전용 유저는 null) |
| `elo` | INT | 1000 | YES | ELO 레이팅 (PRD: ranking 관리) |
| `level` | INT | 1 | YES | 유저 레벨 (PRD: level 관리) |
| `xp` | INT | 0 | YES | 경험치 (레벨 계산용) |
| `streak` | INT | 0 | YES | 현재 연승 기록 (PRD: streak 관리) |
| `maxStreak` | INT | 0 | YES | 최대 연승 기록 (업적용) |
| `oauthProvider` | VARCHAR(20) | NULL | NO | OAuth 제공자 ('42', 'google' 등) |
| `oauthId` | VARCHAR(100) | NULL | NO | OAuth 제공자 고유 ID |
| `avatarUrl` | VARCHAR(255) | NULL | NO | profileImg → avatarUrl 리네이밍 (명확성) |
| `isOnline` | BOOLEAN | false | YES | 온라인 상태 (isPlaying과 별도) |
| `lastSeenAt` | TIMESTAMP | NULL | NO | 마지막 접속 시간 |
| `createdAt` | TIMESTAMP | CURRENT_TIMESTAMP | YES | 생성일 |
| `updatedAt` | TIMESTAMP | CURRENT_TIMESTAMP ON UPDATE | YES | 수정일 |

### 변경 사항:
- `profileImg` → `avatarUrl`로 리네이밍
- `intraId` 유지 (42 OAuth 호환)
- `email`에 UNIQUE 제약 조건 추가

---

## 2. 신규 테이블: `friends`

친구 시스템 (subject IV.1 Web Major - User interaction 요구)

| 컬럼명 | 타입 | 기본값 | NOT NULL | 설명 |
|--------|------|--------|----------|------|
| `friendshipId` | INT (AI) | - | YES | PK |
| `requesterId` | INT | - | YES | FK → users.userid (요청자) |
| `addresseeId` | INT | - | YES | FK → users.userid (수신자) |
| `status` | ENUM('pending','accepted','blocked') | 'pending' | YES | 상태 |
| `createdAt` | TIMESTAMP | CURRENT_TIMESTAMP | YES | 생성일 |
| `updatedAt` | TIMESTAMP | CURRENT_TIMESTAMP ON UPDATE | YES | 수정일 |

### 관계:
- users 1:N friends (requesterId)
- users 1:N friends (addresseeId)
- UNIQUE(requesterId, addresseeId)

---

## 3. 신규 테이블: `messages`

채팅 시스템 (subject IV.1 Web Major - basic chat)

| 컬럼명 | 타입 | 기본값 | NOT NULL | 설명 |
|--------|------|--------|----------|------|
| `messageId` | INT (AI) | - | YES | PK |
| `senderId` | INT | - | YES | FK → users.userid |
| `receiverId` | INT | - | YES | FK → users.userid |
| `content` | TEXT | - | YES | 메시지 내용 |
| `isRead` | BOOLEAN | false | YES | 읽음 여부 |
| `createdAt` | TIMESTAMP | CURRENT_TIMESTAMP | YES | 생성일 |

### 관계:
- users 1:N messages (senderId)
- users 1:N messages (receiverId)

---

## 4. 신규 테이블: `achievements`

업적 정의 (PRD: 최소 3개 업적)

| 컬럼명 | 타입 | 기본값 | NOT NULL | 설명 |
|--------|------|--------|----------|------|
| `achievementId` | INT (AI) | - | YES | PK |
| `name` | VARCHAR(50) | - | YES | 업적명 (예: 'first_win') |
| `displayName` | VARCHAR(100) | - | YES | 표시명 (예: '첫 승리') |
| `description` | VARCHAR(255) | - | YES | 설명 |
| `icon` | VARCHAR(255) | NULL | NO | 아이콘 URL |
| `condition` | VARCHAR(100) | - | YES | 달성 조건 키 (코드에서 매칭) |
| `threshold` | INT | 1 | YES | 달성 기준값 |

### 기본 업적 데이터 (seed):
1. `first_win` - 첫 승리 (wins >= 1)
2. `ten_games` - 10경기 달성 (wins + loses >= 10)
3. `three_streak` - 3연승 (streak >= 3)
4. `elo_master` - ELO 1500 달성 (elo >= 1500)
5. `tournament_winner` - 토너먼트 우승 (tournament wins >= 1)

---

## 5. 신규 테이블: `user_achievements`

유저-업적 매핑

| 컬럼명 | 타입 | 기본값 | NOT NULL | 설명 |
|--------|------|--------|----------|------|
| `userAchievementId` | INT (AI) | - | YES | PK |
| `userId` | INT | - | YES | FK → users.userid |
| `achievementId` | INT | - | YES | FK → achievements.achievementId |
| `unlockedAt` | TIMESTAMP | CURRENT_TIMESTAMP | YES | 달성 시각 |

### 관계:
- users 1:N user_achievements
- achievements 1:N user_achievements
- UNIQUE(userId, achievementId)

---

## 6. 신규 테이블: `api_keys`

Public API 인증 (PRD: API Key CRUD)

| 컬럼명 | 타입 | 기본값 | NOT NULL | 설명 |
|--------|------|--------|----------|------|
| `apiKeyId` | INT (AI) | - | YES | PK |
| `userId` | INT | - | YES | FK → users.userid (발급자) |
| `keyHash` | VARCHAR(255) | - | YES | API Key 해시 (원본은 발급 시 1회만 표시) |
| `name` | VARCHAR(100) | - | YES | 키 이름/설명 |
| `isActive` | BOOLEAN | true | YES | 활성 여부 |
| `lastUsedAt` | TIMESTAMP | NULL | NO | 마지막 사용 시각 |
| `expiresAt` | TIMESTAMP | NULL | NO | 만료일 (NULL=무기한) |
| `createdAt` | TIMESTAMP | CURRENT_TIMESTAMP | YES | 생성일 |
| `updatedAt` | TIMESTAMP | CURRENT_TIMESTAMP ON UPDATE | YES | 수정일 |

### 관계:
- users 1:N api_keys

---

## 7. 기존 테이블 공통 변경

### 모든 테이블에 타임스탬프 추가:

| 테이블 | 추가 컬럼 |
|--------|----------|
| `rooms` | `createdAt`, `updatedAt` |
| `room_members` | `joinedAt` (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP) |
| `tournaments` | `createdAt`, `updatedAt` |
| `tournament_participants` | `joinedAt` |
| `scores` | `createdAt` |

### `rooms` 테이블 status ENUM 변경:
- `VARCHAR(20)` → `ENUM('waiting', 'playing', 'finished')`

### `matchs` 테이블 status ENUM 변경:
- `VARCHAR(20)` → `ENUM('waiting', 'playing', 'finished', 'walkover')`

### `tournament_participants` 테이블 status 변경:
- `BOOLEAN` → `ENUM('active', 'eliminated', 'winner')`

---

## 8. 최종 테이블 목록 (v2)

| # | 테이블 | 신규/변경 |
|---|--------|----------|
| 1 | `users` | 변경 (컬럼 추가) |
| 2 | `rooms` | 변경 (타임스탬프, ENUM) |
| 3 | `room_members` | 변경 (타임스탬프) |
| 4 | `tournaments` | 변경 (타임스탬프) |
| 5 | `tournament_participants` | 변경 (ENUM, 타임스탬프) |
| 6 | `matchs` | 변경 (ENUM) |
| 7 | `scores` | 변경 (타임스탬프) |
| 8 | **`friends`** | **신규** |
| 9 | **`messages`** | **신규** |
| 10 | **`achievements`** | **신규** |
| 11 | **`user_achievements`** | **신규** |
| 12 | **`api_keys`** | **신규** |

총 12개 테이블 (기존 7 + 신규 5)
