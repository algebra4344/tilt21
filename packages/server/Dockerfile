FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules packages/core/node_modules
COPY --from=deps /app/packages/server/node_modules packages/server/node_modules
COPY . .
RUN npm run build -w packages/core && npm run build -w packages/server

FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules packages/core/node_modules
COPY --from=deps /app/packages/server/node_modules packages/server/node_modules
COPY --from=build /app/packages/server/dist packages/server/dist
COPY packages/server/drizzle.config.ts packages/server/
COPY packages/server/src/db packages/server/src/db
COPY packages/core/package.json packages/core/
COPY packages/server/package.json packages/server/
EXPOSE 3001
CMD ["node", "packages/server/dist/index.js"]
