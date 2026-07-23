FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

ARG UPLOADS_PROXY_URL=http://backend:3001
ENV UPLOADS_PROXY_URL=$UPLOADS_PROXY_URL

ARG NEXT_PUBLIC_API_URL=https://megaelectra.rusoft.dev/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build

# ── Runner ────────────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/public                    ./public
COPY --from=build /app/.next/standalone          ./
COPY --from=build /app/.next/static              ./.next/static

EXPOSE 5174

ENV PORT=5174
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
