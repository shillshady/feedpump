FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy prisma schema first for generate step
COPY prisma ./prisma

# Copy worker package files and install deps
COPY worker/package*.json ./
RUN npm ci --omit=dev

# Generate Prisma client
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy worker source and build
COPY worker/tsconfig.json ./
COPY worker/src ./src
RUN npm install typescript --save-dev && npx tsc && npm uninstall typescript

CMD ["node", "dist/index.js"]
