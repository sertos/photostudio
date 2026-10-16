# Cambiamos Alpine por Debian Slim. Evita el 99% de los errores de npm install con esbuild.
FROM node:20-slim

WORKDIR /app

# Copiamos solo los manifiestos primero
COPY package*.json ./

# Limpiamos el lock e instalamos. Si falla, obligamos a Docker a imprimir el log real del error.
RUN rm -f package-lock.json && \
    npm install --legacy-peer-deps || \
    (cat /root/.npm/_logs/*-debug*.log && exit 1)

# Copiamos el resto del código
COPY . .

# Compilamos
RUN npm run build

# Configuramos entorno
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Ejecutamos con el blidaje anti-crash
CMD ["node", "dist/server.cjs"]
