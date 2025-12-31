/* =============================================================================
   XENTAURI PI SCREEN - Utility Helpers
   ============================================================================= */

/**
 * Utility functions for the Xentauri Pi Screen client.
 */
const Helpers = {
    // -------------------------------------------------------------------------
    // Time Formatting
    // -------------------------------------------------------------------------

    /**
     * Format an ISO timestamp to a readable time string.
     * @param {string} isoString - ISO 8601 timestamp
     * @returns {string} Formatted time (e.g., "2:30 PM")
     */
    formatTime(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit'
        });
    },

    /**
     * Format an ISO timestamp to a readable date string.
     * @param {string} isoString - ISO 8601 timestamp
     * @returns {string} Formatted date (e.g., "Monday, January 15")
     */
    formatDate(isoString) {
        if (!isoString) return '';
        const date = new Date(isoString);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
    },

    /**
     * Format a duration in seconds to HH:MM:SS.
     * @param {number} seconds - Duration in seconds
     * @returns {string} Formatted duration (e.g., "01:30:45")
     */
    formatDuration(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    },

    // -------------------------------------------------------------------------
    // String Utilities
    // -------------------------------------------------------------------------

    /**
     * Escape HTML special characters to prevent XSS.
     * @param {string} text - Raw text
     * @returns {string} HTML-escaped text
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Truncate a string to a maximum length.
     * @param {string} str - String to truncate
     * @param {number} maxLength - Maximum length
     * @returns {string} Truncated string with ellipsis if needed
     */
    truncate(str, maxLength) {
        if (!str || str.length <= maxLength) return str || '';
        return str.substring(0, maxLength - 3) + '...';
    },

    // -------------------------------------------------------------------------
    // Weather Utilities
    // -------------------------------------------------------------------------

    /**
     * Get weather icon for a condition.
     * @param {string} condition - Weather condition code
     * @returns {string} Weather emoji icon
     */
    getWeatherIcon(condition) {
        const icons = {
            'sunny': '\u2600\uFE0F',
            'clear': '\u2600\uFE0F',
            'partly_cloudy': '\u26C5',
            'cloudy': '\u2601\uFE0F',
            'overcast': '\u2601\uFE0F',
            'rain': '\uD83C\uDF27\uFE0F',
            'light_rain': '\uD83C\uDF26\uFE0F',
            'heavy_rain': '\uD83C\uDF27\uFE0F',
            'snow': '\u2744\uFE0F',
            'thunder': '\u26C8\uFE0F',
            'thunderstorm': '\u26C8\uFE0F',
            'fog': '\uD83C\uDF2B\uFE0F',
            'mist': '\uD83C\uDF2B\uFE0F',
            'wind': '\uD83D\uDCA8',
            'default': '\uD83C\uDF24\uFE0F'
        };
        return icons[condition?.toLowerCase()] || icons['default'];
    },

    // -------------------------------------------------------------------------
    // DOM Utilities
    // -------------------------------------------------------------------------

    /**
     * Create a DOM element with properties.
     * @param {string} tag - HTML tag name
     * @param {Object} props - Element properties
     * @param {string|Element|Element[]} children - Child content
     * @returns {Element} Created element
     */
    createElement(tag, props = {}, children = null) {
        const element = document.createElement(tag);

        // Apply properties
        for (const [key, value] of Object.entries(props)) {
            if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key === 'className') {
                element.className = value;
            } else if (key === 'dataset') {
                Object.assign(element.dataset, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else {
                element.setAttribute(key, value);
            }
        }

        // Append children
        if (children) {
            if (typeof children === 'string') {
                element.textContent = children;
            } else if (Array.isArray(children)) {
                children.forEach(child => {
                    if (child) element.appendChild(child);
                });
            } else {
                element.appendChild(children);
            }
        }

        return element;
    },

    // -------------------------------------------------------------------------
    // Storage Utilities
    // -------------------------------------------------------------------------

    /**
     * Save data to localStorage.
     * @param {string} key - Storage key
     * @param {*} data - Data to save
     */
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('[Xentauri Helpers] Failed to save to storage:', e);
        }
    },

    /**
     * Load data from localStorage.
     * @param {string} key - Storage key
     * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
     * @returns {*} Stored data or null
     */
    loadFromStorage(key, maxAge = 3600000) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;

            const { data, timestamp } = JSON.parse(item);
            const age = Date.now() - timestamp;

            if (age > maxAge) {
                localStorage.removeItem(key);
                return null;
            }

            return data;
        } catch (e) {
            console.warn('[Xentauri Helpers] Failed to load from storage:', e);
            return null;
        }
    },

    /**
     * Clear data from localStorage.
     * @param {string} key - Storage key
     */
    clearStorage(key) {
        try {
            localStorage.removeItem(key);
        } catch (e) {
            console.warn('[Xentauri Helpers] Failed to clear storage:', e);
        }
    },

    // -------------------------------------------------------------------------
    // Debug Utilities
    // -------------------------------------------------------------------------

    /**
     * Log a debug message (only in debug mode).
     * @param {string} context - Log context/source
     * @param {string} message - Log message
     * @param {...*} args - Additional arguments
     */
    debug(context, message, ...args) {
        if (typeof CONFIG !== 'undefined' && CONFIG.DEBUG) {
            console.log(`[${context}] ${message}`, ...args);
        }
    },

    /**
     * Log an error message.
     * @param {string} context - Log context/source
     * @param {string} message - Error message
     * @param {...*} args - Additional arguments
     */
    error(context, message, ...args) {
        console.error(`[${context}] ${message}`, ...args);
    }
};

// Make globally available
window.Helpers = Helpers;
