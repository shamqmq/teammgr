FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy the rest of the backend code
COPY . .

# Expose the port your Express app listens on
EXPOSE 3000

# Run migration then start the server with file watching
CMD ["sh", "-c", "bun run db:migrate && bun --watch src/server.ts"]
