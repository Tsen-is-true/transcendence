# ft_transcendence

## Project Description
`ft_transcendence` is a full-stack web application featuring a real-time multiplayer Pong game, dynamic tournament brackets, an interactive lobby, and a robust user management system. It showcases real-time WebSocket communication, a modern reactive UI, and secure authentication.

## 👥 Team Members & Roles
- **yutsong(Developer)**: Backend Developer
- **kjung(Tech Lead)**: Backend & Frontend Developer
- **bohchoi(PM)**: Frontend Developer
- **jinsecho(PO)**: DevOps Engineer

## 🛠 Project Management Approach
We utilized an Agile-inspired methodology, tracking our progress via GitHub Issues and Pull Requests. Development was divided into 'Epics' (e.g., Epic 01-10) covering Core Setup, Auth, Users, Rooms, Game Engine, Tournaments, Stats, APIs, Monitoring, and Chat. Continuous Integration and descriptive PR logs ensured team alignment and code quality.

## 💻 Technologies Used (with Justifications)
- **Frontend**: Next.js (React) + TailwindCSS
  - *Justification*: Next.js provides SSR capabilities required for specific pages, while React offers exceptional component reusability. TailwindCSS allows for rapid, consistent styling.
- **Backend**: NestJS + TypeScript
  - *Justification*: NestJS enforces a highly organized, modular architecture out-of-the-box, making standard REST endpoints and WebSocket Gateways easy to manage and scale.
- **Database**: MariaDB + TypeORM
  - *Justification*: MariaDB is robust and reliable for relational data (Users, Matches, Friends), and TypeORM provides excellent TypeScript integration and schema synchronization.
- **Infrastructure**: Docker + Nginx + Prometheus + Grafana
  - *Justification*: Containerization ensures uniform environments. Nginx handles HTTPS/SSL reverse proxying. Prometheus and Grafana provide required DevOps monitoring and alerting.

## 🗄 Database Schema
Our relational database comprises the following core entities:
- **Users**: ID, Email, Nickname, Passwords/OAuth tokens, AvatarURL, Status, Stats (Wins/Losses/ELO).
- **Friends**: Requester, Addressee, Status (Pending, Accepted, Blocked).
- **Matches/Games**: ID, Player1_ID, Player2_ID, Score, Winner, Tournament_ID.
- **Rooms**: Capacity, Host_ID, Match_State.
*(Please refer to `docs/backend/schema-changes.md` for the full ERD)*

## ✨ Implementation Overview by PRs
- feat: 커스텀 Prometheus 메트릭 수집 연결 (developed by @Bebsae-Utae)
- feat: add nginx SSL reverse proxy for localhost HTTPS (developed by @Bebsae-Utae)
- feat: Auth Flow Improvements & Local Game Navigation (developed by @JKW1008)
- 🎨 feat(frontend): 42 OAuth 로그인 연동 버튼 추가 (developed by @JKW1008)
- 🐳 feat(docker): 로컬 개발용 docker-compose 보관 설정 (developed by @JKW1008)
- 🎨 feat(frontend): 프론트엔드 리액트 워크스페이스 보일러 플레이트 추적 (developed by @JKW1008)
- ⚙️ fix(backend): 서버 설정 연동 및 친구 인터페이스 조율 (developed by @JKW1008)
- 🎮 fix(backend): 게임 게이트웨이 및 매치 엔티티 필드 수정 (developed by @JKW1008)
- 🎮 fix(backend): 토너먼트 라운드 결과 연산 및 부전승 예외 가동 (developed by @JKW1008)
- 🚪 fix(backend): 방 파기 수량 바인딩 및 매치 스타트 페이로드 보강 (developed by @JKW1008)
- 👤 feat(backend): 유저 프로필 아바타 추가 및 비밀번호 변경 기능 (developed by @JKW1008)
- 🎨 fix(frontend): RoomView 피라미드 대진표 및 예외 처리 최적화 (developed by @JKW1008)
- fix(frontend): OnlineGame pyramid layout & styles (developed by @JKW1008)
- feat(frontend): login UI (developed by @bohchoi)
- Frontend baseline import (developed by @bohchoi)
- FE-AUTH-08: 프론트 인증 회귀 테스트 기반 추가 (developed by @bohchoi)
- FE-AUTH-07: 레거시 세션 인증 코드 제거 (developed by @bohchoi)
- FE-AUTH-06: 로그인/회원가입/설정 검증 규칙 일원화 (developed by @bohchoi)
- FE-AUTH-05: 42 OAuth 콜백 페이지 및 토큰 저장 처리 (developed by @bohchoi)
- FE-AUTH-04: 42 OAuth 로그인 진입 UI 추가 (developed by @bohchoi)
- FE-AUTH-03: 보호 라우트 공통 가드 도입 (developed by @bohchoi)
- FE-AUTH-02: AuthContext 초기화/로그아웃 흐름 정리 (developed by @bohchoi)
- FE-AUTH-01: refresh 응답 파싱 및 토큰 재시도 복구 (developed by @bohchoi)
- Add dev_db docker-compose for standalone development database (developed by @Bebsae-Utae)
- feat: Epic 11 - 백엔드 단위 테스트 (28 test suites, 270 tests) (developed by @Bebsae-Utae)
*(and more...)*

