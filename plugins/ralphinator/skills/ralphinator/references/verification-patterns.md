# Verification Patterns

Objective pass/fail verification for every component type. The Ralph loop agent cannot eyeball a browser — every verification step must be a command that exits 0 on success and non-zero on failure.

## API / Server

```bash
# Start server, POST data, assert response
node server/index.js &
SERVER_PID=$!
sleep 1
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:PORT/api/health)
kill $SERVER_PID
[ "$RESPONSE" = "200" ] && echo "PASS" || echo "FAIL"
```

For Ralph prompts, express as:
```
- [ ] **Verify:** start server with `node server/index.js`, POST a test payload with curl, confirm 200 response and expected JSON body. Kill server.
```

## Frontend / UI (Playwright)

Playwright runs headless — the loop agent CAN execute these.

### Setup (one-time, in the test infrastructure phase)

```
- [ ] Create `playwright.config.js` — headless chromium, base URL, 30s timeout
- [ ] Create `test/dashboard.test.js` — with startServer/stopServer helpers
- [ ] **Verify:** `npx playwright install chromium && npx playwright test` — skeleton tests pass
```

### DOM Assertions

```javascript
// Element existence
await expect(page.locator('#timeline')).toBeVisible();

// Element count
const bars = page.locator('svg .agent-bar');
await expect(bars).toHaveCount(4);

// Text content
await expect(page.locator('.stat-card.tokens .value')).toHaveText('142.3k');

// CSS property (color, fill, etc.)
const bar = page.locator('.agent-bar.explore').first();
await expect(bar).toHaveCSS('fill', 'rgb(74, 158, 255)');

// Class presence
await expect(page.locator('.agent-bar').first()).toHaveClass(/highlighted/);

// Evaluate JS in browser context
const eventCount = await page.evaluate(() => window.events.length);
expect(eventCount).toBe(5);
```

### Feeding Test Data

```javascript
async function postEvent(event) {
  await fetch('http://localhost:7847/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });
}

// Post, then wait for SSE + re-render
await postEvent({ event_type: 'agent_spawn', agent_id: 'ag_01', ... });
await page.waitForTimeout(500);
```

For Ralph prompts, express as:
```
- [ ] Add Playwright tests to `test/dashboard.test.js`:
  - Test: "timeline renders agent bars" — POST 4 agent events, assert `.agent-bar` count equals 4
  - Test: "colors match agent types" — assert Explore bars have fill `#4a9eff`
- [ ] **Verify:** `npx playwright test` — all tests pass
```

## Library / CLI

```bash
# Node.js built-in test runner
node --test test/*.test.js

# Python
pytest test/

# Rust
cargo test
```

For Ralph prompts:
```
- [ ] **Verify:** `node --test test/lib.test.js` — all tests pass
```

## Infrastructure / Config

```bash
# Health check
curl -sf http://localhost:PORT/api/health

# Config validation
node -e "JSON.parse(require('fs').readFileSync('config.json'))"

# File existence
[ -f "output/result.json" ] && echo "PASS"
```

## Smoke Test (Final Phase)

The last phase should exercise the full system end-to-end:

```
#### Phase N: Integration smoke test
- [ ] Create `test/smoke.js` (or equivalent)
  - Start all services
  - Feed realistic test data
  - Assert end-to-end flow works
  - Clean up
- [ ] **Verify:** `node test/smoke.js` exits 0 with no errors
```

If the project has Playwright tests, the smoke test is simply:
```
- [ ] **Verify:** `npx playwright test` — full suite passes, zero failures
```
