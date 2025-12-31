/* =============================================================================
   XENTAURI PI SCREEN - WebSocket Client
   ============================================================================= */

/**
 * WebSocket client for connecting to Xentauri Cloud backend.
 * Handles connection, reconnection, heartbeats, and message routing.
 */
class XentauriWebSocket {
    constructor(options = {}) {
        // Configuration
        this.agentId = options.agentId || CONFIG.AGENT_ID;
        this.baseUrl = options.wsUrl || CONFIG.WS_URL;

        // Connection state
        this.ws = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.heartbeatInterval = null;

        // Callbacks
        this.onConnected = options.onConnected || (() => {});
        this.onDisconnected = options.onDisconnected || (() => {});
        this.onCommand = options.onCommand || (() => {});
        this.onError = options.onError || (() => {});
        this.onReconnecting = options.onReconnecting || (() => {});

        // Bind methods
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.handleMessage = this.handleMessage.bind(this);
        this.handleOpen = this.handleOpen.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleError = this.handleError.bind(this);

        this.log('WebSocket client initialized', { agentId: this.agentId });
    }

    // -------------------------------------------------------------------------
    // Logging
    // -------------------------------------------------------------------------

    log(message, data = null) {
        if (CONFIG.DEBUG) {
            if (data) {
                console.log(`[XentauriWS] ${message}`, data);
            } else {
                console.log(`[XentauriWS] ${message}`);
            }
        }
    }

    logError(message, error = null) {
        console.error(`[XentauriWS] ${message}`, error || '');
    }

    // -------------------------------------------------------------------------
    // Connection Management
    // -------------------------------------------------------------------------

    /**
     * Build the WebSocket URL with agent_id query parameter.
     */
    buildUrl() {
        return `${this.baseUrl}?agent_id=${encodeURIComponent(this.agentId)}`;
    }

    /**
     * Connect to the WebSocket server.
     */
    connect() {
        // Validate agent ID
        if (!this.agentId || this.agentId === 'YOUR_AGENT_ID_HERE') {
            this.logError('Agent ID not configured. Please set CONFIG.AGENT_ID');
            this.onError({ type: 'config_error', message: 'Agent ID not configured' });
            return;
        }

        // Clear any existing reconnect timer
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // Close existing connection
        if (this.ws) {
            this.ws.close();
        }

        const url = this.buildUrl();
        this.log(`Connecting to ${url}...`);

        try {
            this.ws = new WebSocket(url);
            this.ws.onopen = this.handleOpen;
            this.ws.onmessage = this.handleMessage;
            this.ws.onclose = this.handleClose;
            this.ws.onerror = this.handleError;
        } catch (e) {
            this.logError('Failed to create WebSocket connection', e);
            this.scheduleReconnect();
        }
    }

    /**
     * Disconnect from the WebSocket server.
     */
    disconnect() {
        this.log('Disconnecting...');

        // Clear timers
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // Close connection
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }

        this.connected = false;
    }

    // -------------------------------------------------------------------------
    // Event Handlers
    // -------------------------------------------------------------------------

    handleOpen() {
        this.log('Connected successfully');
        this.connected = true;
        this.reconnectAttempts = 0;

        // Start heartbeat
        this.startHeartbeat();

        // Notify callback
        this.onConnected();
    }

    handleMessage(event) {
        try {
            const data = JSON.parse(event.data);
            this.log('Received message', { type: data.type });

            switch (data.type) {
                case 'connected':
                    this.log(`Welcome: ${data.message}`);
                    break;

                case 'command':
                    this.handleCommand(data);
                    break;

                case 'heartbeat_ack':
                    this.log('Heartbeat acknowledged');
                    break;

                default:
                    this.log(`Unknown message type: ${data.type}`);
            }
        } catch (e) {
            this.logError('Failed to parse message', e);
        }
    }

    handleClose(event) {
        this.connected = false;

        // Clear heartbeat
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        const reason = event.reason || (event.code === 1000 ? 'Normal closure' : `Code ${event.code}`);
        this.log(`Disconnected: ${reason}`);

        // Notify callback
        this.onDisconnected({ code: event.code, reason });

        // Schedule reconnect (unless it was a clean close)
        if (event.code !== 1000) {
            this.scheduleReconnect();
        }
    }

    handleError(error) {
        this.logError('WebSocket error', error);
        this.onError({ type: 'websocket_error', error });
    }

    // -------------------------------------------------------------------------
    // Command Handling
    // -------------------------------------------------------------------------

    handleCommand(data) {
        const { command_id, command_type, parameters } = data;

        this.log(`Command received: ${command_type}`, { command_id, parameters });

        // Pass to callback
        this.onCommand({
            commandId: command_id,
            commandType: command_type,
            parameters: parameters || {}
        });

        // Send acknowledgment
        this.sendAck(command_id, 'completed');
    }

    // -------------------------------------------------------------------------
    // Message Sending
    // -------------------------------------------------------------------------

    /**
     * Send a message to the server.
     */
    send(message) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            this.logError('Cannot send message - not connected');
            return false;
        }

        try {
            this.ws.send(JSON.stringify(message));
            return true;
        } catch (e) {
            this.logError('Failed to send message', e);
            return false;
        }
    }

    /**
     * Send command acknowledgment.
     */
    sendAck(commandId, status) {
        this.send({
            type: 'ack',
            command_id: commandId,
            status: status
        });
        this.log(`Sent ACK for command ${commandId}: ${status}`);
    }

    /**
     * Send heartbeat.
     */
    sendHeartbeat() {
        this.send({ type: 'heartbeat' });
    }

    // -------------------------------------------------------------------------
    // Heartbeat
    // -------------------------------------------------------------------------

    startHeartbeat() {
        // Clear existing interval
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }

        // Send heartbeat every 30 seconds
        this.heartbeatInterval = setInterval(() => {
            if (this.connected) {
                this.sendHeartbeat();
            }
        }, CONFIG.HEARTBEAT_INTERVAL);

        this.log('Heartbeat started');
    }

    // -------------------------------------------------------------------------
    // Reconnection
    // -------------------------------------------------------------------------

    /**
     * Calculate reconnection delay with exponential backoff and jitter.
     */
    calculateReconnectDelay() {
        const { BASE_DELAY, MAX_DELAY, MULTIPLIER, JITTER } = CONFIG.RECONNECT;

        // Exponential backoff
        let delay = BASE_DELAY * Math.pow(MULTIPLIER, this.reconnectAttempts);

        // Cap at max delay
        delay = Math.min(delay, MAX_DELAY);

        // Add jitter (random variation)
        const jitterAmount = delay * JITTER;
        delay += Math.random() * jitterAmount * 2 - jitterAmount;

        return Math.round(delay);
    }

    /**
     * Schedule a reconnection attempt.
     */
    scheduleReconnect() {
        this.reconnectAttempts++;
        const delay = this.calculateReconnectDelay();

        this.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

        // Notify callback
        this.onReconnecting({
            attempt: this.reconnectAttempts,
            delay: delay
        });

        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
    }

    /**
     * Force immediate reconnection.
     */
    forceReconnect() {
        this.log('Forcing immediate reconnect');
        this.reconnectAttempts = 0;

        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        this.connect();
    }

    // -------------------------------------------------------------------------
    // Status
    // -------------------------------------------------------------------------

    /**
     * Check if connected.
     */
    isConnected() {
        return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
    }

    /**
     * Get connection status.
     */
    getStatus() {
        return {
            connected: this.connected,
            reconnectAttempts: this.reconnectAttempts,
            agentId: this.agentId
        };
    }
}

// Make globally available
window.XentauriWebSocket = XentauriWebSocket;
