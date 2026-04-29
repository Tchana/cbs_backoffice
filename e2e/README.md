# Backoffice E2E Tests

## Setup

1. Copy `.env.example` to `.env` if needed.
2. Set:
   - `E2E_EMAIL`
   - `E2E_PASSWORD`
3. Install dependencies:
   - `npm install`
4. Install browser:
   - `npx playwright install chromium`

## Run

- Headless:
  - `npm run test:e2e`
- Interactive UI:
  - `npm run test:e2e:ui`

## Coverage

`e2e/app-flow.spec.js` validates the core backoffice flow:
- login
- sidebar navigation across major pages
- forum page rendering
- announcements page rendering
- courses page and create modal open

