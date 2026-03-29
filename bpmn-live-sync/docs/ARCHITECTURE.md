# Architecture Notes

## Goals
- Keep the authoring experience inside Claude Code / Cursor.
- Use an external BPMN MCP server for diagram intelligence.
- Keep browser rendering local and fast.
- Support optional publishing to Miro and Google Workspace.

## Design decisions

### Decision 1 — Use BPMN XML as the system-of-record
**Why**
- portable
- standard BPMN format
- easy to diff in Git
- reusable across viewer, Miro sync, Slides sync, and Docs rendering

### Decision 2 — Separate authoring from synchronization
**Why**
- BPMN MCP tools remain focused on creating / editing BPMN
- sync bridge handles integration concerns
- easier to swap BPMN MCP vendors later

### Decision 3 — Use live browser preview as the primary real-time output
**Why**
- fastest feedback loop
- simplest demo surface
- least external auth friction

### Decision 4 — Use Miro and Google as downstream targets
**Why**
- better for collaboration and presentation
- worse than local viewer for tight real-time editing loops
- external APIs add auth + rate-limit + formatting constraints

## Main trade-offs

### Trade-off A — Google Slides vs Google Docs
- Slides is better for native drawing.
- Docs is better for document embedding.
- Therefore the repo uses native redraw in Slides and image embedding in Docs.

### Trade-off B — REST sync vs MCP-only sync for Miro
- Official Miro MCP is excellent for AI-native exploration and board-aware prompting.
- Deterministic BPMN replication is easier to control in code via REST.
- Therefore this repo keeps the Miro MCP config for the AI client, while the bridge handles structured sync via API.

### Trade-off C — full diffing vs full redraw
- Full diffing is ideal in production.
- Full redraw is faster to implement for a portfolio starter.
- Therefore Slides currently uses a rebuild approach.

## Production roadmap
- Add persistent object mapping storage.
- Add OAuth callback app.
- Add background queue.
- Add layout normalization.
- Add observability and tracing.
- Add BPMN DI support for lanes and message flows.
