# Epic 05: Pong 게임 엔진

> 서버 권위적(Server-Authoritative) Pong 게임 로직, WebSocket 실시간 동기화, 재접속 처리

## 목표
- 서버에서 게임 물리 연산 (공, 패들, 충돌)
- 60fps 게임 루프 → 클라이언트에 상태 브로드캐스트
- 11점 선승 규칙
- 연결 끊김/재접속 처리
- 게임 종료 시 결과 저장

---

## 게임 상수

```typescript
const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  PADDLE_WIDTH: 10,
  PADDLE_HEIGHT: 100,
  PADDLE_SPEED: 8,
  PADDLE_MARGIN: 20,       // 벽에서 패들까지 거리
  BALL_SIZE: 10,
  BALL_INITIAL_SPEED: 5,
  BALL_SPEED_INCREMENT: 0.2, // 랠리마다 속도 증가
  BALL_MAX_SPEED: 12,
  WINNING_SCORE: 11,
  TICK_RATE: 60,            // 서버 틱레이트
  BROADCAST_RATE: 30,       // 클라이언트 전송 빈도
  RECONNECT_TIMEOUT: 30000, // 재접속 대기 시간 (30초)
  COUNTDOWN_SECONDS: 3,     // 시작 전 카운트다운
};
```

---

## 게임 상태 (인메모리)

```typescript
interface GameState {
  matchId: number;
  roomId: number;
  status: 'countdown' | 'playing' | 'paused' | 'finished';

  ball: {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
    speed: number;
  };

  players: {
    player1: {
      userId: number;
      paddleY: number;
      score: number;
      connected: boolean;
      socketId: string | null;
    };
    player2: {
      userId: number;
      paddleY: number;
      score: number;
      connected: boolean;
      socketId: string | null;
    };
  };

  rallyCount: number;
  startedAt: Date;
  lastUpdateAt: number;
}
```

---

## 게임 루프

```
[매 틱 (1/60초)]
1. 입력 처리 (패들 이동)
2. 공 위치 업데이트
3. 충돌 감지
   ├─ 상/하 벽 충돌 → Y 반전
   ├─ 패들 충돌 → X 반전 + 각도 계산 + 속도 증가
   └─ 좌/우 벽 통과 → 득점 처리
4. 득점 시
   ├─ 스코어 업데이트
   ├─ 11점 도달 → 게임 종료
   └─ 미달 → 공 리셋 + 1초 대기
5. 상태 브로드캐스트 (30fps)
```

### 공 반사 각도 계산
```typescript
// 패들 중심으로부터의 거리 비율 (-1 ~ 1)
const relativeIntersectY = (paddleCenterY - ball.y) / (PADDLE_HEIGHT / 2);
// 최대 반사 각도: 75도
const bounceAngle = relativeIntersectY * (Math.PI * 5 / 12);
```

---

## WebSocket 이벤트 (Namespace: `/game`)

### 서버 → 클라이언트

| 이벤트 | 데이터 | 빈도 | 설명 |
|--------|--------|------|------|
| `game:state` | GameState (최소화) | 30fps | 게임 상태 동기화 |
| `game:countdown` | `{ seconds }` | 1/s | 시작 카운트다운 |
| `game:start` | `{ matchId }` | 1회 | 게임 시작 |
| `game:score` | `{ player1Score, player2Score, scorer }` | 이벤트 | 득점 |
| `game:pause` | `{ reason, timeout }` | 이벤트 | 일시정지 (재접속 대기) |
| `game:resume` | - | 이벤트 | 게임 재개 |
| `game:end` | `{ winnerId, finalScore }` | 1회 | 게임 종료 |

### 클라이언트 → 서버

| 이벤트 | 데이터 | 설명 |
|--------|--------|------|
| `game:join` | `{ matchId }` | 게임 소켓 참가 |
| `game:paddle` | `{ direction: 'up' \| 'down' \| 'stop' }` | 패들 입력 |
| `game:ping` | `{ timestamp }` | 지연 측정 |

### 상태 브로드캐스트 (최소화)
```json
{
  "b": { "x": 400, "y": 300 },
  "p1": { "y": 250, "s": 3 },
  "p2": { "y": 280, "s": 5 },
  "t": 1234567890
}
```

---

## 재접속 처리

### 끊김 감지
1. 소켓 disconnect 이벤트 감지
2. `player.connected = false`
3. 게임 상태 → 'paused'
4. 상대방에게 `game:pause` 이벤트 전송
5. 30초 타이머 시작

### 재접속 플로우
1. 유저가 다시 `/game` 네임스페이스 연결
2. JWT 토큰으로 유저 식별
3. 진행 중인 게임 확인 (인메모리 GameState)
4. `player.connected = true`, `player.socketId = newSocketId`
5. 게임 상태 → 'playing' 복귀
6. `game:resume` 이벤트
7. 3초 카운트다운 후 재개

### 타임아웃
- 30초 내 재접속 실패 → 상대방 부전승
- 게임 종료 처리 (패배자의 현재 스코어 기록)

---

## 게임 종료 처리

```
게임 종료 (11점 달성 또는 부전승)
├─ 1. GameState 정리 (인메모리에서 제거)
├─ 2. Match 레코드 업데이트 (winnerId, status, finishAt)
├─ 3. Score 레코드 저장 (최종 스코어)
├─ 4. User 통계 업데이트 (wins/loses/elo/streak/xp)
├─ 5. 업적 체크 (Epic 07)
├─ 6. Room status → 'finished' (1:1) 또는 다음 매치 트리거 (토너먼트)
└─ 7. game:end 이벤트 브로드캐스트
```

---

## ELO 계산

```typescript
function calculateElo(winnerElo: number, loserElo: number, K = 32) {
  const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

  return {
    winnerNewElo: Math.round(winnerElo + K * (1 - expectedWinner)),
    loserNewElo: Math.round(loserElo + K * (0 - expectedLoser)),
  };
}
```

---

## 성능 고려사항

- **게임 루프**: `setInterval` 대신 정밀 타이머 사용 (delta time 기반)
- **메모리**: 게임 종료 후 즉시 GameState 정리
- **브로드캐스트 최적화**: 30fps 전송, 데이터 최소화 (짧은 키 사용)
- **동시 게임**: Map<matchId, GameState>로 관리, 각 게임 독립 루프

---

## 완료 기준
- [ ] 서버 사이드 Pong 물리 엔진 동작
- [ ] 2인 실시간 게임 플레이 가능
- [ ] 11점 선승 규칙 동작
- [ ] 재접속 처리 (30초 내)
- [ ] 게임 종료 시 DB 결과 저장
- [ ] ELO 계산 정확성 확인
- [ ] 동시 다수 게임 독립 실행

---

## 커밋 단위
1. `feat: implement server-side Pong physics engine`
2. `feat: add game WebSocket gateway and state sync`
3. `feat: implement reconnection and pause/resume logic`
4. `feat: add game end processing (score, stats, ELO)`
