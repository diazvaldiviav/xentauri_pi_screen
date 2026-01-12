/**
 * Xentauri Thinking Indicator - Vanilla JS
 * Backend-driven phases with multi-language message rotation
 *
 * Usage:
 *   // Initialize (creates but doesn't show)
 *   const indicator = new ThinkingIndicator({
 *     container: document.body,
 *     mascotSrc: './mascot.png' // optional
 *   });
 *
 *   // Show with phase from backend
 *   indicator.show(1, 'Preparando visualizacion...');
 *   indicator.setPhase(2, 'Analizando contenido...');
 *   indicator.setPhase(3, 'Disenando experiencia...');
 *
 *   // Hide when content is ready
 *   indicator.hide();
 */

(function(global) {
  'use strict';

  // ============================================================================
  // PHASE CONFIGURATION - Backend-driven with multi-language messages
  // ============================================================================

  const PHASES = {
    1: {
      id: 'preparing',
      messages: [
        { text: 'Preparando visualizacion...', lang: 'ES' },
        { text: 'Preparing visualization...', lang: 'EN' },
        { text: 'Preparation de la visualisation...', lang: 'FR' },
        { text: 'Preparando visualizacao...', lang: 'PT' },
        { text: 'Vorbereitung der Visualisierung...', lang: 'DE' },
        { text: 'Preparazione della visualizzazione...', lang: 'IT' },
        { text: 'preparing visualization...', lang: 'JA' },
        { text: 'Zhunbei keshihua...', lang: 'ZH' }
      ],
      progress: 15
    },
    2: {
      id: 'analyzing',
      messages: [
        { text: 'Analizando contenido...', lang: 'ES' },
        { text: 'Analyzing content...', lang: 'EN' },
        { text: 'Analyse du contenu...', lang: 'FR' },
        { text: 'Analisando conteudo...', lang: 'PT' },
        { text: 'Inhalt wird analysiert...', lang: 'DE' },
        { text: 'Analizzando il contenuto...', lang: 'IT' },
        { text: 'Kontentsu o bunseki chu...', lang: 'JA' },
        { text: 'Fenxi neirong...', lang: 'ZH' }
      ],
      progress: 45
    },
    3: {
      id: 'designing',
      messages: [
        { text: 'Disenando experiencia...', lang: 'ES' },
        { text: 'Designing experience...', lang: 'EN' },
        { text: "Conception de l'experience...", lang: 'FR' },
        { text: 'Projetando experiencia...', lang: 'PT' },
        { text: 'Erlebnis wird gestaltet...', lang: 'DE' },
        { text: "Progettazione dell'esperienza...", lang: 'IT' },
        { text: 'Taiken o dezain chu...', lang: 'JA' },
        { text: 'Sheji tiyan...', lang: 'ZH' }
      ],
      progress: 75
    }
  };

  // ============================================================================
  // DEFAULT MASCOT SVG
  // ============================================================================

  const DEFAULT_MASCOT_SVG = `
    <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="50" fill="url(#mascotGradient)"/>
      <circle cx="45" cy="50" r="8" fill="white"/>
      <circle cx="75" cy="50" r="8" fill="white"/>
      <circle cx="47" cy="52" r="4" fill="#1a1a2e"/>
      <circle cx="77" cy="52" r="4" fill="#1a1a2e"/>
      <path d="M45 75 Q60 85 75 75" stroke="white" stroke-width="3" stroke-linecap="round" fill="none"/>
      <ellipse cx="30" cy="60" rx="8" ry="5" fill="hsla(190, 100%, 50%, 0.3)"/>
      <ellipse cx="90" cy="60" rx="8" ry="5" fill="hsla(190, 100%, 50%, 0.3)"/>
      <defs>
        <linearGradient id="mascotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="hsl(252, 76%, 60%)"/>
          <stop offset="100%" stop-color="hsl(190, 100%, 50%)"/>
        </linearGradient>
      </defs>
    </svg>
  `;

  // ============================================================================
  // MAIN CLASS
  // ============================================================================

  function ThinkingIndicator(options) {
    if (!(this instanceof ThinkingIndicator)) {
      return new ThinkingIndicator(options);
    }

    // Options
    this.container = options.container || document.body;
    this.mascotSrc = options.mascotSrc || null;
    this.messageInterval = options.messageInterval || 3000;

    // State
    this.currentPhase = 1;
    this.messageIndex = 0;
    this.startTime = null;
    this.timeoutDuration = options.timeoutDuration || (8 * 60 * 1000); // 8 min default
    this.countdownMode = options.countdownMode !== false; // true by default
    this.isVisible = false;
    this.destroyed = false;

    // Timers
    this.timers = {
      message: null,
      time: null
    };

    // DOM refs
    this.elements = {};

    // Initialize DOM (hidden by default)
    this._createDOM();
  }

  // ============================================================================
  // DOM CREATION
  // ============================================================================

  ThinkingIndicator.prototype._createDOM = function() {
    var self = this;

    // Fullscreen overlay
    var overlay = document.createElement('div');
    overlay.className = 'xti-overlay xti-hidden';
    this.elements.overlay = overlay;

    // Main container
    var wrapper = document.createElement('div');
    wrapper.className = 'xti-container xti-hidden';

    // Card
    var card = document.createElement('div');
    card.className = 'xti-card xti-phase-preparing';

    // Particles (reduced to 4 for Pi performance)
    var particles = document.createElement('div');
    particles.className = 'xti-particles';
    for (var i = 0; i < 4; i++) {
      var particle = document.createElement('div');
      particle.className = 'xti-particle';
      particle.style.setProperty('--delay', (Math.random() * 2) + 's');
      particle.style.setProperty('--duration', (2 + Math.random() * 2) + 's');
      particle.style.left = 'calc(50% + ' + (Math.random() * 80 - 40) + 'px)';
      particle.style.top = 'calc(50% + ' + (Math.random() * 80 - 40) + 'px)';
      particles.appendChild(particle);
    }
    card.appendChild(particles);

    // Mascot section
    var mascotSection = document.createElement('div');
    mascotSection.className = 'xti-mascot-section';

    var glowRing = document.createElement('div');
    glowRing.className = 'xti-glow-ring';
    mascotSection.appendChild(glowRing);

    var mascotContainer = document.createElement('div');
    mascotContainer.className = 'xti-mascot-container';

    var mascotFloat = document.createElement('div');
    mascotFloat.className = 'xti-mascot-float';

    if (this.mascotSrc) {
      var img = document.createElement('img');
      img.src = this.mascotSrc;
      img.alt = 'Loading mascot';
      img.className = 'xti-mascot-image';
      mascotFloat.appendChild(img);
    } else {
      mascotFloat.innerHTML = DEFAULT_MASCOT_SVG;
    }

    mascotContainer.appendChild(mascotFloat);
    mascotSection.appendChild(mascotContainer);
    card.appendChild(mascotSection);

    // Message section
    var messageSection = document.createElement('div');
    messageSection.className = 'xti-message-section';

    var messageContainer = document.createElement('div');
    messageContainer.className = 'xti-message-container';

    var messageText = document.createElement('p');
    messageText.className = 'xti-message-text';
    this.elements.messageText = messageText;

    var messageLang = document.createElement('span');
    messageLang.className = 'xti-message-lang';
    this.elements.messageLang = messageLang;

    messageContainer.appendChild(messageText);
    messageContainer.appendChild(messageLang);
    messageSection.appendChild(messageContainer);
    card.appendChild(messageSection);

    // Progress section
    var progressSection = document.createElement('div');
    progressSection.className = 'xti-progress-section';

    var progressTrack = document.createElement('div');
    progressTrack.className = 'xti-progress-track';

    var progressBar = document.createElement('div');
    progressBar.className = 'xti-progress-bar';
    this.elements.progressBar = progressBar;

    var shimmer = document.createElement('div');
    shimmer.className = 'xti-progress-shimmer';

    progressTrack.appendChild(progressBar);
    progressTrack.appendChild(shimmer);

    var progressLabel = document.createElement('div');
    progressLabel.className = 'xti-progress-label';

    var phaseLabel = document.createElement('span');
    phaseLabel.textContent = 'Fase 1/3';
    this.elements.phaseLabel = phaseLabel;

    var timeLabel = document.createElement('span');
    timeLabel.className = 'xti-time';
    timeLabel.textContent = '0:00';
    this.elements.time = timeLabel;

    progressLabel.appendChild(phaseLabel);
    progressLabel.appendChild(timeLabel);
    progressSection.appendChild(progressTrack);
    progressSection.appendChild(progressLabel);
    card.appendChild(progressSection);

    // Footer with dots
    var footer = document.createElement('div');
    footer.className = 'xti-footer';

    var footerLeft = document.createElement('div');
    footerLeft.className = 'xti-footer-left';

    // Dots
    var dots = document.createElement('div');
    dots.className = 'xti-dots';
    for (var d = 0; d < 3; d++) {
      var dot = document.createElement('div');
      dot.className = 'xti-dot';
      dot.style.setProperty('--dot-delay', (d * 0.15) + 's');
      dots.appendChild(dot);
    }
    footerLeft.appendChild(dots);

    footer.appendChild(footerLeft);
    card.appendChild(footer);

    wrapper.appendChild(card);
    overlay.appendChild(wrapper);

    this.elements.wrapper = wrapper;
    this.elements.card = card;

    this.container.appendChild(overlay);
  };

  // ============================================================================
  // PUBLIC METHODS
  // ============================================================================

  /**
   * Show the indicator with initial phase
   * @param {number} phase - Phase number (1, 2, or 3)
   * @param {string} message - Message from backend (used as primary Spanish message)
   */
  ThinkingIndicator.prototype.show = function(phase, message) {
    if (this.destroyed || this.isVisible) return;

    this.isVisible = true;
    this.startTime = Date.now();
    this.messageIndex = 0;

    // Set initial phase
    this.setPhase(phase, message);

    // Show overlay
    var overlay = this.elements.overlay;
    var wrapper = this.elements.wrapper;

    overlay.classList.remove('xti-hidden');

    // Force reflow then animate in
    overlay.offsetHeight;
    wrapper.classList.remove('xti-hidden');
    wrapper.classList.add('xti-visible');

    // Start timers
    this._startTimers();
  };

  /**
   * Hide the indicator
   */
  ThinkingIndicator.prototype.hide = function() {
    if (this.destroyed || !this.isVisible) return;

    this.isVisible = false;
    this._stopTimers();

    var self = this;
    var wrapper = this.elements.wrapper;
    var overlay = this.elements.overlay;

    wrapper.classList.remove('xti-visible');
    wrapper.classList.add('xti-hidden');

    setTimeout(function() {
      overlay.classList.add('xti-hidden');
    }, 300);
  };

  /**
   * Update to a new phase
   * @param {number} phase - Phase number (1, 2, or 3)
   * @param {string} message - Message from backend (optional override)
   */
  ThinkingIndicator.prototype.setPhase = function(phase, message) {
    if (this.destroyed) return;

    var phaseConfig = PHASES[phase];
    if (!phaseConfig) {
      console.warn('[ThinkingIndicator] Invalid phase:', phase);
      return;
    }

    this.currentPhase = phase;
    this.messageIndex = 0;

    // Update phase class for colors
    this._updatePhaseClass(phaseConfig.id);

    // Update progress bar
    this.elements.progressBar.style.width = phaseConfig.progress + '%';
    this.elements.phaseLabel.textContent = 'Fase ' + phase + '/3';

    // Trigger bounce animation
    this._triggerPhaseChange();

    // Update message immediately
    this._updateMessage();
  };

  /**
   * Destroy the indicator and clean up
   */
  ThinkingIndicator.prototype.destroy = function() {
    if (this.destroyed) return;
    this.destroyed = true;

    this._stopTimers();

    if (this.elements.overlay && this.elements.overlay.parentNode) {
      this.elements.overlay.parentNode.removeChild(this.elements.overlay);
    }
  };

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  ThinkingIndicator.prototype._startTimers = function() {
    var self = this;

    // Message rotation timer - rotates languages within current phase
    this.timers.message = setInterval(function() {
      if (self.destroyed || !self.isVisible) return;
      self._rotateMessage();
    }, this.messageInterval);

    // Time update timer
    this.timers.time = setInterval(function() {
      if (self.destroyed || !self.isVisible) return;
      self._updateTime();
    }, 1000);
  };

  ThinkingIndicator.prototype._stopTimers = function() {
    if (this.timers.message) {
      clearInterval(this.timers.message);
      this.timers.message = null;
    }
    if (this.timers.time) {
      clearInterval(this.timers.time);
      this.timers.time = null;
    }
  };

  ThinkingIndicator.prototype._updatePhaseClass = function(phaseId) {
    var card = this.elements.card;
    var phases = ['preparing', 'analyzing', 'designing'];

    phases.forEach(function(p) {
      card.classList.remove('xti-phase-' + p);
    });

    card.classList.add('xti-phase-' + phaseId);
  };

  ThinkingIndicator.prototype._triggerPhaseChange = function() {
    var mascot = this.elements.card.querySelector('.xti-mascot-container');
    if (!mascot) return;

    mascot.classList.add('xti-phase-bounce');

    setTimeout(function() {
      mascot.classList.remove('xti-phase-bounce');
    }, 300);
  };

  ThinkingIndicator.prototype._updateMessage = function() {
    var phaseConfig = PHASES[this.currentPhase];
    if (!phaseConfig) return;

    var message = phaseConfig.messages[this.messageIndex];
    if (!message) return;

    var textEl = this.elements.messageText;
    var langEl = this.elements.messageLang;

    // Fade out
    textEl.classList.add('xti-fade-out');
    langEl.classList.add('xti-fade-out');

    setTimeout(function() {
      textEl.textContent = message.text;
      langEl.textContent = message.lang;
      textEl.classList.remove('xti-fade-out');
      langEl.classList.remove('xti-fade-out');
    }, 150);
  };

  ThinkingIndicator.prototype._rotateMessage = function() {
    var phaseConfig = PHASES[this.currentPhase];
    if (!phaseConfig) return;

    this.messageIndex = (this.messageIndex + 1) % phaseConfig.messages.length;
    this._updateMessage();
  };

  ThinkingIndicator.prototype._updateTime = function() {
    if (!this.startTime) return;

    var elapsed = Date.now() - this.startTime;
    var totalSeconds;

    if (this.countdownMode) {
      // Countdown: show remaining time
      var remaining = Math.max(0, this.timeoutDuration - elapsed);
      totalSeconds = Math.ceil(remaining / 1000);
    } else {
      // Elapsed: show time passed
      totalSeconds = Math.floor(elapsed / 1000);
    }

    var mins = Math.floor(totalSeconds / 60);
    var secs = totalSeconds % 60;

    this.elements.time.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
  };

  // ============================================================================
  // EXPORT
  // ============================================================================

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThinkingIndicator;
  } else {
    global.ThinkingIndicator = ThinkingIndicator;
  }

})(typeof window !== 'undefined' ? window : this);
