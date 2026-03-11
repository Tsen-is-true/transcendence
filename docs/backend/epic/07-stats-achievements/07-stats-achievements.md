# Epic 07: 통계, 업적, 리더보드

> 유저 게임 통계, 매치 히스토리, 업적 시스템, ELO 기반 리더보드

## 목표
- 유저별 게임 통계 관리 (wins/loses/elo/level/streak)
- 매치 히스토리 조회 (날짜/결과/상대 표시)
- 업적 시스템 (최소 5개)
- 리더보드 (ELO 기반 Top N)

---

## 엔티티

### Achievement
```typescript
@Entity('achievements')
export class Achievement {
  @PrimaryGeneratedColumn()
  achievementId: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  name: string; // 코드 키 (예: 'first_win')

  @Column({ type: 'varchar', length: 100 })
  displayName: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon: string;

  @Column({ type: 'varchar', length: 100 })
  condition: string; // 'wins', 'games', 'streak', 'elo', 'tournament_wins'

  @Column({ type: 'int', default: 1 })
  threshold: number;
}
```

### UserAchievement
```typescript
@Entity('user_achievements')
@Unique(['userId', 'achievementId'])
export class UserAchievement {
  @PrimaryGeneratedColumn()
  userAchievementId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Achievement)
  @JoinColumn({ name: 'achievementId' })
  achievement: Achievement;

  @CreateDateColumn()
  unlockedAt: Date;
}
```

---

## 업적 목록 (Seed 데이터)

| name | displayName | condition | threshold | 설명 |
|------|------------|-----------|-----------|------|
| `first_win` | 첫 승리 | wins | 1 | 첫 번째 승리 |
| `ten_games` | 10경기 | games | 10 | 총 10경기 플레이 |
| `three_streak` | 3연승 | streak | 3 | 3연승 달성 |
| `five_streak` | 5연승 | streak | 5 | 5연승 달성 |
| `elo_1200` | 실력자 | elo | 1200 | ELO 1200 달성 |
| `elo_1500` | 마스터 | elo | 1500 | ELO 1500 달성 |
| `tournament_winner` | 토너먼트 챔피언 | tournament_wins | 1 | 토너먼트 우승 |
| `fifty_wins` | 50승 | wins | 50 | 50승 달성 |

---

## 업적 체크 로직

```typescript
async checkAchievements(userId: number): Promise<Achievement[]> {
  const user = await this.userRepo.findOne(userId);
  const allAchievements = await this.achievementRepo.find();
  const unlocked = await this.userAchievementRepo.find({ where: { userId } });
  const unlockedIds = new Set(unlocked.map(ua => ua.achievementId));

  const newlyUnlocked: Achievement[] = [];

  for (const achievement of allAchievements) {
    if (unlockedIds.has(achievement.achievementId)) continue;

    let value: number;
    switch (achievement.condition) {
      case 'wins': value = user.wins; break;
      case 'games': value = user.wins + user.loses; break;
      case 'streak': value = user.maxStreak; break;
      case 'elo': value = user.elo; break;
      case 'tournament_wins':
        value = await this.getTournamentWins(userId);
        break;
    }

    if (value >= achievement.threshold) {
      await this.userAchievementRepo.save({ userId, achievementId: achievement.achievementId });
      newlyUnlocked.push(achievement);
    }
  }

  return newlyUnlocked;
}
```

### 호출 시점
- 매치 종료 후 (`game:end` 처리 내에서)
- 새로 달성된 업적이 있으면 WebSocket으로 알림

---

## 레벨/XP 시스템

```typescript
// XP 획득
const XP_WIN = 30;
const XP_LOSE = 10;
const XP_TOURNAMENT_WIN = 100;

// 레벨 계산 (필요 XP = level * 100)
function calculateLevel(xp: number): number {
  let level = 1;
  let requiredXp = 100;
  let totalRequired = 0;

  while (totalRequired + requiredXp <= xp) {
    totalRequired += requiredXp;
    level++;
    requiredXp = level * 100;
  }

  return level;
}
```

---

## API 엔드포인트

### GET /users/:id/stats
유저 통계 조회

**Response:**
```json
{
  "data": {
    "wins": 15,
    "loses": 8,
    "winRate": 65.2,
    "elo": 1150,
    "level": 3,
    "xp": 580,
    "xpToNextLevel": 300,
    "streak": 2,
    "maxStreak": 5,
    "totalGames": 23,
    "tournamentWins": 1
  }
}
```

---

### GET /users/:id/matches
매치 히스토리 조회

**Query Parameters:**
- `page`, `limit`
- `type`: 'all' | '1v1' | 'tournament'

**Response:**
```json
{
  "data": [
    {
      "matchId": 42,
      "opponent": { "userid": 5, "nickname": "player5", "avatarUrl": "..." },
      "result": "win",
      "myScore": 11,
      "opponentScore": 7,
      "eloChange": +18,
      "type": "1v1",
      "playedAt": "2026-03-10T14:30:00Z",
      "duration": "4m 32s"
    }
  ],
  "meta": { "total": 23, "page": 1, "limit": 20 }
}
```

---

### GET /users/:id/achievements
유저 업적 조회

**Response:**
```json
{
  "data": {
    "unlocked": [
      {
        "achievementId": 1,
        "name": "first_win",
        "displayName": "첫 승리",
        "description": "첫 번째 승리를 거두세요",
        "icon": "/achievements/first_win.png",
        "unlockedAt": "2026-03-05T10:00:00Z"
      }
    ],
    "locked": [
      {
        "achievementId": 3,
        "name": "three_streak",
        "displayName": "3연승",
        "description": "3연승을 달성하세요",
        "icon": "/achievements/three_streak.png",
        "progress": { "current": 2, "target": 3 }
      }
    ]
  }
}
```

---

### GET /leaderboard
리더보드

**Query Parameters:**
- `type`: 'elo' | 'wins' | 'level' (default: 'elo')
- `limit`: 10 | 20 | 50 (default: 10)

**Response:**
```json
{
  "data": [
    {
      "rank": 1,
      "user": {
        "userid": 3,
        "nickname": "champion",
        "avatarUrl": "...",
        "elo": 1450,
        "wins": 42,
        "loses": 12,
        "level": 8
      }
    }
  ]
}
```

---

## 완료 기준
- [ ] 매치 종료 시 유저 통계 자동 갱신
- [ ] ELO 계산 정확성 확인
- [ ] 업적 자동 체크 및 알림
- [ ] 매치 히스토리 API (페이지네이션)
- [ ] 리더보드 API (ELO/승수/레벨 기준)
- [ ] 업적 seed 데이터 8개 이상

---

## 커밋 단위
1. `feat: add user statistics tracking (wins, elo, level, xp)`
2. `feat: implement match history API with pagination`
3. `feat: add achievement system with auto-check on match end`
4. `feat: implement leaderboard API (elo, wins, level)`
