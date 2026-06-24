// Utility functions for the blog

/**
 * Debounce function to limit function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately
 * @returns {Function}
 */
function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

/**
 * Throttle function to limit function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function}
 */
function throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Format date to Korean format
 * @param {string|Date} dateInput - Date string or Date object
 * @returns {string} Formatted date string
 */
function formatDate(dateInput) {
    try {
        const date = new Date(dateInput);
        
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return dateInput; // Return original if invalid
        }
        
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        // If less than 7 days, show relative time
        if (diffDays === 0) {
            const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
            if (diffHours === 0) {
                const diffMinutes = Math.floor(diffTime / (1000 * 60));
                return diffMinutes <= 1 ? '방금 전' : `${diffMinutes}분 전`;
            }
            return `${diffHours}시간 전`;
        } else if (diffDays === 1) {
            return '어제';
        } else if (diffDays < 7) {
            return `${diffDays}일 전`;
        }
        
        // Otherwise show formatted date
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (error) {
        console.error('Date formatting error:', error);
        return dateInput;
    }
}

/**
 * Convert Google Drive URL to direct access URL with fallbacks
 * @param {string} url - Google Drive URL
 * @returns {string} Direct access URL
 */
function convertGoogleDriveUrl(url) {
    if (!url) return url;
    
    // Google Drive file ID 추출
    let fileId = null;
    
    // 다양한 Google Drive URL 패턴 지원
    const patterns = [
        /[?&]id=([a-zA-Z0-9_-]+)/,                    // ?id=FILE_ID 또는 &id=FILE_ID
        /\/file\/d\/([a-zA-Z0-9_-]+)/,                // /file/d/FILE_ID/
        /\/open\?id=([a-zA-Z0-9_-]+)/,                // /open?id=FILE_ID
        /drive\.google\.com.*\/([a-zA-Z0-9_-]+)/      // 기타 패턴
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            fileId = match[1];
            break;
        }
    }
    
    if (fileId) {
        // 여러 형식 시도를 위한 URL 반환 (첫 번째 형식)
        return `https://lh3.googleusercontent.com/d/${fileId}=s1600`;
    }
    
    // Google Drive URL이 아니거나 파일 ID를 찾을 수 없으면 원본 반환
    return url;
}

/**
 * Get fallback Google Drive URLs for error handling
 * @param {string} url - Original Google Drive URL
 * @returns {Array} Array of fallback URLs
 */
function getGoogleDriveFallbackUrls(url) {
    if (!url) return [];
    
    // Google Drive file ID 추출
    let fileId = null;
    const patterns = [
        /[?&]id=([a-zA-Z0-9_-]+)/,
        /\/file\/d\/([a-zA-Z0-9_-]+)/,
        /\/open\?id=([a-zA-Z0-9_-]+)/,
        /drive\.google\.com.*\/([a-zA-Z0-9_-]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            fileId = match[1];
            break;
        }
    }
    
    if (!fileId) return [];
    
    // 여러 형식의 URL 반환
    return [
        `https://lh3.googleusercontent.com/d/${fileId}=s1600`,
        `https://drive.google.com/uc?export=view&id=${fileId}`,
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
        `https://drive.google.com/file/d/${fileId}/view`
    ];
}

/**
 * Try fallback images when the current image fails to load
 * @param {HTMLImageElement} imgElement - The img element that failed to load
 */
function tryFallbackImage(imgElement) {
    try {
        const fallbackUrls = JSON.parse(imgElement.dataset.fallbackUrls || '[]');
        let currentIndex = parseInt(imgElement.dataset.currentIndex || '0');
        
        // 다음 fallback URL 시도
        currentIndex++;
        
        if (currentIndex < fallbackUrls.length) {
            imgElement.dataset.currentIndex = currentIndex.toString();
            imgElement.src = fallbackUrls[currentIndex];
        } else {
            // 모든 fallback URL 실패 시 에러 상태로 설정
            imgElement.parentElement.parentElement.classList.add('image-error');
            imgElement.style.display = 'none';
        }
    } catch (error) {
        console.error('Error in tryFallbackImage:', error);
        imgElement.parentElement.parentElement.classList.add('image-error');
        imgElement.style.display = 'none';
    }
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} html - HTML string to sanitize
 * @returns {string} Sanitized HTML
 */
