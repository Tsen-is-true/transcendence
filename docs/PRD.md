# PRD

## 1. 프로젝트 개요

- **프로젝트명:** Transcendence
- **목표:**
  1. 웹에서 **실시간 2인 Pong**을 원격으로 플레이(WS)
  2. **대기방/재접속/지연 처리**를 UX로 증명
  3. **최대 4인 토너먼트(싱글 엘리미네이션)** 운영
  4. DB와 상호작용하는 **Public API(5+ endpoints, CRUD, API Key, Rate limit, Docs)** 제공
  5. **User Management(통계/히스토리/업적/리더보드)** 제공
  6. **Prometheus + Grafana**로 모니터링

---

## 2. 핵심 기능 구조

### 2.1 게임 구조

- Room → Match → Score
- Tournament → Match 연결 (round + nextMatchId)

### 2.2 유저 구조

- ID/PW 회원가입 및 로그인 (해싱/솔트 처리)
- 42 OAuth 로그인
- wins / loses / elo / level / streak 관리
- isPlaying 실시간 상태 표시

### 2.3 토너먼트 구조

- 최대 4인
- 준결승 2경기 + 결승 1경기(싱글 엘리미네이션)

## 3. 기술 스택 & 모노레포 구조

### 3.1 기술 스택

- **Frontend:** Next.js(React)
  - SSR: 랜딩/Docs/리더보드 등 최소 1~2 페이지 SSR로 증명
- **Backend:** NestJS
  - REST API + WebSocket Gateway
- **DB:** MariaDB
- **ORM:** TypeORM (택1)
- **Realtime:** WebSocket (로비/게임/토너먼트 상태 브로드캐스트)
- **DevOps:** Docker Compose, Prometheus, Grafana

### 3.2 폴더 구조(TurboRepo)

```
my-project/
├── apps/
│   ├── frontend/ (Next.js)
│   └── backend/  (Nest.js)
├── infra/
│   ├── dev/
│   │   └── docker-compose.yml (MariaDB only)
│   ├── prod/
│   │   └── docker-compose.yml (FE+BE+DB+Monitoring)
│   └── mariadb/
│       ├── conf.d/
│       └── initdb.d/
│           └── 001_schema.sql
├── .env.dev
├── .env.prod
└── package.json / turbo.json
```

---

## 4. 기능 요구사항

## 4.1 Web (Major)

### 4.1.1 프레임워크 FE/BE

- FE: Next.js(React)
- BE: NestJS

### 4.1.2 WebSocket 실시간

- 실시간 업데이트(로비 참가/Ready/Start, 게임 스코어/상태, 토너먼트 매치 상태)
- 연결/끊김/재접속 처리
- 메시지 브로드캐스팅(룸/매치/토너먼트 단위로 효율적 전파)

### 4.1.3 Public API (DB + API Key + Rate limit + Docs + 5 endpoints + CRUD)

- API Key 인증 필수(키 발급/폐기/조회 포함)
- Rate limiting 적용(rpm 단위)
- 문서화: Swagger 또는 README API 문서

**권장 최소 엔드포인트(5+)**

- API Key CRUD (4개)
  - `POST /api/api-keys`
  - `GET /api/api-keys`
  - `PUT /api/api-keys/{id}`
  - `DELETE /api/api-keys/{id}`
- 매치 히스토리 조회
  - `GET /api/matches`
- (선택, 있으면 더 좋음) 리더보드
  - `GET /api/leaderboard`

## 4.2 Web (Minor)

- ORM 사용(Prisma/TypeORM)
- SSR(Next.js) 적용(랜딩/Docs/리더보드 중 최소 1~2개)
- 디자인 시스템(재사용 10개 이상: Button/Input/Modal/Toast/Card/Tabs/Badge/Table/Pagination/Header/Sidebar…)

---

## 4.3 Accessibility & i18n (Minor)

- i18n: ko/en 토글, 텍스트 길이 변화 대응
- 추가 브라우저 2개 이상 완전 호환: 예) Firefox + Safari(또는 Edge)
- 브라우저별 테스트/제한 사항 문서화 + UI/UX 일관성 유지

---

## 4.4 User Management (Minor)

> OAuth만이 아니라 아래 기능이 포함된 것으로 해석하고 **최소 구현**으로 충족

- OAuth2 원격 인증(Google/GitHub/42 중 1~2개)
- 유저 통계: wins/losses, ranking(ELO), level(단순 계산 가능)
- 매치 히스토리: 날짜/결과/상대 표시
- 업적/진행: 최소 3개 업적(예: 첫 승, 10경기, 3연승)
- 리더보드: Top N(elo 또는 wins 기반)

---

## 4.5 Gaming (Major) + Tournament (Minor)

### 4.5.1 Pong (Major)

- 규칙: 11점 선승(명확한 승패)
- 원격 2인 실시간
- 지연/끊김/재접속 처리(연결 상태 UI 포함)

### 4.5.2 Tournament (Minor, 최대 4인)

- 등록/관리
- 싱글 엘리미네이션 4인 고정
  - 준결승 2경기 + 결승 1경기 = 총 3경기
- 대진표는 구현 난이도 낮게 “매치 목록 테이블” 기반도 허용

---

## 4.6 DevOps (Major)

- Grafana 커스텀 대시보드
- 알람 규칙(에러율, 지연, 다운 등)
- Grafana 접근 보안(기본 인증/리버스프록시)

---
