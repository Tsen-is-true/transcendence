# API Endpoint 목록

> 구현 완료 시 `[x]`로 체크. 총 REST 41개 / WebSocket 26개

---

## REST API

### Epic 02: Auth

| 상태 | Method | Path | 설명 | 인증 |
|------|--------|------|------|------|
| [x] | POST | `/auth/register` | 이메일/비밀번호 회원가입 | - |
| [x] | POST | `/auth/login` | 로그인 | - |
| [x] | POST | `/auth/refresh` | Access Token 갱신 | Refresh Token |
| [x] | GET | `/auth/42` | 42 OAuth 로그인 리다이렉트 | - |
| [x] | GET | `/auth/42/callback` | 42 OAuth 콜백 | - |
| [x] | POST | `/auth/logout` | 로그아웃 (Refresh Token 무효화) | JWT |

### Epic 03: Users

| 상태 | Method | Path | 설명 | 인증 |
|------|--------|------|------|------|
| [x] | GET | `/users/me` | 내 프로필 조회 | JWT |
| [x] | PATCH | `/users/me` | 내 프로필 수정 | JWT |
| [x] | POST | `/users/me/avatar` | 아바타 업로드 | JWT |
| [x] | GET | `/users/:id` | 유저 프로필 조회 | JWT |
| [x] | GET | `/users?search={query}` | 유저 검색 | JWT |
| [x] | POST | `/friends/:userId` | 친구 요청 | JWT |
| [x] | PATCH | `/friends/:friendshipId/accept` | 친구 요청 수락 | JWT |
| [x] | DELETE | `/friends/:friendshipId` | 친구 삭제/거절 | JWT |
| [x] | GET | `/friends` | 친구 목록 조회 | JWT |
| [x] | POST | `/friends/:userId/block` | 유저 차단 | JWT |

### Epic 04: Rooms

| 상태 | Method | Path | 설명 | 인증 |
|------|--------|------|------|------|
| [x] | POST | `/rooms` | 방 생성 | JWT |
| [x] | GET | `/rooms` | 방 목록 조회 | JWT |
| [x] | GET | `/rooms/:roomId` | 방 상세 조회 | JWT |
| [x] | POST | `/rooms/:roomId/join` | 방 참가 | JWT |
| [x] | POST | `/rooms/:roomId/leave` | 방 퇴장 | JWT |
| [x] | DELETE | `/rooms/:roomId` | 방 삭제 | JWT |

### Epic 06: Tournaments

| 상태 | Method | Path | 설명 | 인증 |
|------|--------|------|------|------|
| [ ] | GET | `/tournaments/:tournamentId` | 토너먼트 상세 (대진표 포함) | JWT |

### Epic 07: Stats / Achievements

| 상태 | Method | Path | 설명 | 인증 |
|------|--------|------|------|------|
| [ ] | GET | `/users/:id/stats` | 유저 통계 조회 | JWT |
| [ ] | GET | `/users/:id/matches` | 매치 히스토리 (페이지네이션) | JWT |
| [ ] | GET | `/users/:id/achievements` | 유저 업적 목록 | JWT |
| [ ] | GET | `/leaderboard` | 리더보드 (ELO/승수/레벨) | JWT |

### Epic 08: Public API

| 상태 | Method | Path | 설명 | 인증 |
|------|--------|------|------|------|
| [ ] | POST | `/api/api-keys` | API Key 생성 | JWT |
| [ ] | GET | `/api/api-keys` | 내 API Key 목록 | JWT |
| [ ] | PUT | `/api/api-keys/:id` | API Key 수정 | JWT |
| [ ] | DELETE | `/api/api-keys/:id` | API Key 삭제 | JWT |
| [ ] | GET | `/api/matches` | 매치 조회 (Public) | API Key |
| [ ] | GET | `/api/leaderboard` | 리더보드 (Public) | API Key |
| [ ] | GET | `/api/users/:id/stats` | 유저 통계 (Public) | API Key |

### Epic 09: Monitoring

| 상태 | Method | Path | 설명 | 인증 |
|------|--------|------|------|------|
| [ ] | GET | `/metrics` | Prometheus 메트릭 | - |

### Epic 10: Chat

| 상태 | Method | Path | 설명 | 인증 |
|------|--------|------|------|------|
| [ ] | GET | `/chat/conversations` | 대화 목록 조회 | JWT |
| [ ] | GET | `/chat/messages/:userId` | 대화 내역 조회 (커서 페이지네이션) | JWT |
| [ ] | POST | `/chat/messages/:userId/read` | 메시지 읽음 처리 | JWT |

---

## WebSocket Events

### Namespace: `/lobby` (Epic 04)

| 상태 | 방향 | 이벤트 | 설명 |
|------|------|--------|------|
| [x] | S→C | `room:created` | 방 생성됨 |
| [x] | S→C | `room:updated` | 방 정보 변경 |
| [x] | S→C | `room:deleted` | 방 삭제됨 |
| [x] | S→C | `room:member:joined` | 멤버 참가 |
| [x] | S→C | `room:member:left` | 멤버 퇴장 |
| [x] | S→C | `room:member:ready` | 레디 상태 변경 |
| [x] | S→C | `room:game:starting` | 게임 시작 카운트다운 |
| [x] | C→S | `room:join` | 방 소켓 접속 |
| [x] | C→S | `room:leave` | 방 소켓 퇴장 |
| [x] | C→S | `room:ready` | 레디 토글 |
| [x] | C→S | `room:kick` | 멤버 강퇴 (호스트) |

### Namespace: `/game` (Epic 05)

| 상태 | 방향 | 이벤트 | 설명 |
|------|------|--------|------|
| [ ] | S→C | `game:state` | 게임 상태 동기화 (30fps) |
| [ ] | S→C | `game:countdown` | 시작 카운트다운 |
| [ ] | S→C | `game:start` | 게임 시작 |
| [ ] | S→C | `game:score` | 득점 이벤트 |
| [ ] | S→C | `game:pause` | 일시정지 (재접속 대기) |
| [ ] | S→C | `game:resume` | 게임 재개 |
| [ ] | S→C | `game:end` | 게임 종료 |
| [ ] | C→S | `game:join` | 게임 소켓 접속 |
| [ ] | C→S | `game:paddle` | 패들 입력 |
| [ ] | C→S | `game:ping` | 레이턴시 측정 |

### Tournament Events (Epic 06)

| 상태 | 방향 | 이벤트 | 설명 |
|------|------|--------|------|
| [ ] | S→C | `tournament:update` | 토너먼트 상태/대진표 변경 |
| [ ] | S→C | `tournament:match:start` | 다음 매치 시작 |
| [ ] | S→C | `tournament:match:end` | 매치 종료 |
| [ ] | S→C | `tournament:end` | 토너먼트 종료 |

### Namespace: `/chat` (Epic 10)

| 상태 | 방향 | 이벤트 | 설명 |
|------|------|--------|------|
| [ ] | S→C | `chat:message` | 메시지 수신 |
| [ ] | S→C | `chat:read` | 읽음 확인 |
| [ ] | S→C | `chat:typing` | 타이핑 표시 |
| [ ] | C→S | `chat:send` | 메시지 전송 |
| [ ] | C→S | `chat:read` | 읽음 처리 |
| [ ] | C→S | `chat:typing` | 타이핑 상태 전송 |
