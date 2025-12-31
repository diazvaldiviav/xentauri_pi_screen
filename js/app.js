/* =============================================================================
   XENTAURI PI SCREEN - Main Application
   ============================================================================= */

/**
 * Main application controller for Xentauri Pi Screen.
 * Coordinates WebSocket connection, scene rendering, and UI state.
 */
const XentauriApp = {
    // WebSocket client
    ws: null,

    // UI Elements
    elements: {
        connectionOverlay: null,
        connectionMessage: null,
        connectionDetails: null,
        displayContainer: null,
        pairingScreen: null,
        pairingCode: null,
        errorScreen: null,
        errorMessage: null,
        retryCountdown: null
    },

    // State
    state: {
        connected: false,
        reconnecting: false,
        lastScene: null
    },

    // -------------------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------------------

    /**
     * Initialize the application.
     */
    init() {
        console.log('[Xentauri App] Initializing...');

        // Get DOM elements
        this.initElements();

        // Initialize scene renderer
        SceneRenderer.init(this.elements.displayContainer);

        // Check configuration
        if (!this.validateConfig()) {
            return;
        }

        // Initialize WebSocket
        this.initWebSocket();

        // Restore previous state if enabled
        if (CONFIG.PERSIST_CONTENT) {
            this.restoreState();
        }

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        console.log('[Xentauri App] Initialized');
    },

    /**
     * Initialize DOM element references.
     */
    initElements() {
        this.elements = {
            connectionOverlay: document.getElementById('connection-overlay'),
            connectionMessage: document.getElementById('connection-message'),
            connectionDetails: document.getElementById('connection-details'),
            displayContainer: document.getElementById('display-container'),
            pairingScreen: document.getElementById('pairing-screen'),
            pairingCode: document.getElementById('pairing-code'),
            errorScreen: document.getElementById('error-screen'),
            errorMessage: document.getElementById('error-message'),
            retryCountdown: document.getElementById('retry-countdown')
        };
    },

    /**
     * Validate configuration.
     */
    validateConfig() {
        if (!CONFIG.AGENT_ID || CONFIG.AGENT_ID === 'YOUR_AGENT_ID_HERE') {
            this.showError(
                'Configuration Error',
                'Agent ID not configured. Please edit js/config.js and set your AGENT_ID.'
            );
            return false;
        }
        return true;
    },

    // -------------------------------------------------------------------------
    // WebSocket Management
    // -------------------------------------------------------------------------

    /**
     * Initialize WebSocket connection.
     */
    initWebSocket() {
        this.ws = new XentauriWebSocket({
            agentId: CONFIG.AGENT_ID,
            wsUrl: CONFIG.WS_URL,
            onConnected: () => this.handleConnected(),
            onDisconnected: (data) => this.handleDisconnected(data),
            onCommand: (cmd) => this.handleCommand(cmd),
            onError: (err) => this.handleError(err),
            onReconnecting: (data) => this.handleReconnecting(data)
        });

        // Connect
        this.showConnectionStatus('Connecting to Xentauri...', '');
        this.ws.connect();
    },

    // -------------------------------------------------------------------------
    // Connection Handlers
    // -------------------------------------------------------------------------

    handleConnected() {
        console.log('[Xentauri App] Connected');
        this.state.connected = true;
        this.state.reconnecting = false;

        // Hide connection overlay
        this.hideConnectionOverlay();

        // Show idle screen if no scene
        if (!SceneRenderer.hasScene()) {
            SceneRenderer.showIdleScreen();
        }
    },

    handleDisconnected(data) {
        console.log('[Xentauri App] Disconnected:', data);
        this.state.connected = false;
    },

    handleReconnecting(data) {
        console.log('[Xentauri App] Reconnecting:', data);
        this.state.reconnecting = true;

        const seconds = Math.round(data.delay / 1000);
        this.showConnectionStatus(
            'Connection Lost',
            `Reconnecting in ${seconds}s (attempt ${data.attempt})`
        );
    },

    handleError(error) {
        console.error('[Xentauri App] Error:', error);

        if (error.type === 'config_error') {
            this.showError('Configuration Error', error.message);
        }
    },

    // -------------------------------------------------------------------------
    // Command Handlers
    // -------------------------------------------------------------------------

    handleCommand(cmd) {
        console.log('[Xentauri App] Command:', cmd.commandType);

        switch (cmd.commandType) {
            case 'display_scene':
                this.handleDisplayScene(cmd.parameters);
                break;

            case 'show_content':
                this.handleShowContent(cmd.parameters);
                break;

            case 'clear_content':
                this.handleClearContent();
                break;

            case 'power_off':
                this.handlePowerOff();
                break;

            default:
                console.log('[Xentauri App] Unknown command:', cmd.commandType);
        }
    },

    /**
     * Handle display_scene command.
     */
    handleDisplayScene(params) {
        const scene = params?.scene;

        if (!scene) {
            console.error('[Xentauri App] display_scene: No scene data');
            return;
        }

        console.log('[Xentauri App] Rendering scene:', scene.scene_id);

        // Render the scene
        SceneRenderer.render(scene);

        // Save state for persistence
        if (CONFIG.PERSIST_CONTENT) {
            this.saveState('scene', scene);
        }
    },

    /**
     * Handle show_content command (legacy URL display).
     */
    handleShowContent(params) {
        const url = params?.url;
        const contentType = params?.content_type || 'url';

        if (!url) {
            console.error('[Xentauri App] show_content: No URL');
            return;
        }

        console.log('[Xentauri App] Showing content:', contentType, url);

        // Clear current scene
        SceneRenderer.clear();

        // Create iframe for URL content
        const iframe = document.createElement('iframe');
        iframe.style.cssText = `
            width: 100%;
            height: 100%;
            border: none;
            position: absolute;
            top: 0;
            left: 0;
        `;

        // Handle relative URLs
        let fullUrl = url;
        if (url.startsWith('/')) {
            fullUrl = CONFIG.BACKEND_URL + url;
        }

        iframe.src = fullUrl;
        this.elements.displayContainer.appendChild(iframe);

        // Save state
        if (CONFIG.PERSIST_CONTENT) {
            this.saveState('content', { url: fullUrl, contentType });
        }
    },

    /**
     * Handle clear_content command.
     */
    handleClearContent() {
        console.log('[Xentauri App] Clearing content');
        SceneRenderer.clear();
        SceneRenderer.showIdleScreen();

        // Clear saved state
        if (CONFIG.PERSIST_CONTENT) {
            Helpers.clearStorage(CONFIG.STORAGE_KEY);
        }
    },

    /**
     * Handle power_off command.
     */
    handlePowerOff() {
        console.log('[Xentauri App] Power off');
        this.handleClearContent();
    },

    // -------------------------------------------------------------------------
    // State Persistence
    // -------------------------------------------------------------------------

    /**
     * Save current state to localStorage.
     */
    saveState(type, data) {
        Helpers.saveToStorage(CONFIG.STORAGE_KEY, { type, data });
    },

    /**
     * Restore state from localStorage.
     */
    restoreState() {
        const saved = Helpers.loadFromStorage(CONFIG.STORAGE_KEY);

        if (!saved) return;

        console.log('[Xentauri App] Restoring saved state:', saved.type);

        if (saved.type === 'scene' && saved.data) {
            SceneRenderer.render(saved.data);
        } else if (saved.type === 'content' && saved.data?.url) {
            this.handleShowContent(saved.data);
        }
    },

    // -------------------------------------------------------------------------
    // UI Updates
    // -------------------------------------------------------------------------

    /**
     * Show connection status overlay.
     */
    showConnectionStatus(message, details) {
        if (this.elements.connectionMessage) {
            this.elements.connectionMessage.textContent = message;
        }
        if (this.elements.connectionDetails) {
            this.elements.connectionDetails.textContent = details;
        }
        if (this.elements.connectionOverlay) {
            this.elements.connectionOverlay.classList.remove('hidden');
        }
    },

    /**
     * Hide connection overlay.
     */
    hideConnectionOverlay() {
        if (this.elements.connectionOverlay) {
            this.elements.connectionOverlay.classList.add('hidden');
        }
    },

    /**
     * Show error screen.
     */
    showError(title, message) {
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
        }
        if (this.elements.errorScreen) {
            this.elements.errorScreen.classList.remove('hidden');
        }

        // Hide connection overlay
        this.hideConnectionOverlay();
    },

    /**
     * Hide error screen.
     */
    hideError() {
        if (this.elements.errorScreen) {
            this.elements.errorScreen.classList.add('hidden');
        }
    },

    // -------------------------------------------------------------------------
    // Keyboard Shortcuts
    // -------------------------------------------------------------------------

    /**
     * Setup keyboard shortcuts for development/debugging.
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // ESC - Clear content
            if (e.key === 'Escape') {
                this.handleClearContent();
            }

            // F - Toggle fullscreen
            if (e.key === 'f' || e.key === 'F') {
                this.toggleFullscreen();
            }

            // R - Force reconnect
            if (e.key === 'r' || e.key === 'R') {
                if (this.ws) {
                    this.ws.forceReconnect();
                }
            }

            // D - Toggle debug info
            if (e.key === 'd' || e.key === 'D') {
                this.toggleDebugInfo();
            }
        });
    },

    /**
     * Toggle fullscreen mode.
     */
    toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            document.documentElement.requestFullscreen();
        }
    },

    /**
     * Toggle debug info display.
     */
    toggleDebugInfo() {
        console.log('[Xentauri App] Debug Info:', {
            connected: this.state.connected,
            reconnecting: this.state.reconnecting,
            hasScene: SceneRenderer.hasScene(),
            currentScene: SceneRenderer.getCurrentScene()?.scene_id,
            wsStatus: this.ws?.getStatus()
        });
    }
};

// -------------------------------------------------------------------------
// Application Bootstrap
// -------------------------------------------------------------------------

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => XentauriApp.init());
} else {
    XentauriApp.init();
}

// Make globally available for debugging
window.XentauriApp = XentauriApp;
