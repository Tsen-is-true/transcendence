# TICKET-0701: 유저 통계 트래킹 (wins/elo/level/xp)

> **Epic:** 07-stats-achievements
> **커밋 메시지:** `feat: add user statistics tracking (wins, elo, level, xp)`

## 구현 범위

### 통계 갱신 서비스
- 매치 종료 시 호출 (TICKET-0504와 연동)
- wins/loses 증감
- streak/maxStreak 갱신
- ELO 계산 (K=32)
- XP 부여 (승리 30, 패배 10, 토너먼트 우승 100)
- 레벨 재계산

### GET /users/:id/stats
- winRate, totalGames, tournamentWins 등 계산된 통계

## 완료 기준
- [ ] 매치 종료 시 통계 자동 갱신
- [ ] 통계 API 정확한 데이터 반환
