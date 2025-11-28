// Gmail Unsubscribe - Click Gmail's built-in unsubscribe button
// Simple, reliable approach that uses Gmail's native functionality

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Find and click Gmail's unsubscribe button for a sender
 * @param {Object} target - Sender object with email/name and ids
 * @returns {Promise<Object>} - Result status
 */
export const unsubscribeFromSender = async (target) => {
    console.log(`[GmailUnsubscribe] Unsubscribing from: ${target.senderName}`);
    
    // Find email rows from this sender using their thread IDs
    const threadId = target.ids && target.ids[0];
    if (!threadId) {
        console.error('[GmailUnsubscribe] No thread ID found');
        return { status: 'error', message: 'No thread ID' };
    }
    
    // Find the row with this thread ID
    const row = document.querySelector(`tr[id="${threadId}"]`) || 
                 document.querySelector(`[data-legacy-thread-id="${threadId}"]`)?.closest('tr');
    
    if (!row) {
        console.error('[GmailUnsubscribe] Row not found for thread:', threadId);
        return { status: 'error', message: 'Row not found' };
    }
    
    // Look for Gmail's built-in unsubscribe button
    // Selector: "Leiratkozás" or "Unsubscribe" button
    const unsubscribeButton = row.querySelector('.aKS .T-I') || // Standard unsubscribe button
                               row.querySelector('[aria-label*="nsubscribe"]') || // Any unsubscribe button
                               row.querySelector('.aJ6')?.closest('.T-I'); // Button with "Leiratkozás" text
    
    if (unsubscribeButton) {
        console.log('[GmailUnsubscribe] Found Gmail unsubscribe button, clicking...');
        
        // Click the button
        unsubscribeButton.click();
        
        // Wait for Gmail to process
        await sleep(500);
        
        // Check if a modal/dialog appeared
        const confirmButton = document.querySelector('[role="dialog"] button[name="ok"]') ||
                             document.querySelector('[role="dialog"] .T-I-atl'); // Confirm button
        
        if (confirmButton) {
            console.log('[GmailUnsubscribe] Confirming unsubscribe...');
            confirmButton.click();
            await sleep(300);
        }
        
        return { status: 'success' };
    }
    
    // Fallback: If no Gmail button, look for unsubscribe link in email body
    // We need to open the email first
    console.log('[GmailUnsubscribe] No Gmail button found, trying email body...');
    
    // Click the row to open email
    row.click();
    await sleep(1000); // Wait for email to open
    
    // Look for unsubscribe links in the email body
    const emailBody = document.querySelector('.a3s.aiL') || 
                      document.querySelector('.ii.gt');
    
    if (emailBody) {
        // Find links containing "unsubscribe" or "leiratkozás"
        const unsubLink = Array.from(emailBody.querySelectorAll('a'))
            .find(a => {
                const href = a.href.toLowerCase();
                const text = a.textContent.toLowerCase();
                return href.includes('unsubscribe') || 
                       text.includes('unsubscribe') ||
                       text.includes('leiratkozás') ||
                       text.includes('leiratkozas');
            });
        
        if (unsubLink) {
            console.log('[GmailUnsubscribe] Found unsubscribe link in email body:', unsubLink.href);
            
            // Open in new tab
            window.open(unsubLink.href, '_blank');
            
            // Close the email (press Escape)
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
            await sleep(300);
            
            return { status: 'manual', link: unsubLink.href };
        }
    }
    
    // No unsubscribe option found
    console.warn('[GmailUnsubscribe] No unsubscribe option found');
    
    // Close email if we opened it
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27 }));
    
    return { status: 'error', message: 'No unsubscribe option found' };
};
