FROM node:20-alpine

RUN apk add --no-cache mysql-client

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

COPY . .

RUN mkdir -p uploads public/qrcodes

EXPOSE 3001

CMD ["node", "app.js"]
