[README.md](https://github.com/user-attachments/files/26334830/README.md)
# BPMN Live Sync

**Prompt in Claude Code / Cursor → BPMN XML updates → browser preview refreshes → Miro board syncs → Google Slides redraws → Google Docs preview image updates**

This repository is a production-leaning starter kit for a real-time BPMN workflow demo.
It is designed for the exact storytelling flow many AI-native PMs and technical PMs want to show:

1. write a prompt in **Claude Code** or **Cursor**,
2. let a **BPMN MCP server** create or modify a BPMN diagram,
3. save the BPMN XML,
4. watch a local bridge service detect the change,
5. update a **live browser BPMN viewer**,
6. optionally sync the same diagram into **Miro**, **Google Slides**, and **Google Docs**.

---

## What this repo gives you

### Included in this starter
- A **Node.js sync bridge** that watches a BPMN XML file.
- A **live browser viewer** powered by `bpmn-js`.
- A **BPMN parser** that reads BPMN XML and extracts nodes + sequence flows.
- A **diagram asset renderer** that exports a simplified SVG + PNG preview.
- A **Miro sync adapter** that creates shapes and connectors on a board.
- A **Google Slides sync adapter** that rebuilds a slide using shapes and lines.
- A **Google Docs sync adapter** that inserts a rendered diagram image into a document.
- **MCP configuration examples** for Cursor and Claude Code.

### External components this repo expects you to install
- A BPMN MCP server such as:
  - `dattmavis/bpmn-js-mcp`
- Browser automation MCP:
  - `microsoft/playwright-mcp`
- Miro MCP connection:
  - official `miroapp/miro-ai` / `https://mcp.miro.com/`

---

## Recommended architecture

```text
Claude Code / Cursor
        |
        | prompt
        v
 BPMN MCP server (external)
        |
        | export BPMN XML
        v
 ./examples/order-approval.bpmn
        |
        | file watcher
        v
 BPMN Live Sync bridge
   |           |            |
   |           |            |
   v           v            v
Live Viewer   Miro API    Google APIs
(bpmn-js)     sync        Slides + Docs
```

---

## Why Google Slides and Google Docs are handled differently

This repo intentionally supports **two different Google rendering modes**:

- **Google Slides** → native reconstruction using shapes and lines.
- **Google Docs** → rendered preview image insertion.

This split is deliberate because Slides is much better suited for structured diagram drawing, while Docs is more reliable as a document surface for an embedded BPMN preview.

---

## Quick start

### 1. Clone your repository

```bash
git clone https://github.com/YOUR_USERNAME/bpmn-live-sync.git
cd bpmn-live-sync
```

### 2. Install dependencies

```bash
npm install
```

### 3. Copy the environment template

```bash
cp .env.example .env
```

### 4. Start the local bridge

```bash
npm run dev
```

### 5. Open the live browser viewer

```text
http://localhost:8787/viewer/
```

### 6. Trigger a manual sync

```bash
curl -X POST http://localhost:8787/sync
```

---

## Local demo flow

### Demo path A — pure local proof of concept
1. Run the bridge.
2. Open the viewer in your browser.
3. Edit `./examples/order-approval.bpmn`.
4. The viewer refreshes automatically.

### Demo path B — AI-driven flow
1. Connect Claude Code or Cursor to a BPMN MCP server.
2. Prompt the model to create or modify a BPMN workflow.
3. Save the exported XML into `./examples/order-approval.bpmn`.
4. Let the watcher trigger sync automatically.
5. Show the browser viewer, Miro board, and Google Slides side by side.

---

## API endpoints

### Health
```bash
curl http://localhost:8787/health
```

### Current state
```bash
curl http://localhost:8787/state
```

### Full sync
```bash
curl -X POST http://localhost:8787/sync
```

### Sync only to Miro
```bash
curl -X POST http://localhost:8787/sync/miro
```

### Sync only to Google Slides
```bash
curl -X POST http://localhost:8787/sync/google/slides
```

### Sync only to Google Docs
```bash
curl -X POST http://localhost:8787/sync/google/docs
```

---

## Environment variables

See `.env.example`.

### Most important variables

```bash
BPMN_SOURCE_PATH=./examples/order-approval.bpmn
MIRO_ACCESS_TOKEN=...
MIRO_BOARD_ID=...
GOOGLE_CLIENT_EMAIL=...
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SLIDES_PRESENTATION_ID=...
GOOGLE_DOCS_DOCUMENT_ID=...
PUBLIC_IMAGE_BASE_URL=https://your-public-assets.example.com/bpmn
```

---

## MCP setup examples

### Cursor
Use `config/mcp.cursor.json` as your starting point.

### Claude Code
Use `.claude/settings.local.json.example` as your starting point.

---

## Miro sync model

This starter currently creates board objects from the BPMN graph:
- BPMN events → circles
- gateways → diamonds
- tasks / subprocesses → rounded rectangles / rectangles
- sequence flows → connectors

For a polished production setup, you should add:
- idempotent board item updates
- tag-based cleanup
- frame scoping
- layout normalization
- retry / backoff / rate-limit handling

---

## Google Slides sync model

This starter rebuilds a target slide by:
1. reading a BPMN graph,
2. deleting existing page elements on the target slide,
3. recreating shapes,
4. inserting node labels,
5. drawing simple connecting lines.

For a polished production setup, you should add:
- richer connector routing
- better BPMN iconography
- lane / pool support
- subprocess visual details
- element-level diffing instead of full slide rebuilds

---

## Google Docs sync model

This starter inserts a rendered PNG into a document at a placeholder:

```text
[[BPMN_DIAGRAM_HERE]]
```

For Docs sync to work, the image must be reachable via a **public URL**.
A common production pattern is:

```text
Bridge renders diagram.png -> upload to GCS/S3/public asset URL -> Docs API inserts image by URL
```

---

## What is ready vs what is scaffolded

### Ready enough for a demo / portfolio post
- live local browser BPMN preview
- file-watcher-based sync orchestration
- BPMN parsing + simplified rendering
- API endpoints for manual sync calls
- Miro / Slides / Docs adapter scaffolding
- repository structure suitable for GitHub portfolio work

### Not yet production-hardened
- OAuth flows and token refresh lifecycle
- Miro update/delete diffing
- guaranteed layout fidelity for complex BPMN diagrams
- full BPMN DI support across pools, lanes, annotations, and message flows
- robust retry queues and observability
- multi-user concurrency controls

---

## Suggested demo script

1. Open Cursor or Claude Code on the left.
2. Open `http://localhost:8787/viewer/` on the right.
3. Optionally open a Miro board and a Google Slides deck in additional tabs.
4. Prompt the assistant to update the BPMN flow.
5. Save the BPMN XML.
6. Show the viewer refresh immediately.
7. Trigger `/sync/miro` and `/sync/google/slides`.
8. Refresh Miro / Slides and show the same process rendered there.

---

## Suggested repository topics

```text
bpmn mcp claude-code cursor miro google-slides google-docs playwright-mcp ai-workflows process-automation bpmn-js
```

---

## Next upgrades

- Add OAuth web callbacks for Miro and Google.
- Add persistent mapping of BPMN element IDs to Miro / Slides object IDs.
- Add BPMN lane and pool support.
- Add React dashboard for sync history and errors.
- Add GitHub Actions validation for BPMN XML and TypeScript build.
- Add LinkedIn-ready GIF capture workflow.

---

## License

MIT for your own repository, if you choose.
