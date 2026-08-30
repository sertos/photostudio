# Usamos la imagen COMPLETA de Node (sin -slim ni -alpine) para tener todas las librerías nativas de Linux
FROM node:20 AS build
WORKDIR /app

# Copiamos manifiestos
COPY package*.json ./

# Instalamos de forma limpia
RUN npm install

# Copiamos el resto del código
COPY . .

# Variables y Build
ARG VITE_GEMINI_API_KEY
ENV VITE_GEMINI_API_KEY=$VITE_GEMINI_API_KEY

RUN npm run build

# Etapa final Nginx (esta sí sigue siendo ultraligera)
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN sed -i 's/listen  *80;/listen 8080;/g' /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
