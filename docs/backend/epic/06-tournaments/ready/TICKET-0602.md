# TICKET-0602: 자동 라운드 진행 로직

> **Epic:** 06-tournaments
> **커밋 메시지:** `feat: implement automatic round progression logic`

## 구현 범위

### 매치 종료 → 다음 라운드 진행
1. 패자 상태 → 'eliminated'
2. nextMatch에 승자 배정 (player1 또는 player2)
3. nextMatch 양쪽 배정 완료 시 → 10초 대기 → 다음 매치 시작
4. 결승전 종료 → 토너먼트 종료 (isFinish=true, winnerId 설정)
5. 우승자 상태 → 'winner'

### 준결승 순차 진행
- 준결승 1 종료 → 준결승 2 시작 (또는 동시 진행)
- 현재 구조: 순차 진행 (1매치씩)

### tournament.currentRound 업데이트
- 준결승 진행 중: 1
- 결승 진행 중: 2

## 완료 기준
- [ ] 준결승 승자 → 결승 자동 배정
- [ ] 결승 종료 → 토너먼트 종료 처리
- [ ] 참가자 상태 (active/eliminated/winner) 정확성
- [ ] 전체 3경기 완주 시나리오 성공
