# TICKET-0601: 토너먼트 생성 및 대진표 생성

> **Epic:** 06-tournaments
> **커밋 메시지:** `feat: add tournament creation and bracket generation`

## 구현 범위

### Tournament, TournamentParticipant 엔티티
- tournaments 테이블 (tournamentId, roomId, isFinish, winnerId, currentRound)
- tournament_participants 테이블 (participantId, tournamentId, userId, status)
- status: ENUM('active', 'eliminated', 'winner')

### 토너먼트 생성 플로우
1. 4인 전원 Ready 트리거 (TICKET-0404에서 호출)
2. Tournament 레코드 생성
3. 4명 참가자 등록 (랜덤 셔플)
4. 결승전 Match 먼저 생성 (nextMatchId 연결용)
5. 준결승 Match 2개 생성 (player1/2 배정, nextMatchId 연결)
6. 첫 준결승 게임 시작

### GET /tournaments/:tournamentId
- 대진표 조회 (참가자 + 모든 매치 정보)

## 완료 기준
- [ ] 4인 토너먼트 자동 생성 동작
- [ ] 대진표 (3매치) 정확히 생성
- [ ] nextMatchId 연결 정확성
- [ ] 대진표 API 응답 정확성
