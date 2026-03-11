# TICKET-0503: 재접속 및 일시정지/재개 로직

> **Epic:** 05-game-engine
> **커밋 메시지:** `feat: implement reconnection and pause/resume logic`

## 구현 범위

### 끊김 감지
- 소켓 disconnect → player.connected = false
- 게임 상태 → 'paused'
- 상대방에게 `game:pause` 이벤트 (reason, timeout)
- 30초 재접속 타이머 시작

### 재접속 플로우
- 유저 재연결 → JWT로 식별
- 진행 중인 GameState에서 매칭
- player.connected = true, socketId 업데이트
- `game:resume` 이벤트 → 3초 카운트다운 → 게임 재개

### 타임아웃 처리
- 30초 내 재접속 실패 → 상대방 부전승
- 현재 스코어 기록, 게임 종료 처리

## 완료 기준
- [ ] 연결 끊김 시 게임 일시정지
- [ ] 30초 내 재접속 시 게임 재개
- [ ] 타임아웃 시 부전승 처리
- [ ] 재접속 후 상태 동기화 정확성
