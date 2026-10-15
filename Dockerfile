# Estapa 1: Build de la app y del server
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2: Ejecución con Node.js (Servidor Express + Estáticos)
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
RUN npm install --only=production

# Copiamos la compilación
COPY --from=builder /app/dist ./dist

EXPOSE 8080

# Ejecutamos el servidor de Express
CMD ["node", "dist/server.cjs"]
