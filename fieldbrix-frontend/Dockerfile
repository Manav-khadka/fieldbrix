FROM node:24.12.0-bookworm-slim AS development

WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

FROM development AS production
RUN pnpm build
FROM nginx:1.27.3-alpine
COPY --from=production /workspace/dist /usr/share/nginx/html
