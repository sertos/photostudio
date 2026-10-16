# Imagen completa y pesada, garantizada para compilar módulos nativos
FROM node:20

WORKDIR /app

COPY package*.json ./

# Instalamos con bandera verbose para que no oculte absolutamente nada
RUN rm -f package-lock.json && npm install --verbose

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/server.cjs"]
