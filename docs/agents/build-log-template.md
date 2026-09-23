# Local build status template

`npm run verify -- --task <task-slug>` writes a concise `STATUS.md` under the Git-ignored `docs/agents/build-logs/<task-slug>/` directory.

The record contains UTC time, Git HEAD, a working-tree fingerprint, commands, exit codes, result, progress, and next step. Before relying on an earlier result, rerun verification if HEAD or the working tree changed. Console and CI retain detailed output. Do not copy secrets, environment values, or raw application logs into the status file.
