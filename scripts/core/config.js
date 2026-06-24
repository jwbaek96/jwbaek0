// Configuration file for Google Sheets Blog
// Runtime config is loaded from local JSON files instead of external config services.

const CONFIG = {
    // API URLs
    APPS_SCRIPT_URL: null,
    UPLOAD_API_URL: null,

    // Google Sheets (public sheet)
    GOOGLE_SHEET_ID: '1X9uL2ZmuaHTc4kl8Z6C63fJ8lb99_LDP4CVqSoP2FqY',
    GOOGLE_SHEET_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRXRuG3cRUqGABTludaX-ddVgqUCsfJ0EV37n3IifaAbREUxSqa4rJYp64evCH15v9hC8O-YSNMtPMc/pub?output=csv',

    // Google Drive settings
    GOOGLE_DRIVE_FOLDER_ID: null,
    GOOGLE_DRIVE_API_KEY: null,
    GOOGLE_API_KEY: null,
    GOOGLE_CLIENT_ID: null,

    // Blog settings
    BLOG_TITLE: 'JW.BAEK - Blog',
    BLOG_DESCRIPTION: 'JW.BAEK의 블로그 - 창작 과정과 예술적 탐구를 공유합니다.',
    BLOG_AUTHOR: 'Your Name',
    BLOG_URL: 'https://jwbaek.kr/',

    // Development settings
    DEV_MODE: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1',
    DEV_PORT: 5500,

    // Pagination
    POSTS_PER_PAGE: 10,

    // Cache settings
    CACHE_DURATION: 1 * 60 * 1000,
    CACHE_KEY: 'blog_posts_cache',

    // Upload settings
    MAX_FILE_SIZE: Infinity,
    MAX_IMAGE_SIZE: Infinity,
    MAX_VIDEO_SIZE: Infinity,
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'],
    IMAGE_MAX_WIDTH: 1920,
    IMAGE_QUALITY: 0.85,

    // Google Drive upload settings
    DRIVE_FOLDER_STRUCTURE: {
        ROOT_FOLDER: 'Blog Data',
        USE_DATE_FOLDERS: true,
        THUMBNAIL_FOLDER: 'thumbnails',
        TEMP_FOLDER: 'temp'
    },

    // OAuth scopes for Google Drive
    GOOGLE_DRIVE_API_SCOPE: 'https://www.googleapis.com/auth/drive.file',
    GOOGLE_SCOPES: ['https://www.googleapis.com/auth/drive.file'],

    // UI settings
    TOAST_DURATION: 3000,
    LOADING_DELAY: 500,

    // Feature flags
    FEATURES: {
        DARK_MODE: true,
        COMMENTS: true,
        SEARCH: true,
        ANALYTICS: false
    },

    // Comments (Utterances)
    UTTERANCES: {
        REPO: 'jwbaek96/blog1',
        ISSUE_TERM: 'pathname',
        THEME: 'github-light',
        LABEL: 'comment'
    },

    // Social links
    SOCIAL_LINKS: {
        github: '',
        twitter: '',
        linkedin: '',
        email: ''
    }
};

let runtimeConfig = {};
let runtimeConfigLoaded = false;
let runtimeConfigLoading = false;

function getConfigCandidates() {
    return [
        '../config.local.json',
        'config.local.json',
        '/config.local.json',
        '../config.json',
        'config.json',
        '/config.json'
    ];
}

async function fetchConfigFromCandidates() {
    const candidates = getConfigCandidates();

    for (const path of candidates) {
        try {
            const response = await fetch(`${path}?t=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) {
                continue;
            }

            const json = await response.json();
            return json || {};
        } catch (_error) {
            // Ignore candidate errors and continue.
        }
    }

    return {};
}

function applyRuntimeConfig(input) {
    const cfg = input || {};

    runtimeConfig = { ...cfg };

    // URL aliases
    CONFIG.APPS_SCRIPT_URL = cfg.GOOGLE_APPS_SCRIPT_URL || cfg.APPS_SCRIPT_URL || CONFIG.APPS_SCRIPT_URL;
    CONFIG.UPLOAD_API_URL = cfg.UPLOAD_API_URL || cfg.GOOGLE_APPS_SCRIPT_URL || cfg.APPS_SCRIPT_URL || CONFIG.UPLOAD_API_URL;

    // Drive settings
    CONFIG.GOOGLE_DRIVE_FOLDER_ID = cfg.GOOGLE_DRIVE_FOLDER_ID || CONFIG.GOOGLE_DRIVE_FOLDER_ID;
    CONFIG.GOOGLE_DRIVE_API_KEY = cfg.GOOGLE_DRIVE_API_KEY || CONFIG.GOOGLE_DRIVE_API_KEY;
    CONFIG.GOOGLE_API_KEY = cfg.GOOGLE_API_KEY || cfg.GOOGLE_DRIVE_API_KEY || CONFIG.GOOGLE_API_KEY;
    CONFIG.GOOGLE_CLIENT_ID = cfg.GOOGLE_CLIENT_ID || CONFIG.GOOGLE_CLIENT_ID;
}

function validateConfig() {
    const missing = [];

    if (!CONFIG.APPS_SCRIPT_URL) {
        missing.push('APPS_SCRIPT_URL');
    }

    if (missing.length > 0) {
        console.warn('Configuration not fully set:', missing);
        return false;
    }

    return true;
}

async function loadRuntimeConfig() {
    if (runtimeConfigLoaded) {
        return runtimeConfig;
    }

    if (runtimeConfigLoading) {
        while (runtimeConfigLoading) {
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return runtimeConfig;
    }

    runtimeConfigLoading = true;

    try {
        const loaded = await fetchConfigFromCandidates();
        applyRuntimeConfig(loaded);
        runtimeConfigLoaded = true;
        return runtimeConfig;
    } finally {
        runtimeConfigLoading = false;
    }
}

async function initializeConfig() {
    try {
        await loadRuntimeConfig();
    } catch (error) {
        console.error('Failed to load runtime config:', error);
    }

    validateConfig();

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('configLoaded', { detail: CONFIG }));
    }
}

window.getConfig = async (key) => {
    await loadRuntimeConfig();

    if (key === 'GOOGLE_APPS_SCRIPT_URL') {
        return CONFIG.APPS_SCRIPT_URL;
    }
    if (Object.prototype.hasOwnProperty.call(runtimeConfig, key)) {
        return runtimeConfig[key];
    }

    return CONFIG[key];
};

window.getAllConfig = async () => {
    await loadRuntimeConfig();
    return { ...runtimeConfig, ...CONFIG };
};

window.refreshConfig = async () => {
    runtimeConfigLoaded = false;
    runtimeConfig = {};
    await loadRuntimeConfig();
    return { ...runtimeConfig, ...CONFIG };
};

if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeConfig);
    } else {
        setTimeout(initializeConfig, 0);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG };
}
