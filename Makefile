COMPOSE_FILE	= docker-compose.yml
COMPOSE		= docker-compose -f $(COMPOSE_FILE)

# ─────────────────────────────────────────────
# Main targets
# ─────────────────────────────────────────────

all: up

## Build images and start all containers in the background
up:
	$(COMPOSE) up -d --build

## Start containers without rebuilding (faster)
start:
	$(COMPOSE) up -d

## Stop and remove all containers, networks
down:
	$(COMPOSE) down

## Stop containers (keep them, don't remove)
stop:
	$(COMPOSE) stop

## Restart all containers
re: down up

## Restart without rebuild
restart: stop start

# ─────────────────────────────────────────────
# Logs
# ─────────────────────────────────────────────

## Show logs for all services (follow)
logs:
	$(COMPOSE) logs -f

## Show frontend logs
logs-front:
	$(COMPOSE) logs -f frontend

## Show backend logs
logs-back:
	$(COMPOSE) logs -f backend

## Show nginx logs
logs-nginx:
	$(COMPOSE) logs -f nginx

# ─────────────────────────────────────────────
# Status
# ─────────────────────────────────────────────

## Show running container status
ps:
	$(COMPOSE) ps

## Show port usage that might conflict
check-ports:
	@echo "=== Checking ports 80, 443, 3000, 3001, 3306 ==="
	@lsof -i :80    2>/dev/null | grep LISTEN || echo "  80  : free"
	@lsof -i :443   2>/dev/null | grep LISTEN || echo "  443 : free"
	@lsof -i :3000  2>/dev/null | grep LISTEN || echo "  3000: free"
	@lsof -i :3001  2>/dev/null | grep LISTEN || echo "  3001: free"
	@lsof -i :3306  2>/dev/null | grep LISTEN || echo "  3306: free"

# ─────────────────────────────────────────────
# Clean
# ─────────────────────────────────────────────

## Remove containers, networks, and volumes (DB data will be lost!)
fclean:
	$(COMPOSE) down -v --remove-orphans

## Remove all unused Docker images (free up disk space)
prune:
	docker image prune -f

## Full wipe: fclean + prune
clean: fclean prune

# ─────────────────────────────────────────────
# Help
# ─────────────────────────────────────────────

help:
	@echo ""
	@echo "  Transcendence - Available make targets"
	@echo "  ───────────────────────────────────────"
	@grep -E '^##' Makefile | sed 's/## /  /'
	@echo ""

.PHONY: all up start down stop re restart logs logs-front logs-back logs-nginx ps check-ports fclean prune clean help
