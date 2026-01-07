/* =============================================================================
   XENTAURI PI SCREEN - Configuration
   ============================================================================= */

/**
 * Configuration object for the Xentauri Pi Screen client.
 * Agent ID is now stored in localStorage after pairing.
 */
const CONFIG = {
    // -------------------------------------------------------------------------
    // Backend Configuration
    // -------------------------------------------------------------------------

    // Production backend URL
    BACKEND_URL: 'https://xentauri-cloud-core.fly.dev',

    // WebSocket URL (derived from backend URL)
    get WS_URL() {
        const wsProtocol = this.BACKEND_URL.startsWith('https') ? 'wss' : 'ws';
        const host = this.BACKEND_URL.replace(/^https?:\/\//, '');
        return `${wsProtocol}://${host}/ws/devices`;
    },

    // Pairing API endpoint
    get PAIR_URL() {
        return `${this.BACKEND_URL}/devices/pair`;
    },

    // -------------------------------------------------------------------------
    // Device Configuration
    // -------------------------------------------------------------------------

    // Agent ID is stored in localStorage after pairing
    // Use getAgentId() function to retrieve it
    STORAGE_KEY_AGENT_ID: 'xentauri_agent_id',

    // Device display name (for debugging)
    DEVICE_NAME: 'Raspberry Pi Screen',

    // -------------------------------------------------------------------------
    // Connection Settings
    // -------------------------------------------------------------------------

    // WebSocket reconnection settings
    RECONNECT: {
        BASE_DELAY: 1000,      // Start at 1 second
        MAX_DELAY: 30000,      // Max 30 seconds
        MULTIPLIER: 1.5,       // Exponential backoff multiplier
        JITTER: 0.1            // Random jitter factor (10%)
    },

    // Heartbeat interval (30 seconds)
    HEARTBEAT_INTERVAL: 30000,

    // -------------------------------------------------------------------------
    // Display Settings
    // -------------------------------------------------------------------------

    // Default layout settings
    LAYOUT: {
        DEFAULT_PADDING: '16px',
        DEFAULT_GAP: '16px',
        DEFAULT_BORDER_RADIUS: '12px'
    },

    // Clock format: '12h' or '24h'
    CLOCK_FORMAT: '12h',

    // Weather units: 'fahrenheit' or 'celsius'
    WEATHER_UNITS: 'fahrenheit',

    // -------------------------------------------------------------------------
    // Debug Settings
    // -------------------------------------------------------------------------

    // Enable debug logging
    DEBUG: true,

    // Show connection status overlay
    SHOW_CONNECTION_STATUS: true,

    // Content persistence (restore on refresh)
    PERSIST_CONTENT: true,

    // Storage key for content state
    STORAGE_KEY: 'xentauri_pi_screen',

    // -------------------------------------------------------------------------
    // Eleven Labs TTS Configuration
    // -------------------------------------------------------------------------
    ELEVENLABS: {
        // Enable/disable TTS narration
        ENABLED: true,

        // API Key (configure on device)
        API_KEY: '',

        // Voice ID (configure on device)
        VOICE_ID: '',

        // Model ID for multilingual support
        MODEL_ID: 'eleven_multilingual_v2',

        // Voice settings for educational content
        VOICE_SETTINGS: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.0,
            use_speaker_boost: true
        },

        // Maximum text length to send (API limit is ~5000 chars)
        MAX_TEXT_LENGTH: 5000,

        // Remove emojis from text before speech (some voices handle them poorly)
        REMOVE_EMOJIS: true,

        // Auto-narrate scenes when they arrive
        AUTO_NARRATE: true,

        // Only narrate these component types (null = all)
        NARRATE_COMPONENTS: null  // or ['text_block', 'doc_summary']
    }
};

// -------------------------------------------------------------------------
// Agent ID Management Functions
// -------------------------------------------------------------------------

/**
 * Get the stored agent ID from localStorage.
 * @returns {string|null} Agent ID or null if not paired
 */
function getAgentId() {
    try {
        return localStorage.getItem(CONFIG.STORAGE_KEY_AGENT_ID);
    } catch (e) {
        console.error('[Config] Failed to get agent ID:', e);
        return null;
    }
}

/**
 * Store the agent ID in localStorage after successful pairing.
 * @param {string} agentId - The agent ID to store
 */
function setAgentId(agentId) {
    try {
        localStorage.setItem(CONFIG.STORAGE_KEY_AGENT_ID, agentId);
        console.log('[Config] Agent ID stored:', agentId);
    } catch (e) {
        console.error('[Config] Failed to store agent ID:', e);
    }
}

/**
 * Clear the stored agent ID (unpair).
 */
function clearAgentId() {
    try {
        localStorage.removeItem(CONFIG.STORAGE_KEY_AGENT_ID);
        console.log('[Config] Agent ID cleared');
    } catch (e) {
        console.error('[Config] Failed to clear agent ID:', e);
    }
}

/**
 * Check if the device is paired.
 * @returns {boolean} True if agent ID exists
 */
function isPaired() {
    return getAgentId() !== null;
}

// Make functions globally available
window.getAgentId = getAgentId;
window.setAgentId = setAgentId;
window.clearAgentId = clearAgentId;
window.isPaired = isPaired;

// Freeze config to prevent accidental modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.RECONNECT);
Object.freeze(CONFIG.LAYOUT);
Object.freeze(CONFIG.ELEVENLABS);
Object.freeze(CONFIG.ELEVENLABS.VOICE_SETTINGS);

// Log configuration on load (debug mode only)
if (CONFIG.DEBUG) {
    console.log('[Xentauri Config] Loaded configuration:', {
        backend: CONFIG.BACKEND_URL,
        wsUrl: CONFIG.WS_URL,
        pairUrl: CONFIG.PAIR_URL,
        isPaired: isPaired(),
        agentId: getAgentId() || '(NOT PAIRED)',
        debug: CONFIG.DEBUG,
        elevenLabs: {
            enabled: CONFIG.ELEVENLABS.ENABLED,
            configured: Boolean(CONFIG.ELEVENLABS.API_KEY),
            autoNarrate: CONFIG.ELEVENLABS.AUTO_NARRATE
        }
    });
}
