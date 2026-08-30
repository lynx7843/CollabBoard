# The API: Express + Socket.IO, talking to whichever MongoDB MONGODB_URI names.
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Manifests first, so a source change does not reinstall the dependency tree.
# `npm ci` installs exactly the lockfile; --omit=dev leaves the test tooling out
# of the image.
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Nothing this process does needs root.
USER node

EXPOSE 5000

# The health check lives in docker-compose.yml rather than here: an image-level
# HEALTHCHECK is ignored by Podman's default OCI image format, and the check is
# about the running service anyway, not the image.
CMD ["node", "index.js"]
