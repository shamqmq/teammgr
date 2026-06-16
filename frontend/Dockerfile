FROM oven/bun:1-alpine
WORKDIR /app

# Copy package.json and install dependencies first (caching)
COPY package.json bun.lockb* ./
RUN bun install

# Copy the rest of the source
COPY . .

EXPOSE 5173

# Run Vite dev server with host flag to allow external connections
CMD ["bun", "run", "dev", "--host"]
