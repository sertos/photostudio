FROM node:20-slim

WORKDIR /app

# 1. Copiamos los manifiestos
COPY package*.json ./

# 2. Limpiamos cualquier rastro de conflictos e instalamos TODO
RUN rm -f package-lock.json && npm install --legacy-peer-deps

# 3. Copiamos el resto del código y compilamos
COPY . .
RUN npm run build

# 4. Configuramos el entorno para Cloud Run
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# 5. Ejecutamos el servidor compilado
CMD ["node", "dist/server.cjs"]
