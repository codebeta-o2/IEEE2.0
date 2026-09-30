<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/4d0c0eb6-d841-42bd-a2c2-0aedd809df6b

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to Vercel

Import this repository into Vercel with the Vite framework preset. Vercel uses the `api/` directory for serverless API routes and the SPA fallback in `vercel.json` for the React app.

Add this Project Environment Variable before deploying:

- `GOOGLE_SHEET_WEBAPP_URL`: the deployed Google Apps Script URL ending in `/exec`

The production build command is `npm run build`. After deployment, verify `/api/health` and the site URL over HTTPS; HTTPS is required for the QR-code camera flow.

## Examination Entry QR Codes

Print two QR codes with these exact text payloads. The first opens the Python code-order puzzle; the second must be scanned after the puzzle is solved to start the exam.

- Entry QR payload: `IEEE-PYTHON-GAME`
- Room QR payload: `IEEE-EXAM-START`
- Room shown after the puzzle: `B2LG2.8`

The browser needs camera permission, and deployed pages must use HTTPS for camera access.
