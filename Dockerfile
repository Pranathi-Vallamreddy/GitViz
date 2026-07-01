# Portable image for the GitViz API (Fly.io, Railway, any container host).
# Render users don't need this — use render.yaml (native Node) instead.
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
# Install deps against the lockfile first for better layer caching.
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY packages/shared/package.json packages/shared/
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
COPY apps/cli/package.json apps/cli/
RUN pnpm install --frozen-lockfile
# Build the engine + server.
COPY . .
RUN pnpm --filter @gitviz/server build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    GITVIZ_REPO=/app/demo-repo \
    CORS_ORIGIN=* \
    PORT=3000
COPY --from=build /app /app
EXPOSE 3000
CMD ["node", "packages/server/dist/index.js"]
