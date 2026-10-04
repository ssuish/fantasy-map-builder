# Phase 1 questionnaire decision record

Issue #27 is the closed shared decision gate. This is the dated questionnaire provenance; current requirements and measurement rules live in the product specification and technical design. The project owner confirmed the consolidated Q1–Q18 agreement on 2026-10-04. This is the preparation and handoff record, not feature implementation authorization or passing acceptance evidence.

## Confirmed answers — 2026-10-04

- **Q1 — Deferred baseline decision (C):** The project owner will use native hardware during development and choose the acceptance benchmark environment during final QA preparation before pilot release. A VMware virtual machine is proposed, but is not yet approved as a replacement for the original physical baseline. Assigning virtual CPU and memory resources does not establish equivalent physical CPU or integrated-GPU performance. The project owner owns the baseline decision and environment provision. This blocks performance sign-off and pilot release, but does not block implementation or closure of #27 once the deferral is recorded in the handoff.
- **Q2 — Measurement protocol (B):** Use a production build, five warmups and 30 measured generations per fixed representative seed/settings case, and at least 100 Brush samples per case, covering ordinary regions, the wrapping seam, and tile boundaries. Report nearest-rank p95, maximum, raw durations, and failures. Record first generation separately and require it to finish within three seconds as well as the warm-generation p95 budget. The precise cold-start procedure and cases must be recorded in the eventual harness.
- **Q3 — Brush timing (A):** Measure from each accepted input sample to the first presented frame containing its terrain update. Require visible updates during dragging and verify that pointer release eventually presents the complete stroke, including queued work. Input admission and dropped/coalesced samples must be observable so the measurement cannot conceal lag by rejecting work.
- **Q4 — Generation completion (A):** Measure from Generate activation until all initial visible terrain tiles and enabled overlays are presented and pan, zoom, and Brush input are ready. Include generation, Worker transfers, derivation, texture upload, and rendering. Verify responsiveness separately and check offscreen tile correctness when navigating.
- **Q5 — Confirmed session replacement (A):** Allow blank or generated creation at session start and an explicit “Discard session and start new Map” confirmation for replacing the in-memory session. Preserve the current session until replacement succeeds; do not commit partial replacement results. This does not authorize regeneration of a durable Map.
- **Q6 — Blank terrain (A):** Initialize all three source fields with uniform flat land above sea level and neutral temperature and moisture. Use the same rendering and Brush paths as generated terrain. Record exact normalized defaults during implementation.
- **Q7 — Generation water control (A):** Expose sea level as the authoritative elevation threshold for land/water derivation. Resulting land coverage may vary by seed; no exact coverage percentage is promised.
- **Q8 — Sea level after creation (A):** Keep sea level fixed during the Phase 1 session. Global sea-level editing is deferred beyond v1 and may be reconsidered if users request it; this does not commit to a future feature.
- **Q9 — Seed experience (A):** Accept a text seed, provide a random-seed action, and always display the effective seed. Preserve the seed while adjusting creation settings. Record and version input normalization and seed conversion with the generator and cover fixed seed/settings cases in determinism checks.
- **Q10 — Climate controls (A):** Temperature and moisture controls influence generated distributions as climate targets, without promising exact arithmetic means. Label the controls accordingly. Painting may change the resulting averages.
- **Q11 — Brush operation (A):** Use target-value painting for elevation, temperature, and moisture with radius, strength, and smooth falloff. Clamp source values to their valid ranges and sample strokes at fixed map-space spacing so equivalent paths are independent of browser pointer event frequency. Raise/lower and smoothing modes remain deferred. Specify strength and repeated-pass behavior during implementation.
- **Q12 — Brush radius (A):** Use map-space radius with enforced minimum and maximum limits. The cursor preview scales with zoom. Record exact supported limits during implementation, verify previews at zoom extremes, and include the maximum supported radius in performance evidence.
- **Q13 — Desktop gestures (A):** Primary drag paints when a Brush is selected. Space plus drag or a visible Pan tool pans; wheel zooms around the pointer. Provide keyboard-accessible DOM zoom-in, zoom-out, and fit controls. Space must respect typing and focused controls. Verify gesture conflicts, continuous east/west wrapping, and finite north/south boundaries.
- **Q14 — Terrain visuals (A):** Use one readable fantasy palette with distinct water depth and biome colors, visible coastlines, and restrained hill-shading. Review fixed-seed screenshots before visual acceptance. Interface styling follows DESIGN.md.
- **Q15 — Contours (A):** Include a contour toggle, default off. Contours are derived display state and must update after painting. Include enabled contours in correctness and timing checks, including wrapping seams and tile boundaries.
- **Q16 — Determinism (A):** Require byte-identical source fields and byte-identical CPU-derived color tiles for fixed golden cases in Chromium and Firefox. Check presentation separately with narrow, documented tolerance for GPU differences. Version generator and derivation rules together when output changes. Keep this bounded to a small representative case set and direct byte comparisons; the owner explicitly requested avoiding overengineering.
- **Q17 — Failure behavior (A):** Show actionable creation errors and retry using the same settings. Preserve the current session until replacement succeeds. Rebuild derived rendering from authoritative in-memory fields after graphics context loss where possible; define tested recovery cases and explicit terminal-failure fallback during implementation. Refresh still loses session content.
- **Q18 — Authorization (A):** Prepare documentation, issue #2/#3 acceptance, risk ownership, and harness requirements, and close #27 once its decision-gate criteria are satisfied. Feature implementation requires a separate request. Neither issue closure nor preparation establishes feature completion or pilot acceptance.

