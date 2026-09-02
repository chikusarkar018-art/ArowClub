FROM node:20-slim

WORKDIR /app

# Copy package definition files
COPY package.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Build Vite client and backend bundle
RUN npm run build

# Production environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start compiled server
CMD ["npm", "start"]
