# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm install --global npm@10.9.8 \
    && npm ci --no-audit --no-fund

FROM base AS builder
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

ARG DEPLOYMENT_ID=v1-3-1
ARG DATABASE_URL=postgres://build:build@localhost:5432/build
ARG APP_URL=http://localhost:3000
ARG AUTH_SECRET=build-only-secret-at-least-32-characters
ARG SETUP_TOKEN=build-only-setup-token
ARG TWENTY_BASE_URL=http://localhost:3001
ARG TWENTY_API_KEY=build-only-api-key
ARG TWENTY_WEBHOOK_SECRET=build-only-webhook-secret

ENV DATABASE_URL=$DATABASE_URL
ENV APP_URL=$APP_URL
ENV AUTH_SECRET=$AUTH_SECRET
ENV SETUP_TOKEN=$SETUP_TOKEN
ENV TWENTY_BASE_URL=$TWENTY_BASE_URL
ENV TWENTY_API_KEY=$TWENTY_API_KEY
ENV TWENTY_WEBHOOK_SECRET=$TWENTY_WEBHOOK_SECRET
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_DEPLOYMENT_ID=$DEPLOYMENT_ID

RUN npm run build \
    && npm run build:runtime \
    && rm -f .next/standalone/.env .next/standalone/.env.*

FROM node:22-alpine AS runner
WORKDIR /app

ARG VERSION=1.3.1
LABEL org.opencontainers.image.title="Twenty CRM Client Portal" \
      org.opencontainers.image.description="Self-hosted external client portal for Twenty CRM" \
      org.opencontainers.image.source="https://github.com/lilremark/twentycrmclientportal" \
      org.opencontainers.image.version=$VERSION

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV APP_VERSION=$VERSION
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache libc6-compat \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 --ingroup nodejs portal \
    && mkdir -p /app/data/uploads \
    && chown -R portal:nodejs /app/data

COPY --from=builder --chown=portal:nodejs /app/.next/standalone ./
COPY --from=builder --chown=portal:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=portal:nodejs /app/public ./public
COPY --from=builder --chown=portal:nodejs /app/drizzle ./drizzle
COPY --from=builder --chown=portal:nodejs /app/.runtime ./scripts
COPY --chown=portal:nodejs scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod 0755 /usr/local/bin/docker-entrypoint.sh

USER portal
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:3000/health/ready || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