## Open decisions

Shared understanding is confirmed. All Q1–Q18 have answers or an explicit deferred disposition. Q1 performance acceptance remains blocked until final QA establishes and exercises the chosen baseline. Feature implementation is not authorized.

## Observed evidence

Read-only review at HEAD `dd3c3e5de1fce4bbef589585c9f39e6c82e48a63` confirmed a static frontend and static manifest contract, a Chromium-only browser harness using SwiftShader, and no Phase 1 terrain or Brush implementation. At initial inspection, #2/#3 had no questionnaire answers; they later received confirmed acceptance contracts and remain open. Dependency issue #19 is closed. Interview inspection ran no feature tests or benchmarks; preparation verification was recorded separately on #27.

## Risks, ownership, and required evidence

| Risk | Owner | Mitigation and required evidence | Blocking status |
|---|---|---|---|
| Final benchmark environment unavailable or unlike the original physical baseline | Project owner | Choose and document the baseline during final QA preparation. Record host and guest details if VMware is chosen, graphics acceleration, CPU, RAM, GPU, OS, Chromium version, viewport, DPR, and power mode. Explicitly approve any revised baseline; do not infer physical equivalence from resource counts. | Blocks performance sign-off and pilot release; does not block implementation. Track in #24. |
| Timing excludes startup, presentation, or queued Brush work | Implementer of #2/#3 | Use the Q2–Q4 protocol; record cold-start procedure, raw durations, nearest-rank p95, maximum, failures, input admission/coalescing, and complete-stroke presentation. Native development timings are diagnostic only. | Blocks measured acceptance of #2/#3 until exercised on the chosen baseline. |
| Cross-browser derivation differences | Implementer of #2 | Small fixed golden case set with exact source/color byte comparisons; narrow documented presentation tolerance. Version output changes. | Blocks determinism acceptance. |
| Seams, dirty tiles, or contours become stale | Implementer of #2/#3 | Test wrapped source coordinates, finite north/south edges, neighboring dirty-tile derivation, contour continuity, and maximum-radius strokes. Store one canonical source sample per location. | Blocks correctness acceptance. |
| Refresh or terminal graphics failure loses session content | Project owner (accepted scope); implementer (recovery) | Phase 1 is explicitly in-memory. Explain session loss; test retry, preservation on failed replacement, supported context recovery, and actionable terminal fallback. No durable recovery promise. | Accepted limitation for Phase 1 only; does not waive later Draft recovery or #24. |
| Session replacement expands into regeneration | Implementer of #2 | Keep replacement within the disposable in-memory session; confirmation and atomic success/failure behavior. No durable Map regeneration endpoint or semantics. | Any expansion requires a new scope decision. |
| Visual quality or maximum-radius performance fails late | Project owner (visual review); implementer (limits/evidence) | Fixed-seed screenshot review, enforced documented radius limits, benchmark maximum supported radius and contours on/off. | Blocks relevant visual/performance acceptance. |

