import { checkAccess } from './gatekeeper';
import { GmailAdapter } from './adapters/gmail';
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
            adapter = GmailAdapter;
            useApi = true;
            token = tokenData.access_token;
        } else {
            console.log('[Scanner] Gmail DOM Adapter is deprecated. Please sign in with Google.');
            return { error: "AUTH_REQUIRED", provider: "gmail", results: [] };
        }
    } else if (providerHost.includes('outlook') || providerHost.includes('live')) {
        adapter = OutlookAdapter;
    } else if (providerHost.includes('yahoo')) {
        adapter = OutlookAdapter;
    } else {
        // Fallback or unknown
        return { error: "UNKNOWN_PROVIDER", results: [] };
    }

    let allFindings = [];
    let totalFound = 0;

    if (useApi) {
        // API Scan Strategy
        try {
            const scanResults = await adapter.scan(token, accessConfig.canDeepScan ? maxPages : 1);
            
            return {
                results: [], // Deprecated flat list
                data: scanResults, // New structured data
                totalFound: scanResults.meta.totalScanned,
                unlockLimit: accessConfig.unlockLimit,
                isLimited: !accessConfig.isPremium && scanResults.meta.totalScanned > accessConfig.unlockLimit,
                estimatedHidden: 0
            };

        } catch (error) {
            console.error('[Scanner] API Scan failed:', error);
            return { error: "API_SCAN_FAILED", details: error.message, results: [] };
        }
    } else {
        // Non-Gmail strategies (Outlook etc)
        if (adapter === OutlookAdapter) {
             // Restore DOM loop for Outlook
             let pagesScanned = 0;
             const effectiveMaxPages = accessConfig.canDeepScan ? maxPages : 1;
             
             while (pagesScanned < effectiveMaxPages) {
                const rows = Array.from(document.querySelectorAll(adapter.selectors.row));
                const pageResults = adapter.processRows(rows);
                allFindings = mergeResults(allFindings, pageResults);
                pagesScanned++;
                if (mode === 'quick') break;
                
                if (pagesScanned < effectiveMaxPages) {
                    const olderButton = document.querySelector(adapter.selectors.olderButton);
                    if (olderButton && olderButton.getAttribute('aria-disabled') !== 'true') {
                        olderButton.click();
                        await sleep(2000); 
                    } else {
                        break;
                    }
                }
             }
             totalFound = allFindings.length;
             
             return {
                results: groupItems(allFindings),
                totalFound,
                unlockLimit: accessConfig.unlockLimit,
                isLimited: !accessConfig.isPremium && totalFound > accessConfig.unlockLimit,
                estimatedHidden: 0
            };
        }
    }

    return { results: [], totalFound: 0 };
};

function mergeResults(existing, newResults) {
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
    return Array.from(map.values()).sort((a, b) => b.score - a.score);
}
