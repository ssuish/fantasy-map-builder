# Use Strapi-managed Google OAuth

Use Strapi Users & Permissions as the sole identity and token authority, with Google as the only Creator sign-in provider for the MVP. Do not introduce Firebase Authentication or password login; this keeps authorization and Creator ownership inside one backend, at the cost of coupling authentication to Strapi's provider flow.
