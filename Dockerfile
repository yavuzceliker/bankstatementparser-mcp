FROM node:22-alpine
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm install && npm run build
ENTRYPOINT ["node", "dist/index.js"]
