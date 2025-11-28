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
        
        // PIVOT: Trash Strategy
        // If no header, we can't unsubscribe automatically.
        // We return 'manual' status with 'no_header' type so the UI can offer "Trash All"
        return {
            status: 'manual',
            type: 'no_header',
            link: null,
            message: 'No unsubscribe header found'
        };
    }

    console.log('[Unsubscribe] List-Unsubscribe header:', listUnsubscribe);

    // Parse List-Unsubscribe header
    const links = listUnsubscribe
        .split(',')
        .map(l => l.trim().replace(/^<|>$/g, ''));

    const httpsLink = links.find(l => l.startsWith('https://') || l.startsWith('http://'));
    const mailtoLink = links.find(l => l.startsWith('mailto:'));

    if (httpsLink) {
        console.log('[Unsubscribe] Found HTTPS link:', httpsLink);
        
        try {
            // CRITICAL: Use no-cors mode to avoid CORS errors
            const response = await fetch(httpsLink, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: 'List-Unsubscribe=One-Click'
            });
            
            // If fetch didn't throw a NetworkError, we assume it sent successfully
            if (response.type === 'opaque' || response.status === 0 || response.ok) {
                console.log('[Unsubscribe] POST sent successfully for:', sender.senderName);
                return { 
                    status: 'success',
                    link: httpsLink
                };
            }
        } catch (error) {
            console.error('[Unsubscribe] POST failed:', error);
            
            // Fallback: try GET request with no-cors
            try {
                const response = await fetch(httpsLink, { 
                    mode: 'no-cors',
                    method: 'GET'
                });
                
                if (response.type === 'opaque' || response.status === 0 || response.ok) {
                    console.log('[Unsubscribe] GET sent successfully for:', sender.senderName);
                    return { 
                        status: 'success',
                        link: httpsLink
                    };
                }
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
        
        // PIVOT: Trash Strategy
        // Mailto links require manual email composition which is friction.
        // We return 'manual' status with 'mailto' type so the UI can offer "Trash All"
        return { 
            status: 'manual',
            type: 'mailto',
            link: null,
            message: 'Mailto link found - recommending Trash'
        };
    }

    return { 
        status: 'error', 
        message: 'No supported unsubscribe method found' 
    };
}
