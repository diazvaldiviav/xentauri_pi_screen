/* =============================================================================
   XENTAURI PI SCREEN - Pairing Service
   ============================================================================= */

/**
 * Pairing service for linking the Pi with a device in the backend.
 * Handles the pairing code validation and agent ID registration.
 */
const PairingService = {
    // -------------------------------------------------------------------------
    // Configuration
    // -------------------------------------------------------------------------

    /**
     * Generate a unique agent ID for this Pi.
     * Uses a combination of random string and timestamp.
     * @returns {string} Unique agent ID
     */
    generateAgentId() {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = 'pi-';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    /**
     * Get or create an agent ID for this device.
     * If already paired, returns the stored agent ID.
     * If not paired, generates a new one.
     * @returns {string} Agent ID
     */
    getOrCreateAgentId() {
        let agentId = getAgentId();
        if (!agentId) {
            agentId = this.generateAgentId();
            console.log('[PairingService] Generated new agent ID:', agentId);
        }
        return agentId;
    },

    // -------------------------------------------------------------------------
    // Pairing API
    // -------------------------------------------------------------------------

    /**
     * Pair this device with the backend using a pairing code.
     * @param {string} pairingCode - 6-character pairing code from iOS app
     * @returns {Promise<Object>} Result with success status and device info
     */
    async pair(pairingCode) {
        // Validate code format
        const cleanCode = pairingCode.toUpperCase().trim();
        if (cleanCode.length !== 6) {
            return {
                success: false,
                error: 'Pairing code must be 6 characters'
            };
        }

        // Get or generate agent ID
        const agentId = this.getOrCreateAgentId();

        console.log('[PairingService] Attempting to pair...', {
            pairingCode: cleanCode,
            agentId: agentId
        });

        try {
            // Call the pairing endpoint
            const url = `${CONFIG.PAIR_URL}?agent_id=${encodeURIComponent(agentId)}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pairing_code: cleanCode
                })
            });

            const data = await response.json();

            if (!response.ok) {
                console.error('[PairingService] Pairing failed:', data);
                return {
                    success: false,
                    error: data.detail || 'Pairing failed',
                    statusCode: response.status
                };
            }

            // Success! Store the agent ID
            setAgentId(agentId);

            console.log('[PairingService] Pairing successful!', data);

            return {
                success: true,
                device: data,
                agentId: agentId
            };

        } catch (error) {
            console.error('[PairingService] Network error:', error);
            return {
                success: false,
                error: 'Network error. Check your connection.',
                networkError: true
            };
        }
    },

    /**
     * Unpair this device (clear stored agent ID).
     */
    unpair() {
        clearAgentId();
        // Also clear any stored content
        Helpers.clearStorage(CONFIG.STORAGE_KEY);
        console.log('[PairingService] Device unpaired');
    },

    /**
     * Check if the device is currently paired.
     * @returns {boolean}
     */
    isPaired() {
        return isPaired();
    }
};

// Make globally available
window.PairingService = PairingService;
