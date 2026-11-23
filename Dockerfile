FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm install --no-audit --no-fund
COPY arena ./arena
COPY scripts/build-ui.mjs ./scripts/build-ui.mjs
RUN npm run build:arena && npm prune --omit=dev

FROM node:24-bookworm-slim AS app
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/generated ./generated
COPY . .
ENV NODE_ENV=production
USER node
EXPOSE 4173
CMD ["node","server.mjs"]

FROM docker:29-cli AS cli
FROM app AS worker
USER root
COPY --from=cli /usr/local/bin/docker /usr/local/bin/docker
CMD ["node","judge/worker.mjs"]
