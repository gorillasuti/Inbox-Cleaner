/**
 * Gmail Adapter (API Version)
 * Handles Deep Scanning via Gmail API
 */

const BATCH_SIZE = 500; // Gmail API limit per page

export const GmailAdapter = {
    /**
     * Deep Scan for subscription emails
     * @param {string} token - Valid Google Access Token
     * @param {number} maxPages - Number of pages to scan (default 1)
     * @param {function} onProgress - Callback(current, total)
     * @returns {Promise<Object>} - { cleanable: [], manual: [], meta: {} }
     */
    async scan(token, maxPages = 1, onProgress = () => {}) {
        let pageToken = null;
        let totalScanned = 0;
        let allMessages = [];
        
        // Buckets
        const results = {
            cleanable: [], // Has List-Unsubscribe
            manual: [],    // Likely newsletter but no header
            meta: {
                totalScanned: 0,
                pagesScanned: 0
            }
        };

        try {
            for (let page = 0; page < maxPages; page++) {
                // 1. List Messages (Ids only)
                // Query: look for promotions or newsletters to narrow down
                const query = 'category:promotions OR label:smartlabel_newsletter OR unsubscribe OR "opt out"';
                
                let listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${BATCH_SIZE}`;
                if (pageToken) {
                    listUrl += `&pageToken=${pageToken}`;
                }

                const listResp = await fetch(listUrl, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!listResp.ok) {
                    throw new Error(`Gmail List API Error: ${listResp.statusText}`);
                }

                const listData = await listResp.json();
                const messages = listData.messages || [];
                
                if (messages.length === 0) break;

                // 2. Batch Fetch Metadata
                // We only need specific headers to decide
                const batchData = await this.fetchBatchMetadata(token, messages);
                
                // 3. Process & Categorize
                const processed = this.processMessages(batchData);
                
                // Merge into main results
                results.cleanable.push(...processed.cleanable);
                results.manual.push(...processed.manual);
                
                totalScanned += messages.length;
                results.meta.totalScanned = totalScanned;
                results.meta.pagesScanned = page + 1;

                // Report Progress
                if (onProgress) {
                    onProgress(totalScanned, null); // Total unknown for now
                }

                // Setup next loop
                pageToken = listData.nextPageToken;
                if (!pageToken) break;
            }
        } catch (error) {
            console.error('[GmailAdapter] Scan failed:', error);
            throw error;
        }

        return results;
    },

    /**
     * Fetch metadata for a batch of message IDs
     * Uses the batch endpoint or parallel requests if batch not supported nicely by fetch
     * Note: Gmail API supports batch, but it's complex with multipart/mixed. 
     * For simplicity and HTTP/2, parallel requests are often fine or we can use a helper.
     * However, to be efficient, we should use the `format=metadata` on individual gets.
     */
    async fetchBatchMetadata(token, messages) {
        // Limit concurrency to avoid rate limits
        const CONCURRENCY = 10; 
        const results = [];
        
        for (let i = 0; i < messages.length; i += CONCURRENCY) {
            const chunk = messages.slice(i, i + CONCURRENCY);
            const promises = chunk.map(msg => 
                fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=List-Unsubscribe&metadataHeaders=List-Unsubscribe-Post&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                }).then(r => r.json())
            );
            
            const chunkResults = await Promise.all(promises);
            results.push(...chunkResults);
        }
        
        return results;
    },

    /**
     * Categorize messages into Cleanable vs Manual
     * @param {Array} messages - Full message objects with payload.headers
     */
    processMessages(messages) {
        const cleanable = [];
        const manual = [];

        for (const msg of messages) {
            if (!msg.payload || !msg.payload.headers) continue;

            const headers = msg.payload.headers;
            const getHeader = (name) => {
                const h = headers.find(x => x.name.toLowerCase() === name.toLowerCase());
                return h ? h.value : null;
            };

            const listUnsubscribe = getHeader('List-Unsubscribe');
            const from = getHeader('From');
            const subject = getHeader('Subject');
            
            // Basic extraction of name/email from "From" header
            // Format: "Name <email@domain.com>" or "email@domain.com"
            let senderName = "Unknown";
            let senderEmail = "unknown";
            
            if (from) {
                const match = from.match(/(.*)<(.+)>/);
                if (match) {
                    senderName = match[1].replace(/"/g, '').trim();
                    senderEmail = match[2].trim();
                } else {
                    senderEmail = from.trim();
                    senderName = senderEmail.split('@')[0]; // Fallback
                }
            }

            const item = {
                id: msg.id,
                threadId: msg.threadId,
                senderName,
                senderEmail,
                subject,
                listUnsubscribe,
                internalDate: msg.internalDate
            };

            // Logic Rule 1: Cleanable if List-Unsubscribe exists
            if (listUnsubscribe) {
                cleanable.push(item);
            } 
            // Logic Rule 2: Manual if no header but looks like newsletter
            // (We already filtered by query, so most here are likely candidates)
            // But we should filter out transactional stuff if possible.
            // For now, if it was in the query results and has no unsub header, it's "Manual"
            // UNLESS it looks strictly transactional (hard to tell without body).
            // The prompt says: "Rule for 'Ignore': Transactional emails... that lack headers should be dropped"
            // Since we can't easily detect transactional without body/advanced logic, 
            // and our query `category:promotions` already does heavy lifting,
            // we will assume the query was good enough, but maybe check subject keywords?
            else {
                // Simple keyword check to exclude obvious transactional
                const lowerSub = (subject || '').toLowerCase();
                const isTransactional = lowerSub.includes('order') || 
                                      lowerSub.includes('receipt') || 
                                      lowerSub.includes('shipped') || 
                                      lowerSub.includes('delivery');
                
                if (!isTransactional) {
                    manual.push(item);
                }
            }
        }

        return { cleanable, manual };
    }
};
