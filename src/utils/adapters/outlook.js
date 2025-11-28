const SCORING = {
    HIGH: 10,
    MEDIUM: 5,
    LOW: 1
};

const THRESHOLD = 1;

const KEYWORDS = {
    HIGH: ['unsubscribe', 'opt-out', 'view in browser', 'manage preferences', 'mailing list'],
    MEDIUM: ['sale', 'offer', 'discount', 'promo', 'exclusive', 'deal', 'weekly', 'daily', 'digest', 'edition'],
    LOW: ['update', 'news', 'alert', 'notification', 'invite', 'join', 'welcome']
};

export const OutlookAdapter = {
    selectors: {
        row: 'div[role="row"], div[role="option"]',
        listContainer: 'div[role="grid"], div[role="listbox"]',
        totalCount: '[aria-label*="items"], [title*="items"]' // Heuristic for "123 items"
    },

    getTotalCount: () => {
        try {
            // Outlook often shows "X items" in the status bar or header
            // We look for elements containing "items" or "messages" text
            const candidates = Array.from(document.querySelectorAll('span, div'));
            const countElement = candidates.find(el => 
                /(\d+)\s+(items|messages)/i.test(el.innerText) && 
                el.innerText.length < 30
            );

            if (countElement) {
                const match = countElement.innerText.match(/(\d+)\s+(items|messages)/i);
                if (match) {
                    return parseInt(match[1].replace(/,/g, ''), 10);
                }
            }
        } catch (e) {
            console.warn("[OutlookAdapter] Failed to get total count:", e);
        }
        return 0;
    },

    navigateToNewsletterView: () => {
        // Outlook doesn't have a direct "Promotions" URL hash like Gmail.
        // We could try to find a "Other" tab if "Focused" is active, but that's complex.
        return false;
    },

    processRows: (rows) => {
        const findings = new Map();

        rows.forEach(row => {
            // Outlook DOM is complex and class-obfuscated. We rely on ARIA and structure.
            const fullText = row.innerText.toLowerCase();

            // Heuristic: Try to find sender and subject
            // Sender often has a title attribute or is in a specific column
            // We'll look for elements with text that looks like an email or name

            let score = 0;
            if (KEYWORDS.HIGH.some(k => fullText.includes(k))) score += SCORING.HIGH;
            if (KEYWORDS.MEDIUM.some(k => fullText.includes(k))) score += SCORING.MEDIUM;
            if (KEYWORDS.LOW.some(k => fullText.includes(k))) score += SCORING.LOW;

            if (score >= THRESHOLD) {
                // Attempt to extract sender
                // In Outlook, the sender is usually the first bold text or has a specific class
                // We'll try to find an element with 'title' that looks like an email

                let senderName = "Unknown";
                let email = "unknown@email.com";

                // Try to find an element with an email in title or aria-label
                const emailElement = row.querySelector('[title*="@"], [aria-label*="@"]');
                if (emailElement) {
                    const title = emailElement.getAttribute('title') || emailElement.getAttribute('aria-label');
                    if (title && title.includes('@')) {
                        email = title;
                        senderName = title.split('<')[0].trim().replace(/"/g, '') || email.split('@')[0];
                    }
                } else {
                    // Fallback: Use the first significant text node as sender
                    const textNodes = row.innerText.split('\n').filter(t => t.trim().length > 0);
                    if (textNodes.length > 0) {
                        senderName = textNodes[0].trim(); // Usually sender is first
                    }
                }

                const key = email !== "unknown@email.com" ? email : senderName;

                if (!findings.has(key)) {
                    findings.set(key, {
                        senderName: senderName,
                        email: email,
                        count: 0,
                        score: 0,
                        ids: []
                    });
                }

                const group = findings.get(key);
                group.count++;
                group.ids.push(row.id);
                group.score = Math.max(group.score, score);
            }
        });

        return Array.from(findings.values())
            .filter(g => g.score >= THRESHOLD)
            .sort((a, b) => b.score - a.score)
            .sort((a, b) => b.count - a.count);
    }
};
