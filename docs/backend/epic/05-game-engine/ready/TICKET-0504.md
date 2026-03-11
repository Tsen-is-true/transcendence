# TICKET-0504: 게임 종료 처리 (스코어/통계/ELO)

> **Epic:** 05-game-engine
> **커밋 메시지:** `feat: add game end processing (score, stats, ELO)`

## 구현 범위

### 게임 종료 시 처리 파이프라인
1. GameState 인메모리에서 제거
2. Match 레코드 업데이트 (winnerId, status='finished', finishAt)
3. Score 레코드 저장 (player1Score, player2Score)
4. User 통계 갱신 (wins/loses, streak, maxStreak, xp)
5. ELO 계산 및 갱신
6. 레벨 재계산
7. Room status → 'finished' (1:1) 또는 다음 매치 트리거 (토너먼트)
8. `game:end` 이벤트 브로드캐스트
9. user.isPlaying = false

### ELO 계산
- K-factor: 32
- 표준 ELO 수식 적용
- 최소 ELO: 100 (바닥 보호)

### XP/레벨
- 승리: +30 XP, 패배: +10 XP
- 레벨 = f(totalXP)

## 완료 기준
- [ ] 게임 종료 시 DB 결과 정확히 저장
- [ ] ELO 계산 정확성 (양쪽 합 일정)
- [ ] XP 및 레벨 갱신
- [ ] 연승 기록 업데이트
- [ ] 인메모리 GameState 정리 확인
