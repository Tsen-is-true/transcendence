# Epic 02: 인증 시스템

> 이메일+비밀번호 회원가입/로그인, JWT 토큰 인증, 42 OAuth 연동

## 목표
- 이메일/비밀번호 기반 회원가입 및 로그인 (bcrypt 해싱)
- JWT Access + Refresh Token 발급/갱신
- 42 OAuth 2.0 연동
- 인증 Guard를 통한 보호 라우트

---

## 엔티티

### User (인증 관련 필드)
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  userid: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string; // bcrypt hash, OAuth 전용 유저는 null

  @Column({ type: 'varchar', length: 50, nullable: true })
  intraId: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  oauthProvider: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  oauthId: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  nickname: string;
  // ... 나머지 필드
}
```

---

## API 엔드포인트

### POST /auth/register
회원가입

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "MyP@ssw0rd!",
  "nickname": "player1"
}
```

**Validation:**
- email: 이메일 형식, 중복 불가
- password: 최소 8자, 대소문자+숫자+특수문자 포함
- nickname: 2~20자, 영문/숫자/한글, 중복 불가

**Response (201):**
```json
{
  "statusCode": 201,
  "message": "회원가입이 완료되었습니다",
  "data": {
    "userid": 1,
    "email": "user@example.com",
    "nickname": "player1"
  }
}
```

---

### POST /auth/login
로그인

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "MyP@ssw0rd!"
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": {
      "userid": 1,
      "email": "user@example.com",
      "nickname": "player1",
      "avatarUrl": null
    }
  }
}
```

**에러 케이스:**
- 401: 이메일 또는 비밀번호 불일치
- 400: 입력값 유효성 실패

---

### POST /auth/refresh
토큰 갱신

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

**Response (200):**
```json
{
  "statusCode": 200,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

---

### GET /auth/42
42 OAuth 로그인 시작 (리다이렉트)

### GET /auth/42/callback
42 OAuth 콜백

**Flow:**
1. 프론트엔드에서 `/auth/42`로 리다이렉트
2. 42 인트라넷 로그인 화면
3. 인증 성공 시 `/auth/42/callback`으로 콜백
4. 유저 존재 여부 확인
   - 신규: 자동 회원가입 (intraId, nickname, avatarUrl 자동 세팅)
   - 기존: 로그인 처리
5. JWT 토큰 발급 후 프론트엔드로 리다이렉트 (쿼리 파라미터 또는 쿠키)

---

### POST /auth/logout
로그아웃 (Refresh Token 무효화)

**Headers:** `Authorization: Bearer {accessToken}`

---

## JWT 전략

### Access Token
- 만료: 15분
- Payload: `{ sub: userid, email, nickname }`

### Refresh Token
- 만료: 7일
- DB 또는 Redis에 저장하여 무효화 가능

### Guard 적용
```typescript
@UseGuards(JwtAuthGuard)
@Get('profile')
getProfile(@CurrentUser() user: User) {
  return user;
}
```

---

## 비밀번호 보안
- **bcrypt** 사용 (salt rounds: 12)
- 비밀번호는 절대 응답에 포함하지 않음
- 비밀번호 정책: 최소 8자, 대문자 1+, 소문자 1+, 숫자 1+, 특수문자 1+

---

## 완료 기준
- [ ] 이메일+PW 회원가입 동작
- [ ] 로그인 시 JWT 토큰 발급
- [ ] 보호된 라우트에 JWT Guard 동작
- [ ] Refresh Token으로 Access Token 갱신
- [ ] 42 OAuth 로그인/회원가입 플로우 동작
- [ ] 비밀번호 bcrypt 해싱 확인
- [ ] 입력값 유효성 검증 동작

---

## 커밋 단위
1. `feat: add email/password registration and login`
2. `feat: implement JWT access/refresh token authentication`
3. `feat: add 42 OAuth login integration`
