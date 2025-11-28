# Inbox Cleaner - Walkthrough

I have built the "Inbox Cleaner" Chrome Extension as requested.
Due to environment limitations (`npm` not available), I have created all the source code and configuration files, but you will need to run the build command.

## Prerequisites

Before you begin, you **must** have Node.js installed.
1.  Check if you have it: `node -v`
2.  If not, download and install it from [nodejs.org](https://nodejs.org/).
    *   **Mac**: Download the macOS Installer (.pkg).

## What's Included

1.  **Project Scaffolding**:
    *   `package.json` with React, Vite, Tailwind, and Lucide icons.
    *   `vite.config.js` configured for Chrome Extension build.
    *   `manifest.json` (V3) with necessary permissions.

2.  **UI Implementation**:
    *   **Shadow DOM Isolation**: The app is injected into a Shadow Root to prevent Gmail styles from bleeding in.
    *   **Floating Dashboard**: A fixed, top-left panel with the requested design (Green header, stats, list).
    *   **Components**: `App.jsx` handles the UI logic, stats, and list rendering.

3.  **Scanning Logic**:
    *   `src/utils/scanner.js` contains the logic to scan Gmail rows.
    *   **Mock Mode**: Currently enabled by default (`USE_MOCK = true`) to allow you to test the UI immediately without relying on fragile DOM selectors.

4.  **Action Logic**:
    *   **Unsubscribe**: The "Unsubscribe" button is implemented (MVP version alerts and logs).

## How to Verify

1.  **Install & Build**:
    Open your terminal and run these exact commands:
    ```bash
    cd ~/.gemini/antigravity/scratch/inbox-cleaner
    npm install
    npm run build
    ```

2.  **Load Extension**:
    *   Go to `chrome://extensions`.
    *   Enable Developer Mode.
    *   Load Unpacked -> Select `inbox-cleaner/dist`.

3.  **Test on Gmail**:
    *   Open Gmail.
    *   You should see the "Inbox Cleaner" panel.
    *   Click "Scan Inbox" to see the mock results.
    *   Select items and click "Unsubscribe".

## Next Steps

*   Disable Mock Mode in `src/utils/scanner.js` to test real scanning.
*   Refine the DOM selectors in `scanner.js` if Gmail's layout has changed.

## Troubleshooting

**Error: "Manifest file is missing or unreadable"**
*   **Cause**: You tried to load the `inbox-cleaner` root folder instead of the `dist` folder, or you haven't run the build yet.
*   **Fix**:
    1.  Make sure you ran `npm run build`.
    2.  Check that the `inbox-cleaner/dist` folder exists.
    3.  When clicking "Load unpacked", select the `inbox-cleaner/dist` folder.