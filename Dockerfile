# Cloud Run用 Dockerfile
# ビルドコンテキスト: リポジトリルート

FROM node:20-alpine AS builder

# pnpmを有効化
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# frontendフォルダから依存関係ファイルをコピー
COPY frontend/package.json frontend/pnpm-lock.yaml ./

# 依存関係をインストール
RUN pnpm install --frozen-lockfile

# frontendフォルダのソースコードをコピー
COPY frontend/ ./

# Next.jsをビルド
RUN pnpm build

# 本番用イメージ
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOSTNAME="0.0.0.0"

# セキュリティ: 非rootユーザーで実行
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# standaloneビルド成果物をコピー
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
