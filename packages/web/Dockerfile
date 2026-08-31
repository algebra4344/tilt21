FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/core/package.json packages/core/
COPY packages/web/package.json packages/web/
COPY packages/server/package.json packages/server/
RUN npm ci --ignore-scripts

FROM base AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ARG NEXT_PUBLIC_WS_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build -w packages/core && npm run build -w packages/web

FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages/web/.next packages/web/.next
COPY packages/core/package.json packages/core/
COPY packages/web/package.json packages/web/
COPY packages/web/next.config.ts packages/web/
EXPOSE 3000
CMD ["npm", "run", "start", "-w", "packages/web"]
