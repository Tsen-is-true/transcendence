# TICKET-0702: 매치 히스토리 API

> **Epic:** 07-stats-achievements
> **커밋 메시지:** `feat: implement match history API with pagination`

## 구현 범위

### GET /users/:id/matches
- 해당 유저가 참가한 매치 목록
- 필터: type ('all', '1v1', 'tournament')
- 페이지네이션 (page, limit)
- 각 매치: 상대 정보, 결과(win/lose), 스코어, ELO 변동, 플레이 시간, 날짜

### Match 쿼리 최적화
- player1Id 또는 player2Id가 해당 유저인 경우
- JOIN으로 상대방 정보 포함
- 최신순 정렬

## 완료 기준
- [ ] 매치 히스토리 조회 동작
- [ ] 필터 및 페이지네이션 동작
- [ ] 상대방 정보, 결과, ELO 변동 포함
