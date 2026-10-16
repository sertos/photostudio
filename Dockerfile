FROM node:20-alpine

WORKDIR /app

# 1. Copiamos manifiestos
COPY package*.json ./

# 2. Instalamos TODO (dev y prod). Sin podar nada.
RUN npm install

# 3. Copiamos el código y compilamos
COPY . .
RUN npm run build

# 4. Variables obligatorias para Cloud Run
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# 5. Ejecutamos
CMD ["node", "dist/server.cjs"]
