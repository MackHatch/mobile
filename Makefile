# 2-minute demo: backend + DB + mobile
# Run from repo root

COMPOSE := docker compose -f infra/docker-compose.yml
BACKEND := npm run dev --workspace=@habit-mood-tracker/backend

.PHONY: demo reset

demo:
	$(COMPOSE) up -d
	@echo "Waiting for Postgres..."
	@sleep 5
	@echo "Running migrations..."
	@npm run db:migrate:deploy
	@echo "Seeding demo data..."
	@npm run db:seed
	@echo ""
	@echo "=========================================="
	@echo "  Backend starting. For mobile, run:"
	@echo "  cd apps/mobile && npm start"
	@echo "=========================================="
	$(BACKEND)

reset:
	$(COMPOSE) down -v
	$(COMPOSE) up -d
	@echo "Waiting for Postgres..."
	@sleep 5
	@npm run db:migrate:deploy
	@npm run db:seed
	@echo "Database reset and reseeded."
