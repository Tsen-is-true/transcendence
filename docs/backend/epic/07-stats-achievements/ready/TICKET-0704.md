# TICKET-0704: 리더보드 API

> **Epic:** 07-stats-achievements
> **커밋 메시지:** `feat: implement leaderboard API (elo, wins, level)`

## 구현 범위

### GET /leaderboard
- Query: type ('elo', 'wins', 'level'), limit (10, 20, 50)
- rank 번호 포함
- 유저 정보: nickname, avatarUrl, elo, wins, loses, level

### 정렬 기준
- elo: DESC
- wins: DESC
- level: DESC → xp DESC

## 완료 기준
- [ ] 리더보드 API 3가지 타입 동작
- [ ] 랭킹 번호 정확성
- [ ] limit 파라미터 동작
