# TICKET-1104: Tournaments·Achievements·ApiKeys 모듈 테스트

> **Epic:** 11-unit-tests
> **커밋 메시지:** `test: add unit tests for tournaments, achievements, and api-keys modules`

## 생성 파일
- `modules/tournaments/tournaments.service.spec.ts`
- `modules/tournaments/tournaments.controller.spec.ts`
- `modules/achievements/achievements.service.spec.ts`
- `modules/achievements/achievements.controller.spec.ts`
- `modules/api-keys/api-keys.service.spec.ts`
- `modules/api-keys/api-keys.controller.spec.ts`
- `modules/api-keys/public-api.controller.spec.ts`

## 테스트 항목
- TournamentsService: getTournamentBracket
- TournamentsController: GET /tournaments/:id
- AchievementsService: checkAchievements, getUserAchievements, seedAchievements
- AchievementsController: GET /users/:id/achievements
- ApiKeysService: create, findAll, update, remove, findByKeyHash
- ApiKeysController: CRUD 엔드포인트
- PublicApiController: Public API 엔드포인트