function sanitizeHTML(html) {
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

/**
 * Create excerpt from HTML content
 * @param {string} html - HTML content
 * @param {number} maxLength - Maximum length of excerpt
 * @returns {string} Text excerpt
 */
function createExcerpt(html, maxLength = 150) {
    try {
        if (!html || typeof html !== 'string') {
            return '';
        }
        
        // Safely remove HTML tags using DOM parsing
        const div = document.createElement('div');
        // Use a copy to avoid modifying original content
        const htmlCopy = html.toString();
        div.innerHTML = htmlCopy;
        
        // Extract text content safely
        let text = '';
        try {
            text = div.textContent || div.innerText || '';
        } catch (e) {
            // Fallback: use regex to remove basic HTML tags
            text = htmlCopy.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
        }
        
        // Trim and truncate
        const trimmed = text.trim();
        if (trimmed.length <= maxLength) {
            return trimmed;
        }
        
        // Find last complete word within limit
        const truncated = trimmed.substring(0, maxLength);
        const lastSpace = truncated.lastIndexOf(' ');
        
        if (lastSpace > 0) {
            return truncated.substring(0, lastSpace) + '...';
        }
        
        return truncated + '...';
    } catch (error) {
        console.error('Excerpt creation error:', error);
        // Return a safe fallback
        if (typeof html === 'string' && html.length > 0) {
            return html.substring(0, Math.min(maxLength, html.length)) + '...';
        }
        return '';
    }
}

/**
 * Parse CSV data into array of objects
 * @param {string} csvText - CSV text data
 * @returns {Array} Array of objects
 */
function parseCSV(csvText) {
    try {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) return [];
        
        const headers = lines[0].split(',').map(header => {
            const trimmed = header.trim();
            // Only remove outer quotes, preserve inner quotes
            if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                return trimmed.slice(1, -1);
            }
            return trimmed;
        });
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = [];
            let current = '';
            let inQuotes = false;
            
            for (let j = 0; j < lines[i].length; j++) {
                const char = lines[i][j];
                
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    const trimmed = current.trim();
                    // Only remove outer quotes, preserve inner quotes
                    if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                        // Handle double-escaped quotes in CSV
                        const unquoted = trimmed.slice(1, -1);
                        const unescaped = unquoted.replace(/""/g, '"'); // Convert "" back to "
                        values.push(unescaped);
                    } else {
                        values.push(trimmed);
                    }
                    current = '';
                } else {
                    current += char;
                }
            }
            
            // Push the last value
            const trimmed = current.trim();
            if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
                // Handle double-escaped quotes in CSV
                const unquoted = trimmed.slice(1, -1);
                const unescaped = unquoted.replace(/""/g, '"'); // Convert "" back to "
                values.push(unescaped);
            } else {
                values.push(trimmed);
            }
            
            // Create object from headers and values
            const obj = {};
            headers.forEach((header, index) => {
                obj[header] = values[index] || '';
            });
            
            data.push(obj);
        }
        
        return data;
    } catch (error) {
        console.error('CSV parsing error:', error);
        return [];
    }
}

/**
 * Show toast notification
 * @param {string} message - Message to show
 * @param {string} type - Type of toast (success, error, info, warning)
 * @param {number} duration - Duration in milliseconds
 */
function showToast(message, type = 'info', duration = CONFIG.TOAST_DURATION) {
    const container = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = getToastIcon(type);
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-message">${message}</span>
    `;
    
    container.appendChild(toast);
    
    // Auto remove
    setTimeout(() => {
        if (toast.parentNode) {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
    
    // Click to dismiss
    toast.addEventListener('click', () => {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    });
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
}

function getToastIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

/**
 * Get or set cache data
 * @param {string} key - Cache key
 * @param {*} data - Data to cache (optional)
 * @param {number} duration - Cache duration in milliseconds
 * @returns {*} Cached data or null
 */
function cache(key, data = null, duration = CONFIG.CACHE_DURATION) {
    try {
        if (data !== null) {
            // Set cache
            const cacheData = {
                data: data,
                timestamp: Date.now(),
                duration: duration
            };
            localStorage.setItem(key, JSON.stringify(cacheData));
            return data;
        } else {
            // Get cache
            const cached = localStorage.getItem(key);
            if (!cached) return null;
            
            const cacheData = JSON.parse(cached);
            const now = Date.now();
            
            if (now - cacheData.timestamp > cacheData.duration) {
                localStorage.removeItem(key);
                return null;
            }
            
            return cacheData.data;
        }
    } catch (error) {
        console.error('Cache error:', error);
        return null;
    }
}

/**
 * Clear all cache
 */
function clearCache() {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.includes('blog_') || key.includes('cache')) {
                localStorage.removeItem(key);
            }
        });
        showToast('캐시가 삭제되었습니다', 'success');
    } catch (error) {
        console.error('Cache clear error:', error);
        showToast('캐시 삭제 중 오류가 발생했습니다', 'error');
    }
}

/**
 * Get URL parameters
 * @param {string} param - Parameter name
 * @returns {string|null} Parameter value
 */
function getUrlParameter(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Set URL parameter without page reload
 * @param {string} param - Parameter name
 * @param {string} value - Parameter value
 */
function setUrlParameter(param, value) {
    const url = new URL(window.location);
    if (value) {
        url.searchParams.set(param, value);
    } else {
        url.searchParams.delete(param);
    }
    window.history.replaceState({}, '', url);
}

/**
 * Scroll to element smoothly
 * @param {string|Element} element - Element selector or element
 * @param {number} offset - Offset from top
 */
function scrollToElement(element, offset = 80) {
    try {
        const target = typeof element === 'string' ? document.querySelector(element) : element;
        if (!target) return;
        
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - offset;
        
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    } catch (error) {
        console.error('Scroll error:', error);
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            return success;
        }
    } catch (error) {
        console.error('Clipboard error:', error);
        return false;
    }
}

/**
 * Load external script dynamically
 * @param {string} src - Script source URL
 * @returns {Promise} Promise that resolves when script loads
 */
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * Initialize utilities
 */
function initUtils() {
    // Utilities initialized
}

// Auto-initialize on DOM ready
if (typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUtils);
    } else {
        initUtils();
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.Utils = {
        debounce,
        throttle,
        formatDate,
        sanitizeHTML,
        createExcerpt,
        parseCSV,
        showToast,
        cache,
        clearCache,
        getUrlParameter,
        setUrlParameter,
        scrollToElement,
        copyToClipboard,
        loadScript,
        convertGoogleDriveUrl,
        getGoogleDriveFallbackUrls,
        tryFallbackImage
    };
}

// Export functions globally for HTML onerror handlers
if (typeof window !== 'undefined') {
    window.tryFallbackImage = tryFallbackImage;
    window.convertGoogleDriveUrl = convertGoogleDriveUrl;
    window.getGoogleDriveFallbackUrls = getGoogleDriveFallbackUrls;
}