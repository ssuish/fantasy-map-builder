FROM node:24-bookworm-slim AS builder

ENV NODE_ENV=development
WORKDIR /workspace

# Install every workspace from the root lockfile for a reproducible workspace build.
COPY package.json package-lock.json ./
COPY atlas/package.json ./atlas/package.json
COPY atlas-cms/package.json ./atlas-cms/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN npm ci --include=dev

COPY . .
RUN npm run build -w @atlas/contracts && npm run build -w atlas-cms

FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production
WORKDIR /workspace

# Install only the CMS workspace's production dependency graph. The root lockfile
# remains the source of truth, while the frontend workspace is omitted.
COPY package.json package-lock.json ./
COPY atlas/package.json ./atlas/package.json
COPY atlas-cms/package.json ./atlas-cms/package.json
COPY packages/contracts/package.json ./packages/contracts/package.json
RUN npm ci --omit=dev --workspace=atlas-cms --ignore-scripts

COPY --from=builder --chown=node:node /workspace/atlas-cms/config ./atlas-cms/config
COPY --from=builder --chown=node:node /workspace/atlas-cms/database ./atlas-cms/database
COPY --from=builder --chown=node:node /workspace/atlas-cms/dist ./atlas-cms/dist
COPY --from=builder --chown=node:node /workspace/atlas-cms/public ./atlas-cms/public
COPY --from=builder --chown=node:node /workspace/atlas-cms/src ./atlas-cms/src
COPY --from=builder --chown=node:node /workspace/atlas-cms/types ./atlas-cms/types
COPY --from=builder --chown=node:node /workspace/atlas-cms/package.json ./atlas-cms/package.json
COPY --from=builder --chown=node:node /workspace/atlas-cms/tsconfig.json ./atlas-cms/tsconfig.json
RUN mkdir -p /workspace/atlas-cms/.tmp /workspace/atlas-cms/public/uploads \
    && chown node:node /workspace/atlas-cms/.tmp /workspace/atlas-cms/public/uploads

WORKDIR /workspace/atlas-cms
USER node
EXPOSE 8080
CMD ["npm", "run", "start"]
