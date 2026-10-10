# 📈 AlgoTraders

A production-ready, distributed, event-driven Algorithmic Trading Platform built for pattern detection and automated execution. Designed with a modular monorepo architecture, AlgoTraders allows you to visually build trading strategies, backtest them, and deploy them live against real brokers (like Alpaca) with built-in risk management and real-time dashboard monitoring.

![Aesthetic](https://img.shields.io/badge/UI-Glassmorphism-blue)
![Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20NestJS-black)
![Database](https://img.shields.io/badge/DB-PostgreSQL%20%7C%20Redis-red)

---

## 🌟 Key Features

- **Visual Strategy Builder**: Drag-and-drop indicators (RSI, SMA, EMA, MACD, VWAP) to create complex Abstract Syntax Trees (ASTs) for trading conditions without writing a single line of code.
- **Event-Driven Micro-Architecture**: Engineered over **Redis Pub/Sub**. The *Market Data Gateway* pipes live candlesticks to the *Strategy Engine*, which evaluates conditions and fires signals to the *Execution Service*.
- **Live Trading & Broker Integration**: Out-of-the-box integration with Alpaca. API keys are safely encrypted in PostgreSQL using `aes-256-gcm`. 
- **Global Risk Management**: Strict circuit breakers. Set a Max Daily Loss limit or maximum trade sizes. The Risk Service transparently intercepts and approves/rejects all strategy signals before broker execution.
- **Real-Time Glassmorphic Dashboard**: A gorgeous, minimalist UI built with Next.js 14, Tailwind CSS, and `lightweight-charts`. WebSocket connections instantly reflect live portfolio PnL, recent orders, and push notifications when algorithmic trades trigger.
- **Strategy Orchestration**: A dedicated "My Strategies" manager to dynamically activate or pause your trading algorithms on the fly without dropping WebSocket connections.

---

## 🏗️ Architecture & Tech Stack

This project is structured as a **Turborepo** monorepo to ensure tight type-safety across the frontend, backend, and shared libraries.

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Lightweight Charts, Socket.io-client.
- **Backend**: NestJS, TypeScript, Socket.io.
- **Databases**: PostgreSQL (Relational State via Prisma ORM), Redis (Pub/Sub Event Bus & In-memory caching).
- **Core Packages**:
  - `@stock-platform/strategy-core`: The AST parser and evaluation engine for trading algorithms.
  - `@stock-platform/indicators`: Mathematical indicator calculation logic (RSI, MACD, etc.).
  - `@stock-platform/types`: Shared TypeScript interfaces across the entire stack.
  - `@stock-platform/database`: Prisma schema and migrations.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/en/) (v18+)
- [pnpm](https://pnpm.io/) (v9+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for PostgreSQL and Redis)

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/your-username/AlgoTraders.git
cd AlgoTraders
pnpm install
```

### 2. Infrastructure
Boot up the PostgreSQL database and Redis event bus using Docker:
```bash
npm run docker:up
```

### 3. Environment Variables
Ensure the `.env` file in the root directory is properly configured. A default `.env` is provided. If it's missing, ensure the following are set:
```env
DATABASE_URL=postgresql://stock_platform:stock_platform_password@localhost:5432/stock_platform?schema=public
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=your_super_secret_jwt_key
```

### 4. Database Setup
Push the Prisma schema to your running PostgreSQL instance:
```bash
cd services/api
pnpm prisma db push
cd ../../
```

### 5. Launch the Platform
Start both the NestJS API and the Next.js Frontend simultaneously:
```bash
npm run dev
# or
pnpm run dev
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:3001](http://localhost:3001)

---

## 🛡️ Security
- All sensitive broker API keys are encrypted at rest using AES-256-GCM.
- JWT-based authentication guards the API routes.
- Webhooks are securely validated against expected broker IP ranges (where applicable).

## 📄 License
This project is licensed under the MIT License.
