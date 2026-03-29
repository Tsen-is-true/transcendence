*This project has been created as part of the 42 curriculum by yutsong, kjung, bohchoi, jinsecho.*

# ft_transcendence

## Description
`ft_transcendence` is a full-stack web application centered on a real-time multiplayer Pong experience. The project combines a React frontend, a NestJS backend, WebSocket-based live game synchronization, tournament brackets, user management, and DevOps monitoring into one deployable product.

The main goal of the project is to deliver a complete browser-based multiplayer experience while demonstrating backend architecture, secure API design, real-time communication, database modeling, and operational visibility.

Key features:
- Real-time remote Pong matches with live state synchronization
- Lobby and room management for matchmaking and game setup
- 4-player single-elimination tournament flow
- Local authentication plus 42 OAuth integration
- User profiles, friends, achievements, match history, and leaderboard
- Public API with API keys, rate limiting, and Swagger documentation
- Monitoring with Prometheus and Grafana

## Team Information
The ownership lines below indicate the primary defense and presentation areas for each member. Several features were reviewed and integrated collaboratively across the team.

| Login | Assigned role(s) | Responsibilities |
| --- | --- | --- |
| `yutsong` | Developer, Backend | Backend ownership for schema-oriented features, API validation, API-key/public API flows, and backend quality support. |
| `kjung` | Tech Lead, Backend & Frontend Developer | Architecture coordination, frontend-backend integration, real-time game flow, and tournament-related product decisions. |
| `bohchoi` | PM, Frontend Developer | Frontend ownership for authentication UI/UX, route protection, user flows, and client-side regression stability. |
| `jinsecho` | PO, DevOps Engineer | Product scope coordination, deployment readiness, HTTPS reverse proxy, monitoring, and operational visibility. |

## Project Management
The team followed an Agile-inspired workflow built around small deliverables and iterative integration.

- Work was split into backend epics such as project setup, auth, users, rooms, game engine, tournaments, stats, public API, monitoring, chat, and unit tests.
- Task tracking and review were organized through GitHub Issues and Pull Requests.
- Repository-based communication happened through issue threads, pull request discussions, and project documentation stored in `docs/`.
- The team used role-based ownership to divide work, then integrated changes through review and merge cycles.

## Technical Stack
| Area | Technology | Why we chose it |
| --- | --- | --- |
| Frontend | React, Vite, TailwindCSS, React Router | React supports reusable UI composition, Vite keeps the build/dev loop fast, and TailwindCSS helps keep screen styling consistent. |
| Backend | NestJS, TypeScript, Socket.IO, Swagger | NestJS gives us a modular structure for REST and WebSocket features, while Swagger documents the API and Socket.IO powers live updates. |
| Database | MariaDB, TypeORM | MariaDB fits the relational data model of users, matches, rooms, tournaments, and social data, while TypeORM keeps the entity model close to TypeScript code. |
| DevOps | Docker, Nginx, Prometheus, Grafana | Docker standardizes deployment, Nginx provides HTTPS reverse proxying, and Prometheus/Grafana cover metrics collection and visualization. |
| Media / Utilities | Multer, Sharp, JWT, Passport | These libraries support avatar uploads, authentication, and secure user session handling. |

## Database Schema
The database is relational and organized around the gameplay, user, and platform domains.

Core entities:
- `users`: account identity, nickname, avatar, online status, win/loss stats, ELO, level, streak
- `friendships`: requester/addressee relationship, pending/accepted/blocked status
- `rooms` and `room_members`: lobby room lifecycle, host, capacity, readiness, tournament flag
- `matches`: player pairing, score, winner, tournament linkage, match status
- `tournaments` and related bracket records: tournament creation and round progression
- `messages`: user-to-user chat messages with read state
- `achievements` and `user_achievements`: progression and unlock tracking
- `api_keys`: external access control for public API usage

For the full schema evolution and relationship notes, see:
- `docs/backend/schema-changes.md`

## Features List
Primary team members below indicate ownership and defense responsibility for each feature area rather than exclusive authorship.

