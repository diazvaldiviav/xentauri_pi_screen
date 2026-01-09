/**
 * Xentauri Listen Button - Vanilla JS
 * Floating button for on-demand TTS narration
 *
 * Usage:
 *   const listenBtn = new ListenButton({
 *     container: document.body,
 *     onListen: async (scene) => { ... },
 *     onStop: () => { ... }
 *   });
 *
 *   listenBtn.show(scene);  // Show button with scene data
 *   listenBtn.hide();       // Hide button
 */

(function(global) {
  'use strict';

  // ============================================================================
  // ICONS
  // ============================================================================

  const ICONS = {
    speaker: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>`,
    stop: `<svg viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="2"/>
    </svg>`
  };

  // ============================================================================
  // MAIN CLASS
  // ============================================================================

  function ListenButton(options) {
    if (!(this instanceof ListenButton)) {
      return new ListenButton(options);
    }

    // Options
    this.container = options.container || document.body;

    // State
    this.state = 'idle'; // idle, loading, playing
    this.currentScene = null;
    this.isVisible = false;

    // DOM refs
    this.elements = {};

    // Initialize
    this._createDOM();
  }

  // ============================================================================
  // DOM CREATION
  // ============================================================================

  ListenButton.prototype._createDOM = function() {
    var self = this;

    // Container
    var wrapper = document.createElement('div');
    wrapper.className = 'xti-listen-container';
    this.elements.wrapper = wrapper;

    // Button
    var button = document.createElement('button');
    button.className = 'xti-listen-button';
    button.type = 'button';
    this.elements.button = button;

    // Icon container
    var icon = document.createElement('span');
    icon.className = 'xti-listen-icon';
    this.elements.icon = icon;

    // Label
    var label = document.createElement('span');
    label.className = 'xti-listen-label';
    label.textContent = 'Escuchar';
    this.elements.label = label;

    button.appendChild(icon);
    button.appendChild(label);
    wrapper.appendChild(button);

    // Event listener
    button.addEventListener('click', function() {
      self._handleClick();
    });

    this.container.appendChild(wrapper);

    // Set initial state
    this._updateUI();
  };

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  ListenButton.prototype._handleClick = async function() {
    if (this.state === 'loading') {
      // Don't allow clicks while loading
      return;
    }

    if (this.state === 'playing') {
      // Stop current playback
      this._stopPlayback();
      return;
    }

    // Start narration
    await this._startNarration();
  };

  ListenButton.prototype._startNarration = async function() {
    if (!this.currentScene || !window.ElevenLabsService) {
      console.log('[ListenButton] No scene or ElevenLabs not available');
      return;
    }

    if (!ElevenLabsService.isEnabled()) {
      console.log('[ListenButton] ElevenLabs not enabled or configured');
      return;
    }

    // Set loading state
    this.state = 'loading';
    this._updateUI();

    try {
      console.log('[ListenButton] Starting narration...');

      // Call ElevenLabs to narrate the scene
      const speakId = await ElevenLabsService.narrateScene(this.currentScene);

      if (speakId === -1) {
        // Failed to start
        console.log('[ListenButton] Narration failed to start');
        this.state = 'idle';
        this._updateUI();
        return;
      }

      // Set playing state
      this.state = 'playing';
      this._updateUI();

      // Monitor when audio ends
      this._monitorPlayback();

    } catch (error) {
      console.error('[ListenButton] Narration error:', error);
      this.state = 'idle';
      this._updateUI();
    }
  };

  ListenButton.prototype._stopPlayback = function() {
    if (window.ElevenLabsService) {
      ElevenLabsService.stopAll();
    }
    this.state = 'idle';
    this._updateUI();
  };

  ListenButton.prototype._monitorPlayback = function() {
    var self = this;

    // Check periodically if audio is still playing
    var checkInterval = setInterval(function() {
      if (!window.ElevenLabsService || !ElevenLabsService.isSpeaking()) {
        clearInterval(checkInterval);
        if (self.state === 'playing') {
          self.state = 'idle';
          self._updateUI();
        }
      }
    }, 500);
  };

  // ============================================================================
  // UI UPDATES
  // ============================================================================

  ListenButton.prototype._updateUI = function() {
    var button = this.elements.button;
    var icon = this.elements.icon;
    var label = this.elements.label;

    // Remove all state classes
    button.classList.remove('loading', 'playing');
    button.disabled = false;

    switch (this.state) {
      case 'loading':
        button.classList.add('loading');
        button.disabled = true;
        icon.innerHTML = '<div class="xti-listen-spinner"></div>';
        label.textContent = 'Cargando...';
        break;

      case 'playing':
        button.classList.add('playing');
        icon.innerHTML = this._createSoundWaveHTML();
        label.textContent = 'Detener';
        break;

      default: // idle
        icon.innerHTML = ICONS.speaker;
        label.textContent = 'Escuchar';
        break;
    }
  };

  ListenButton.prototype._createSoundWaveHTML = function() {
    return '<div class="xti-sound-wave">' +
      '<div class="xti-sound-bar"></div>' +
      '<div class="xti-sound-bar"></div>' +
      '<div class="xti-sound-bar"></div>' +
      '<div class="xti-sound-bar"></div>' +
    '</div>';
  };

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Show the button with scene data
   * @param {Object} scene - Scene data to narrate when clicked
   */
  ListenButton.prototype.show = function(scene) {
    // Only show if ElevenLabs is enabled
    if (!window.ElevenLabsService || !ElevenLabsService.isEnabled()) {
      console.log('[ListenButton] ElevenLabs not available, hiding button');
      return;
    }

    this.currentScene = scene;
    this.isVisible = true;
    this.elements.wrapper.classList.add('visible');
  };

  /**
   * Hide the button
   */
  ListenButton.prototype.hide = function() {
    this.isVisible = false;
    this.elements.wrapper.classList.remove('visible');

    // Stop any ongoing playback
    if (this.state !== 'idle') {
      this._stopPlayback();
    }
  };

  /**
   * Update scene data without changing visibility
   * @param {Object} scene - New scene data
   */
  ListenButton.prototype.setScene = function(scene) {
    this.currentScene = scene;

    // If currently playing, stop (scene changed)
    if (this.state !== 'idle') {
      this._stopPlayback();
    }
  };

  /**
   * Check if button is currently visible
   */
  ListenButton.prototype.isShowing = function() {
    return this.isVisible;
  };

  /**
   * Destroy the button
   */
  ListenButton.prototype.destroy = function() {
    if (this.state !== 'idle') {
      this._stopPlayback();
    }

    if (this.elements.wrapper && this.elements.wrapper.parentNode) {
      this.elements.wrapper.parentNode.removeChild(this.elements.wrapper);
    }
  };

  // ============================================================================
  // EXPORT
  // ============================================================================

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ListenButton;
  } else {
    global.ListenButton = ListenButton;
  }

})(typeof window !== 'undefined' ? window : this);
