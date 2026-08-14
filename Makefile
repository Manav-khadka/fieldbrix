.DEFAULT_GOAL := help

.PHONY: help install bootstrap migrate seed start stop clean test lint build health commitlint

help:
	@printf '%s\n' 'FieldBrix Sprint 01 commands:' '  make install    Install backend, frontend, and mobile dependencies' '  make bootstrap  Build and start the local FieldBrix stack' '  make migrate    Apply repeatable local schema' '  make seed       Apply deterministic local seed data' '  make start      Start local services' '  make stop       Stop local services (preserves data)' '  make clean      Remove only FieldBrix local containers and volumes' '  make test       Run backend, frontend, and mobile tests' '  make lint       Run backend, frontend, and mobile static checks' '  make build      Build backend, frontend, and mobile shells' '  make health     Check API, web, PostgreSQL, S3, and SQS health'

install:
	./scripts/local/install.sh

bootstrap:
	./scripts/local/bootstrap.sh

migrate:
	./scripts/local/migrate.sh

seed:
	./scripts/local/seed.sh

start:
	docker compose up -d

stop:
	docker compose stop

clean:
	./scripts/local/clean.sh

test:
	./scripts/local/test.sh

lint:
	./scripts/local/lint.sh

build:
	./scripts/local/build.sh

health:
	./scripts/local/health.sh

commitlint:
	./scripts/validate-commit.sh "$(MESSAGE)"
