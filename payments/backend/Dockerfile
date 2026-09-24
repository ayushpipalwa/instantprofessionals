FROM node:22-bookworm-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node core.mjs server.mjs postgres.mjs cloud-server.mjs ./
USER node
ENV NODE_ENV=production PORT=8080
EXPOSE 8080
CMD ["node", "cloud-server.mjs"]
