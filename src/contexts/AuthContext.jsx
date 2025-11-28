import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isPremium, setIsPremium] = useState(false);
    const [loading, setLoading] = useState(true);
    const [lastPremiumCheck, setLastPremiumCheck] = useState(0);

    const checkPremiumStatus = async (user) => {
        // Debounce: Don't check if we checked less than 2 seconds ago
        const now = Date.now();
        if (now - lastPremiumCheck < 2000) {
            console.log("[AuthContext] Skipping premium check (debounced)");
            return;
        }
        setLastPremiumCheck(now);
        
        console.log("[AuthContext] Checking premium status for user:", user?.id);
        if (!user) {
            console.log("[AuthContext] No user, setting premium to false");
            setIsPremium(false);
            return;
        }

        // 1. Check local override first (fastest)
        try {
            const result = await new Promise((resolve, reject) => {
                try {
                    chrome.storage.local.get(['inbox-cleaner-is-premium'], (res) => {
                        if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
                        else resolve(res);
                    });
                } catch (e) {
                    reject(e);
                }
            });
            console.log("[AuthContext] Local storage premium override:", result);
            if (result['inbox-cleaner-is-premium'] === 'true') {
                setIsPremium(true);
            }
        } catch (error) {
            if (error.message && error.message.includes("Extension context invalidated")) {
                console.warn("[AuthContext] Extension context invalidated, suppressing error.");
                return; // Stop execution if context is invalid
            }
            console.error("[AuthContext] Storage check failed:", error);
        }

        // 2. Verify with Supabase (authoritative)
        try {
            console.log("[AuthContext] Querying Supabase profiles for id:", user.id);
            let profile, error;
            
            // Try fetching with new column first
            try {
                const result = await supabase
                    .from('profiles')
                    .select('subscription_status, has_seen_welcome, has_seen_onboarding, subscription_end_date, cancel_at_period_end, has_been_premium')
                    .eq('id', user.id)
                    .single();
                
                profile = result.data;
                error = result.error;
            } catch (e) {
                // Unexpected error
                console.error("[AuthContext] Unexpected fetch error:", e);
                error = e;
            }

            // If column doesn't exist (migration not run), retry without it
            if (error && error.code === '42703') { // Undefined column
                console.warn("[AuthContext] 'has_seen_onboarding' column missing. Retrying with legacy query...");
                const retryResult = await supabase
                    .from('profiles')
                    .select('subscription_status, has_seen_welcome, subscription_end_date, cancel_at_period_end, has_been_premium')
                    .eq('id', user.id)
                    .single();
                
                profile = retryResult.data;
                error = retryResult.error;
                
                // Set default for missing column
                if (profile) {
                    profile.has_seen_onboarding = false;
                }
            }

            console.log("[AuthContext] Supabase profile result:", JSON.stringify({ profile, error }, null, 2));

            if (profile && (profile.subscription_status === 'active' || profile.subscription_status === 'trialing')) {
                console.log("[AuthContext] User IS premium based on profile status:", profile.subscription_status);
                setIsPremium(true);
                chrome.storage.local.set({ 'inbox-cleaner-is-premium': 'true' });
                
                // Store welcome status and dates in user object for UI to read
                user.has_seen_welcome = profile.has_seen_welcome;
                user.has_seen_onboarding = profile.has_seen_onboarding;
                user.subscription_end_date = profile.subscription_end_date;
                user.cancel_at_period_end = profile.cancel_at_period_end;
                user.has_been_premium = profile.has_been_premium;
                
                setUser(prev => ({ 
                    ...prev, 
                    has_seen_welcome: profile.has_seen_welcome,
                    has_seen_onboarding: profile.has_seen_onboarding,
                    subscription_end_date: profile.subscription_end_date,
                    cancel_at_period_end: profile.cancel_at_period_end,
                    has_been_premium: profile.has_been_premium
                }));
            } else {
                console.log("[AuthContext] User is NOT premium. Status:", profile?.subscription_status);
                if (!error && profile) {
                    setIsPremium(false);
                    chrome.storage.local.remove(['inbox-cleaner-is-premium']);
                    
                    // Sync profile data for free users too
                    user.has_seen_welcome = profile.has_seen_welcome;
                    user.has_seen_onboarding = profile.has_seen_onboarding;
                    user.has_been_premium = profile.has_been_premium;
                    
                    setUser(prev => ({ 
                        ...prev, 
                        has_seen_welcome: profile.has_seen_welcome,
                        has_seen_onboarding: profile.has_seen_onboarding,
                        has_been_premium: profile.has_been_premium
                    }));
                } else if (error && error.code === 'PGRST116') {
                    // PGRST116: JSON object requested, multiple (or no) rows returned
                    // This often means "no rows returned" when using .single()
                    console.warn("[AuthContext] Profile missing for user (Zombie User). Recreating...");
                    
                    // Attempt to insert a default profile
                    const { error: insertError } = await supabase
                        .from('profiles')
                        .insert({
                            id: user.id,
                            email: user.email,
                            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                            subscription_status: 'free'
                        });
                    
                    if (insertError) {
                        console.error("[AuthContext] Failed to recreate profile:", insertError);
                    } else {
                        console.log("[AuthContext] Profile recreated successfully.");
                        // Retry check
                        checkPremiumStatus(user);
                    }
                } else {
                    console.error("[AuthContext] Error fetching profile:", JSON.stringify(error, null, 2));
                }
            }
        } catch (err) {
            console.error("[AuthContext] Failed to check premium status:", err);
        }
    };

    // Helper to parse session from storage
    const loadSessionFromStorage = async () => {
        // Dynamically get project ref from URL
        // URL format: https://<project-ref>.supabase.co
        let projectRef = 'unknown';
        try {
            // We need to import SUPABASE_URL, but imports are static.
            // We'll rely on the fact that if the user hasn't set it up, auth won't work anyway.
            // But to find the key, we can search for it.
            const all = await chrome.storage.local.get(null);
            const authKey = Object.keys(all).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));

            if (authKey) {
                console.log("[AuthContext] Found auth key:", authKey);
                const sessionStr = all[authKey];
                if (sessionStr) {
                    try {
                        const session = JSON.parse(sessionStr);
                        if (session && session.user) {
                            console.log("[AuthContext] User found:", session.user.email);
                            
                            // CRITICAL: Initialize Supabase client with the session so RLS works
                            if (session.access_token && session.refresh_token) {
                                await supabase.auth.setSession({
                                    access_token: session.access_token,
                                    refresh_token: session.refresh_token
                                });
                            }

                            setUser(session.user);
                            checkPremiumStatus(session.user);
                        } else {
                            setUser(null);
                            setIsPremium(false);
                        }
                    } catch (e) {
                        console.error("[AuthContext] Failed to parse session", e);
                        setUser(null);
                    }
                }
            } else {
                console.log("[AuthContext] No auth session found in storage.");
                setUser(null);
                setIsPremium(false);
            }
        } catch (e) {
            console.error("[AuthContext] Storage error:", e);
        }
        setLoading(false);
    };

    useEffect(() => {
        // Initial session load
        loadSessionFromStorage();

        // Listen for auth changes from Supabase
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("[AuthContext] Auth state change:", event);
            
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                if (session) {
                    setUser(session.user);
                    checkPremiumStatus(session.user);
                    
                    // Save provider token if present (usually only on SIGNED_IN)
                    if (session.provider_token) {
                        chrome.storage.local.set({ google_provider_token: session.provider_token });
                    }
                }
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
                setIsPremium(false);
                // setHistory([]); // If history state exists
                chrome.storage.local.remove(['inbox-cleaner-is-premium', 'google_provider_token']);
            }
        });

        const handleStorageChange = async (changes, area) => {
            if (area === 'local') {
                // Check if any key looks like an auth token
                const authKey = Object.keys(changes).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));

                // If auth token changed, reload session ONLY if it's different from current
                if (authKey) {
                    const newValue = changes[authKey].newValue;
                    const oldValue = changes[authKey].oldValue;
                    
                    // If it's a new value (not a deletion)
                    if (newValue) {
                        try {
                            const { data } = await supabase.auth.getSession();
                            const currentToken = data?.session?.access_token;
                            
                            // Parse the new value from storage
                            const newSession = JSON.parse(newValue);
                            const newToken = newSession?.access_token;

                            // BREAK THE LOOP: Only update if tokens are different
                            if (currentToken !== newToken) {
                                console.log("[AuthContext] Auth token changed in storage, reloading session...");
                                loadSessionFromStorage();
                            } else {
                                console.log("[AuthContext] Auth token update ignored (same token).");
                            }
                        } catch (e) {
                            console.error("[AuthContext] Error checking token equality:", e);
                        }
                    } else if (!newValue && oldValue) {
                        // Token removed (logout)
                        console.log("[AuthContext] Auth token removed from storage, logging out...");
                        setUser(null);
                        setIsPremium(false);
                    }
                }

                if (changes['inbox-cleaner-is-premium']) {
                    setIsPremium(changes['inbox-cleaner-is-premium'].newValue === 'true');
                }
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    useEffect(() => {
        // Realtime Subscription for Premium Status
        const channel = supabase
            .channel('public:profiles')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, (payload) => {
                console.log('[AuthContext] Profile update received:', payload);
                if (user && payload.new.id === user.id) {
                    const isNowPremium = payload.new.subscription_status === 'active' || payload.new.subscription_status === 'trialing';
                    setIsPremium(isNowPremium);
                    
                    // Update user object with new details ONLY if changed
                    setUser(prev => {
                        if (
                            prev.has_seen_welcome === payload.new.has_seen_welcome &&
                            prev.subscription_end_date === payload.new.subscription_end_date &&
                            prev.cancel_at_period_end === payload.new.cancel_at_period_end &&
                            prev.has_been_premium === payload.new.has_been_premium &&
                            prev.subscription_status === payload.new.subscription_status
                        ) {
                            return prev;
                        }
                        return {
                            ...prev,
                            has_seen_welcome: payload.new.has_seen_welcome,
                            subscription_end_date: payload.new.subscription_end_date,
                            cancel_at_period_end: payload.new.cancel_at_period_end,
                            has_been_premium: payload.new.has_been_premium,
                            subscription_status: payload.new.subscription_status
                        };
                    });

                    if (isNowPremium) {
                        chrome.storage.local.set({ 'inbox-cleaner-is-premium': 'true' });
                    } else {
                        chrome.storage.local.remove(['inbox-cleaner-is-premium']);
                    }
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    // Manual refresh helper
    const refreshProfile = async () => {
        if (user) await checkPremiumStatus(user);
    };

    const upgradeToPremium = async () => {
        try {
            console.log("[AuthContext] Creating checkout session...");

            // Manually get session to avoid Supabase SDK "Extension context invalidated" issues
            let accessToken = null;
            
            // 1. Try Supabase SDK first (if it works)
            try {
                const { data } = await supabase.auth.getSession();
                if (data?.session) {
                    accessToken = data.session.access_token;
                }
            } catch (err) {
                console.warn("[AuthContext] Supabase SDK getSession failed, trying manual storage:", err);
            }

            // 2. Fallback to manual storage read
            if (!accessToken) {
                const all = await chrome.storage.local.get(null);
                const authKey = Object.keys(all).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
                if (authKey && all[authKey]) {
                    try {
                        const session = JSON.parse(all[authKey]);
                        accessToken = session.access_token;
                    } catch (e) {
                        console.error("[AuthContext] Failed to parse stored session:", e);
                    }
                }
            }

            if (!accessToken) throw new Error("Not authenticated (No token found)");

            // TODO: Replace with your actual Vercel deployment URL in production
            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            console.log("[AuthContext] API_URL:", API_URL);
            
            // Send message to background script to perform the fetch (bypassing CSP)
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'CREATE_CHECKOUT_SESSION',
                    apiUrl: API_URL,
                    accessToken: accessToken,
                    priceId: 'price_1SXUMCRVsfT7jfFtdvtBo8mg'
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (response.error) {
                        reject(new Error(response.error));
                    } else {
                        resolve(response.data);
                    }
                });
            });

            if (response.url) {
                // Open Stripe Checkout
                window.open(response.url, '_blank');
            } else {
                console.error("[AuthContext] No checkout URL returned");
                throw new Error("No checkout URL returned");
            }
        } catch (e) {
            console.error("[AuthContext] Failed to start checkout:", e);
            throw e; // Re-throw to handle in UI
        }
    };

    const createPortalSession = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) throw new Error("Not authenticated");

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'CREATE_PORTAL_SESSION',
                    apiUrl: API_URL,
                    accessToken: accessToken,
                    returnUrl: window.location.href
                }, (response) => {
                    if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                    else if (response.error) reject(new Error(response.error));
                    else resolve(response.data);
                });
            });

            if (response.url) {
                window.open(response.url, '_blank');
            }
        } catch (error) {
            console.error("Portal session failed:", error);
            throw error;
        }
    };

    const cancelSubscription = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) throw new Error("Not authenticated");

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            console.log("[AuthContext] Requesting cancellation via API:", API_URL);

            const result = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'CANCEL_SUBSCRIPTION',
                    apiUrl: API_URL,
                    accessToken: accessToken
                }, (response) => {
                    console.log("[AuthContext] Cancellation response from background:", JSON.stringify(response, null, 2));
                    if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                    else if (response.error) reject(new Error(response.error));
                    else resolve(response.data);
                });
            });

            console.log("[AuthContext] Cancellation successful, result:", JSON.stringify(result, null, 2));

            // Optimistic update
            setUser(prev => ({ ...prev, cancel_at_period_end: true }));
        } catch (error) {
            console.error("Cancellation failed:", error);
            throw error;
        }
    };

    const resumeSubscription = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            if (!accessToken) throw new Error("Not authenticated");

            const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            console.log("[AuthContext] Requesting resume via API:", API_URL);

            const result = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'RESUME_SUBSCRIPTION',
                    apiUrl: API_URL,
                    accessToken: accessToken
                }, (response) => {
                    console.log("[AuthContext] Resume response from background:", JSON.stringify(response, null, 2));
                    if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
                    else if (response.error) reject(new Error(response.error));
                    else resolve(response.data);
                });
            });

            console.log("[AuthContext] Resume successful, result:", JSON.stringify(result, null, 2));

            // Optimistic update
            setUser(prev => ({ ...prev, cancel_at_period_end: false }));
        } catch (error) {
            console.error("Resume failed:", error);
            throw error;
        }
    };

    const markWelcomeAsSeen = async () => {
        if (!user) return;
        try {
            await supabase
                .from('profiles')
                .update({ has_seen_welcome: true })
                .eq('id', user.id);
            
            setUser({ ...user, has_seen_welcome: true });
        } catch (error) {
            console.error("Failed to mark welcome as seen:", error);
        }
    };

    const markOnboardingAsSeen = async () => {
        if (!user) return;
        try {
            await supabase
                .from('profiles')
                .update({ has_seen_onboarding: true })
                .eq('id', user.id);
            
            console.log("[AuthContext] Marked onboarding as seen");
        } catch (error) {
            console.error("Failed to mark onboarding as seen:", error);
        }
    };

    const [history, setHistory] = useState([]);

    useEffect(() => {
        if (user) {
            fetchHistory();
        } else {
            setHistory([]);
        }
    }, [user]);

    const fetchHistory = async () => {
        if (!user) return;
        console.log("[AuthContext] Fetching history for user:", user.id);
        const { data, error } = await supabase
            .from('unsubscribed_history')
            .select('*')
            .eq('user_id', user.id)
            .order('unsubscribed_at', { ascending: false });
        
        if (error) {
            console.error("[AuthContext] Failed to fetch history:", error);
            return;
        }

        if (data) {
            console.log(`[AuthContext] Loaded ${data.length} history items`);
            setHistory(data);
        }
    };

    const addToHistory = async (senderName, senderEmail, method) => {
        if (!user) return;
        
        console.log(`[AuthContext] Adding to history: ${senderName} (${method})`);

        // Optimistic update
        const newItem = {
            id: crypto.randomUUID(), // Temporary ID
            user_id: user.id,
            sender_name: senderName,
            sender_email: senderEmail,
            method: method,
            unsubscribed_at: new Date().toISOString()
        };
        setHistory(prev => [newItem, ...prev]);

        try {
            const { data, error } = await supabase
                .from('unsubscribed_history')
                .insert({
                    user_id: user.id,
                    sender_name: senderName,
                    sender_email: senderEmail,
                    method: method
                })
                .select()
                .single();
            
            if (error) {
                console.error("[AuthContext] Supabase insert error:", error);
                throw error;
            }

            if (data) {
                console.log("[AuthContext] History item persisted:", data.id);
                // Replace temp item with real one
                setHistory(prev => prev.map(item => item.id === newItem.id ? data : item));
            }
        } catch (error) {
            console.error("[AuthContext] Failed to add to history (exception):", error);
            // Revert on error
            setHistory(prev => prev.filter(item => item.id !== newItem.id));
        }
    };

    const addBatchToHistory = async (items) => {
        if (!user || !items || items.length === 0) return;

        console.log(`[AuthContext] Adding batch to history: ${items.length} items`);

        // Optimistic update
        const newItems = items.map(item => ({
            id: crypto.randomUUID(), // Temporary ID
            user_id: user.id,
            sender_name: item.senderName,
            sender_email: item.senderEmail,
            method: item.method,
            unsubscribed_at: new Date().toISOString()
        }));
        
        setHistory(prev => [...newItems, ...prev]);

        try {
            const dbItems = items.map(item => ({
                user_id: user.id,
                sender_name: item.senderName,
                sender_email: item.senderEmail,
                method: item.method
            }));

            const { data, error } = await supabase
                .from('unsubscribed_history')
                .insert(dbItems)
                .select();
            
            if (error) {
                console.error("[AuthContext] Supabase batch insert error:", error);
                throw error;
            }

            if (data) {
                console.log(`[AuthContext] Batch persisted: ${data.length} items`);
                // Replace temp items with real ones
                const tempIds = new Set(newItems.map(i => i.id));
                setHistory(prev => {
                    const withoutTemps = prev.filter(i => !tempIds.has(i.id));
                    return [...data, ...withoutTemps];
                });
            }
        } catch (error) {
            console.error("[AuthContext] Failed to add batch to history:", error);
            // Revert on error
            const tempIds = new Set(newItems.map(i => i.id));
            setHistory(prev => prev.filter(item => !tempIds.has(item.id)));
        }
    };


    const removeFromHistory = async (id) => {
        if (!user) return;

        // Optimistic update
        setHistory(prev => prev.filter(item => item.id !== id));

        try {
            await supabase
                .from('unsubscribed_history')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);
        } catch (error) {
            console.error("Failed to remove from history:", error);
            fetchHistory();
        }
    };

    const clearHistory = async () => {
        if (!user) return;

        // Optimistic update
        setHistory([]);

        try {
            await supabase
                .from('unsubscribed_history')
                .delete()
                .eq('user_id', user.id);
        } catch (error) {
            console.error("Failed to clear history:", error);
            fetchHistory();
        }
    };

    const login = async (email, password) => {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'SUPABASE_LOGIN', email, password }, (response) => {
                if (response && response.error) reject(new Error(response.error));
                else {
                    // Immediate state update
                    if (response?.data?.user) {
                        setUser(response.data.user);
                        checkPremiumStatus(response.data.user);
                    }
                    // CRITICAL: Set session in local Supabase client
                    if (response?.data?.session) {
                        supabase.auth.setSession(response.data.session);
                    }
                    resolve(response?.data);
                }
            });
        });
    };

    const loginWithGoogle = async () => {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'SUPABASE_OAUTH_GOOGLE' }, async (response) => {
                if (response && response.error) reject(new Error(response.error));
                else if (response?.data?.redirectUrl) {
                    // Parse the URL to get the access_token and refresh_token
                    try {
                        const url = new URL(response.data.redirectUrl);
                        const params = new URLSearchParams(url.hash.substring(1)); // Remove the '#'
                        const access_token = params.get('access_token');
                        const refresh_token = params.get('refresh_token');
                        const provider_token = params.get('provider_token');

                        if (provider_token) {
                            console.log("[AuthContext] Captured provider token");
                            chrome.storage.local.set({ 'google_provider_token': provider_token });
                        }

                        if (access_token && refresh_token) {
                            // Set the session in Supabase (via background to ensure persistence matches)
                            chrome.runtime.sendMessage({
                                action: 'SUPABASE_SET_SESSION',
                                access_token,
                                refresh_token
                            }, (sessionResponse) => {
                                if (sessionResponse?.error) {
                                    reject(new Error(sessionResponse.error));
                                } else if (sessionResponse?.data?.user) {
                                    setUser(sessionResponse.data.user);
                                    checkPremiumStatus(sessionResponse.data.user);
                                    resolve(sessionResponse.data);
                                } else {
                                    reject(new Error("Failed to set session"));
                                }
                            });
                        } else {
                            reject(new Error("No tokens found in redirect URL"));
                        }
                    } catch (e) {
                        console.error("Error parsing OAuth response:", e);
                        reject(e);
                    }
                } else {
                    reject(new Error("Invalid response from background script"));
                }
            });
        });
    };

    const register = async (email, password, fullName) => {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'SUPABASE_SIGNUP', email, password, fullName }, (response) => {
                if (response && response.error) reject(new Error(response.error));
                else {
                    // Immediate state update
                    if (response?.data?.user) {
                        setUser(response.data.user);
                        checkPremiumStatus(response.data.user);
                    }
                    // CRITICAL: Set session in local Supabase client
                    if (response?.data?.session) {
                        supabase.auth.setSession(response.data.session);
                    }
                    resolve(response?.data);
                }
            });
        });
    };

    const submitBugReport = async (type, description, metadata) => {
        if (!user) throw new Error("Must be logged in to report bugs");
        
        const { error } = await supabase
            .from('bug_reports')
            .insert({
                user_id: user.id,
                type,
                description,
                metadata
            });

        if (error) throw error;
    };

    const logout = async () => {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({ action: 'SUPABASE_LOGOUT' }, (response) => {
                if (response && response.error) reject(new Error(response.error));
                else {
                    setUser(null);
                    setIsPremium(false);
                    chrome.storage.local.remove(['inbox-cleaner-is-premium']); // Clear local override
                    resolve();
                }
            });
        });
    };

    const deleteAccount = async () => {
        if (!user) return;
        try {
            const { error } = await supabase.rpc('delete_own_user');
            if (error) throw error;
            // We do NOT logout here anymore. The UI will handle the success state and then call logout.
        } catch (error) {
            console.error("Failed to delete account:", error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider value={{ 
            user, isPremium, login, loginWithGoogle, register, logout, 
            upgradeToPremium, checkPremiumStatus, loading, refreshProfile,
            createPortalSession,
        cancelSubscription,
        resumeSubscription,
        markWelcomeAsSeen,
        markOnboardingAsSeen,
        submitBugReport,
        addToHistory, addBatchToHistory, removeFromHistory, clearHistory, history,
        deleteAccount
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
