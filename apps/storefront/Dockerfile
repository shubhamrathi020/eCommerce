# Storefront (Angular SSR). Build from the repository root:
#   docker build -f apps/storefront/Dockerfile -t shop-storefront .

# ---- build stage: install locked dependencies and produce the production bundle ----
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
# Copy manifests first so dependency installation is cached until they change.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm exec nx build storefront

# ---- runtime stage: Node only; the server bundle contains its own dependencies ----
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=4000
WORKDIR /app
COPY --from=build --chown=node:node /app/dist/apps/storefront ./
# Run as the unprivileged "node" user that ships with the image.
USER node
EXPOSE 4000
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:4000/healthz || exit 1
CMD ["node", "server/server.mjs"]
