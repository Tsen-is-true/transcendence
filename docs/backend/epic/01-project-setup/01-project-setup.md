# Epic 01: 프로젝트 셋업

> NestJS 프로젝트 초기화, TypeORM 설정, Docker 환경, 프로젝트 구조 수립

## 목표
- `apps/backend`에 NestJS 프로젝트 스캐폴딩
- TypeORM + MariaDB 연결
- Docker 개발 환경 구성
- 공통 모듈 (config, guards, filters, pipes) 기반 마련

---

## 태스크

### 1.1 NestJS 프로젝트 초기화
- `apps/backend`에 NestJS CLI로 프로젝트 생성
- TypeScript strict 모드 설정
- ESLint + Prettier 설정
- path alias 설정 (`@src/`, `@common/` 등)

### 1.2 의존성 설치
```
# Core
@nestjs/core @nestjs/common @nestjs/platform-express

# Database
@nestjs/typeorm typeorm mysql2

# Auth (Epic 02에서 사용)
@nestjs/passport @nestjs/jwt passport passport-jwt passport-local bcrypt

# WebSocket (Epic 05에서 사용)
@nestjs/websockets @nestjs/platform-socket.io socket.io

# Validation
class-validator class-transformer

# Config
@nestjs/config

# Swagger (Epic 08에서 사용)
@nestjs/swagger swagger-ui-express

# Rate Limiting (Epic 08에서 사용)
@nestjs/throttler
```

### 1.3 환경 설정 (`ConfigModule`)
```typescript
// .env 변수 매핑
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=trans
DB_PASSWORD=change_me
DB_DATABASE=trans
JWT_SECRET=your-secret
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d
OAUTH_42_CLIENT_ID=
OAUTH_42_CLIENT_SECRET=
OAUTH_42_CALLBACK_URL=
CORS_ORIGIN=http://localhost:3000
```

### 1.4 TypeORM 설정
```typescript
TypeOrmModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'mariadb',
    host: config.get('DB_HOST'),
    port: config.get<number>('DB_PORT'),
    username: config.get('DB_USERNAME'),
    password: config.get('DB_PASSWORD'),
    database: config.get('DB_DATABASE'),
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize: false, // 프로덕션에서는 migration 사용
    logging: config.get('NODE_ENV') === 'development',
  }),
})
```

### 1.5 프로젝트 구조
```
apps/backend/
├── src/
│   ├── main.ts                    # 엔트리포인트 (HTTPS, CORS, Swagger)
│   ├── app.module.ts              # 루트 모듈
│   ├── common/
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── api-key.guard.ts
│   │   ├── decorators/
│   │   │   └── current-user.decorator.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   └── transform.interceptor.ts
│   │   └── pipes/
│   │       └── validation.pipe.ts
│   ├── config/
│   │   └── configuration.ts
│   ├── database/
│   │   ├── migrations/
│   │   └── seeds/
│   ├── auth/
│   ├── users/
│   ├── rooms/
│   ├── game/
│   ├── tournaments/
│   ├── matches/
│   ├── scores/
│   ├── chat/
│   ├── friends/
│   ├── achievements/
│   ├── api-keys/
│   ├── public-api/
│   └── metrics/
├── test/
├── Dockerfile
├── .env.example
├── tsconfig.json
├── nest-cli.json
└── package.json
```

### 1.6 Docker 환경
- `apps/backend/Dockerfile` 작성 (multi-stage build)
- 루트 `docker-compose.yml` 업데이트 (MariaDB + Backend + 볼륨)
- 개발용 hot-reload 지원 (`docker-compose.dev.yml`)

### 1.7 공통 모듈 구현
- **GlobalExceptionFilter**: HTTP 예외 통합 처리, 에러 응답 포맷 통일
- **TransformInterceptor**: 응답 형식 래핑 (`{ data, statusCode, message }`)
- **ValidationPipe**: class-validator 기반 입력값 검증 (글로벌)
- **CurrentUser Decorator**: JWT에서 유저 정보 추출

---

## 응답 포맷 표준

### 성공 응답
```json
{
  "statusCode": 200,
  "message": "success",
  "data": { ... }
}
```

### 에러 응답
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "details": [
    { "field": "email", "message": "이메일 형식이 올바르지 않습니다" }
  ]
}
```

---

## 완료 기준
- [ ] `npm run start:dev`로 NestJS 서버 기동 확인
- [ ] TypeORM MariaDB 연결 성공
- [ ] Docker Compose로 MariaDB + Backend 동시 실행
- [ ] 글로벌 Validation Pipe 동작 확인
- [ ] `.env.example` 제공
- [ ] Swagger UI 접근 가능 (`/api/docs`)

---

## 커밋 단위
1. `feat: initialize NestJS project with TypeORM and MariaDB`
2. `feat: add common modules (guards, filters, interceptors, pipes)`
3. `feat: configure Docker environment for backend`
