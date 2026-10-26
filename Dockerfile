# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build arguments for Vite
ARG VITE_API_BASE_URL=https://api.zerde.co/diaxel/ai
ARG VITE_ORGANIZATION=cinta
ARG VITE_STAFF_ID=12001
ARG VITE_DURATION=60

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_ORGANIZATION=$VITE_ORGANIZATION
ENV VITE_STAFF_ID=$VITE_STAFF_ID
ENV VITE_DURATION=$VITE_DURATION

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
