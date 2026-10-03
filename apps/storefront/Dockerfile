# Storefront (Angular SSR). Build from the repository root:
#   docker build -f apps/storefront/Dockerfile --build-context contracts_src=../eCommerce-contracts -t shop-storefront .

# ---- build stage: install locked dependencies and produce the production bundle ----
# ---- contracts stage: the shared package lives in the sibling eCommerce-contracts repository and is passed in
# as a named build context (docker compose does this for you). Delete this stage and the two COPY --from=contracts
# lines below once @ecom/contracts is a git or registry dependency instead of `link:../eCommerce-contracts`. ----
FROM node:22-alpine AS contracts
WORKDIR /eCommerce-contracts
RUN corepack enable
COPY --from=contracts_src package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY --from=contracts_src tsconfig.json ./
COPY --from=contracts_src scripts ./scripts
COPY --from=contracts_src src ./src
RUN pnpm build

FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
# `link:../eCommerce-contracts` in package.json resolves to /eCommerce-contracts from /app.
COPY --from=contracts /eCommerce-contracts/package.json /eCommerce-contracts/package.json
COPY --from=contracts /eCommerce-contracts/dist /eCommerce-contracts/dist
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
