# Etapa 1: Build de la app y del servidor Express
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2: Ejecución en Producción
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

COPY package*.json ./
# Instalamos todas las dependencias para evitar errores de módulos faltantes en runtime
RUN npm install

# Copiamos los archivos compilados del frontend y del backend
COPY --from=builder /app/dist ./dist

EXPOSE 8080

# Arrancamos el servidor Express compilado
CMD ["node", "dist/server.cjs"]