| Feature area | Functionality | Primary team member(s) |
| --- | --- | --- |
| Authentication | Email/password registration, login, refresh, logout, protected routes, and 42 OAuth entry/callback flow | `bohchoi`, `kjung` |
| User profiles | Profile pages, settings, avatar upload, user search, and user-centric data views | `bohchoi`, `yutsong`, `kjung` |
| Friends and social layer | Friend requests, accept/reject, block flow, and online relationship handling | `bohchoi`, `yutsong` |
| Lobby and rooms | Room creation, room listing, join/leave, ready state, and game start flow | `kjung`, `yutsong` |
| Real-time Pong | Remote two-player gameplay, game state sync, countdown, scoring, pause/resume, and reconnect-oriented handling | `kjung`, `yutsong` |
| Tournament | Four-player single-elimination tournament flow with bracket updates and match progression | `kjung`, `yutsong` |
| Stats and progression | Match history, wins/losses, ELO, level, achievements, and leaderboard | `yutsong`, `kjung` |
| Public API | API key CRUD, public leaderboard/stats/matches endpoints, Swagger docs, and throttling | `yutsong` |
| Monitoring and deployment | HTTPS reverse proxy, Prometheus metrics, Grafana dashboards, and alert rule setup | `jinsecho` |
| Extra implemented feature | Real-time chat backend domain with conversation history, read receipts, and typing events | `yutsong`, `kjung` |

## Modules
Our claimed defense scope is 18 points in total. The minimum passing threshold is 14 points, and the final validated score depends on the live defense.

### 1. Web (Major: 6 pts, Minor: 3 pts -> Total: 9 pts)

#### Major: Use a framework for both the frontend and backend. (2 pts)
- Why we chose it: a full-stack product benefits from strong structure on both sides of the stack.
- Implementation: the frontend is built with React + Vite, and the backend is built with NestJS + TypeScript.
- Primary team member(s): `kjung`, `bohchoi`, `yutsong`

#### Major: Implement real-time features using WebSockets or similar technology. (2 pts)
- Why we chose it: live lobby/game synchronization is central to the user experience.
- Implementation: Socket.IO-based gateways and frontend hooks synchronize room updates, member readiness, game state, score events, and tournament state changes.
- Primary team member(s): `kjung`, `yutsong`

#### Major: Public API with secured API key, rate limiting, documentation, and database interaction. (2 pts)
- Why we chose it: it demonstrates secure external access to project data rather than only private in-app endpoints.
- Implementation: Swagger is enabled on `/api/docs`, API key CRUD exists, public endpoints are protected by API-key guards, and throttling is applied.
- Primary team member(s): `yutsong`

#### Minor: Use an ORM for the database. (1 pt)
- Why we chose it: the project includes many related entities and benefits from a typed relational model.
- Implementation: TypeORM entities model users, rooms, matches, tournaments, friendships, messages, achievements, and API keys on top of MariaDB.
- Primary team member(s): `yutsong`

#### Minor: Server-Side Rendering (SSR). (1 pt)
- Why we chose it: SSR support was prepared to cover server-rendered delivery paths in the frontend.
- Implementation: separate `entry-client` and `entry-server` files exist with hydration and server-side render code paths.
- Primary team member(s): `kjung`, `bohchoi`

#### Minor: Custom-made design system with reusable components. (1 pt)
- Why we chose it: the project spans auth, profile, leaderboard, lobby, room, and game screens that need visual consistency.
- Implementation: shared UI patterns, repeated styling conventions, and reusable layout structures are used across the frontend.
- Primary team member(s): `bohchoi`, `kjung`

### 2. Accessibility and Internationalization (Minor: 1 pt)

#### Minor: Support for additional browsers. (1 pt)
- Why we chose it: multiplayer web apps must behave consistently outside a single browser.
- Implementation: the frontend is built with browser compatibility in mind and should be defended with browser-specific QA results during evaluation.
- Primary team member(s): `bohchoi`

### 3. User Management (Minor: 1 pt)

#### Minor: Implement remote authentication with OAuth 2.0. (1 pt)
- Why we chose it: OAuth is part of the required user platform experience and fits the social/game profile model.
- Implementation: 42 OAuth login, callback processing, local auth, user stats, leaderboard, achievements, avatar handling, and match-related user data are part of the product.
- Primary team member(s): `bohchoi`, `kjung`, `yutsong`

### 4. Gaming and User Experience (Major: 4 pts, Minor: 1 pt -> Total: 5 pts)

#### Major: Implement a complete web-based game where users can play against each other. (2 pts)
- Why we chose it: Pong is a natural fit for a clear, skill-based, browser-playable real-time game.
- Implementation: the project includes a full Pong loop with score progression, round flow, and explicit win/loss outcomes.
- Primary team member(s): `kjung`, `yutsong`

#### Major: Enable two players on separate computers to play the same game in real time. (2 pts)
- Why we chose it: remote multiplayer is the core of the project experience.
- Implementation: paddle input, ping measurement, state sync, disconnect pause, and reconnect-oriented resume handling are driven by WebSocket events.
- Primary team member(s): `kjung`, `yutsong`

#### Minor: Implement a tournament system. (1 pt)
- Why we chose it: tournament flow extends the base game into a fuller multiplayer experience.
- Implementation: a four-player single-elimination tournament path is supported with room management, participant tracking, and bracket updates.
- Primary team member(s): `kjung`, `yutsong`

