FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --global npm@10.9.8 \
    && npm install --package-lock-only --ignore-scripts --no-audit --no-fund \
    && npm ci

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
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
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 portal
RUN mkdir -p /app/data/uploads && chown -R portal:nodejs /app/data
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/src/lib/password.ts ./src/lib/password.ts
USER portal
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["sh", "-c", "npm run db:migrate && npm run admin:bootstrap && npm start"]
