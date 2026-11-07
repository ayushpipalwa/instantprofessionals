# Review validation

Base commit: `1ce64ea6e00d589da9d6d570bca041433de4153c` (`master`).

- Node 22: all eight backend tests passed; frontend JavaScript syntax check passed. Provider responses were mocked; no live provider account or key was used.
- Headless Microsoft Edge / Playwright: 1440×1000 desktop, 768×1024 tablet, 390×844 mobile and 320×780 small mobile. Screenshots visually inspected at desktop and mobile sizes. No horizontal document overflow or JavaScript page errors.
- Browser flows: all ten modes present, workflow switching, starter prompts, unconfigured preview fails closed, configured chat with mocked service, text attachment sent, attachment removal, new conversation clears messages, malicious HTML displayed as text, no localStorage persistence, authentication error preserves draft, network failure, and request cancellation.
- All 130 pre-existing tracked HTML paths returned HTTP 200 from the local static preview. All navigation targets on the new page resolved. This is route availability checking, not a claim that every existing form submission or calculator was exercised. No production forms were submitted.
- Existing `scripts/qa_site.py`: 118 findings on both the feature checkout and an untouched local clone of `master`; output compared exactly with no differences. Findings include existing price/package expectation mismatches, sitemap/catalogue mismatches, and seven Windows case-collision redirect findings. No unrelated corrections included.
- Windows cannot separately check out seven pairs of legacy HTML names differing only by letter case. Only the explicitly added AI files are staged. The PR's Git tree must preserve every pre-existing entry exactly, including both cases, independent of this local checkout limitation.
- No production deployment, real-provider integration test, live research retrieval, PDF/DOCX ingestion or deterministic calculation engine was performed. These boundaries are documented in the setup guide and service responses.

To repeat API checks: `node --test ai-service/test.mjs` and `node --check ai/app.js`. The pull-request workflow runs both checks on Linux. Configure the separate backend and perform a synthetic-data end-to-end check with the chosen provider before activation.
