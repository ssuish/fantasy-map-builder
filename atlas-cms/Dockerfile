FROM node:24-bookworm-slim

ENV NODE_ENV=production
WORKDIR /workspace

# Install every workspace from the root lockfile for a reproducible workspace build.
COPY package.json package-lock.json ./
COPY atlas/package.json ./atlas/package.json
COPY atlas-cms/package.json ./atlas-cms/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN npm ci --include=dev

COPY . .
RUN npm run build -w @atlas/contracts && npm run build -w atlas-cms \
    && mkdir -p /workspace/atlas-cms/.tmp /workspace/atlas-cms/public/uploads \
    && chown node:node /workspace/atlas-cms /workspace/atlas-cms/.tmp \
       /workspace/atlas-cms/public /workspace/atlas-cms/public/uploads

WORKDIR /workspace/atlas-cms
USER node
EXPOSE 8080
CMD ["npm", "run", "start"]
