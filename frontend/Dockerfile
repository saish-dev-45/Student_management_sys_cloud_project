
# Stage 1: Build the React application
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Serve the production build
FROM nginx:alpine

ENV PORT=8080
ENV BACKEND_URL=http://backend:8000
ENV NGINX_ENVSUBST_VARS='$PORT $BACKEND_URL'

COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]


