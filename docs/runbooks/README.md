# Runbooks

These runbooks cover the current local environment and Phase 0 cloud staging. Production work remains a follow-up.

## Choose a runbook

- [local-development.md](local-development.md): local setup and checks.
- [staging-deployment.md](staging-deployment.md): Hosting, R2, Cloud Run, and Neon staging.
- [inventory.md](inventory.md): resources, URLs, identities, and secret names.
- [operations.md](operations.md): health checks, incident triage, and maintenance.

## Environment boundary

| Environment | Web | CMS | Database | Object storage | Current scope |
|---|---|---|---|---|---|
| Local | Vite dev server | Strapi in Compose or host process | Compose PostgreSQL | Compose MinIO | Development and tests |
| Staging | Firebase Hosting | Cloud Run service | Neon staging branch | Cloudflare R2 | Phase 0 read-only prototype |
| Production | Follow-up | Follow-up | Follow-up | Follow-up | No production procedure in this phase |

Inspect the target, current revision, and existing receipts before mutation. Never copy credentials into the repository.

Cloud facts were recorded from Phase 0 receipts on 2026-09-28. Recheck live state before deployment or incident work.
