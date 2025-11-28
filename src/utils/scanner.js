import { checkAccess } from './gatekeeper';
import { GmailAdapter } from './adapters/gmail';
import { GmailApiAdapter } from './adapters/gmailApiAdapter';
import { OutlookAdapter } from './adapters/outlook';
import { getToken } from './oauth';
import { groupItems } from './grouping';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export const scanInbox = async (maxPages = 1, mode = 'quick') => {
    const providerHost = window.location.hostname;
    
    let accessConfig;

    try {
        // 1. Check Access & Limits
        accessConfig = await checkAccess(providerHost);
    } catch (error) {
        if (error.message === "PREMIUM_PROVIDER_LOCKED") {
            return { error: "LOCKED_PROVIDER", provider: providerHost, results: [] };
        }
        throw error;
    }

    // 2. Select Adapter & Strategy
    let adapter;
    let useApi = false;
    let token = null;

    if (providerHost.includes('google.com')) {
        // Check if we have an API token
        const tokenData = await getToken('gmail');
        if (tokenData && tokenData.access_token) {
            console.log('[Scanner] Using Gmail API Adapter');
            adapter = GmailApiAdapter;
            useApi = true;
            token = tokenData.access_token;
        } else {
            console.log('[Scanner] Using Gmail DOM Adapter');
            adapter = GmailAdapter;
        }
    } else if (providerHost.includes('outlook') || providerHost.includes('live')) {
        adapter = OutlookAdapter;
    } else if (providerHost.includes('yahoo')) {
        adapter = OutlookAdapter;
    } else {
        adapter = GmailAdapter;
    }

    let allFindings = [];
    let totalFound = 0;

    if (useApi) {
        // API Scan Strategy
        try {
            allFindings = await adapter.scan(token, accessConfig.canDeepScan ? maxPages : 1);
            totalFound = allFindings.length;
        } catch (error) {
            console.error('[Scanner] API Scan failed:', error);
            return { error: "API_SCAN_FAILED", details: error.message, results: [] };
        }
    } else {
        // DOM Scan Strategy
        let pagesScanned = 0;
        const effectiveMaxPages = accessConfig.canDeepScan ? maxPages : 1;
        
        console.log('[Inbox Cleaner] Starting DOM Scan...');
    
        while (pagesScanned < effectiveMaxPages) {
            console.log(`[Inbox Cleaner] Scanning page ${pagesScanned + 1}...`);
    
            const rows = Array.from(document.querySelectorAll(adapter.selectors.row));
            const pageResults = adapter.processRows(rows);
            allFindings = mergeResults(allFindings, pageResults);
    
            pagesScanned++;
    
            // Quick Scan Limit: Stop after 1 page
            if (mode === 'quick' && pagesScanned >= 1) {
                break;
            }
    
            if (pagesScanned < effectiveMaxPages) {
                const olderButton = document.querySelector(adapter.selectors.olderButton);
                if (olderButton && olderButton.getAttribute('aria-disabled') !== 'true') {
                    console.log("[Inbox Cleaner] Navigating to older emails...");
                    olderButton.click();
                    await sleep(2000); 
                } else {
                    console.log("[Inbox Cleaner] No more pages or 'Older' button disabled.");
                    break;
                }
            }
        }
        totalFound = allFindings.length; // Note: DOM adapter counts groups, not total emails? No, processRows returns groups.
        // Wait, totalFound in original code was allFindings.length (number of groups).
        // But for API, I calculated total emails?
        // Let's keep consistency. totalFound should be number of GROUPS or EMAILS?
        // The original code: const totalFound = allFindings.length;
        // So it's number of Senders (groups).
        totalFound = allFindings.length;
    }

    // Calculate Estimation for Upsell
    let estimatedHidden = 0;
    if (mode === 'quick' && !useApi && adapter.getTotalCount) {
        const totalEmails = adapter.getTotalCount(); 
        const scannedEmails = 50; 
        if (totalEmails > scannedEmails) {
            const density = totalFound / scannedEmails; 
            estimatedHidden = Math.round((totalEmails - scannedEmails) * density);
        }
    } else if (useApi && mode === 'quick') {
        // For API quick scan, we can estimate based on total messages in inbox if we fetched that info
        // For now, leave as 0 or implement a separate count fetch
    }

    // Group results if they aren't already grouped (DOM adapter returns flat list)
    // API adapter already returns grouped results, but running it again is harmless/idempotent if handled right.
    // Actually, API adapter returns groups. DOM returns senders.
    // Let's check if we need to group.
    
    let finalResults = allFindings;
    if (!useApi) {
        // DOM results are flat senders, need grouping
        finalResults = groupItems(allFindings);
    }

    return {
        results: finalResults,
        totalFound: totalFound,
        unlockLimit: accessConfig.unlockLimit,
        isLimited: !accessConfig.isPremium && totalFound > accessConfig.unlockLimit,
        estimatedHidden: estimatedHidden
    };
};

function mergeResults(existing, newResults) {
    // Helper to merge two result arrays by sender/email
    const map = new Map();

    [...existing, ...newResults].forEach(item => {
        const key = item.email && item.email !== "unknown@email.com" ? item.email : item.senderName;
        if (!map.has(key)) {
            map.set(key, { ...item, ids: [...item.ids] });
        } else {
            const entry = map.get(key);
            entry.count += item.count;
            entry.score = Math.max(entry.score, item.score);
            entry.ids = [...entry.ids, ...item.ids];
        }
    });

    return Array.from(map.values())
        .sort((a, b) => b.score - a.score)
        .sort((a, b) => b.count - a.count);
}
