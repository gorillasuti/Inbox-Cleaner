// Gmail Internal API Access
// Uses Gmail's private web API endpoints (same ones the Gmail UI uses)
// No OAuth required - uses the user's existing Gmail session

/**
 * Extract Gmail session parameters from the page
 */
function getGmailSessionParams() {
    // Gmail stores its API parameters in the page's JavaScript
    // Look for the "ik" (interaction key) parameter
    const scriptTags = Array.from(document.querySelectorAll('script'));
    
    for (const script of scriptTags) {
        const content = script.textContent;
        if (content && content.includes('"ik"')) {
            // Extract ik parameter
            const ikMatch = content.match(/"ik":"([^"]+)"/);
            if (ikMatch) {
                return {
                    ik: ikMatch[1],
                    at: getAuthToken()
                };
            }
        }
    }
    
    return null;
}

/**
 * Get Gmail's auth token from cookies or page
 */
function getAuthToken() {
    // Gmail uses GMAIL_AT cookie or embeds it in the page
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'GMAIL_AT') {
            return value;
        }
    }
    
    // Fallback: try to extract from page
    const scriptTags = Array.from(document.querySelectorAll('script'));
    for (const script of scriptTags) {
        const content = script.textContent;
        if (content && content.includes('GMAIL_AT')) {
            const atMatch = content.match(/GMAIL_AT[=:]+"?([^"';,\\s]+)/);
            if (atMatch) {
                return atMatch[1];
            }
        }
    }
    
    return null;
}

/**
 * Search for emails using Gmail's internal search API
 * @param {string} query - Gmail search query
 * @param {number} limit - Max results
 * @returns {Promise<Array>} - List of message IDs
 */
export async function searchEmails(query, limit = 100) {
    const params = getGmailSessionParams();
    if (!params) {
        throw new Error('Could not extract Gmail session parameters');
    }

    // Gmail's internal search endpoint
    // This is a simplified version - Gmail's actual API is more complex
    const url = `https://mail.google.com/mail/u/0/?ik=${params.ik}&search=query&q=${encodeURIComponent(query)}&start=0&num=${limit}`;
    
    try {
        const response = await fetch(url, {
            credentials: 'include', // Include session cookies
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Gmail API returned ${response.status}`);
        }
        
        const data = await response.json();
        // Parse Gmail's response format
        // This is a placeholder - actual parsing depends on Gmail's response structure
        return data.messages || [];
    } catch (error) {
        console.error('[GmailInternalAPI] Search failed:', error);
        throw error;
    }
}

/**
 * Get full email details including headers
 * @param {string} messageId - Gmail message ID
 * @returns {Promise<Object>} - Email details with headers
 */
export async function getMessage(messageId) {
    const params = getGmailSessionParams();
    if (!params) {
        throw new Error('Could not extract Gmail session parameters');
    }

    // Gmail's message fetch endpoint
    const url = `https://mail.google.com/mail/u/0/?ik=${params.ik}&view=om&th=${messageId}`;
    
    try {
        const response = await fetch(url, {
            credentials: 'include',
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Gmail API returned ${response.status}`);
        }
        
        const html = await response.text();
        
        // Parse email headers from HTML
        // Gmail embeds headers in the email HTML
        const headers = parseEmailHeaders(html);
        
        return {
            id: messageId,
            headers,
            listUnsubscribe: headers.find(h => h.name === 'List-Unsubscribe')?.value,
            from: headers.find(h => h.name === 'From')?.value,
            subject: headers.find(h => h.name === 'Subject')?.value
        };
    } catch (error) {
        console.error('[GmailInternalAPI] getMessage failed:', error);
        throw error;
    }
}

/**
 * Parse email headers from Gmail's HTML response
 */
function parseEmailHeaders(html) {
    const headers = [];
    
    // Gmail includes headers in meta tags or a specific section
    // This is a simplified parser - actual implementation needs to match Gmail's format
    const headerRegex = /<div class="[^"]*header[^"]*">([^<]+):<\s*([^<]+)<\/div>/gi;
    let match;
    
    while ((match = headerRegex.exec(html)) !== null) {
        headers.push({
            name: match[1].trim(),
            value: match[2].trim()
        });
    }
    
    return headers;
}

/**
 * Unsubscribe using List-Unsubscribe header
 * @param {Object} target - { senderName, email, ids }
 * @returns {Promise<Object>} - { status, link }
 */
export async function unsubscribe(target) {
    console.log('[GmailInternalAPI] Attempting to unsubscribe from:', target.senderName);
    
    if (!target.ids || target.ids.length === 0) {
        return { status: 'failed', error: 'No message IDs' };
    }

    try {
        // Get the first email to find unsubscribe info
        const message = await getMessage(target.ids[0]);
        
        if (message.listUnsubscribe) {
            // Parse List-Unsubscribe header
            // Format: <mailto:...>, <https://...>
            const urlMatch = message.listUnsubscribe.match(/https?:\/\/[^,>\s]+/);
            
            if (urlMatch) {
                const unsubUrl = urlMatch[0];
                console.log('[GmailInternalAPI] Found unsubscribe URL:', unsubUrl);
                
                // Open in new tab for user to complete
                window.open(unsubUrl, '_blank');
                
                return { status: 'manual', link: unsubUrl };
            }
        }
        
        return { status: 'failed', error: 'No List-Unsubscribe header found' };
    } catch (error) {
        console.error('[GmailInternalAPI] Unsubscribe failed:', error);
        return { status: 'failed', error: error.message };
    }
}