### 5. DevOps (Major: 2 pts)

#### Major: Monitoring system with Prometheus and Grafana. (2 pts)
- Why we chose it: the project should be observable in operation, not only functional in development.
- Implementation: `/metrics`, Prometheus scraping, Grafana dashboard provisioning, alert rules, and HTTPS-aware deployment are present in the repository.
- Primary team member(s): `jinsecho`

### Point Calculation
- Web: 9 points
- Accessibility and Internationalization: 1 point
- User Management: 1 point
- Gaming and User Experience: 5 points
- DevOps: 2 points
- Total claimed score: 18 points

Note: `Live Chat` is implemented as an extra feature in the repository, but it is not counted as one of our claimed evaluation modules.

## Individual Contributions
The summaries below are based on the current repository structure, documented responsibilities, and merged work referenced in the project history.

### yutsong
- Focus area: backend-oriented ownership
- Representative work: database-oriented backend support, validation-heavy API flows, public API/API-key domain support, and backend quality-related preparation
- Challenges addressed: keeping data relationships, validation rules, and backend-facing evaluation claims aligned

### kjung
- Focus area: technical leadership and product integration
- Representative work: architecture coordination, auth/game integration, room and tournament flow alignment, and frontend-backend connection work
- Challenges addressed: maintaining consistency between live WebSocket flows and the routed user experience

### bohchoi
- Focus area: frontend product flow and client reliability
- Representative work: login UI, auth state flow, protected routes, callback handling, form validation consistency, and client-side auth regression coverage
- Challenges addressed: normalizing authentication transitions and reducing frontend state regressions

### jinsecho
- Focus area: product ownership and DevOps readiness
- Representative work: monitoring stack preparation, HTTPS reverse proxy setup, deployment documentation, and evaluation-oriented operational readiness
- Challenges addressed: exposing useful metrics and making the local deployment demonstrable through secure access paths

## Instructions
### Prerequisites
- Docker and Docker Compose
- Optional: Node.js 20+ and npm if you want to run frontend/backend services outside Docker
- A `.env` file created from the root `.env.example`
- 42 OAuth credentials if you want to test the remote OAuth flow end to end

### Environment Setup
1. Copy the root environment template:

```bash
cp .env.example .env
```

2. Update the values in `.env`.
   At minimum, set:
- `MARIADB_ROOT_PASSWORD`
- `MARIADB_PASSWORD`
- `JWT_SECRET`

3. If you want to use 42 OAuth, also configure the backend OAuth values described in `apps/backend/.env.example`:
- `OAUTH_42_CLIENT_ID`
- `OAUTH_42_CLIENT_SECRET`
- `OAUTH_42_CALLBACK_URL`

### Run with Docker
```bash
docker compose up --build -d
```

### Service Access
- Application: `https://localhost`
- Swagger API documentation: `https://localhost/api/docs`
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3002`

Grafana default credentials in the current Docker configuration:
- Username: `admin`
- Password: `admin`

The Nginx layer generates and serves a local self-signed certificate, so your browser may ask you to trust the local HTTPS certificate the first time you open the app.

### Optional Local App-Level Development
Frontend:

```bash
cd apps/frontend
npm ci
npm run dev
```

Backend:

```bash
cd apps/backend
npm ci
npm run start:dev
```

### Stop the Stack
```bash
docker compose down
```

## Resources
### Internal project documents
- `docs/PRD.md`
- `docs/backend/APIEndpoint.md`
- `docs/backend/schema-changes.md`

### External references
- React documentation: https://react.dev/
- Vite documentation: https://vite.dev/
- NestJS documentation: https://docs.nestjs.com/
- Socket.IO documentation: https://socket.io/docs/v4/
- TypeORM documentation: https://typeorm.io/
- MariaDB documentation: https://mariadb.com/docs/
- Swagger / OpenAPI documentation: https://swagger.io/docs/
- Prometheus documentation: https://prometheus.io/docs/
- Grafana documentation: https://grafana.com/docs/
- Docker documentation: https://docs.docker.com/
- Nginx documentation: https://nginx.org/en/docs/

### AI usage
AI-assisted tooling was used for documentation support during evaluation preparation, including:
- restructuring the README to match the subject requirements
- improving English phrasing and readability in project documentation
- organizing evaluation-oriented summaries from existing repository files

All final claims in this README were manually checked against the repository structure and project documents before being kept.

## Additional Notes
- This README is intentionally written in English to match the subject requirement.
- Browser-support, SSR validation depth, and design-system maturity should be demonstrated carefully during the defense with concrete evidence.
