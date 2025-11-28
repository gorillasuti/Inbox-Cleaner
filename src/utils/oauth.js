// OAuth Manager - Handle Gmail & Outlook API authentication
// Provides optional API access with token management

/**
 * OAuth configuration for supported providers
 */
const OAUTH_CONFIG = {
    gmail: {
        clientId: 'YOUR_GMAIL_CLIENT_ID', // TODO: Add from Google Cloud Console
        scopes: [
            'https://www.googleapis.com/auth/gmail.readonly',
            'https://www.googleapis.com/auth/gmail.modify'
        ],
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token'
    },
    outlook: {
        clientId: 'YOUR_OUTLOOK_CLIENT_ID', // TODO: Add from Azure Portal
        scopes: [
            'https://graph.microsoft.com/Mail.Read',
            'https://graph.microsoft.com/Mail.ReadWrite'
        ],
        authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
    }
};

/**
 * Initiate OAuth flow for a provider
 * @param {string} provider - 'gmail' or 'outlook'
 * @returns {Promise<Object>} - Token object { access_token, refresh_token, expires_at }
 */
export const authenticateProvider = async (provider, options = { interactive: true }) => {
    console.log(`[OAuth] Requesting authentication for ${provider} via background script (interactive: ${options.interactive})`);

    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ 
            action: 'OAUTH_REQUEST', 
            provider,
            interactive: options.interactive
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error(`[OAuth] Message error:`, chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
                return;
            }

            if (response && response.error) {
                console.error(`[OAuth] Background error:`, response.error);
                reject(new Error(response.error));
                return;
            }

            if (response && response.success && response.token) {
                console.log(`[OAuth] Successfully authenticated ${provider}`);
                resolve(response.token);
            } else {
                reject(new Error('Invalid response from background script'));
            }
        });
    });
};

/**
 * Parse token from OAuth redirect URL
 * @param {string} url - Redirect URL with token in hash
 * @returns {Object} - Parsed token data
 */
const parseTokenFromUrl = (url) => {
    const params = new URLSearchParams(url.split('#')[1] || '');
    return {
        access_token: params.get('access_token'),
        refresh_token: params.get('refresh_token'),
        expires_in: parseInt(params.get('expires_in') || '3600')
    };
};

/**
 * Store token in chrome.storage.local
 * @param {string} provider - Provider name
 * @param {Object} tokenData - Token data to store
 */
const storeToken = async (provider, tokenData) => {
    const key = `${provider}_token`;
    await chrome.storage.local.set({ [key]: tokenData });
    console.log(`[OAuth] Token stored for ${provider}`);
};

/**
 * Get stored token for a provider
 * @param {string} provider - Provider name
 * @returns {Promise<Object|null>} - Token data or null if not found
 */
export const getToken = async (provider) => {
    const key = `${provider}_token`;
    const result = await chrome.storage.local.get(key);
    const token = result[key];

    if (!token) {
        console.log(`[OAuth] No token found for ${provider}`);
        return null;
    }

    // Check if token is expired
    // Add a buffer of 60 seconds to be safe
    if (token.expires_at && Date.now() >= (token.expires_at - 60000)) {
        console.log(`[OAuth] Token expired for ${provider}. Attempting refresh...`);
        
        try {
            // Attempt silent re-authentication
            // We reuse the authenticateProvider logic but we need to ensure it can run non-interactively
            // The background script's launchWebAuthFlow usually defaults to interactive: true
            // We might need to modify authenticateProvider or send a specific flag
            
            // For now, let's try to re-authenticate. If the user has approved the app before, 
            // launchWebAuthFlow with interactive: false should work.
            
            // However, authenticateProvider sends a message to background. 
            // We should update the background handler to support 'interactive' flag, 
            // or just try calling it. If it requires interaction, it might pop up a window 
            // which is annoying during a scan, but better than breaking.
            // Ideally we want silent.
            
            // Let's modify authenticateProvider to accept options
            const newToken = await authenticateProvider(provider, { interactive: false });
            if (newToken) {
                console.log(`[OAuth] Token refreshed silently for ${provider}`);
                return newToken;
            }
        } catch (e) {
            console.warn(`[OAuth] Silent refresh failed for ${provider}:`, e);
            // If silent refresh fails, we return null so the scanner falls back to DOM
            // or prompts the user (but scanner currently falls back)
            return null;
        }
    }

    return token;
};

/**
 * Check if a provider is connected (has valid token)
 * @param {string} provider - Provider name
 * @returns {Promise<boolean>} - True if connected
 */
export const isProviderConnected = async (provider) => {
    const token = await getToken(provider);
    return token !== null;
};

/**
 * Disconnect a provider (remove token)
 * @param {string} provider - Provider name
 */
export const disconnectProvider = async (provider) => {
    const key = `${provider}_token`;
    await chrome.storage.local.remove(key);
    console.log(`[OAuth] Disconnected ${provider}`);
};

/**
 * Get all connected providers
 * @returns {Promise<Array<string>>} - Array of connected provider names
 */
export const getConnectedProviders = async () => {
    const providers = ['gmail', 'outlook'];
    const connected = [];

    for (const provider of providers) {
        if (await isProviderConnected(provider)) {
            connected.push(provider);
        }
    }

    return connected;
};
