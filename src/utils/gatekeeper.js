import { PROVIDERS } from './adapters/types';

export const checkAccess = async (provider) => {
    // 1. Fetch User Status (Mock for now - in real app, check chrome.storage)
    // We'll try to read from localStorage first (synced with AuthContext)
    let isPremium = false;
    try {
        // In a real extension, we'd use chrome.storage.local
        // For this mock, we'll assume the AuthContext updates localStorage or we pass it in.
        // However, since this is a utility function, we might need to rely on a passed argument 
        // or a global state if not using chrome.storage. 
        // For now, let's assume we can read a simple flag set by the App.
        isPremium = localStorage.getItem('inbox-cleaner-is-premium') === 'true';
    } catch (e) {
        console.warn("Failed to check premium status", e);
    }

    // 2. Provider Check
    if (provider !== PROVIDERS.GMAIL && !isPremium) {
        throw new Error("PREMIUM_PROVIDER_LOCKED");
    }

    // 3. Define Limits
    return {
        isPremium,
        // Free users: Quick Scan shows 3 unlocked items, rest locked.
        // Premium users: Unlimited.
        unlockLimit: isPremium ? Infinity : 3,
        // Free users cannot perform deep scans (pagination)
        canDeepScan: isPremium
    };
};
