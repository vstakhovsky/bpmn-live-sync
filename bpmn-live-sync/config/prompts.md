# Example Prompts for Claude Code

## 1) Build or modify BPMN XML through the BPMN MCP server

Create a BPMN diagram for an order approval workflow with these nodes:
- Start event: Order placed
- User task: Review order
- Exclusive gateway: Approved?
- Service task: Fulfill order
- End event: Completed
- End event: Rejected
Connect the nodes in a valid BPMN flow, export the final BPMN XML, and save it to `./examples/order-approval.bpmn`.

## 2) Trigger the bridge sync after saving the BPMN file

Run:
```bash
curl -X POST http://localhost:8787/sync
```

## 3) Push the same BPMN model only to Miro

Run:
```bash
curl -X POST http://localhost:8787/sync/miro
```

## 4) Push the same BPMN model only to Google Slides

Run:
```bash
curl -X POST http://localhost:8787/sync/google/slides
```

## 5) Push the rendered BPMN preview only to Google Docs

Run:
```bash
curl -X POST http://localhost:8787/sync/google/docs
```

## 6) Browser verification with Playwright MCP

Open these three tabs:
1. `http://localhost:8787/viewer/`
2. my Miro board
3. my target Google Slides presentation
Then wait for changes while I edit `./examples/order-approval.bpmn`.
