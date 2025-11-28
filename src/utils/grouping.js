
/**
 * Groups items (emails/history) by Company based on Root Domain.
 * 
 * @param {Array} items - Array of items to group. Each item must have 'email' and 'senderName' (or 'sender_email', 'sender_name').
 * @returns {Array} - Array of group objects.
 */
export const groupItems = (items) => {
    const companyGroups = new Map();
    
    // Generic domains that shouldn't be grouped by domain
    const GENERIC_DOMAINS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'protonmail.com'];

    items.forEach((item) => {
        // Normalize fields (handle both scan results and history items)
        const email = item.email || item.sender_email || "unknown@email.com";
        const name = item.senderName || item.sender_name || "Unknown";
        const count = item.count || 1;
        const score = item.score || 0;
        const id = item.id; // Message ID or History ID

        const fullDomain = email.split('@')[1]?.toLowerCase();
        let companyName = name;
        let groupId = email; // Default to individual email if generic

        if (fullDomain && !GENERIC_DOMAINS.includes(fullDomain) && email !== "unknown@email.com") {
            // Extract Root Domain (e.g., "send.zapier.com" -> "zapier.com")
            const parts = fullDomain.split('.');
            const rootDomain = parts.length > 2 ? parts.slice(-2).join('.') : fullDomain;
            
            // Use root domain as group ID
            groupId = rootDomain;
            
            // Derive company name from root domain (e.g., "zapier.com" -> "Zapier")
            const namePart = rootDomain.split('.')[0];
            companyName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
        } else if (email === "unknown@email.com") {
            // If email is unknown, group by Sender Name instead
            groupId = name;
            companyName = name;
        }

        if (!companyGroups.has(groupId)) {
            companyGroups.set(groupId, {
                id: groupId,
                name: companyName,
                domain: groupId.includes('.') ? groupId : null,
                count: 0,
                score: 0,
                senders: []
            });
        }

        const group = companyGroups.get(groupId);
        
        // Check if sender already exists in group
        let existingSender = group.senders.find(s => s.email === email && s.senderName === name);
        if (existingSender) {
            existingSender.count += count;
            existingSender.ids = [...(existingSender.ids || []), ...(item.ids || [id])];
        } else {
            group.senders.push({
                senderName: name,
                email: email,
                count: count,
                ids: item.ids || [id],
                originalItem: item // Keep reference to original item (useful for history actions)
            });
        }

        group.count += count;
        group.score = Math.max(group.score, score);
    });

    return Array.from(companyGroups.values())
        .sort((a, b) => b.score - a.score)
        .sort((a, b) => b.count - a.count);
};
