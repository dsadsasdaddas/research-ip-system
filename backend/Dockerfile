# 注:刻意不写 `# syntax=docker/dockerfile:1` —— 那会让 BuildKit 联网拉取 dockerfile 前端镜像,
# 在 docker.io 不稳定(如内网/国内)时会卡在 "resolve image config for docker/dockerfile:1"。
# 本 Dockerfile 只用标准指令,直接用 BuildKit 内置前端即可。
# =============================================================================
# 后端镜像(多阶段,**两阶段都用 glibc/bookworm**,而非 alpine/musl)
#   stage 1 (rust-builder): 在镜像内编译 napi-rs + jieba-rs 原生插件为 cdylib
#           (libresearch_search_engine.so)。cdylib 必须用 glibc 构建 —— Alpine/musl 的
#           `x86_64-unknown-linux-musl` 目标不支持 cdylib crate-type(会报 "target does not
#           support these crate types")。runtime 阶段也用 bookworm 才能加载这个 glibc .so(ABI 一致)。
#   stage 2 (backend):      node:20-bookworm,装依赖、构建 Nest、跑 dist/main.js。
#           Rust 用 1.95:与宿主一致,依赖里有 crate 要求 edition2024(1.85 才稳定)。
# =============================================================================

# ---- stage 1: Rust 原生插件构建(glibc) ----
FROM rust:1.95-bookworm AS rust-builder

# nodejs 用来跑 scripts/build-rust-search.js(按 process.platform 选 .so/.dylib/.dll 并改名)。
# rust:bookworm 已自带 gcc/g++/make(build-essential),这里补 nodejs 以防精简。
RUN apt-get update && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace/native/search-engine

# 先只拷 Cargo 元数据,利用 Docker 缓存依赖编译
COPY backend/native/search-engine/Cargo.toml ./Cargo.toml
COPY backend/native/search-engine/Cargo.lock ./Cargo.lock
COPY backend/native/search-engine/build.rs ./build.rs
COPY backend/native/search-engine/src ./src

# 编译 release(生产 cdylib: libresearch_search_engine.so)
RUN cargo build --release

# 复制构建脚本并执行: 把 .so 复制成 index.node(Linux 分支)
COPY backend/scripts/build-rust-search.js /workspace/scripts/build-rust-search.js
# build-rust-search.js 用 process.platform 选文件名,容器内是 linux -> libresearch_search_engine.so
RUN node /workspace/scripts/build-rust-search.js

# ---- stage 2: Node 后端(glibc,与 stage1 的 cdylib ABI 一致) ----
FROM node:20-bookworm AS backend

# git 给个别 npm 包 postinstall 用(node:bookworm 通常已带,显式装以防精简)。
# fonts-wqy-zenhei:报表 PDF 导出需要 CJK 字体(pdfkit 内置字体无中文,会渲染成乱码)。
#   reports.service.resolveCjkFont() 会在 /usr/share/fonts/truetype/wqy/ 下找到它。
RUN apt-get update && apt-get install -y --no-install-recommends git fonts-wqy-zenhei \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先拷依赖清单,利用缓存
COPY backend/package.json backend/package-lock.json* ./

# 安装全部依赖(dev 也需要:nest build 依赖 @nestjs/cli 等)
# 用 npm install 而非 npm ci:lockfile 在 Windows 宿主生成,含 Windows 平台的 optional 依赖;
# Linux 容器下 npm ci 会因缺 Linux 平台的 @emnapi/@img-sharp 等条目而报
# "Missing ... from lock file"(platform-specific optional deps 跨平台不一致)。
# npm install 按容器平台重新解析,跨平台稳妥;--no-audit/--no-fund 加速。
RUN npm install --no-audit --no-fund

# 拷贝源码 + 构建脚本
COPY backend/src ./src
COPY backend/tsconfig.json ./tsconfig.json
COPY backend/nest-cli.json ./nest-cli.json
COPY backend/scripts ./scripts

# 拷贝并就位 Rust 插件到 native/search-engine/index.node
# 运行时 rust-search-adapter.ts 用 join(process.cwd(), 'native','search-engine','index.node') 加载
COPY --from=rust-builder /workspace/native/search-engine/index.node ./native/search-engine/index.node
# 同时保留 Cargo 元数据,便于 build:rust-search / test 脚本存在时不报错
COPY backend/native/search-engine/Cargo.toml ./native/search-engine/Cargo.toml

# 编译 Nest -> dist
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "dist/main.js"]
