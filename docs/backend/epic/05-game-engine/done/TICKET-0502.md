# TICKET-0502: 게임 WebSocket Gateway + 상태 동기화

> **Epic:** 05-game-engine
> **커밋 메시지:** `feat: add game WebSocket gateway and state sync`

## 구현 범위

### WebSocket Gateway (Namespace: /game)
- 연결 시 JWT 인증
- 유저-소켓 매핑

### 클라이언트 → 서버 이벤트
- `game:join` - 게임 참가 `{ matchId }`
- `game:paddle` - 패들 입력 `{ direction: 'up'|'down'|'stop' }`
- `game:ping` - 지연 측정 `{ timestamp }`

### 서버 → 클라이언트 이벤트
- `game:state` - 게임 상태 (30fps) - 최소화된 JSON
- `game:countdown` - 시작 카운트다운 `{ seconds }`
- `game:start` - 게임 시작 `{ matchId }`
- `game:score` - 득점 `{ player1Score, player2Score, scorer }`
- `game:end` - 게임 종료 `{ winnerId, finalScore }`

### 상태 브로드캐스트 최적화
- 30fps 전송 (게임 루프 60fps와 분리)
- 짧은 키 사용 (`b`, `p1`, `p2`, `t`)
- 매치별 소켓 룸으로 대상 제한

## 완료 기준
- [ ] 2인 실시간 게임 플레이 동작
- [ ] 패들 입력 → 서버 반영 → 상태 전파
- [ ] 30fps 상태 동기화 안정적 동작
- [ ] 카운트다운 후 게임 시작