## Harness handoff

No harness code changed during this preparation. Required future work belongs to #2/#3:

- Retain the existing software-rendered static smoke check as correctness evidence only. Add focused Chromium and Firefox golden cases with direct byte comparisons; avoid a general compatibility framework.
- Add browser interaction coverage for creation, confirmation/cancellation, failed replacement, pan/zoom focus handling, seam/boundary painting, neighboring dirty tiles, contours on/off, and supported context recovery. Browser checks need not wait for final benchmark hardware.
- Use a production-build benchmark path with hardware acceleration, separate from forced SwiftShader. Specify a fresh page/Worker cold-start procedure, a small representative seed/settings case set, and maximum supported Brush radius. Record first-generation duration and five warmups followed by 30 measured generations per case, plus at least 100 Brush samples per case for ordinary regions, seam, and tile boundaries with contours on/off. Do not exercise these repeated generations through a user-facing regeneration feature.
- Correlate accepted input with renderer completion and the next presentation opportunity; document what browser instrumentation can prove and corroborate visible behavior. A render submission or requestAnimationFrame callback alone is not proof of physical display presentation.
- Record commit, working-tree state, production build, machine/browser/display metadata, settings, counts, raw durations, nearest-rank p95, maximum, and failures. Never report planned runs or native diagnostic timings as final acceptance.
- Root verification continues to cover lint, typecheck, unit tests, and builds. Browser correctness and final hardware performance evidence remain separate. No feature checks can pass before feature implementation exists.

## Next step and authorization

Issue #19 is closed. The next implementation target is #2; #3 depends on its terrain/viewport interfaces. Both remain planned because the owner authorized preparation only. A separate request is required to start feature implementation. Exact radius limits, seed normalization, representative cases, visual tolerance, and tested context-recovery limits are bounded engineering choices to document during implementation, not additional product modes.

Closing #27 records this confirmed agreement, updated issue contracts, risks, and preparation evidence. It does not close #2/#3 or establish pilot acceptance. The baseline deferral must remain visible in #24 until final QA resolves it.

## Subsequent implementation authorization — 2026-10-05

The owner approved the consolidated #2 implementation plan and then explicitly requested implementation. This supersedes the preparation-only authorization above without changing the original #27 decision record.

- Add `/editor` with an explicit initial creation form; preserve the static demo at `/`.
- Deliver five dependent feature PRs: source/generation, derivation/Worker, viewport, editor/recovery, and browser/measurement evidence. The first targets `phase-1`; later PRs target their predecessor. Leave the stack open.
- Delegate bounded module work to Luna workers; the primary agent retains architecture, integration, verification, commits, and publication responsibilities.
- Use TDD at Terrain Engine commands, Session Replacement controller, viewport transforms, and the rendered editor journey.
- Support bounded WebGL recovery from retained source fields: one automatic attempt within 10 seconds, followed by actionable explicit renderer retry. Preserve the viewport and contour setting.
- Perform no provider actions. Before opening feature PRs, limit the existing Firebase preview workflow to PRs targeting `stage`. GitHub branch/PR publication is authorized, but no deployment, remote application-data access, provider configuration, or `stage` push is authorized.

The owner also confirmed the creation defaults and seed policy recorded in technical design. Visual acceptance still requires owner screenshot review, and final hardware performance remains pending under #24.
