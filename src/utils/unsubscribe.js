// List-Unsubscribe header-based unsubscribe utility
// Uses the List-Unsubscribe header from email metadata

/**
 * Parse mailto: link and convert to Gmail Compose URL
 * @param {string} mailtoLink - mailto:email@example.com?subject=Unsubscribe
 * @returns {string} Gmail compose URL
 */
function parseMailtoToGmailCompose(mailtoLink) {
    try {
        // Remove 'mailto:' prefix
        const mailto = mailtoLink.replace('mailto:', '');
        
        // Split email and parameters
        const [email, params] = mailto.split('?');
        const to = encodeURIComponent(email.trim());
        
        // Parse parameters
        const urlParams = new URLSearchParams(params || '');
        const subject = encodeURIComponent(urlParams.get('subject') || 'Unsubscribe');
        const body = urlParams.get('body') ? encodeURIComponent(urlParams.get('body')) : '';
        
        // Construct Gmail Compose URL with exact format
        // 'view=cm' is the critical param for Compose Mode
        let gmailUrl = `https://mail.google.com/mail/u/0/?view=cm&fs=1&to=${to}&su=${subject}`;
        if (body) gmailUrl += `&body=${body}`;
        
        return gmailUrl;
    } catch (error) {
        console.error('[Unsubscribe] Failed to parse mailto link:', error);
        return mailtoLink; // Fallback to original
    }
}

/**
 * Attempt to unsubscribe from a sender using List-Unsubscribe header
 * @param {Object} sender - { senderName, email, listUnsubscribe, threadId, domain, ... }
 * @returns {Promise<Object>} - { status: 'success' | 'manual' | 'website_fallback', link?: string, type?: string, message?: string }
 */
export async function unsubscribeFromSender(sender) {
    console.log('[Unsubscribe] Processing:', sender.senderName, 'Email:', sender.email);
    
    // Check if we have a List-Unsubscribe header
    const listUnsubscribe = sender.listUnsubscribe || sender.originalItem?.listUnsubscribe;
    
    if (!listUnsubscribe) {
        console.warn('[Unsubscribe] No List-Unsubscribe header for:', sender.senderName);
        
        // FALLBACK 1: If we have a thread ID, create deep link to the email
        const threadId = sender.threadId || sender.ids?.[0];
        if (threadId) {
            return {
                status: 'manual',
                type: 'thread_fallback',
                link: `https://mail.google.com/mail/u/0/#inbox/${threadId}`,
                message: 'No automatic link found - opening email for manual check'
            };
        }
        
        // FALLBACK 2: Return website domain for manual visit
        const domain = sender.domain || sender.email?.split('@')[1];
        if (domain) {
            return { 
                status: 'website_fallback',
                domain: domain,
                link: `https://${domain}`,
                message: 'No unsubscribe link found - visit website manually'
            };
        }
        
        return { 
            status: 'error', 
            message: 'No unsubscribe information available' 
        };
    }

    console.log('[Unsubscribe] List-Unsubscribe header:', listUnsubscribe);

    // Parse List-Unsubscribe header
    // Format: <https://example.com/unsubscribe>, <mailto:unsub@example.com>
    // or just: <https://example.com/unsubscribe>
    const links = listUnsubscribe
        .split(',')
        .map(l => l.trim().replace(/^<|>$/g, ''));

    const httpsLink = links.find(l => l.startsWith('https://') || l.startsWith('http://'));
    const mailtoLink = links.find(l => l.startsWith('mailto:'));

    if (httpsLink) {
        console.log('[Unsubscribe] Found HTTPS link:', httpsLink);
        
        try {
            // CRITICAL: Use no-cors mode to avoid CORS errors
            // This triggers the unsubscribe endpoint even though we can't read the response
            const response = await fetch(httpsLink, {
                method: 'POST',
                mode: 'no-cors', // <--- CRITICAL for CORS compliance
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'List-Unsubscribe=One-Click'
            });
            
            // CRITICAL FIX for opaque responses:
            // When mode is no-cors, we CANNOT check response.ok
            // If fetch didn't throw a NetworkError, we assume it sent successfully
            if (response.type === 'opaque' || response.status === 0) {
                console.log('[Unsubscribe] POST sent successfully (opaque response) for:', sender.senderName);
                return { 
                    status: 'success',
                    link: httpsLink
                };
            }
            
            // Only check .ok if we are NOT in no-cors mode (rare case)
            if (!response.ok) {
                throw new Error('Server returned error');
            }
            
            console.log('[Unsubscribe] POST sent successfully for:', sender.senderName);
            return { 
                status: 'success',
                link: httpsLink
            };
        } catch (error) {
            console.error('[Unsubscribe] POST failed:', error);
            
            // Fallback: try GET request with no-cors
            try {
                const response = await fetch(httpsLink, { 
                    mode: 'no-cors',
                    method: 'GET'
                });
                
                // Same opaque response logic for GET
                if (response.type === 'opaque' || response.status === 0) {
                    console.log('[Unsubscribe] GET sent successfully (opaque response) for:', sender.senderName);
                    return { 
                        status: 'success',
                        link: httpsLink
                    };
                }
                
                console.log('[Unsubscribe] GET sent successfully for:', sender.senderName);
                return { 
                    status: 'success',
                    link: httpsLink
                };
            } catch (getError) {
                console.error('[Unsubscribe] GET also failed:', getError);
                return { 
                    status: 'error', 
                    message: 'Failed to connect to unsubscribe URL',
                    link: httpsLink
                };
            }
        }
    } else if (mailtoLink) {
        console.log('[Unsubscribe] Found mailto link:', mailtoLink);
        
        // BROWSER-FRIENDLY: Convert mailto to Gmail Compose URL
        // This keeps the user in the browser instead of launching system mail app
        const gmailComposeUrl = parseMailtoToGmailCompose(mailtoLink);
        
        return { 
            status: 'manual',
            type: 'mailto',
            link: gmailComposeUrl,
            message: 'Opening Gmail compose with unsubscribe request'
        };
    }

    return { 
        status: 'error', 
        message: 'No supported unsubscribe method found' 
    };
}
