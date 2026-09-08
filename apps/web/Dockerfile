FROM node:20-alpine AS builder

# Enable pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy the entire workspace
COPY . .

# Install dependencies and build the web app
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @stock-platform/web run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Next.js standalone output automatically copies required node_modules
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

# Expose port
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# The standalone build outputs a server.js in the root of the workspace context
CMD ["node", "apps/web/server.js"]
