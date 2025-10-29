FROM node:18-alpine
WORKDIR /app

# Install deps
COPY package*.json ./
RUN npm ci || npm install

# Copy source
COPY . .

# Build with Vite using API base provided at build-time
ARG VITE_API_BASE
ENV VITE_API_BASE=${VITE_API_BASE}
RUN npm run build

# Serve static build
RUN npm i -g serve
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
