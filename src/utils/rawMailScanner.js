// Raw Mail Scanner - Gmail Header Extraction via "Show Original"
// Fetches raw RFC 822 email headers in background (no UI flickering)

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Fetch raw email source via "Show Original" endpoint
 * Uses background fetch - zero UI impact
 * @param {string} threadId - Gmail thread ID (e.g., "FMfcgzQcqtlTMBGzMTjkwvkZTgLGHFdG")
 * @returns {Promise<string>} - Raw RFC 822 message text
 */
export const fetchRawMessage = async (threadId) => {
    // Gmail's "Show Original" endpoint (no ik parameter needed)
    const url = `https://mail.google.com/mail/u/0/?ui=2&view=om&th=${threadId}`;
    
    console.log(`[RawMailScanner] Fetching raw message in background: ${threadId}`);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include', // Include session cookies
            headers: {
                'Accept': 'text/html,application/xhtml+xml,application/xml'
            }
        });

        if (!response.ok) {
            throw new Error(`FETCH_FAILED: ${response.status}`);
        }

        const rawText = await response.text();
        console.log(`[RawMailScanner] ✓ Fetched raw message (${rawText.length} bytes)`);
        return rawText;
    } catch (error) {
        console.error('[RawMailScanner] Fetch failed:', error);
        throw error;
    }
};

/**
 * Parse headers from raw message text
 * @param {string} rawText - Raw RFC 822 message or HTML containing headers
 * @returns {Object} - Parsed newsletter info
 */
export const parseHeaders = (rawText) => {
    const findings = {
        isNewsletter: false,
        unsubscribeUrl: null,
        unsubscribeMethod: 'GET',
        from: null,
        subject: null
    };

    // 1. Detect List-Unsubscribe header
    // Format: List-Unsubscribe: <mailto:...>, <https://...>
    // or:     List-Unsubscribe: <https://...>
    const unsubMatch = rawText.match(/List-Unsubscribe:\s*(?:<mailto:[^>]+>,\s*)?<(https?:\/\/[^>]+)>/i);
    
    if (unsubMatch) {
        findings.isNewsletter = true;
        findings.unsubscribeUrl = unsubMatch[1];
        console.log('[RawMailScanner] ✓ Found List-Unsubscribe:', findings.unsubscribeUrl);
    }

    // 2. Check for RFC 8058 One-Click Post support
    const postMatch = rawText.match(/List-Unsubscribe-Post:\s*List-Unsubscribe=One-Click/i);
    if (postMatch && findings.unsubscribeUrl && findings.unsubscribeUrl.startsWith('http')) {
        findings.unsubscribeMethod = 'POST';
        console.log('[RawMailScanner] ✓ One-Click POST supported');
    }

    // 3. Extract From header
    const fromMatch = rawText.match(/^From:\s*(.+?)$/im);
    if (fromMatch) {
        findings.from = fromMatch[1].trim();
        
        // Parse email from "Name <email@domain.com>" format
        const emailMatch = findings.from.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
        if (emailMatch) {
            findings.email = emailMatch[1];
        }
    }

    // 4. Extract Subject
    const subjectMatch = rawText.match(/^Subject:\s*(.+?)$/im);
    if (subjectMatch) {
        findings.subject = subjectMatch[1].trim();
    }

    return findings;
};

/**
 * Batch fetch and parse raw messages with rate limiting
 * @param {Array<string>} threadIds - Array of thread IDs
 * @param {number} concurrency - Max concurrent requests (default: 3)
 * @returns {Promise<Map>} - Map of threadId -> parsed headers
 */
export const batchFetchHeaders = async (threadIds, concurrency = 3) => {
    const results = new Map();
    const queue = [...threadIds];
    const inProgress = new Set();

    console.log(`[RawMailScanner] Batch fetching ${threadIds.length} messages (concurrency: ${concurrency})`);

    while (queue.length > 0 || inProgress.size > 0) {
        // Start new requests up to concurrency limit
        while (inProgress.size < concurrency && queue.length > 0) {
            const threadId = queue.shift();
            
            const promise = (async () => {
                try {
                    await sleep(200); // Small delay between requests
                    const raw = await fetchRawMessage(threadId);
                    const parsed = parseHeaders(raw);
                    results.set(threadId, parsed);
                } catch (error) {
                    console.error(`[RawMailScanner] Failed to fetch ${threadId}:`, error);
                    results.set(threadId, { error: error.message });
                } finally {
                    inProgress.delete(promise);
                }
            })();

            inProgress.add(promise);
        }

        // Wait for at least one to complete
        if (inProgress.size > 0) {
            await Promise.race(inProgress);
        }
    }

    console.log(`[RawMailScanner] ✓ Batch complete: ${results.size} results`);
    return results;
};

/**
 * Execute unsubscribe action
 * @param {string} url - Unsubscribe URL
 * @param {string} method - 'GET' or 'POST'
 * @returns {Promise<Object>} - Result status
 */
export const executeUnsubscribe = async (url, method = 'GET') => {
    if (method === 'POST') {
        try {
            console.log('[RawMailScanner] Executing One-Click POST unsubscribe:', url);
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'List-Unsubscribe': 'One-Click'
                },
                body: 'List-Unsubscribe=One-Click'
            });

            if (response.ok) {
                console.log('[RawMailScanner] ✓ One-Click unsubscribe successful');
                return { status: 'success' };
            } else {
                console.warn('[RawMailScanner] POST failed, falling back to manual');
                window.open(url, '_blank');
                return { status: 'manual', link: url };
            }
        } catch (error) {
            console.error('[RawMailScanner] POST failed:', error);
            window.open(url, '_blank');
            return { status: 'manual', link: url };
        }
    } else {
        // GET or mailto - open in new tab
        console.log('[RawMailScanner] Opening unsubscribe link:', url);
        window.open(url, '_blank');
        return { status: 'manual', link: url };
    }
}
