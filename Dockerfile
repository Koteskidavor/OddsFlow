# ---------- Stage 1: build ----------
# Installs exact dependencies and produces the production bundle.
FROM node:22-alpine AS build
WORKDIR /app

# Copy manifests first so npm ci is cached until the lockfile changes.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Stage 2: serve ----------
# Copies the client build output into nginx and serves it with an SPA
# fallback for Angular client-side routing.
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/OddsFlow/browser /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]