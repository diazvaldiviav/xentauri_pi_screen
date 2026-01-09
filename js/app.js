/* =============================================================================
   XENTAURI PI SCREEN - Main Application
   ============================================================================= */

/**
 * Main application controller for Xentauri Pi Screen.
 * Handles pairing flow, WebSocket connection, and scene rendering.
 */
const XentauriApp = {
    // WebSocket client
    ws: null,

    // Thinking Indicator
    thinkingIndicator: null,

    // Listen Button (TTS on demand)
    listenButton: null,

    // UI Elements
    elements: {
        connectionOverlay: null,
        connectionMessage: null,
        connectionDetails: null,
        displayContainer: null,
        pairingScreen: null,
        pairingInput: null,
        pairButton: null,
        pairingStatus: null,
        errorScreen: null,
        errorMessage: null,
        retryButton: null
    },

    // State
    state: {
        paired: false,
        connected: false,
        reconnecting: false,
        pairing: false
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

        // Initialize Thinking Indicator
        if (window.ThinkingIndicator) {
            this.thinkingIndicator = new ThinkingIndicator({
                container: document.body
            });
            console.log('[Xentauri App] ThinkingIndicator initialized');
        }

        // Initialize Listen Button (TTS on demand)
        if (window.ListenButton) {
            this.listenButton = new ListenButton({
                container: document.body
            });
            console.log('[Xentauri App] ListenButton initialized');
        }

        // Initialize Eleven Labs TTS (audio unlock)
        if (window.ElevenLabsService) {
            ElevenLabsService.init();
        }

        // Check if already paired
        if (isPaired()) {
            console.log('[Xentauri App] Device is paired, connecting...');
            this.state.paired = true;
            this.showMainScreen();
            this.initWebSocket();
        } else {
            console.log('[Xentauri App] Device not paired, showing pairing screen...');
            this.showPairingScreen();
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
            pairingInput: document.getElementById('pairing-input'),
            pairButton: document.getElementById('pair-button'),
            pairingStatus: document.getElementById('pairing-status'),
            errorScreen: document.getElementById('error-screen'),
            errorMessage: document.getElementById('error-message'),
            retryButton: document.getElementById('retry-button')
        };

        // Setup pairing input handlers
        this.setupPairingHandlers();
    },

    // -------------------------------------------------------------------------
    // Pairing Flow
    // -------------------------------------------------------------------------

    /**
     * Setup pairing screen event handlers.
     */
    setupPairingHandlers() {
        const input = this.elements.pairingInput;
        const button = this.elements.pairButton;

        if (input) {
            // Handle input changes
            input.addEventListener('input', (e) => {
                // Force uppercase and remove non-alphanumeric
                let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
                e.target.value = value;

                // Enable/disable button based on length
                if (button) {
                    button.disabled = value.length !== 6;
                }

                // Clear error state
                input.classList.remove('error');
                this.setPairingStatus('', '');
            });

            // Handle Enter key
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && input.value.length === 6) {
                    this.doPairing();
                }
            });
        }

        if (button) {
            button.addEventListener('click', () => this.doPairing());
        }

        // Retry button
        if (this.elements.retryButton) {
            this.elements.retryButton.addEventListener('click', () => {
                this.hideError();
                if (isPaired()) {
                    this.initWebSocket();
                } else {
                    this.showPairingScreen();
                }
            });
        }
    },

    /**
     * Show pairing screen.
     */
    showPairingScreen() {
        if (this.elements.pairingScreen) {
            this.elements.pairingScreen.classList.remove('hidden');
        }
        if (this.elements.displayContainer) {
            this.elements.displayContainer.classList.add('hidden');
        }
        if (this.elements.connectionOverlay) {
            this.elements.connectionOverlay.classList.add('hidden');
        }

        // Focus the input
        setTimeout(() => {
            if (this.elements.pairingInput) {
                this.elements.pairingInput.focus();
            }
        }, 100);
    },

    /**
     * Hide pairing screen and show main display.
     */
    showMainScreen() {
        if (this.elements.pairingScreen) {
            this.elements.pairingScreen.classList.add('hidden');
        }
        if (this.elements.displayContainer) {
            this.elements.displayContainer.classList.remove('hidden');
        }
    },

    /**
     * Perform pairing with the entered code.
     */
    async doPairing() {
        if (this.state.pairing) return;

        const code = this.elements.pairingInput?.value || '';
        if (code.length !== 6) {
            this.setPairingStatus('Please enter a 6-character code', 'error');
            return;
        }

        this.state.pairing = true;

        // Update UI to loading state
        if (this.elements.pairButton) {
            this.elements.pairButton.classList.add('loading');
            this.elements.pairButton.disabled = true;
        }
        this.setPairingStatus('Pairing...', '');

        // Call pairing service
        const result = await PairingService.pair(code);

        this.state.pairing = false;

        // Reset button state
        if (this.elements.pairButton) {
            this.elements.pairButton.classList.remove('loading');
        }

        if (result.success) {
            // Success!
            this.setPairingStatus('Paired successfully!', 'success');
            if (this.elements.pairingInput) {
                this.elements.pairingInput.classList.add('success');
            }

            // Wait a moment then switch to main screen
            setTimeout(() => {
                this.state.paired = true;
                this.showMainScreen();
                this.showConnectionStatus('Connecting to Xentauri...', '');
                this.initWebSocket();
            }, 1000);

        } else {
            // Error
            this.setPairingStatus(result.error || 'Pairing failed', 'error');
            if (this.elements.pairingInput) {
                this.elements.pairingInput.classList.add('error');
            }
            if (this.elements.pairButton) {
                this.elements.pairButton.disabled = false;
            }
        }
    },

    /**
     * Set pairing status message.
     */
    setPairingStatus(message, type) {
        const status = this.elements.pairingStatus;
        if (status) {
            status.textContent = message;
            status.className = 'pairing-status';
            if (type) {
                status.classList.add(type);
            }
        }
    },

    // -------------------------------------------------------------------------
    // WebSocket Management
    // -------------------------------------------------------------------------

    /**
     * Initialize WebSocket connection.
     */
    initWebSocket() {
        const agentId = getAgentId();

        if (!agentId) {
            console.error('[Xentauri App] No agent ID found');
            this.showPairingScreen();
            return;
        }

        this.ws = new XentauriWebSocket({
            agentId: agentId,
            wsUrl: CONFIG.WS_URL,
            onConnected: () => this.handleConnected(),
            onDisconnected: (data) => this.handleDisconnected(data),
            onCommand: (cmd) => this.handleCommand(cmd),
            onError: (err) => this.handleError(err),
            onReconnecting: (data) => this.handleReconnecting(data)
        });

        // Show connecting overlay
        this.showConnectionStatus('Connecting to Xentauri...', '');

        // Connect
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

        // Restore previous state if enabled
        if (CONFIG.PERSIST_CONTENT) {
            this.restoreState();
        }

        // Show idle screen if no scene restored
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
            case 'loading_start':
                this.handleLoadingStart(cmd.parameters);
                break;

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
     * Handle loading_start command - show thinking indicator.
     * Sprint 5.2.3: Backend sends loading phases during content generation.
     */
    handleLoadingStart(params) {
        const phase = params?.phase || 1;
        const message = params?.message || 'Processing...';

        console.log(`[Xentauri App] Loading phase ${phase}: ${message}`);

        if (!this.thinkingIndicator) {
            console.log('[Xentauri App] ThinkingIndicator not available');
            return;
        }

        // Show or update phase
        if (!this.thinkingIndicator.isVisible) {
            this.thinkingIndicator.show(phase, message);
        } else {
            this.thinkingIndicator.setPhase(phase, message);
        }
    },

    /**
     * Handle display_scene command.
     * Sprint 5.2: Supports custom_layout (GPT-5.2 HTML) with SceneGraph fallback.
     * Sprint 5.2.3: Hides thinking indicator when content arrives.
     * Sprint 5.2.4: Shows listen button for on-demand TTS narration.
     */
    handleDisplayScene(params) {
        // Hide thinking indicator when content arrives
        if (this.thinkingIndicator && this.thinkingIndicator.isVisible) {
            this.thinkingIndicator.hide();
        }

        const scene = params?.scene;
        const customLayout = params?.custom_layout;

        // Custom layout takes priority if available
        if (customLayout) {
            console.log('[Xentauri App] Rendering custom HTML layout (GPT-5.2)');

            // Render custom layout with scene as fallback
            const success = SceneRenderer.renderCustomLayout(customLayout, scene);

            if (success) {
                // Save state for persistence
                if (CONFIG.PERSIST_CONTENT) {
                    this.saveState('custom_layout', { customLayout, scene });
                }

                // Show listen button for on-demand TTS (Sprint 5.2.4)
                if (scene && this.listenButton) {
                    this.listenButton.show(scene);
                }
                return;
            }

            // Custom layout failed, fall through to scene rendering
            console.log('[Xentauri App] Custom layout failed, falling back to SceneGraph');
        }

        // SceneGraph fallback
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

        // Show listen button for on-demand TTS (Sprint 5.2.4)
        if (this.listenButton) {
            this.listenButton.show(scene);
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

        // Hide listen button
        if (this.listenButton) {
            this.listenButton.hide();
        }

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
    // TTS Narration (Eleven Labs)
    // -------------------------------------------------------------------------

    /**
     * Narrate a scene using Eleven Labs TTS (streaming).
     * @param {Object} scene - Scene data to narrate
     */
    async narrateScene(scene) {
        if (!window.ElevenLabsService) {
            console.log('[Xentauri App] ElevenLabsService not available');
            return;
        }

        if (!ElevenLabsService.isEnabled()) {
            console.log('[Xentauri App] TTS is disabled or not configured');
            return;
        }

        try {
            console.log('[Xentauri App] Starting TTS narration (streaming)...');
            await ElevenLabsService.narrateScene(scene);
            console.log('[Xentauri App] TTS narration completed');
        } catch (error) {
            console.error('[Xentauri App] TTS narration error:', error);
        }
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
     * Sprint 5.2: Also restores custom_layout states.
     */
    restoreState() {
        const saved = Helpers.loadFromStorage(CONFIG.STORAGE_KEY);

        if (!saved) return;

        console.log('[Xentauri App] Restoring saved state:', saved.type);

        if (saved.type === 'custom_layout' && saved.data?.customLayout) {
            // Restore custom layout with scene fallback
            const success = SceneRenderer.renderCustomLayout(saved.data.customLayout, saved.data.scene);
            if (!success && saved.data.scene) {
                SceneRenderer.render(saved.data.scene);
            }
        } else if (saved.type === 'scene' && saved.data) {
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

        // Hide other overlays
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
    // Unpair / Reset
    // -------------------------------------------------------------------------

    /**
     * Unpair this device and show pairing screen.
     */
    unpair() {
        console.log('[Xentauri App] Unpairing device...');

        // Disconnect WebSocket
        if (this.ws) {
            this.ws.disconnect();
            this.ws = null;
        }

        // Clear pairing data
        PairingService.unpair();

        // Reset state
        this.state.paired = false;
        this.state.connected = false;

        // Clear input
        if (this.elements.pairingInput) {
            this.elements.pairingInput.value = '';
            this.elements.pairingInput.classList.remove('success', 'error');
        }
        if (this.elements.pairButton) {
            this.elements.pairButton.disabled = true;
        }
        this.setPairingStatus('', '');

        // Show pairing screen
        this.showPairingScreen();
    },

    // -------------------------------------------------------------------------
    // Keyboard Shortcuts
    // -------------------------------------------------------------------------

    /**
     * Setup keyboard shortcuts for development/debugging.
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // ESC - Clear content (only when connected)
            if (e.key === 'Escape' && this.state.connected) {
                this.handleClearContent();
            }

            // F - Toggle fullscreen
            if (e.key === 'f' || e.key === 'F') {
                if (!this.elements.pairingInput || document.activeElement !== this.elements.pairingInput) {
                    this.toggleFullscreen();
                }
            }

            // R - Force reconnect (only when paired)
            if ((e.key === 'r' || e.key === 'R') && this.state.paired) {
                if (!this.elements.pairingInput || document.activeElement !== this.elements.pairingInput) {
                    if (this.ws) {
                        this.ws.forceReconnect();
                    }
                }
            }

            // U - Unpair (Shift+U for safety)
            if (e.key === 'U' && e.shiftKey) {
                this.unpair();
            }

            // D - Toggle debug info
            if (e.key === 'd' || e.key === 'D') {
                if (!this.elements.pairingInput || document.activeElement !== this.elements.pairingInput) {
                    this.toggleDebugInfo();
                }
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
            paired: this.state.paired,
            agentId: getAgentId(),
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
