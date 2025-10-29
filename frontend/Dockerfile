FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
# Install all dependencies including dev dependencies for development
RUN npm install
COPY . .
EXPOSE 3000
# Default command for development (can be overridden in docker-compose)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
