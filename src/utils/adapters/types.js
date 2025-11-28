export const PROVIDERS = {
    GMAIL: 'mail.google.com',
    OUTLOOK: 'outlook.live.com',
    YAHOO: 'mail.yahoo.com'
};

export const getCurrentProvider = () => window.location.hostname;
