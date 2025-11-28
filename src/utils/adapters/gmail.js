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
        
        // Maps for grouping: Key = email (or name if email missing)
        const cleanableMap = new Map();
        const manualMap = new Map();

        const results = {
            cleanable: [],
            manual: [],
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
                
                // 4. Group Results
                this.groupResults(processed.cleanable, cleanableMap);
                this.groupResults(processed.manual, manualMap);
                
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
            
            // Convert Maps to Arrays
            results.cleanable = Array.from(cleanableMap.values()).sort((a, b) => b.count - a.count);
            results.manual = Array.from(manualMap.values()).sort((a, b) => b.count - a.count);

        } catch (error) {
            console.error('[GmailAdapter] Scan failed:', error);
            throw error;
        }

        return results;
    },

    /**
     * Helper to group items into a Map
     */
    groupResults(items, map) {
        items.forEach(item => {
            const key = item.email; // Group by email
            
            if (!map.has(key)) {
                map.set(key, {
                    senderName: item.senderName,
                    email: item.email,
                    count: 0,
                    ids: []
                });
            }
            
            const group = map.get(key);
            group.count++;
            group.ids.push(item.id);
        });
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

        // Robust header parser
        const getHeader = (headers, name) => {
            if (!headers) return null;
            const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
            return header ? header.value : null;
        };

        for (const msg of messages) {
            if (!msg.payload) continue;
            
            const headers = msg.payload.headers;
            
            const listUnsubscribe = getHeader(headers, 'List-Unsubscribe');
            const from = getHeader(headers, 'From');
            const subject = getHeader(headers, 'Subject');
            
            // Parse Sender
            let senderName = "Unknown";
            let senderEmail = "unknown@email.com";
            
            if (from) {
                const match = from.match(/(.*)<(.+)>/);
                if (match) {
                    senderName = match[1].replace(/"/g, '').trim();
                    senderEmail = match[2].trim();
                } else {
                    senderEmail = from.trim();
                    senderName = senderEmail.split('@')[0];
                }
            }

            const item = {
                id: msg.id,
                threadId: msg.threadId,
                senderName,
                email: senderEmail, // Normalized key
                subject,
                listUnsubscribe
            };

            // Logic Rule 1: Cleanable if List-Unsubscribe exists
            if (listUnsubscribe) {
                cleanable.push(item);
            } 
            // Logic Rule 2: Manual if no header
            else {
                // Filter out purely transactional stuff if possible
                // For MVP, add ALL non-cleanable to manual
                // But filter out known system notifications if needed (omitted for now as per instruction "add ALL non-cleanable to manual")
                manual.push(item);
            }
        }

        return { cleanable, manual };
    }
};
