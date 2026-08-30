# Two stages: Node builds the bundle, nginx serves it. The Node toolchain does
# not ship in the image that runs.
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

# Vite bakes VITE_* variables into the bundle at build time, so these are build
# arguments rather than runtime environment: changing one needs a rebuild.
# VITE_API_URL is where the browser reaches the API directly for the WebSocket,
# so it is a host address, not the compose service name — the browser runs
# outside the compose network and cannot resolve `server`.
ARG VITE_API_URL=http://localhost:5000
ARG VITE_DEMO_MODE=false
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_DEMO_MODE=$VITE_DEMO_MODE

COPY . .
RUN npm run build

FROM nginx:alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
