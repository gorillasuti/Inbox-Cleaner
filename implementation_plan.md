# Implementation Plan - Inbox Cleaner

## Goal Description
Build a Chrome Extension (Manifest V3) that injects a floating "cleaner" dashboard into Gmail to identify and unsubscribe/delete newsletter/spam emails.
Stack: React, Vite, Tailwind CSS, Shadow DOM.

## User Review Required
> [!IMPORTANT]
> `npm` and `npx` are not available in the agent environment. I will create the file structure and code manually. You will need to run `npm install` and `npm run build` locally to verify and build the extension.

## Proposed Changes

### Project Structure
- `package.json`: Dependencies (React, Vite, Tailwind, CRXJS or manual config).
- `vite.config.js`: Build configuration for Content Script and Popup/Background if needed.
- `public/manifest.json`: Manifest V3 definition.
- `src/`: Source code.

### Phase 1: Scaffolding & Manifest
#### [NEW] [package.json](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/package.json)
- Define dependencies: `react`, `react-dom`, `lucide-react`.
- Define devDependencies: `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`.
- Scripts: `dev`, `build`.

#### [NEW] [vite.config.js](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/vite.config.js)
- Configure build to output `content.js` and `style.css`.
- Use `rollupOptions` to specify input/output for content script.

#### [NEW] [manifest.json](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/public/manifest.json)
- Permissions: `activeTab`, `scripting`, `storage`, `tabs`.
- Content Scripts: Matches `*://mail.google.com/*`.
- Action: Default icon.

### Phase 2: UI Implementation (Shadow DOM)
#### [NEW] [content.jsx](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/content.jsx)
- Entry point.
- Create Shadow Host (`div#inbox-cleaner-root`).
- Attach Shadow DOM.
- Inject styles (Tailwind output).
- Mount React Root.

#### [NEW] [App.jsx](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/App.jsx)
- Main Dashboard Component.
- Fixed position, z-index 9999.
- Tailwind classes for styling.

### Phase 3: Scanning Logic
#### [NEW] [scanner.js](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/utils/scanner.js)
- `scanInbox()` function.
- DOM traversal to find email rows.
- Heuristics for newsletters.

### Phase 3.5: Enhanced Scanning
#### [MODIFY] [App.jsx](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/App.jsx)
- Add "Quick Scan" and "Full Scan" buttons.
- Handle multi-page scanning state.

#### [MODIFY] [scanner.js](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/utils/scanner.js)
- Implement `scanInbox(mode)`.
- **Quick Mode**: Scan current visible rows.
- **Full Mode**: Scan current page -> Click "Older" -> Scan -> Repeat (Limit 5 pages).
- **Heuristics**: Implement scoring system.
    - High Score: "Unsubscribe", "Opt-out".
    - Medium Score: "Sale", "Offer" (Subject).
    - Low Score: "Update", "Digest" (Requires multiple).

### Phase 5: UI/UX Overhaul
#### [MODIFY] [package.json](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/package.json)
- Add `@tippyjs/react` and `tippy.js`.

#### [MODIFY] [content.jsx](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/content.jsx)
- Change position to Top-Right.

#### [MODIFY] [App.jsx](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/App.jsx)
- **Theme**: Implement `dark` class toggle on wrapper.
- **Style**: Use Zinc/Emerald palette. Add "Pro" badges.
- **Tooltips**: Integrate Tippy.js for "Clutter Score" and "Pages Scanned". Configure `appendTo` for Shadow DOM support.

### Phase 6: Polish & Monetization
#### [MODIFY] [package.json](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/package.json)
- Add `react-draggable`.

#### [MODIFY] [App.jsx](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/App.jsx)
- **Draggable**: Wrap main container in `<Draggable>`.
- **UI Tweaks**: Reduce header gap.
- **Monetization**: Gate "Deep Scan" (100 pages) behind Pro toggle/mock.

#### [MODIFY] [scanner.js](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/utils/scanner.js)
- Update `scanInbox` to accept `maxPages`.
- Set Full Scan limit to 100.

### Phase 7: Refinements
#### [MODIFY] [App.jsx](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/App.jsx)
- **Tippy**: Append to `appRef.current` (container) to ensure styles and z-index work.
- **Modal**: Move outside scrollable area, make `absolute inset-0` of the main card. Ensure min-height. Update price to $2.99.
- **UI**: Fix header gap.

#### [MODIFY] [scanner.js](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/utils/scanner.js)
- **Heuristics**: Add generic keywords ("terms", "privacy", "click here").
- **Pagination**: Increase wait time slightly or check for row changes more robustly.

### Phase 8: Auth & Advanced UI
#### [NEW] [AuthContext.jsx](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/contexts/AuthContext.jsx)
- Mock `AuthProvider` with `login`, `register`, `logout`, `upgrade`.
- State: `user` (null or object), `isPremium` (boolean).

