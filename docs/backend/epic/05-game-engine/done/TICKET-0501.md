# TICKET-0501: 서버사이드 Pong 물리 엔진

> **Epic:** 05-game-engine
> **커밋 메시지:** `feat: implement server-side Pong physics engine`

## 구현 범위

### 게임 상수 정의
- Canvas: 800x600, Paddle: 10x100, Ball: 10
- 패들 속도: 8, 공 초기 속도: 5, 최대 속도: 12
- 속도 증가: 랠리당 0.2
- 11점 선승

### GameState 인터페이스
- ball (x, y, velocityX, velocityY, speed)
- players (paddleY, score, connected, socketId)
- status ('countdown', 'playing', 'paused', 'finished')

### 게임 루프 (60fps)
1. 입력 처리 (패들 이동)
2. 공 위치 업데이트 (delta time 기반)
3. 충돌 감지 (상/하 벽, 패들)
4. 패들 충돌 시 반사 각도 계산 (최대 75도)
5. 좌/우 벽 통과 → 득점 처리
6. 11점 도달 → 게임 종료

### 인메모리 게임 관리
- `Map<matchId, GameState>` 구조
- 게임 생성/삭제 메서드

## 완료 기준
- [ ] 공 물리 연산 (이동, 반사, 속도 증가) 정확성
- [ ] 패들 충돌 및 각도 계산 동작
- [ ] 11점 선승 규칙 동작
- [ ] 동시 다수 게임 독립 실행
