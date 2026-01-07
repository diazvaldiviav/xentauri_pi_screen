/* =============================================================================
   XENTAURI PI SCREEN - Eleven Labs TTS Service (Streaming)
   ============================================================================= */

/**
 * Eleven Labs Text-to-Speech service for Pi Screen.
 * Uses streaming for lower latency audio playback.
 */
const ElevenLabsService = {
    // Current audio element
    currentAudio: null,
    currentAudioUrl: null,

    // Cancellation system
    nextSpeakId: 0,
    activeSpeakId: null,
    cancelledIds: new Set(),

    // Audio unlock state (for browsers that require user interaction)
    audioUnlocked: false,
    pendingScene: null,

    // -------------------------------------------------------------------------
    // Initialization & Audio Unlock
    // -------------------------------------------------------------------------

    /**
     * Initialize the service and set up audio unlock listeners.
     * Call this once on page load.
     */
    init() {
        if (this.audioUnlocked) return;

        // Try to unlock audio immediately (works with --autoplay-policy flag)
        this.tryUnlockAudio();

        // Set up listeners for user interaction to unlock audio
        const unlockEvents = ['click', 'touchstart', 'keydown'];
        const unlockHandler = () => {
            this.tryUnlockAudio();
            // Remove listeners after unlock
            if (this.audioUnlocked) {
                unlockEvents.forEach(event => {
                    document.removeEventListener(event, unlockHandler);
                });
            }
        };

        unlockEvents.forEach(event => {
            document.addEventListener(event, unlockHandler, { once: false });
        });

        console.log('[ElevenLabs] Service initialized, waiting for audio unlock');
    },

    /**
     * Try to unlock audio by playing a silent sound.
     */
    tryUnlockAudio() {
        if (this.audioUnlocked) return;

        // Create a short silent audio to test autoplay
        const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwmHAAAAAAD/+1DEAAAGAAGn9AAAIAAANIAAAARMQwDAAAANIAAAAQbMEP/hIQQ/5CAv/4SEDv/KAgd/4JCB3/8ub/+XP5c//y5//lz+XP/8uf/5c/lz//Ln/+XAAAAAAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tQxB4AAADSAAAAAAAAANIAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');

        audio.volume = 0.01;
        audio.play()
            .then(() => {
                this.audioUnlocked = true;
                console.log('[ElevenLabs] Audio unlocked successfully');
                audio.pause();

                // If there's a pending scene, narrate it now
                if (this.pendingScene) {
                    const scene = this.pendingScene;
                    this.pendingScene = null;
                    this.narrateScene(scene);
                }
            })
            .catch((err) => {
                console.log('[ElevenLabs] Audio locked, waiting for user interaction');
            });
    },

    // -------------------------------------------------------------------------
    // Configuration Check
    // -------------------------------------------------------------------------

    isConfigured() {
        return Boolean(
            CONFIG.ELEVENLABS?.API_KEY &&
            CONFIG.ELEVENLABS?.VOICE_ID &&
            CONFIG.ELEVENLABS?.API_KEY.length > 0
        );
    },

    isEnabled() {
        return CONFIG.ELEVENLABS?.ENABLED && this.isConfigured();
    },

    // -------------------------------------------------------------------------
    // Cancellation Helpers
    // -------------------------------------------------------------------------

    isCancelled(speakId) {
        return this.cancelledIds.has(speakId) || this.activeSpeakId !== speakId;
    },

    stopCurrentAudio() {
        if (this.currentAudio) {
            try {
                this.currentAudio.pause();
                this.currentAudio.currentTime = 0;
                this.currentAudio.onended = null;
                this.currentAudio.onerror = null;
            } catch (error) {
                console.error('[ElevenLabs] Error pausing audio:', error);
            }
        }
        this.cleanup();
    },

    cleanup() {
        if (this.currentAudioUrl) {
            URL.revokeObjectURL(this.currentAudioUrl);
            this.currentAudioUrl = null;
        }
        this.currentAudio = null;
    },

    // -------------------------------------------------------------------------
    // Text-to-Speech (Streaming)
    // -------------------------------------------------------------------------

    /**
     * Convert text to speech using streaming endpoint.
     * Downloads chunks progressively for lower latency.
     * @param {string} text - Text to speak
     * @returns {Promise<number>} Speak ID for cancellation
     */
    async speak(text) {
        if (!this.isEnabled()) {
            console.log('[ElevenLabs] TTS disabled or not configured');
            return -1;
        }

        if (!text || text.trim().length === 0) {
            console.log('[ElevenLabs] No text to speak');
            return -1;
        }

        // Create unique ID for this speak request
        const speakId = ++this.nextSpeakId;
        this.activeSpeakId = speakId;

        // Stop previous audio
        this.stopCurrentAudio();

        console.log('[ElevenLabs] Starting speech, id:', speakId, 'length:', text.length);

        try {
            const voiceId = CONFIG.ELEVENLABS.VOICE_ID;

            // Use streaming endpoint for lower latency
            const response = await fetch(
                `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
                {
                    method: 'POST',
                    headers: {
                        'xi-api-key': CONFIG.ELEVENLABS.API_KEY,
                        'Content-Type': 'application/json',
                        'Accept': 'audio/mpeg'
                    },
                    body: JSON.stringify({
                        text: text,
                        model_id: CONFIG.ELEVENLABS.MODEL_ID || 'eleven_multilingual_v2',
                        voice_settings: {
                            stability: CONFIG.ELEVENLABS.VOICE_SETTINGS?.stability || 0.5,
                            similarity_boost: CONFIG.ELEVENLABS.VOICE_SETTINGS?.similarity_boost || 0.75,
                            style: CONFIG.ELEVENLABS.VOICE_SETTINGS?.style || 0.0,
                            use_speaker_boost: CONFIG.ELEVENLABS.VOICE_SETTINGS?.use_speaker_boost || true
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }

            // Check cancellation after API call
            if (this.isCancelled(speakId)) {
                console.log('[ElevenLabs] Cancelled during API call, id:', speakId);
                return speakId;
            }

            // Download chunks from stream
            const chunks = [];
            const reader = response.body.getReader();

            console.log('[ElevenLabs] Downloading audio chunks, id:', speakId);

            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    console.log('[ElevenLabs] Download complete, id:', speakId);
                    break;
                }

                // Check cancellation during download
                if (this.isCancelled(speakId)) {
                    console.log('[ElevenLabs] Cancelled during download, id:', speakId);
                    await reader.cancel();
                    return speakId;
                }

                chunks.push(new Uint8Array(value));
            }

            // Check cancellation before playback
            if (this.isCancelled(speakId)) {
                console.log('[ElevenLabs] Cancelled before playback, id:', speakId);
                return speakId;
            }

            // Combine chunks and create blob
            const combinedChunks = this.combineChunks(chunks);
            const audioBlob = new Blob([combinedChunks.buffer], { type: 'audio/mpeg' });
            const audioUrl = URL.createObjectURL(audioBlob);
            this.currentAudioUrl = audioUrl;

            // Play using HTMLAudioElement
            return new Promise((resolve) => {
                if (this.isCancelled(speakId)) {
                    console.log('[ElevenLabs] Cancelled before audio creation, id:', speakId);
                    URL.revokeObjectURL(audioUrl);
                    resolve(speakId);
                    return;
                }

                const audio = new Audio(audioUrl);
                this.currentAudio = audio;

                console.log('[ElevenLabs] Audio element created, id:', speakId);

                audio.onended = () => {
                    console.log('[ElevenLabs] Audio ended, id:', speakId);
                    this.cleanup();
                    resolve(speakId);
                };

                audio.onerror = (e) => {
                    console.error('[ElevenLabs] Audio error, id:', speakId, e);
                    this.cleanup();
                    resolve(speakId);
                };

                audio.oncanplay = () => {
                    if (this.isCancelled(speakId)) {
                        console.log('[ElevenLabs] Cancelled on canplay, id:', speakId);
                        this.cleanup();
                        resolve(speakId);
                        return;
                    }

                    audio.play()
                        .then(() => {
                            console.log('[ElevenLabs] Audio playing, id:', speakId);
                        })
                        .catch((err) => {
                            console.error('[ElevenLabs] Play failed:', err);
                            this.cleanup();
                            resolve(speakId);
                        });
                };

                audio.load();
            });

        } catch (error) {
            console.error('[ElevenLabs] Speech error:', error);
            return speakId;
        }
    },

    /**
     * Combine multiple Uint8Array chunks into one.
     */
    combineChunks(chunks) {
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            combined.set(chunk, offset);
            offset += chunk.length;
        }
        return combined;
    },

    // -------------------------------------------------------------------------
    // Stop/Cancel Functions
    // -------------------------------------------------------------------------

    /**
     * Stop a specific audio by ID.
     * @param {number} speakId - ID to cancel. If not provided, cancels active audio.
     */
    stop(speakId) {
        const idToCancel = speakId ?? this.activeSpeakId;

        console.log('[ElevenLabs] stop called for id:', idToCancel);

        if (idToCancel !== null) {
            this.cancelledIds.add(idToCancel);

            if (idToCancel === this.activeSpeakId) {
                this.stopCurrentAudio();
            }

            // Clean old IDs to prevent memory leak
            if (this.cancelledIds.size > 100) {
                const idsArray = Array.from(this.cancelledIds);
                idsArray.slice(0, idsArray.length - 100).forEach(id => this.cancelledIds.delete(id));
            }
        }
    },

    /**
     * Stop all audio.
     */
    stopAll() {
        console.log('[ElevenLabs] stopAll called');
        if (this.activeSpeakId !== null) {
            this.cancelledIds.add(this.activeSpeakId);
        }
        this.stopCurrentAudio();
        this.activeSpeakId = null;
    },

    /**
     * Check if audio is currently playing.
     */
    isSpeaking() {
        return this.currentAudio !== null && !this.currentAudio.paused;
    },

    // -------------------------------------------------------------------------
    // Content Extraction
    // -------------------------------------------------------------------------

    /**
     * Extract speakable content from a scene.
     */
    extractContentFromScene(scene) {
        if (!scene || !scene.components) {
            return '';
        }

        const textParts = [];

        for (const component of scene.components) {
            const content = this.extractContentFromComponent(component);
            if (content) {
                textParts.push(content);
            }
        }

        return textParts.join('\n\n');
    },

    /**
     * Extract speakable content from a component.
     */
    extractContentFromComponent(component) {
        const type = component.type;
        const data = component.data || {};
        const props = component.props || {};

        switch (type) {
            case 'text_block':
                return data.content || props.content || null;

            case 'calendar_agenda':
            case 'calendar_week':
                return this.formatCalendarForSpeech(data);

            case 'weather_current':
                return this.formatWeatherForSpeech(data);

            case 'weather_forecast':
                return this.formatForecastForSpeech(data);

            case 'countdown_timer':
                return this.formatCountdownForSpeech(data);

            case 'meeting_detail':
                return this.formatMeetingForSpeech(data);

            case 'doc_summary':
            case 'doc_preview':
                return data.content || data.summary || null;

            default:
                return data.content || props.content || null;
        }
    },

    formatCalendarForSpeech(data) {
        if (!data.events || data.events.length === 0) {
            return 'No hay eventos programados.';
        }

        const parts = ['Tus próximos eventos:'];
        for (const event of data.events.slice(0, 5)) {
            const time = event.start_time || event.time || '';
            const title = event.title || event.summary || 'Evento sin título';
            parts.push(`${time}: ${title}`);
        }
        return parts.join('\n');
    },

    formatWeatherForSpeech(data) {
        const location = data.location || 'tu ubicación';
        const temp = data.temperature || data.temp;
        const condition = data.condition || data.description || '';

        if (temp) {
            return `El clima en ${location}: ${temp} grados, ${condition}.`;
        }
        return null;
    },

    formatForecastForSpeech(data) {
        if (!data.forecast || data.forecast.length === 0) {
            return null;
        }

        const parts = ['Pronóstico del tiempo:'];
        for (const day of data.forecast.slice(0, 3)) {
            const dayName = day.day || day.date || '';
            const high = day.high || day.max_temp || '';
            const low = day.low || day.min_temp || '';
            const condition = day.condition || '';
            parts.push(`${dayName}: máxima ${high}, mínima ${low}, ${condition}`);
        }
        return parts.join('\n');
    },

    formatCountdownForSpeech(data) {
        const eventName = data.event_name || data.title || 'el evento';
        const remaining = data.remaining || data.time_remaining || '';

        if (remaining) {
            return `Faltan ${remaining} para ${eventName}.`;
        }
        return null;
    },

    formatMeetingForSpeech(data) {
        const title = data.title || 'Reunión';
        const time = data.start_time || data.time || '';
        const attendees = data.attendees || [];

        let text = `${title}`;
        if (time) text += ` a las ${time}`;
        if (attendees.length > 0) {
            text += `. Participantes: ${attendees.slice(0, 3).join(', ')}`;
        }
        return text;
    },

    // -------------------------------------------------------------------------
    // Text Cleaning
    // -------------------------------------------------------------------------

    cleanTextForSpeech(text) {
        if (!text) return '';

        let cleaned = text;

        // Remove markdown formatting
        cleaned = cleaned.replace(/#{1,6}\s/g, '');
        cleaned = cleaned.replace(/\*\*/g, '');
        cleaned = cleaned.replace(/\*/g, '');
        cleaned = cleaned.replace(/_/g, ' ');
        cleaned = cleaned.replace(/`/g, '');

        // Remove emojis if configured
        if (CONFIG.ELEVENLABS.REMOVE_EMOJIS) {
            cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/gu, '');
        }

        // Clean multiple spaces and newlines
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        cleaned = cleaned.replace(/  +/g, ' ');
        cleaned = cleaned.trim();

        return cleaned;
    },

    // -------------------------------------------------------------------------
    // Scene Narration
    // -------------------------------------------------------------------------

    /**
     * Narrate a scene - extract content and speak it.
     */
    async narrateScene(scene) {
        if (!this.isEnabled()) {
            return -1;
        }

        // If audio is locked, store scene for later
        if (!this.audioUnlocked) {
            console.log('[ElevenLabs] Audio locked, storing scene for later narration');
            this.pendingScene = scene;
            this.tryUnlockAudio();
            return -1;
        }

        let content = this.extractContentFromScene(scene);

        if (!content) {
            console.log('[ElevenLabs] No content to narrate');
            return -1;
        }

        // Clean text for speech
        content = this.cleanTextForSpeech(content);

        // Check text length limit
        const maxLength = CONFIG.ELEVENLABS.MAX_TEXT_LENGTH || 5000;
        if (content.length > maxLength) {
            console.log(`[ElevenLabs] Text truncated from ${content.length} to ${maxLength}`);
            content = content.substring(0, maxLength);
        }

        return await this.speak(content);
    }
};

// Make globally available
window.ElevenLabsService = ElevenLabsService;
