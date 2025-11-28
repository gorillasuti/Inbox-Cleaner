
/**
 * Custom storage adapter for Supabase to work with Chrome Extension storage.
 * Supabase expects a synchronous-like interface for some operations, but Chrome storage is async.
 * However, supabase-js v2 supports async storage adapters.
 */
export const ChromeStorageAdapter = {
    getItem: async (key) => {
        return new Promise((resolve) => {
            chrome.storage.local.get([key], (result) => {
                resolve(result[key] || null);
            });
        });
    },
    setItem: async (key, value) => {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [key]: value }, () => {
                resolve();
            });
        });
    },
    removeItem: async (key) => {
        return new Promise((resolve) => {
            chrome.storage.local.remove([key], () => {
                resolve();
            });
        });
    }
};
