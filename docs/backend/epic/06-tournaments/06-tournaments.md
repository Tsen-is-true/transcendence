# Epic 06: 토너먼트 시스템

> 4인 싱글 엘리미네이션 토너먼트 - 대진표 생성, 자동 진행, 상태 관리

## 목표
- 4인 고정 싱글 엘리미네이션 (준결승 2경기 + 결승 1경기)
- 자동 대진표 생성
- 매치 종료 시 다음 라운드 자동 진행
- 토너먼트 상태 실시간 브로드캐스트

---

## 토너먼트 구조

```
Round 1 (준결승)              Round 2 (결승)
┌─────────────┐
│ Match 1     │
│ Player A    │──┐
│ Player B    │  │     ┌─────────────┐
└─────────────┘  ├────→│ Match 3     │
┌─────────────┐  │     │ Winner M1   │
│ Match 2     │  │     │ Winner M2   │──→ 🏆 Champion
│ Player C    │──┘     └─────────────┘
│ Player D    │
└─────────────┘
```

---

## 엔티티

### Tournament
```typescript
@Entity('tournaments')
export class Tournament {
  @PrimaryGeneratedColumn()
  tournamentId: number;

  @OneToOne(() => Room)
  @JoinColumn({ name: 'roomId' })
  room: Room;

  @Column({ type: 'boolean', default: false })
  isFinish: boolean;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'winnerId' })
  winner: User;

  @Column({ type: 'int', default: 1 })
  currentRound: number; // 1=준결승, 2=결승

  @CreateDateColumn()
  createdAt: Date;
}
```

### TournamentParticipant
```typescript
@Entity('tournament_participants')
export class TournamentParticipant {
  @PrimaryGeneratedColumn()
  tournamentParticipantId: number;

  @ManyToOne(() => Tournament)
  @JoinColumn({ name: 'tournamentId' })
  tournament: Tournament;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'enum', enum: ['active', 'eliminated', 'winner'], default: 'active' })
  status: string;
}
```

### Match (토너먼트 관련 필드)
```typescript
// 기존 Match 엔티티에서 토너먼트 관련 필드
@Column({ nullable: true })
tournamentId: number;

@Column()
round: number;        // 1=준결승, 2=결승

@Column()
matchOrder: number;   // 해당 라운드 내 순서 (1 or 2)

@Column({ nullable: true })
nextMatchId: number;  // 승자가 진출할 다음 매치 ID
```

---

## 토너먼트 생성 플로우

### 1. 4인 전원 Ready → 토너먼트 시작

```typescript
async createTournament(room: Room, members: RoomMember[]) {
  // 1. Tournament 레코드 생성
  const tournament = await this.tournamentRepo.save({
    room, currentRound: 1
  });

  // 2. 참가자 등록
  const shuffled = shuffle(members); // 랜덤 대진
  for (const member of shuffled) {
    await this.participantRepo.save({
      tournament, user: member.user, status: 'active'
    });
  }

  // 3. 결승전 매치 먼저 생성 (nextMatchId 연결용)
  const finalMatch = await this.matchRepo.save({
    tournament, room,
    round: 2, matchOrder: 1,
    status: 'waiting'
  });

  // 4. 준결승 매치 2개 생성
  const semi1 = await this.matchRepo.save({
    tournament, room,
    player1: shuffled[0].user,
    player2: shuffled[1].user,
    round: 1, matchOrder: 1,
    nextMatchId: finalMatch.matchId,
    status: 'waiting'
  });

  const semi2 = await this.matchRepo.save({
    tournament, room,
    player1: shuffled[2].user,
    player2: shuffled[3].user,
    round: 1, matchOrder: 2,
    nextMatchId: finalMatch.matchId,
    status: 'waiting'
  });

  // 5. 첫 번째 준결승 시작
  await this.gameService.startMatch(semi1);
}
```

---

## 매치 종료 → 다음 라운드 진행

