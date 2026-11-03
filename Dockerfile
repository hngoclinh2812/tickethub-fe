# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app
# corepack đọc phiên bản pnpm từ "packageManager" trong package.json
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# ---- Serve ----
FROM nginx:1.27-alpine
# nginx:alpine tự envsubst các file *.template trong /etc/nginx/templates khi khởi động
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
ENV BACKEND_URL=http://host.docker.internal:8080
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost/ >/dev/null || exit 1
