FROM node:20-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml .npmrc ./
RUN pnpm install

COPY . .

EXPOSE 5173

CMD ["pnpm", "exec", "vite", "--host", "--port", "5173"]