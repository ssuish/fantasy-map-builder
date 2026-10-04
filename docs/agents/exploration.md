# Code exploration

Read when locating code structure, declarations, module imports/exports, or syntax patterns.

1. Use `rg --files` and bounded `rg` text queries to identify candidate paths without scanning private configuration.
2. Run `npm run explore -- <paths...>` for a tree-sitter outline. Use `--json` for structured results or `--query <query.scm>` for a focused syntax query. Support covers JavaScript/JSX/MJS/CJS and TypeScript/TSX/MTS/CTS. Install root dependencies before structural exploration; report unavailable parser setup instead of silently replacing required syntax work with text guesses.
3. Read the returned locations and their callers/consumers. Finish when the relevant behavior path and contracts are accounted for. Syntax structure alone does not prove runtime dispatch, side effects, or deployed behavior.

The Node helper returns sorted names/captures and locations without full source bodies. Parse errors are explicit; investigate incomplete results before drawing conclusions. It rejects private, unsupported, outside-repository, and symlink-escape paths. Directory traversal excludes installed/generated/local-tooling content. For YAML, Markdown, SQL, and other unsupported formats use targeted text reads; this helper is not a general index or a replacement for current framework docs.

Use Context7 for current library/framework documentation when available, resolving the library ID first. Otherwise use official project documentation. Repository facts come from inspection; owner preferences come from the interview.
