FROM node:20-alpine AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy the entire workspace
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Generate Prisma Client
RUN cd services/api && pnpm exec prisma generate

# Build the API and internal packages
RUN pnpm --filter @stock-platform/api run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

ENV NODE_ENV production

# For simplicity in a pnpm workspace without turbo prune, we copy the entire app and prod dependencies
COPY --from=builder /app /app

# Expose port
EXPOSE 3001

# Run the NestJS application
CMD ["pnpm", "--filter", "@stock-platform/api", "run", "start:prod"]