#### [MODIFY] [App.jsx](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/App.jsx)
- **Profile Menu**: Add dropdown for Profile/Settings/Logout.
- **Settings View**: Toggle providers (Gmail, Outlook, Yahoo), Manage Subscription.
- **Login/Register View**: Simple form to toggle auth state.
- **Quick Scan Logic**: If `isPremium`, show all results (no blur), but add warning "Quick Scan missed X% of newsletters".
- **TunnelBear Animation**: Create a custom overlay with a "Cleaning Character" animation during scan.

#### [MODIFY] [scanner.js](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/utils/scanner.js)
- No changes needed for logic, just UI handling.

### Phase 9: Polish, i18n, & Notifications
#### [NEW] [translations.js](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/utils/translations.js)
- Dictionary for EN, ES, HU, JA, ZH.

#### [MODIFY] [App.jsx](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/App.jsx)
- **Notifications**: Replace `alert()` with custom `Toast` component.
- **UI**: Refactor Auth/Settings to use "Shadcn-like" styling (clean borders, minimal shadows).
- **Animation**:
    - Remove small mail icon.
    - **Premium Animation**: Gold/Purple theme, faster spin, "warp speed" particles.
- **Localization**: Integrate `translations.js` and add language selector in Settings.
- **Subscription**: Add "Manage Subscription" mock flow (Cancel/Upgrade).

### Phase 10: UI Fixes & Feature Enhancements
#### [MODIFY] [App.jsx](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/App.jsx)
- **Fix Overflow**: Ensure container expands (`min-h-[500px]`) when Auth/Settings views are active.
- **Fix Profile Icon**: Enforce fixed width/height (`w-8 h-8`) and `rounded-full` with centered content.
- **Fix Button Hover**: Ensure hover states are contained (check `overflow-hidden` or border radius).
- **Refine Animation**: Replace "pulse" with smooth rotation or "breathing" opacity.
- **Subscription UI**: Create `SubscriptionView` with plan details and "Cancel" button.
- **Language Dropdown**: Replace button grid with a styled dropdown (Select) with flag emojis.

### Phase 11: UI Fixes & Google Auth
#### [MODIFY] [App.jsx](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/App.jsx)
- **Fix Toast**: Verify "Found senders" toast logic. Ensure it doesn't conflict with Unsubscribe UI.
- **Fix Auth Light Mode**: Ensure `AuthView` respects `darkMode` state.
- **Google Auth**: Add "Log in with Google" button (Mock).
- **Widen Buttons**: Increase width of Upgrade/Subscribe buttons.
- **Refine Animation**: Restore "pulse" but make it subtle (opacity/scale) for Premium.

#### [MODIFY] [translations.js](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/utils/translations.js)
- Add `googleLogin` key.

### Phase 12: UI Refinements & Persistence
#### [MODIFY] [App.jsx](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/App.jsx)
- **Toast Styling**: Change to `absolute`, `bottom-2`, `left-2`, `right-2`, `w-auto` (with gap). Remove "Found senders" toast.
- **Dark Mode Persistence**: Use `localStorage` to persist theme preference.
- **Profile Menu**: Add click-outside handler (or transparent overlay) to close menu.
- **Premium Animation**: Make Trash icon static (remove orbit).

### Phase 13: Freemium Scanner Engine
#### [NEW] [src/utils/adapters/types.js](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/utils/adapters/types.js)
- Define `PROVIDERS` constants.
- Helper to get current provider.

#### [NEW] [src/utils/gatekeeper.js](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/utils/gatekeeper.js)
- Implement `checkAccess(provider)` logic.
- Check `isPremium` from storage (or AuthContext).
- Return `maxItems` and `canDeepScan`.

#### [NEW] [src/utils/adapters/gmail.js](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/utils/adapters/gmail.js)
- Move existing Gmail scanning logic here.
- Implement `navigateToNewsletterView` (hash change).
- Implement `processRows`.

#### [NEW] [src/utils/adapters/outlook.js](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/utils/adapters/outlook.js)
- Skeleton adapter for Outlook.

#### [MODIFY] [src/utils/scanner.js](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/utils/scanner.js)
- Refactor `scanInbox` to use `gatekeeper` and `adapters`.
- Handle `PREMIUM_PROVIDER_LOCKED` error.
- Return `{ results, totalFound, isLimited }`.

#### [MODIFY] [src/App.jsx](file:///Users/kiralydaniel/.gemini/antigravity/scratch/inbox-cleaner/src/App.jsx)
- Update `handleScan` to handle `isLimited` and `LOCKED_PROVIDER`.
- Show "Blur Overlay" or "Locked Card" for limited results.
- Show "Premium Feature" overlay for Outlook/Yahoo.

## Verification Plan
### Automated Tests
- None (Environment limitation).

### Manual Verification
1. User runs `npm install`.
2. User runs `npm run build`.
3. User loads `dist` folder in Chrome Extensions (Developer Mode).
4. User opens Gmail.
5. Verify "Inbox Cleaner" dashboard appears.
6. Verify "Scan" button works.
