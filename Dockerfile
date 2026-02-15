# Cloud Run用 Dockerfile
# ビルドコンテキスト: リポジトリルート

FROM node:20-alpine AS builder

# pnpm 9.xを固定バージョンで有効化（ロックファイル互換性のため）
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# frontendフォルダから依存関係ファイルをコピー
COPY frontend/package.json frontend/pnpm-lock.yaml ./

# 依存関係をインストール（互換性問題対応のため--forceを使用）
RUN pnpm install --force

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
