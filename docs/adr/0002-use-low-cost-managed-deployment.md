# Use low-cost managed services across providers

Deploy the React/PixiJS SPA on Firebase Hosting and the Strapi application on scale-to-zero Google Cloud Run, while using Neon PostgreSQL through its pooled connection endpoint and Cloudflare R2 Standard storage through its S3-compatible API. This cross-provider design adds configuration and network boundaries, but avoids an always-on server and favors generous entry-level pricing; browser transfers to R2 should use narrowly scoped, short-lived presigned URLs instead of proxying large map objects through Strapi.
