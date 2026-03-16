# TICKET-1103: Rooms·Game 모듈 테스트

> **Epic:** 11-unit-tests
> **커밋 메시지:** `test: add unit tests for rooms and game modules`

## 생성 파일
- `modules/rooms/rooms.service.spec.ts`
- `modules/rooms/rooms.controller.spec.ts`
- `modules/rooms/gateways/lobby.gateway.spec.ts`
- `modules/game/services/pong-engine.service.spec.ts`
- `modules/game/services/game-result.service.spec.ts`
- `modules/game/gateways/game.gateway.spec.ts`

## 테스트 항목
- RoomsService: create, join, leave, delete, startGame, startTournament
- RoomsController: 각 엔드포인트
- LobbyGateway: room:join, room:ready, room:kick
- PongEngineService: createGame, tick, setPaddleDirection, collision
- GameResultService: processGameEnd, ELO·XP 계산, 토너먼트 진행
- GameGateway: game:join, game:paddle, 재접속