## 🎯 Chosen Modules & Point Calculation (Total: 15 Points)
As specified in our `docs/PRD.md`, we have fulfilled the 14-point minimum requirement through the following major and minor modules:

### Major Modules (2 points each) - Total 8 points
1. **Web (Major)** (2 pts)
   - *Features*: FE/BE Framework utilized, WebSocket real-time updates (Lobby/Match), and heavily documented Public API with API Key authentication, CRUD, and Rate Limiting.
2. **Gaming (Major): Remote Pong** (2 pts)
   - *Features*: Remote 2-player real-time Pong gameplay with strict 11-point win conditions, precise physics, and robust disconnect/reconnect handling.
3. **DevOps (Major)** (2 pts)
   - *Features*: Complete Grafana custom dashboard for metrics monitoring, alert rules (latency/errors), and secure access proxying.
4. **Live Chat (Major)** (2 pts)
   - *Features*: Real-time messaging (Epic 10) integrated deeply into the frontend and backend architectures.

### Minor Modules (1 point each) - Total 7 points
5. **Web (Minor): SSR** (1 pt)
   - *Features*: Next.js Server-Side Rendering applied to landing and leaderboard pages.
6. **Web (Minor): ORM & Database** (1 pt)
   - *Features*: Robust TypeORM and MariaDB integration.
7. **Web (Minor): Design System** (1 pt)
   - *Features*: Shared consistent component library natively developed.
8. **User Management (Minor)** (1 pt)
   - *Features*: 42 OAuth2 integration, robust user statistics tracking (wins/losses/ELO), match history, and global leaderboards.
9. **Tournament (Minor)** (1 pt)
   - *Features*: Fixed 4-player single elimination bracket systems with automatic matchmaking and live transitions.
10. **Accessibility & i18n (Minor)** (1 pt)
   - *Features*: Multi-language toggle (KO/EN), browser compatibility across Chrome/Safari, responsive design.
11. **Server-Side Updates (Minor)** (1 pt)
   - *Features*: Standardized WebSocket syncing across the stack.

*(Note: Evaluator to verify functional points during defense. Modules selected strictly fulfill the requirements listed in the subject PDF and our PRD.)*

## 🔧 Initializing & Deployment
The entire application can be deployed using a single Docker compose command:
```bash
make up
# OR
docker-compose up --build -d
```
All credentials are appropriately secured using `.env` (excluded from Git). Reverse Proxy guarantees HTTPS connection across all microservices.
