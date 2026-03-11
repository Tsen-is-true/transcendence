# Epic 08: Public API

> API Key 인증, Rate Limiting, Swagger 문서화, 5+ 엔드포인트 CRUD

## 목표
- API Key 발급/조회/수정/폐기 CRUD
- API Key 기반 인증 Guard
- Rate Limiting (분당 요청 제한)
- Swagger (OpenAPI) 문서화
- 최소 5개 Public API 엔드포인트

---

## 엔티티

### ApiKey
```typescript
@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn()
  apiKeyId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 255 })
  keyHash: string; // SHA-256 해시

  @Column({ type: 'varchar', length: 8 })
  keyPrefix: string; // 키 앞 8자 (식별용, 예: "tk_a1b2...")

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

---

## API Key 생성 플로우

```
1. 유저가 POST /api/api-keys 요청
2. 서버에서 랜덤 API Key 생성 (예: "tk_a1b2c3d4e5f6g7h8i9j0...")
3. SHA-256 해시 생성 → DB에 해시만 저장
4. 원본 키를 응답으로 반환 (이후 다시 볼 수 없음)
```

### 키 포맷
```
tk_{32자 랜덤 hex}
예: tk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## API Key 인증 Guard

```typescript
@Injectable()
export class ApiKeyGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) throw new UnauthorizedException('API Key required');

    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const keyRecord = await this.apiKeyRepo.findOne({
      where: { keyHash, isActive: true }
    });

    if (!keyRecord) throw new UnauthorizedException('Invalid API Key');
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('API Key expired');
    }

    // 마지막 사용 시간 업데이트
    await this.apiKeyRepo.update(keyRecord.apiKeyId, { lastUsedAt: new Date() });

    request.apiKeyUser = keyRecord.user;
    return true;
  }
}
```

---

## Rate Limiting

```typescript
// NestJS Throttler 모듈 사용
@Module({
  imports: [
    ThrottlerModule.forRoot({
      ttl: 60,    // 60초 윈도우
      limit: 60,  // 분당 60회
    }),
  ],
})

// Public API 엔드포인트에 적용
@UseGuards(ThrottlerGuard, ApiKeyGuard)
@Controller('api')
export class PublicApiController { ... }
```

### Rate Limit 응답 헤더
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 55
X-RateLimit-Reset: 1710000060
```

### 429 Too Many Requests 응답
```json
{
  "statusCode": 429,
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "error": "Too Many Requests"
}
```

---

## Public API 엔드포인트

### 1. POST /api/api-keys
API Key 생성

**Headers:** `Authorization: Bearer {jwt}` (JWT 인증 필요)

**Request Body:**
```json
{
  "name": "My App Key",
  "expiresAt": "2027-01-01T00:00:00Z"  // 선택
}
```

**Response (201):**
```json
{
  "data": {
    "apiKeyId": 1,
    "name": "My App Key",
    "key": "tk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "keyPrefix": "tk_a1b2c",
    "isActive": true,
    "expiresAt": "2027-01-01T00:00:00Z",
    "createdAt": "2026-03-10T12:00:00Z"
  },
  "message": "API Key가 생성되었습니다. 이 키는 다시 표시되지 않으니 안전하게 보관하세요."
}
```

---

### 2. GET /api/api-keys
내 API Key 목록

**Headers:** `Authorization: Bearer {jwt}`

**Response:**
```json
{
  "data": [
    {
      "apiKeyId": 1,
      "name": "My App Key",
      "keyPrefix": "tk_a1b2c",
      "isActive": true,
      "lastUsedAt": "2026-03-10T15:00:00Z",
      "expiresAt": "2027-01-01T00:00:00Z",
      "createdAt": "2026-03-10T12:00:00Z"
    }
  ]
}
```

---

### 3. PUT /api/api-keys/:id
API Key 수정 (이름, 활성 상태)

**Request Body:**
```json
{
  "name": "Updated Name",
  "isActive": false
}
```

---

### 4. DELETE /api/api-keys/:id
API Key 삭제

---

### 5. GET /api/matches
매치 히스토리 조회 (Public)

**Headers:** `X-API-Key: {apiKey}`

**Query Parameters:**
- `userId`: 특정 유저 (선택)
- `type`: 'all' | '1v1' | 'tournament'
- `page`, `limit`

---

### 6. GET /api/leaderboard
리더보드 조회 (Public)

**Headers:** `X-API-Key: {apiKey}`

**Query Parameters:**
- `type`: 'elo' | 'wins' | 'level'
- `limit`: 10 | 20 | 50

---

### 7. GET /api/users/:id/stats
유저 통계 조회 (Public)

**Headers:** `X-API-Key: {apiKey}`

---

## Swagger 문서화

### 설정
```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('Transcendence Public API')
  .setDescription('Pong 게임 플랫폼 Public API')
  .setVersion('1.0')
  .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' }, 'api-key')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

### 접근 URL
- Swagger UI: `https://localhost:3001/api/docs`
- OpenAPI JSON: `https://localhost:3001/api/docs-json`

---

## 완료 기준
- [ ] API Key CRUD 4개 엔드포인트 동작
- [ ] API Key 인증 Guard 동작 (X-API-Key 헤더)
- [ ] Rate Limiting 동작 (분당 60회)
- [ ] Public API 3개+ 엔드포인트 동작 (총 7개)
- [ ] Swagger UI 접근 가능 및 문서 정확성
- [ ] 429 응답 및 Rate Limit 헤더

---

## 커밋 단위
1. `feat: add API Key CRUD endpoints`
2. `feat: implement API Key authentication guard`
3. `feat: add rate limiting with throttler`
4. `feat: add public API endpoints (matches, leaderboard, stats)`
5. `feat: configure Swagger documentation`
