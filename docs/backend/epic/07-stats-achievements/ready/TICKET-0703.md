# TICKET-0703: 업적 시스템 (자동 체크)

> **Epic:** 07-stats-achievements
> **커밋 메시지:** `feat: add achievement system with auto-check on match end`

## 구현 범위

### Achievement, UserAchievement 엔티티
- achievements 테이블 (name, displayName, description, condition, threshold)
- user_achievements 테이블 (userId, achievementId, unlockedAt)

### Seed 데이터 (8개 업적)
- first_win, ten_games, three_streak, five_streak
- elo_1200, elo_1500, tournament_winner, fifty_wins

### 자동 체크 로직
- 매치 종료 후 호출
- 조건별 (wins, games, streak, elo, tournament_wins) 비교
- 새로 달성 시 UserAchievement 저장 + WebSocket 알림

### GET /users/:id/achievements
- unlocked 목록 (달성일 포함)
- locked 목록 (진행도 포함)

## 완료 기준
- [ ] 8개 업적 seed 데이터 삽입
- [ ] 매치 종료 시 자동 업적 체크
- [ ] 새 업적 달성 시 알림
- [ ] 업적 API 응답 (달성/미달성 분류)
