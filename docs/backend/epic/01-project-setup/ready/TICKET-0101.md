# TICKET-0101: NestJS + TypeORM + MariaDB 초기화

> **Epic:** 01-project-setup
> **커밋 메시지:** `feat: initialize NestJS project with TypeORM and MariaDB`

## 관련 태스크
- 1.1 NestJS 프로젝트 초기화
- 1.2 의존성 설치
- 1.3 환경 설정 (ConfigModule)
- 1.4 TypeORM 설정
- 1.5 프로젝트 구조

## 구현 범위

### NestJS 프로젝트 스캐폴딩
- `apps/backend`에 NestJS CLI 프로젝트 생성
- TypeScript strict 모드
- ESLint + Prettier 설정
- path alias (`@src/`, `@common/`)

### 의존성 설치
- Core: `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`
- DB: `@nestjs/typeorm`, `typeorm`, `mysql2`
- Validation: `class-validator`, `class-transformer`
- Config: `@nestjs/config`

### ConfigModule 환경 설정
- `.env` 파일 기반 설정 로드
- DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE
- JWT_SECRET, JWT_EXPIRATION, CORS_ORIGIN

### TypeORM 연결
- `TypeOrmModule.forRootAsync()` 설정
- MariaDB 드라이버
- Entity auto-load 설정
- synchronize: development에서만 true

### 프로젝트 디렉토리 구조 생성
- `src/common/`, `src/config/`, `src/database/`
- 각 도메인 모듈 빈 디렉토리 준비

## 완료 기준
- [ ] `npm run start:dev`로 NestJS 서버 기동 성공
- [ ] TypeORM MariaDB 연결 성공 로그 확인
- [ ] `.env.example` 파일 제공
- [ ] ESLint/Prettier 설정 동작 확인
