const SCORING = {
    HIGH: 10,   // Definite newsletter
    MEDIUM: 5,  // Likely promo
    LOW: 1      // Weak signal
};

const THRESHOLD = 0; // Lowered to 0 to catch more newsletters

const KEYWORDS = {
    HIGH: [
        'unsubscribe', 'opt-out', 'opt out', 'view in browser', 'manage preferences', 
        'mailing list', 'marketing communication', 'subscription', 'stop receiving',
        'email preferences', 'privacy policy', 'this email was sent to', 
        'update your preferences', 'manage your subscription', 'forward to a friend',
        'add us to your address book', 'you\'re receiving this', 'you received this email'
    ],
    MEDIUM: [
        'sale', 'offer', 'discount', 'promo', 'exclusive', 'deal', 'weekly', 'daily', 
        'digest', 'edition', 'issue', 'newsletter', 'roundup', 'briefing',
        'click here', 'read more', 'learn more', 'shop now', 'get started',
        'limited time', 'ends soon', 'today only', 'special offer'
    ],
    LOW: ['update', 'news', 'alert', 'notification', 'invite', 'join', 'welcome', 'confirm', 'verify']
};

// Common newsletter/marketing domains
const NEWSLETTER_DOMAINS = [
    'substack.com', 'beehiiv.com', 'convertkit.com', 'mailchimp.com',
    'constantcontact.com', 'sendgrid.net', 'createsend.com', 'campaign-archive.com',
    'news', 'newsletter', 'noreply', 'no-reply', 'info@', 'marketing@',
    'hello@', 'updates@', 'team@'
];

