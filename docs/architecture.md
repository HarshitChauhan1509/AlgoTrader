# Phase 0 Architecture

## Target System

The platform is a personal Indian-market strategy research, signal, and trading platform. It is intentionally split into bounded components so market data, strategy evaluation, risk, execution, portfolio accounting, and notifications can evolve independently.

```text
apps/web                 Next.js dashboard and strategy builder
apps/mobile              Expo app for monitoring and notifications
services/api             NestJS API, auth, CRUD, real-time gateway
services/market-data     Broker/mock market data ingestion
services/strategy-engine Deterministic strategy evaluation
services/trading-engine  Signal-to-order workflow
services/backtest-engine Historical simulation
packages/indicators      Technical indicators
packages/strategy-core   Shared strategy schema/evaluator primitives
packages/risk-engine     Position sizing and guardrails
packages/broker-adapters Broker abstraction implementations
```

Phase 1 only implements `services/api` plus foundational shared packages. Broker adapters, trading execution, Android, and Web UI are deliberately deferred.

## Phase 1 Decisions

- **NestJS** gives a modular backend structure with dependency injection, validation, guards, and testing conventions.
- **PostgreSQL + Prisma** provide typed application persistence and migrations.
- **TimescaleDB extension** is enabled locally so historical candle storage can become hypertables in a later phase.
- **Redis** is included now for health checks and future queues, idempotency, and real-time fan-out.
- **JWT access + refresh tokens** are implemented for local auth foundations. Refresh tokens are hashed before storage.
- **Strict TypeScript** is enabled across the monorepo because trading systems need deterministic, explicit contracts.
- **Mock-only by design**: no broker integration, no live trading, and no automatic execution exist in Phase 1.

## What Can Go Wrong

- Weak secrets in `.env` make JWTs forgeable. Use long random secrets outside development.
- Missing database migrations cause local and deployed schemas to drift.
- Treating Redis as durable storage would be unsafe. It is used for cache/coordination, not source-of-truth records.
- Auth endpoints must never return password hashes, refresh token hashes, broker secrets, or internal IDs not needed by clients.

## Scaling Path

The API starts as one NestJS service. Later phases can split market data, strategy evaluation, backtesting, and execution into separate services without changing the public contracts because those concepts are already separated in the repo and database model.

