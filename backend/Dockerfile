FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
# Install all dependencies including dev dependencies for development
RUN npm install
COPY . .
EXPOSE 4000
# Default command for development (can be overridden in docker-compose)
CMD ["npm", "run", "start"]