export const GmailAdapter = {
    selectors: {
        row: 'div[role="main"] tr.zA',
        listContainer: 'div[role="main"]',
        olderButton: 'div[role="button"][aria-label="Older"], div[title="Older"]',
        totalCount: 'span.Dj' // "1-50 of 1,234"
    },

    getTotalCount: () => {
        try {
            // Look for the element containing "1-50 of X"
            const countElement = document.querySelector(GmailAdapter.selectors.totalCount);
            if (countElement) {
                const text = countElement.innerText; // "1-50 of 1,234"
                const match = text.match(/of\s+([\d,]+)/);
                if (match) {
                    return parseInt(match[1].replace(/,/g, ''), 10);
                }
            }
            // Fallback: try to find by text content if class changes
            const allSpans = Array.from(document.querySelectorAll('span'));
            const countSpan = allSpans.find(s => /of\s+[\d,]+/.test(s.innerText) && s.innerText.length < 30);
            if (countSpan) {
                const match = countSpan.innerText.match(/of\s+([\d,]+)/);
                if (match) {
                    return parseInt(match[1].replace(/,/g, ''), 10);
                }
            }
        } catch (e) {
            console.warn("[GmailAdapter] Failed to get total count:", e);
        }
        return 0;
    },

    navigateToNewsletterView: () => {
        try {
            // Check if we're already in Promotions
            if (window.location.hash.includes('category/promotions')) {
                console.log('[GmailAdapter] Already in Promotions category.');
                return true;
            }
            
            // Strategy 1: Find and click the Promotions tab
            // Gmail uses different selectors, try multiple approaches
            const promotionsSelectors = [
                'div[data-tooltip="Promotions"]', // Tooltip attribute
                'div[aria-label*="Promotions"]', // Aria label
                'div[role="tab"][aria-label*="Promotions"]', // Tab role
                'a[href*="category/promotions"]' // Direct link
            ];
            
            for (const selector of promotionsSelectors) {
                const tabElement = document.querySelector(selector);
                if (tabElement) {
                    console.log(`[GmailAdapter] Found Promotions tab via: ${selector}`);
                    tabElement.click();
                    return true;
                }
            }
            
            // Strategy 2: If no tab found, try hash change as fallback
            console.log('[GmailAdapter] Promotions tab not found, trying hash navigation...');
            window.location.hash = '#category/promotions';
            return true;
            
        } catch (e) {
            console.warn('[GmailAdapter] Failed to navigate to Promotions:', e);
            return false;
        }
    },
    
    isInPromotions: () => {
        return window.location.hash.includes('category/promotions');
    },

    processRows: (rows) => {
        const findings = new Map();
        const inPromotions = GmailAdapter.isInPromotions();
        
        // With threshold at 0, we'll catch everything and filter later
        const effectiveThreshold = 0;

        rows.forEach(row => {
            const subjectNode = row.querySelector('.bog');
            const snippetNode = row.querySelector('.y2');

            const subject = subjectNode ? subjectNode.innerText.toLowerCase() : '';
            const snippet = snippetNode ? snippetNode.innerText.toLowerCase() : '';
            const fullText = row.innerText.toLowerCase();

            let score = 0;

            // If in Promotions, give base score since Gmail filtered it
            if (inPromotions) {
                score += SCORING.LOW;
            }

            // High signals (Snippet or Full Text)
            if (KEYWORDS.HIGH.some(k => snippet.includes(k) || fullText.includes(k))) score += SCORING.HIGH;

            // Medium signals (Subject or Snippet)
            if (KEYWORDS.MEDIUM.some(k => subject.includes(k) || snippet.includes(k))) score += SCORING.MEDIUM;

            // Low signals (Subject)
            if (KEYWORDS.LOW.some(k => subject.includes(k))) score += SCORING.LOW;
            
            // NEW: Domain-based detection
            let senderEmail = "";
            const senderElement = row.querySelector('.yP, .zF, span[email], .yX span, .a4W');
            if (senderElement) {
                senderEmail = senderElement.getAttribute('email') || 
                             senderElement.getAttribute('data-email') || 
                             senderElement.title || 
                             "";
            }
            
            if (senderEmail && NEWSLETTER_DOMAINS.some(domain => senderEmail.toLowerCase().includes(domain))) {
                score += SCORING.MEDIUM; // Boost score for known newsletter domains
            }
            
            // CRITICAL: Check if email has Gmail's native unsubscribe button
            // This is the most reliable indicator of a newsletter
            const hasUnsubscribeButton = row.querySelector('.aKS .T-I') || // Standard button
                                        row.querySelector('.aJ6') || // "Leiratkozás" text
                                        row.querySelector('[aria-label*="nsubscribe"]');
            
            if (hasUnsubscribeButton) {
                console.log('[Gmail] Found unsubscribe button - definite newsletter');
                score += 1000; // Massive boost - this is definitive proof
            }

            if (score >= effectiveThreshold) {
                // PHASE 1: Extract Sender Info Aggressively
                let senderName = "Unknown";
                let email = "unknown@email.com";
                
                // Try multiple strategies to find sender element
                const senderElement = row.querySelector('.yP, .zF, span[email], .yX span, .a4W, .bA4');
                
                if (senderElement) {
                    // Get sender name from text or attributes
                    senderName = senderElement.innerText?.trim() || 
                                 senderElement.getAttribute('name') || 
                                 senderElement.getAttribute('title') || 
                                 senderElement.textContent?.trim() ||
                                 "Unknown";
                    
                    // Try to get email from attributes first
                    email = senderEmail || 
                            senderElement.getAttribute('email') || 
                            senderElement.getAttribute('data-email') ||
                            senderElement.getAttribute('data-hovercard-id') ||
                            senderElement.title || 
                            "";
                    
                    // Parse "Name <email>" format from title/aria-label
                    if (!email || email === "" || email === "unknown@email.com") {
                        const titleText = senderElement.title || senderElement.getAttribute('aria-label') || '';
                        const emailMatch = titleText.match(/<([^>]+)>/);
                        if (emailMatch) {
                            email = emailMatch[1];
                        }
                    }
                }
                
                // PHASE 2: Fallback - Parse from row attributes
                if (!email || email === "unknown@email.com") {
                    // Check row title for email
                    if (row.title) {
                        const emailMatch = row.title.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
                        if (emailMatch) {
                            email = emailMatch[1];
                        }
                    }
                    
                    // Check row data attributes
                    const dataEmail = row.getAttribute('data-email') || 
                                     row.getAttribute('data-sender-email') ||
                                     row.getAttribute('data-from');
                    if (dataEmail) {
                        email = dataEmail;
                    }
                }
                
                // PHASE 3: Last resort - Regex search in full row text
                if (!email || email === "unknown@email.com") {
                    const rowText = row.innerText || row.textContent || '';
                    const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/;
                    const emailMatch = rowText.match(emailRegex);
                    if (emailMatch) {
                        email = emailMatch[1];
                    }
                }
                
                // Extract name from email if name is "Unknown"
                if (senderName === "Unknown" && email && email !== "unknown@email.com") {
                    // Use email local part as name (e.g., hello@company.com -> hello)
                    const localPart = email.split('@')[0];
                    senderName = localPart.replace(/[._-]/g, ' ')
                                          .split(' ')
                                          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                                          .join(' ');
                }

                const key = email && email !== "unknown@email.com" ? email : senderName;

                if (!findings.has(key)) {
                    findings.set(key, {
                        senderName: senderName,
                        email: email === "" ? "unknown@email.com" : email,
                        count: 0,
                        score: 0,
                        ids: []
                    });
                }

                const group = findings.get(key);
                group.count++;
                
                // Extract FULL thread ID from Gmail's data attributes
                // Gmail stores it in nested <span> elements with data-legacy-thread-id
                let fullThreadId = null;
                
                // Look for data-legacy-thread-id in nested spans
                const spanWithThreadId = row.querySelector('[data-legacy-thread-id]');
                if (spanWithThreadId) {
                    fullThreadId = spanWithThreadId.getAttribute('data-legacy-thread-id');
                    console.log(`[Gmail] Extracted thread ID: ${fullThreadId}`);
                }
                
                // Fallback: use short row ID (will likely fail, but better than nothing)
                if (!fullThreadId) {
                    fullThreadId = row.id;
                    console.warn(`[Gmail] Could not find thread ID, using row ID: ${fullThreadId}`);
                }
                
                group.ids.push(fullThreadId);
                // Keep the highest score found for this sender
                group.score = Math.max(group.score, score);
            }
        });

        return Array.from(findings.values())
            .filter(g => g.score >= effectiveThreshold)
            .sort((a, b) => b.score - a.score)
            .sort((a, b) => b.count - a.count);
    }
};
