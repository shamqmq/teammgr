# ---- Base ----
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies first (layer caching)
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile

# Copy the rest of the backend code
COPY . .

# Expose the port your Express app listens on
EXPOSE 3000

# Run migration inside the container
CMD ["sh", "-c", "bun run db:migrate"]

# Start the app directly with Bun (handles .ts natively)
CMD ["bun", "run", "src/server.ts"]

