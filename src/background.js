import { supabase } from './lib/supabase';

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'SUPABASE_LOGIN') {
        supabase.auth.signInWithPassword({
            email: request.email,
            password: request.password
        }).then(({ data, error }) => {
            if (error) sendResponse({ error: error.message });
            else sendResponse({ data });
        });
        return true; // Keep channel open for async response
    }

    if (request.action === 'SUPABASE_SIGNUP') {
        supabase.auth.signUp({
            email: request.email,
            password: request.password,
            options: {
                data: {
                    full_name: request.fullName
                }
            }
        }).then(({ data, error }) => {
            if (error) sendResponse({ error: error.message });
            else sendResponse({ data });
        });
        return true;
    }

    if (request.action === 'SUPABASE_LOGOUT') {
        supabase.auth.signOut().then(({ error }) => {
            if (error) sendResponse({ error: error.message });
            else sendResponse({ success: true });
        });
        return true;
    }

    if (request.action === 'SUPABASE_GET_SESSION') {
        supabase.auth.getSession().then(({ data, error }) => {
            if (error) sendResponse({ error: error.message });
            else sendResponse({ session: data.session });
        });
        return true;
    }

    if (request.action === 'SUPABASE_OAUTH_GOOGLE') {
        const redirectUrl = chrome.identity.getRedirectURL();
        console.log("[Background] Generated Redirect URL:", redirectUrl);

        supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                scopes: 'https://www.googleapis.com/auth/gmail.modify',
                redirectTo: redirectUrl
            }
        }).then(({ data, error }) => {
            if (error) {
                console.error("[Background] Supabase OAuth Init Error:", error);
                sendResponse({ error: error.message });
            } else {
                console.log("[Background] Supabase OAuth Init Success. Auth URL:", data.url);

                if (data.url) {
                    chrome.identity.launchWebAuthFlow({
                        url: data.url,
                        interactive: true
                    }, async (responseUrl) => {
                        if (chrome.runtime.lastError) {
                            console.error("[Background] LaunchWebAuthFlow Error:", chrome.runtime.lastError.message);
                            sendResponse({ error: chrome.runtime.lastError.message });
                            return;
                        }
                        console.log("[Background] WebAuthFlow Success. Response URL:", responseUrl);
                        sendResponse({ data: { redirectUrl: responseUrl } });
                    });
                } else {
                    console.error("[Background] No Auth URL returned from Supabase");
                    sendResponse({ error: "No Auth URL returned" });
                }
            }
        });
        return true;
    }

    if (request.action === 'SUPABASE_SET_SESSION') {
        supabase.auth.setSession({
            access_token: request.access_token,
            refresh_token: request.refresh_token
        }).then(({ data, error }) => {
            if (error) {
                console.error("[Background] Set Session Error:", error);
                sendResponse({ error: error.message });
            } else {
                console.log("[Background] Session set successfully for:", data.user?.email);
                sendResponse({ data });
            }
        });
        return true;
    }

    if (request.action === 'CREATE_CHECKOUT_SESSION') {
        console.log("[Background] Creating checkout session...", request);
        fetch(`${request.apiUrl}/api/create-checkout-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${request.accessToken}`
            },
            body: JSON.stringify({
                priceId: request.priceId,
                extensionId: chrome.runtime.id
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error("[Background] Checkout API Error:", data.error);
                sendResponse({ error: data.error });
            } else {
                console.log("[Background] Checkout Session Created:", data.url);
                sendResponse({ data });
            }
        })
        .catch(error => {
            console.error("[Background] Checkout Fetch Error:", error);
            sendResponse({ error: error.message });
        });
        return true;
    }

    if (request.action === 'CREATE_PORTAL_SESSION') {
        console.log("[Background] Creating portal session...", request);
        fetch(`${request.apiUrl}/api/create-portal-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${request.accessToken}`
            },
            body: JSON.stringify({
                returnUrl: request.returnUrl
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error("[Background] Portal API Error:", data.error);
                sendResponse({ error: data.error });
            } else {
                console.log("[Background] Portal Session Created:", data.url);
                sendResponse({ data });
            }
        })
        .catch(error => {
            console.error("[Background] Portal Fetch Error:", error);
            sendResponse({ error: error.message });
        });
        return true;
    }

    if (request.action === 'CANCEL_SUBSCRIPTION') {
        console.log("[Background] Cancelling subscription...", request);
        fetch(`${request.apiUrl}/api/cancel-subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${request.accessToken}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error("[Background] Cancel API Error:", data.error);
                sendResponse({ error: data.error });
            } else {
                console.log("[Background] Subscription Canceled:", data);
                sendResponse({ data });
            }
        })
        .catch(error => {
            console.error("[Background] Cancel Fetch Error:", error);
            sendResponse({ error: error.message });
        });
        return true;
    }

    if (request.action === 'RESUME_SUBSCRIPTION') {
        console.log("[Background] Resuming subscription...", request);
        fetch(`${request.apiUrl}/api/resume-subscription`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${request.accessToken}`
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error("[Background] Resume API Error:", data.error);
                sendResponse({ error: data.error });
            } else {
                console.log("[Background] Subscription Resumed:", data);
                sendResponse({ data });
            }
        })
        .catch(error => {
            console.error("[Background] Resume Fetch Error:", error);
            sendResponse({ error: error.message });
        });
        return true;
    }

    if (request.action === 'UNSUBSCRIBE_VIA_POST') {
        console.log("[Background] Executing POST unsubscribe to:", request.url);
        fetch(request.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'List-Unsubscribe': `<${request.url}>`
            },
            body: request.body
        })
        .then(response => {
            if (response.ok) sendResponse({ success: true });
            else sendResponse({ error: `Status: ${response.status}` });
        })
        .catch(error => sendResponse({ error: error.message }));
        return true;
    }

    if (request.action === 'UNSUBSCRIBE_VIA_GET') {
        console.log("[Background] Executing GET unsubscribe to:", request.url);
        fetch(request.url, { method: 'GET' })
        .then(response => {
            // For GET, we assume success if the request completes, even if it's a redirect
            sendResponse({ success: true });
        })
        .catch(error => sendResponse({ error: error.message }));
        return true;
    }

    // OAuth for Gmail/Outlook API access
    if (request.action === 'OAUTH_REQUEST') {
        console.log(`[Background] OAuth request for ${request.provider}`);
        
        const OAUTH_CONFIG = {
            gmail: {
                clientId: '119111271548-qganbion1n21jtuon51a0t7e9g6jvu4c.apps.googleusercontent.com', // TODO: Add from Google Cloud Console
                scopes: [
                    'https://www.googleapis.com/auth/gmail.readonly',
                    'https://www.googleapis.com/auth/gmail.modify'
                ],
                authUrl: 'https://accounts.google.com/o/oauth2/v2/auth'
            },
            outlook: {
                clientId: 'YOUR_OUTLOOK_CLIENT_ID', // TODO: Add from Azure Portal
                scopes: [
                    'https://graph.microsoft.com/Mail.Read',
                    'https://graph.microsoft.com/Mail.ReadWrite'
                ],
                authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
            }
        };

        const config = OAUTH_CONFIG[request.provider];
        if (!config) {
            sendResponse({ error: `Unknown provider: ${request.provider}` });
            return true;
        }

        const redirectUrl = chrome.identity.getRedirectURL();
        const authParams = new URLSearchParams({
            client_id: config.clientId,
            response_type: 'token',
            redirect_uri: redirectUrl,
            scope: config.scopes.join(' ')
        });

        const authUrl = `${config.authUrl}?${authParams.toString()}`;

        chrome.identity.launchWebAuthFlow({
            url: authUrl,
            interactive: request.interactive !== undefined ? request.interactive : true
        }, (responseUrl) => {
            if (chrome.runtime.lastError) {
                console.error('[Background] OAuth failed:', chrome.runtime.lastError.message);
                sendResponse({ error: chrome.runtime.lastError.message });
                return;
            }

            if (!responseUrl) {
                sendResponse({ error: 'OAuth window closed or no response URL' });
                return;
            }

            // Parse token from response URL
            const params = new URLSearchParams(responseUrl.split('#')[1] || '');
            const token = {
                access_token: params.get('access_token'),
                refresh_token: params.get('refresh_token'),
                expires_in: parseInt(params.get('expires_in') || '3600')
            };

            if (!token.access_token) {
                sendResponse({ error: 'No access token returned' });
                return;
            }

            // Store token
            const expiresAt = Date.now() + token.expires_in * 1000;
            const tokenData = {
                access_token: token.access_token,
                refresh_token: token.refresh_token,
                expires_at: expiresAt,
                provider: request.provider
            };

            chrome.storage.local.set({ [`${request.provider}_token`]: tokenData }, () => {
                console.log(`[Background] Token stored for ${request.provider}`);
                sendResponse({ success: true, token: tokenData });
            });
        });

        return true; // Keep channel open for async response
    }
});

// Original functionality: Toggle sidebar
chrome.action.onClicked.addListener((tab) => {
    console.log("[Inbox Cleaner] Action clicked on tab:", tab.id, tab.url);
    if (tab.url.includes("mail.google.com") || tab.url.includes("outlook.live.com") || tab.url.includes("mail.yahoo.com")) {
        console.log("[Inbox Cleaner] Sending toggle_sidebar message...");
        chrome.tabs.sendMessage(tab.id, { action: "toggle_sidebar" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("[Inbox Cleaner] Error sending message:", chrome.runtime.lastError.message);
            } else {
                console.log("[Inbox Cleaner] Message sent successfully.");
            }
        });
    } else {
        console.log("[Inbox Cleaner] URL not supported for toggle.");
    }
});
