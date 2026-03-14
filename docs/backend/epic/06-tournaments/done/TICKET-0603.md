# TICKET-0603: 토너먼트 WebSocket 이벤트

> **Epic:** 06-tournaments
> **커밋 메시지:** `feat: add tournament WebSocket events and status broadcast`

## 구현 범위

### 서버 → 클라이언트 이벤트
- `tournament:update` - 대진표/상태 변경 전체 데이터
- `tournament:match:start` - 다음 매치 시작 알림 `{ matchId, player1, player2 }`
- `tournament:match:end` - 매치 종료 알림 `{ matchId, winnerId }`
- `tournament:end` - 토너먼트 종료 `{ tournamentId, winnerId }`

### 브로드캐스트 대상
- 방 소켓 룸의 모든 멤버 (관전자 포함)
- 현재 게임 중이 아닌 대기 참가자에게도 전달

### 대기 화면 지원
- 준결승 1 진행 중 → 나머지 2명에게 실시간 스코어 전파
- 매치 종료 → 다음 매치 시작 카운트다운

## 완료 기준
- [ ] 토너먼트 상태 변경 실시간 전파
- [ ] 대기 참가자에게 진행 중인 매치 정보 표시
- [ ] 토너먼트 종료 이벤트 정상 발행
