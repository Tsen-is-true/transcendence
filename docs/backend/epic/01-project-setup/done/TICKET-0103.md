# TICKET-0103: Docker 환경 구성

> **Epic:** 01-project-setup
> **커밋 메시지:** `feat: configure Docker environment for backend`

## 관련 태스크
- 1.6 Docker 환경

## 구현 범위

### Dockerfile (apps/backend/Dockerfile)
- Multi-stage build (builder → production)
- Node.js 20 Alpine 베이스
- `npm ci --only=production` 프로덕션 의존성만

### docker-compose.yml 업데이트
- MariaDB 서비스 (기존 유지)
- Backend 서비스 (빌드 컨텍스트, 포트 매핑, 환경변수)
- 네트워크, 볼륨 설정

### 개발용 핫리로드
- `docker-compose.dev.yml` (오버라이드)
- 소스 코드 볼륨 마운트
- `npm run start:dev` 명령

### 환경변수
- `.env.example` 업데이트 (신규 변수 추가)
- docker-compose에서 `.env` 파일 참조

## 완료 기준
- [ ] `docker compose up` 으로 MariaDB + Backend 동시 실행
- [ ] Backend에서 MariaDB 연결 성공
- [ ] 개발 모드에서 코드 변경 시 핫리로드 동작
- [ ] `.env.example`에 모든 필수 변수 문서화
