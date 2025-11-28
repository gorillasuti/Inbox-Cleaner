# Inbox Cleaner Extension

A Chrome Extension to clean your Gmail inbox from newsletters and spam.

## Setup

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Build the Extension**:
    ```bash
    npm run build
    ```
    This will create a `dist` folder.

3.  **Load in Chrome**:
    *   Open Chrome and go to `chrome://extensions`.
    *   Enable "Developer mode" (top right).
    *   Click "Load unpacked".
    *   Select the `dist` folder in this project.

## Usage

1.  Open [Gmail](https://mail.google.com).
2.  You should see the "Inbox Cleaner" dashboard in the top-left corner.
3.  If not visible, click the extension icon in the toolbar to toggle it.
4.  Click "Scan Inbox" to find newsletters.
    *   **Note**: Currently in **Mock Mode** for testing. To enable real scanning, edit `src/utils/scanner.js` and set `USE_MOCK = false`.

## Development

*   The UI is built with React and Tailwind CSS.
*   It uses Shadow DOM to isolate styles from Gmail.
*   `src/content.jsx` is the entry point.
# Inbox-Cleaner
