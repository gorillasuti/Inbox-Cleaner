(async () => {
    try {
        const src = chrome.runtime.getURL('content.js');
        console.log("[Inbox Cleaner] Loading content script from:", src);
        await import(src);
        console.log("[Inbox Cleaner] Content script loaded successfully.");
    } catch (e) {
        console.error("[Inbox Cleaner] Failed to load content script:", e);
    }
})();
