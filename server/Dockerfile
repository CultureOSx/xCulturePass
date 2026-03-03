FROM node:20-bullseye-slim

WORKDIR /usr/src/app

# Install runtime build deps for sharp (libvips)
RUN apt-get update && apt-get install -y \
		ca-certificates \
		build-essential \
		libvips-dev \
	--no-install-recommends && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json* ./
RUN npm ci --only=production

COPY . .
RUN npm run build || true

EXPOSE 8080
CMD ["node", "lib/index.js"]
