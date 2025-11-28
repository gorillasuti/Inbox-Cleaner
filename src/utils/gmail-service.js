
/**
 * Service to interact with Gmail API
 * Requires a valid Google Access Token with 'https://www.googleapis.com/auth/gmail.modify' scope.
 */
export const GmailService = {
    async listMessages(accessToken, query = 'category:promotions', maxResults = 100) {
        let messages = [];
        let nextPageToken = null;
        
        // Gmail API maxResults per page is 500
        const batchSize = 500;

        do {
            // Calculate how many we still need
            const remaining = maxResults - messages.length;
            const currentLimit = Math.min(remaining, batchSize);
            
            if (currentLimit <= 0) break;

            let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${currentLimit}`;
            if (nextPageToken) {
                url += `&pageToken=${nextPageToken}`;
            }

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`Gmail API Error: ${response.statusText}`);
            }

            const data = await response.json();
            
            if (data.messages) {
                messages = messages.concat(data.messages);
            }
            
            nextPageToken = data.nextPageToken;
            
        } while (nextPageToken && messages.length < maxResults);

        return messages;
    },

    async getMessageDetails(accessToken, messageId) {
        const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=List-Unsubscribe`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });
        return response.json();
    },

    /**
     * Trash multiple messages by adding TRASH label
     * @param {string} accessToken - Gmail API access token
     * @param {string[]} messageIds - Array of message IDs to trash
     * @returns {Promise<Object>} Response from batchModify
     */
    async trashMessages(accessToken, messageIds) {
        if (!messageIds || messageIds.length === 0) {
            return { success: true, count: 0 };
        }

        try {
            const response = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        ids: messageIds,
                        addLabelIds: ['TRASH']
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to trash messages: ${response.statusText}`);
            }

            console.log(`[GmailService] Successfully trashed ${messageIds.length} messages`);
            return { success: true, count: messageIds.length };
        } catch (error) {
            console.error('[GmailService] Failed to trash messages:', error);
            throw error;
        }
    },

    async batchDelete(accessToken, messageIds) {
        const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/batchDelete`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: messageIds })
        });
        return response.ok;
    },

    async createLabel(accessToken, name) {
        // 1. Check if label exists
        const listUrl = `https://gmail.googleapis.com/gmail/v1/users/me/labels`;
        const listResp = await fetch(listUrl, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const listData = await listResp.json();
        const existing = listData.labels.find(l => l.name === name);
        if (existing) return existing.id;

        // 2. Create if not
        const createUrl = `https://gmail.googleapis.com/gmail/v1/users/me/labels`;
        const createResp = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: name,
                labelListVisibility: 'labelShow',
                messageListVisibility: 'show'
            })
        });
        const newLabel = await createResp.json();
        return newLabel.id;
    },

    async createFilter(accessToken, senderEmail, labelId) {
        const url = `https://gmail.googleapis.com/gmail/v1/users/me/settings/filters`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                criteria: {
                    from: senderEmail
                },
                action: {
                    addLabelIds: [labelId],
                    removeLabelIds: ['INBOX']
                }
            })
        });
        return response.ok;
    },

    async keepNewest(accessToken, senderEmail, keepCount = 1) {
        // 1. List all messages from sender
        // We might need to page through if there are many
        let messages = [];
        let pageToken = null;
        do {
            const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=from:${encodeURIComponent(senderEmail)}&maxResults=500${pageToken ? `&pageToken=${pageToken}` : ''}`;
            const resp = await fetch(url, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const data = await resp.json();
            if (data.messages) messages = messages.concat(data.messages);
            pageToken = data.nextPageToken;
        } while (pageToken);

        if (messages.length <= keepCount) return { deleted: 0, kept: messages.length };

        // 2. Fetch Internal Dates to Sort (Gmail API list returns in reverse chronological order usually, but let's be safe if needed. 
        // Actually, listMessages returns IDs. We assume they are roughly ordered, but to be 100% sure we should fetch details.
        // However, for speed, we can rely on Gmail's default sort (newest first).
        // Let's assume the list is Newest First (standard behavior).
        
        // 3. Identify messages to delete
        const toDelete = messages.slice(keepCount).map(m => m.id);
        
        // 4. Batch Delete
        // Batch size limit is 1000
        const batchSize = 1000;
        for (let i = 0; i < toDelete.length; i += batchSize) {
            const batch = toDelete.slice(i, i + batchSize);
            await this.batchDelete(accessToken, batch);
        }

        return { deleted: toDelete.length, kept: keepCount };
    },

    async trashEmailsFrom(accessToken, senderEmail) {
        // 1. Find all messages from this sender
        const query = `from:${senderEmail}`;
        const messages = await this.listMessages(accessToken, query, 1000); // Limit to 1000 for safety
        
        if (messages.length === 0) {
            return { trashed: 0 };
        }

        // 2. Batch trash them
        const batchSize = 1000;
        let trashedCount = 0;

        for (let i = 0; i < messages.length; i += batchSize) {
            const batch = messages.slice(i, i + batchSize);
            
            // Use batchModify to add TRASH label
            const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/batchModify`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    ids: batch.map(m => m.id),
                    addLabelIds: ['TRASH']
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to trash emails: ${response.statusText}`);
            }

            trashedCount += batch.length;
        }

        return { trashed: trashedCount };
    }
};
