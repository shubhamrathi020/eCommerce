# API (NestJS). Build from the repository root:
#   docker build -f apps/api/Dockerfile -t shop-api .                      # the server
#   docker build -f apps/api/Dockerfile --target migrate -t shop-api-migrate .  # one-shot migrations + demo seed

# ---- build stage: locked install, Prisma client generation, production bundle ----
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm db:generate && pnpm exec nx build api

# ---- migrate stage: applies migrations (safe to run repeatedly; Prisma takes a lock) and seeds demo accounts ----
# Kept out of the runtime image so the server image carries no schema tooling.
FROM build AS migrate
CMD ["sh", "-c", "pnpm db:migrate:deploy && pnpm db:seed"]

# ---- runtime stage: only the bundle and its production dependencies ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3333
WORKDIR /app
RUN corepack enable
COPY --from=build --chown=node:node /app/dist/apps/api ./
RUN pnpm install --prod --frozen-lockfile && rm -rf /root/.cache /root/.local/share/pnpm
USER node
EXPOSE 3333
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3333/healthz || exit 1
CMD ["node", "main.js"]
