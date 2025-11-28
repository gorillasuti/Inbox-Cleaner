import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import styles from './index.css?inline';
import { AuthProvider } from './contexts/AuthContext';

const ROOT_ID = 'inbox-cleaner-extension-root';

function init() {
    console.log("[Inbox Cleaner] Initializing content script...");
    if (document.getElementById(ROOT_ID)) {
        console.log("[Inbox Cleaner] Already initialized.");
        return;
    }

    const container = document.createElement('div');
    container.id = ROOT_ID;
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.right = '0'; // Changed from left to right
    container.style.zIndex = '2147483647'; // Max z-index
    container.style.pointerEvents = 'none'; // Allow clicking through when hidden/transparent
    document.body.appendChild(container);

    const shadowRoot = container.attachShadow({ mode: 'open' });

    // Inject styles
    const styleTag = document.createElement('style');
    styleTag.textContent = styles;
    shadowRoot.appendChild(styleTag);

    const rootElement = document.createElement('div');
    rootElement.id = 'app-root';
    // Reset pointer events for the app itself
    rootElement.style.pointerEvents = 'auto';
    shadowRoot.appendChild(rootElement);

    const root = createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <AuthProvider>
                <App />
            </AuthProvider>
        </React.StrictMode>
    );

    // Listen for messages
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === "toggle_sidebar") {
            const appRoot = shadowRoot.getElementById('app-root');
            if (appRoot) {
                // We'll dispatch a custom event that App.jsx can listen to, 
                // or we can just toggle visibility here if we had a reference.
                // Better: use a CustomEvent on the window or document inside shadow DOM?
                // Actually, since we render <App />, we can't easily call a method on it.
                // We can use a simple event bus or just toggle the container display.
                // But we want the App to animate or handle state.
                // Let's dispatch an event on the document.
                window.dispatchEvent(new CustomEvent('inbox-cleaner-toggle'));
            }
        }
    });
}

init();
