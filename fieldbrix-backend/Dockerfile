FROM node:24.12.0-bookworm-slim AS development

WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
EXPOSE 3000
CMD ["pnpm", "start:dev"]

FROM development AS production
RUN pnpm build && pnpm prune --prod
CMD ["node", "dist/main"]