```typescript
async onMatchEnd(match: Match, winnerId: number) {
  if (!match.tournamentId) return; // 1:1 매치는 무시

  const loserId = match.player1Id === winnerId ? match.player2Id : match.player1Id;

  // 1. 패자 상태 업데이트
  await this.participantRepo.update(
    { tournament: match.tournament, userId: loserId },
    { status: 'eliminated' }
  );

  // 2. 다음 매치에 승자 배정
  if (match.nextMatchId) {
    const nextMatch = await this.matchRepo.findOne(match.nextMatchId);

    if (!nextMatch.player1Id) {
      nextMatch.player1Id = winnerId;
    } else {
      nextMatch.player2Id = winnerId;
    }
    await this.matchRepo.save(nextMatch);

    // 3. 다음 매치 두 플레이어 모두 배정되었으면 시작
    if (nextMatch.player1Id && nextMatch.player2Id) {
      // 10초 대기 후 다음 매치 시작
      setTimeout(() => this.gameService.startMatch(nextMatch), 10000);
    }
  } else {
    // 결승전 종료 → 토너먼트 종료
    await this.tournamentRepo.update(match.tournamentId, {
      isFinish: true,
      winnerId,
      currentRound: 2
    });

    await this.participantRepo.update(
      { tournament: match.tournament, userId: winnerId },
      { status: 'winner' }
    );
  }
}
```

---

## API 엔드포인트

### GET /tournaments/:tournamentId
토너먼트 상세 조회 (대진표 포함)

**Response:**
```json
{
  "data": {
    "tournamentId": 1,
    "currentRound": 1,
    "isFinish": false,
    "winner": null,
    "participants": [
      { "userId": 1, "nickname": "player1", "status": "active" },
      { "userId": 2, "nickname": "player2", "status": "eliminated" },
      { "userId": 3, "nickname": "player3", "status": "active" },
      { "userId": 4, "nickname": "player4", "status": "active" }
    ],
    "matches": [
      {
        "matchId": 1, "round": 1, "matchOrder": 1,
        "player1": { "userId": 1, "nickname": "player1" },
        "player2": { "userId": 2, "nickname": "player2" },
        "winnerId": 1, "status": "finished",
        "score": { "player1Score": 11, "player2Score": 7 }
      },
      {
        "matchId": 2, "round": 1, "matchOrder": 2,
        "player1": { "userId": 3, "nickname": "player3" },
        "player2": { "userId": 4, "nickname": "player4" },
        "winnerId": null, "status": "playing",
        "score": { "player1Score": 5, "player2Score": 3 }
      },
      {
        "matchId": 3, "round": 2, "matchOrder": 1,
        "player1": { "userId": 1, "nickname": "player1" },
        "player2": null,
        "winnerId": null, "status": "waiting"
      }
    ]
  }
}
```

---

## WebSocket 이벤트 (토너먼트)

| 이벤트 | 데이터 | 설명 |
|--------|--------|------|
| `tournament:update` | 토너먼트 상태 | 대진표/상태 변경 |
| `tournament:match:start` | `{ matchId, player1, player2 }` | 다음 매치 시작 알림 |
| `tournament:match:end` | `{ matchId, winnerId }` | 매치 종료 알림 |
| `tournament:end` | `{ tournamentId, winnerId }` | 토너먼트 종료 |

---

## 상태 머신

```
Tournament 상태 흐름:

[Created] → [Semi 1 Playing] → [Semi 1 Done]
                                      ↓
                               [Semi 2 Playing] → [Semi 2 Done]
                                                        ↓
                                                  [Final Playing] → [Finished]
```

각 매치 상태: `waiting` → `playing` → `finished`

---

## 완료 기준
- [ ] 4인 토너먼트 자동 대진표 생성
- [ ] 준결승 → 결승 자동 진행
- [ ] 매치 결과에 따른 참가자 상태 업데이트
- [ ] 토너먼트 대진표 API 조회
- [ ] WebSocket 실시간 토너먼트 상태 브로드캐스트
- [ ] 토너먼트 우승자 기록

---

## 커밋 단위
1. `feat: add tournament creation and bracket generation`
2. `feat: implement automatic round progression logic`
3. `feat: add tournament WebSocket events and status broadcast`
