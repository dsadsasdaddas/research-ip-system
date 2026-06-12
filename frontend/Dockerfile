# 注:刻意不写 `# syntax=docker/dockerfile:1` —— 那会让 BuildKit 联网拉取 dockerfile 前端镜像,
# 在 docker.io 不稳定(如内网/国内)时会卡在 "resolve image config for docker/dockerfile:1"。
# 本 Dockerfile 只用标准指令,直接用 BuildKit 内置前端即可。
# =============================================================================
# 前端镜像(多阶段)
#   stage 1 (build): node:20-alpine, npm ci + vite build -> dist/
#   stage 2 (serve): nginx:alpine, 提供静态文件并把 /api 反代到后端容器
# 前端构建时用相对路径 VITE_API_BASE=/api,浏览器请求 /api/xxx,
# 由 nginx 反代到 http://backend:3001/api/xxx(同源,无跨域)。
# =============================================================================

# ---- stage 1: 构建 ----
FROM node:20-alpine AS build

WORKDIR /app

COPY frontend/package.json frontend/package-lock.json* ./
# 用 npm install 而非 npm ci:与 backend 同理,Windows 宿主生成的 lockfile 含 Windows 平台
# optional 依赖,Linux 容器下 npm ci 会因平台 optional deps 不一致报错。npm install 跨平台稳妥。
RUN npm install --no-audit --no-fund

COPY frontend/ ./

# VITE_API_BASE 用相对路径 /api,生产由 nginx 反代
ENV VITE_API_BASE=/api
RUN npm run build

# ---- stage 2: nginx 提供静态文件 + 反代 ----
FROM nginx:alpine AS serve

# 清空默认站点,放我们自己的配置
RUN rm -f /etc/nginx/conf.d/default.conf
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# 拷贝构建产物
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
