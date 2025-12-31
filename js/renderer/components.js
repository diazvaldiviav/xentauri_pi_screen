/* =============================================================================
   XENTAURI PI SCREEN - Component Renderers
   ============================================================================= */

/**
 * Component renderers for all 17 Xentauri Scene Graph component types.
 *
 * Categories:
 * - Calendar: calendar_day, calendar_week, calendar_month, calendar_widget,
 *             calendar_agenda, meeting_detail
 * - Utility: clock_digital, clock_analog, weather_current, countdown_timer,
 *            event_countdown, text_block, spacer
 * - Content: image_display, web_embed, doc_summary, doc_preview
 */
const ComponentRenderers = {
    // -------------------------------------------------------------------------
    // Calendar Components
    // -------------------------------------------------------------------------

    /**
     * Render calendar agenda view.
     */
    calendar_agenda(data, props) {
        const container = document.createElement('div');
        container.className = 'calendar-agenda';

        const events = data?.events || [];

        if (events.length === 0) {
            container.innerHTML = '<p class="no-events">No upcoming events</p>';
            return container;
        }

        const maxEvents = props?.max_events || 10;
        const displayEvents = events.slice(0, maxEvents);

        displayEvents.forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = 'agenda-event';
            eventEl.style.borderLeftColor = event.color || '#4285f4';

            const time = event.is_all_day ? 'All Day' : Helpers.formatTime(event.start);
            eventEl.innerHTML = `
                <div class="agenda-event-title">${Helpers.escapeHtml(event.title)}</div>
                <div class="agenda-event-time">${time}${event.location ? ' \u2022 ' + Helpers.escapeHtml(event.location) : ''}</div>
            `;
            container.appendChild(eventEl);
        });

        return container;
    },

    /**
     * Render calendar widget (compact sidebar view).
     */
    calendar_widget(data, props) {
        const container = document.createElement('div');
        container.className = 'calendar-widget';

        const events = data?.events || [];
        const maxEvents = props?.max_events || 5;

        const title = document.createElement('h3');
        title.textContent = 'Upcoming';
        container.appendChild(title);

        if (events.length === 0) {
            container.innerHTML += '<p class="no-events">No upcoming events</p>';
            return container;
        }

        events.slice(0, maxEvents).forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = 'calendar-widget-event';

            const dot = document.createElement('div');
            dot.className = 'event-dot';
            dot.style.background = event.color || '#4285f4';

            const info = document.createElement('div');
            info.className = 'event-info';
            info.innerHTML = `
                <div class="event-info-title">${Helpers.escapeHtml(event.title)}</div>
                <div class="event-info-time">${Helpers.formatTime(event.start)}</div>
            `;

            eventEl.appendChild(dot);
            eventEl.appendChild(info);
            container.appendChild(eventEl);
        });

        return container;
    },

    /**
     * Render calendar day view.
     */
    calendar_day(data, props) {
        // Use agenda view with day-specific styling
        return this.calendar_agenda(data, { ...props, max_events: 15 });
    },

    /**
     * Render calendar week view.
     */
    calendar_week(data, props) {
        // Use agenda view with week-specific settings
        return this.calendar_agenda(data, { ...props, max_events: 20 });
    },

    /**
     * Render calendar month view.
     */
    calendar_month(data, props) {
        const container = document.createElement('div');
        container.className = 'calendar-month';

        const header = document.createElement('h3');
        header.textContent = new Date().toLocaleDateString('en-US', {
            month: 'long',
            year: 'numeric'
        });
        container.appendChild(header);

        // Add agenda below
        const agenda = this.calendar_agenda(data, { ...props, max_events: 10 });
        container.appendChild(agenda);

        return container;
    },

    /**
     * Render meeting detail view.
     */
    meeting_detail(data, props) {
        const container = document.createElement('div');
        container.className = 'meeting-detail';

        if (data?.empty) {
            container.innerHTML = '<p class="no-events">No upcoming meetings</p>';
            return container;
        }

        if (data?.error) {
            container.innerHTML = `<p class="error">${Helpers.escapeHtml(data.error)}</p>`;
            return container;
        }

        const startTime = data?.start_time
            ? new Date(data.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';
        const endTime = data?.end_time
            ? new Date(data.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '';

        container.innerHTML = `
            <h2>${Helpers.escapeHtml(data?.title || 'Meeting')}</h2>
            <div class="meeting-detail-time">
                ${data?.is_all_day ? 'All Day' : `${startTime} - ${endTime}`}
            </div>
            ${data?.location ? `<div class="meeting-detail-location">\uD83D\uDCCD ${Helpers.escapeHtml(data.location)}</div>` : ''}
            ${data?.description ? `<div class="meeting-detail-description">${Helpers.escapeHtml(Helpers.truncate(data.description, 300))}</div>` : ''}
            ${data?.attendees && data.attendees.length > 0 ? `
                <div class="meeting-detail-attendees">
                    \uD83D\uDC65 ${data.attendees.length} attendee${data.attendees.length > 1 ? 's' : ''}
                </div>
            ` : ''}
        `;

        return container;
    },

    // -------------------------------------------------------------------------
    // Clock Components
    // -------------------------------------------------------------------------

    /**
     * Render digital clock.
     */
    clock_digital(data, props) {
        const container = document.createElement('div');
        container.className = 'clock-digital';

        const timeEl = document.createElement('div');
        timeEl.className = 'clock-time';

        const dateEl = document.createElement('div');
        dateEl.className = 'clock-date';

        function updateClock() {
            const now = new Date();
            const format = props?.format || CONFIG.CLOCK_FORMAT || '12h';

            let hours = now.getHours();
            let ampm = '';

            if (format === '12h') {
                ampm = hours >= 12 ? ' PM' : ' AM';
                hours = hours % 12 || 12;
            }

            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = props?.show_seconds
                ? ':' + String(now.getSeconds()).padStart(2, '0')
                : '';

            timeEl.textContent = `${hours}:${minutes}${seconds}${ampm}`;

            if (props?.show_date !== false) {
                dateEl.textContent = now.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                });
            }
        }

        updateClock();
        const intervalId = setInterval(updateClock, 1000);

        // Store interval ID for cleanup
        container.dataset.intervalId = intervalId;

        container.appendChild(timeEl);
        if (props?.show_date !== false) {
            container.appendChild(dateEl);
        }

        return container;
    },

    /**
     * Render analog clock (fallback to digital for now).
     */
    clock_analog(data, props) {
        // TODO: Implement SVG-based analog clock
        return this.clock_digital(data, props);
    },

    // -------------------------------------------------------------------------
    // Weather Component
    // -------------------------------------------------------------------------

    /**
     * Render current weather.
     */
    weather_current(data, props) {
        const container = document.createElement('div');
        container.className = 'weather-current';

        const icon = Helpers.getWeatherIcon(data?.condition || 'sunny');
        const temp = data?.temperature || '--';
        const units = props?.units || CONFIG.WEATHER_UNITS || 'fahrenheit';
        const unit = units === 'celsius' ? '\u00B0C' : '\u00B0F';

        container.innerHTML = `
            <div class="weather-icon">${icon}</div>
            <div class="weather-temp">${temp}${unit}</div>
            <div class="weather-location">${Helpers.escapeHtml(data?.location || '')}</div>
            ${data?.is_placeholder ? '<div class="weather-placeholder">Demo data</div>' : ''}
        `;

        return container;
    },

    // -------------------------------------------------------------------------
    // Countdown Components
    // -------------------------------------------------------------------------

    /**
     * Render countdown timer.
     */
    countdown_timer(data, props) {
        const container = document.createElement('div');
        container.className = 'countdown-timer';

        if (data?.error) {
            container.innerHTML = `<p class="error">${Helpers.escapeHtml(data.error)}</p>`;
            return container;
        }

        if (data?.empty) {
            container.innerHTML = '<p>No upcoming events</p>';
            return container;
        }

        let seconds = data?.seconds_until || 0;

        container.innerHTML = `
            <div class="countdown-label">${Helpers.escapeHtml(data?.target_label || 'Countdown')}</div>
            <div class="countdown-display">${Helpers.formatDuration(seconds)}</div>
        `;

        // Store remaining seconds for live countdown
        container.dataset.secondsUntil = seconds;

        // Start live countdown
        const intervalId = setInterval(() => {
            if (!document.contains(container)) {
                clearInterval(intervalId);
                return;
            }

            const display = container.querySelector('.countdown-display');
            let remaining = parseInt(container.dataset.secondsUntil);

            if (display && remaining > 0) {
                remaining--;
                container.dataset.secondsUntil = remaining;
                display.textContent = Helpers.formatDuration(remaining);
            } else if (remaining <= 0) {
                clearInterval(intervalId);
            }
        }, 1000);

        container.dataset.intervalId = intervalId;

        return container;
    },

    /**
     * Render event countdown (alias for countdown_timer).
     */
    event_countdown(data, props) {
        return this.countdown_timer(data, props);
    },

    // -------------------------------------------------------------------------
    // Text & Layout Components
    // -------------------------------------------------------------------------

    /**
     * Render text block.
     */
    text_block(data, props) {
        const el = document.createElement('div');
        el.className = 'text-block';

        if (props?.font_size) {
            el.style.fontSize = props.font_size;
        }

        // Use props.content first, fallback to data.content
        const content = props?.content || data?.content || '';
        el.textContent = content;

        return el;
    },

    /**
     * Render spacer.
     */
    spacer(data, props) {
        const el = document.createElement('div');
        el.className = 'spacer';
        el.style.minHeight = props?.size || '16px';
        return el;
    },

    // -------------------------------------------------------------------------
    // Content Components
    // -------------------------------------------------------------------------

    /**
     * Render image display.
     */
    image_display(data, props) {
        const container = document.createElement('div');
        container.className = 'image-display';

        const img = document.createElement('img');
        img.src = data?.url || '';
        img.alt = data?.alt || '';
        img.style.objectFit = props?.fit || 'contain';

        container.appendChild(img);
        return container;
    },

    /**
     * Render web embed (iframe).
     */
    web_embed(data, props) {
        const container = document.createElement('div');
        container.className = 'web-embed';

        const iframe = document.createElement('iframe');
        iframe.src = data?.url || '';
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');

        container.appendChild(iframe);
        return container;
    },

    /**
     * Render document summary.
     */
    doc_summary(data, props) {
        const container = document.createElement('div');
        container.className = 'doc-summary';

        if (data?.error) {
            container.innerHTML = `<p class="error">${Helpers.escapeHtml(data.error)}</p>`;
            return container;
        }

        // Check for AI-generated content (takes priority)
        if (data?.generated_content) {
            const formattedContent = this._formatGeneratedContent(
                data.generated_content,
                data.content_type
            );

            container.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 16px;">
                    <h3>\uD83D\uDCC4 ${Helpers.escapeHtml(data?.title || 'Document')}</h3>
                    <span class="ai-badge">\u2728 AI</span>
                </div>
                <div class="ai-content">${formattedContent}</div>
            `;
            return container;
        }

        // Standard display
        const keyPointsHtml = data?.key_points && data.key_points.length > 0
            ? `<ul class="doc-key-points">
                 ${data.key_points.map(point => `<li>${Helpers.escapeHtml(point)}</li>`).join('')}
               </ul>`
            : '';

        container.innerHTML = `
            <h3>\uD83D\uDCC4 ${Helpers.escapeHtml(data?.title || 'Document')}</h3>
            ${data?.summary ? `<p class="doc-summary-text">${Helpers.escapeHtml(data.summary)}</p>` : ''}
            ${data?.preview_text ? `<p class="doc-summary-text" style="opacity: 0.7;">${Helpers.escapeHtml(data.preview_text)}</p>` : ''}
            ${keyPointsHtml}
            ${data?.last_modified ? `<div class="doc-last-modified">Last modified: ${new Date(data.last_modified).toLocaleDateString()}</div>` : ''}
        `;

        return container;
    },

    /**
     * Render document preview (reuses doc_summary).
     */
    doc_preview(data, props) {
        return this.doc_summary(data, props);
    },

    // -------------------------------------------------------------------------
    // Unknown Component Fallback
    // -------------------------------------------------------------------------

    /**
     * Render unknown component type.
     */
    unknown(type) {
        const el = document.createElement('div');
        el.className = 'unknown-component';
        el.textContent = `Unknown component: ${type}`;
        return el;
    },

    // -------------------------------------------------------------------------
    // Helper Methods
    // -------------------------------------------------------------------------

    /**
     * Format AI-generated content for display.
     */
    _formatGeneratedContent(content, contentType) {
        if (!content) return '';

        // Escape HTML first
        let formatted = Helpers.escapeHtml(content);

        // Convert markdown-style formatting
        // Bold: **text** or __text__
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.replace(/__(.*?)__/g, '<strong>$1</strong>');

        // Italic: *text* or _text_
        formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        formatted = formatted.replace(/_([^_]+)_/g, '<em>$1</em>');

        // Convert numbered lists
        formatted = formatted.replace(
            /^(\d+)\.\s+(.+)$/gm,
            '<div style="margin: 8px 0; padding-left: 20px;"><span style="color: #7b2cbf; font-weight: bold;">$1.</span> $2</div>'
        );

        // Convert bullet points
        formatted = formatted.replace(
            /^[-\u2022]\s+(.+)$/gm,
            '<div style="margin: 8px 0; padding-left: 20px;">\u2022 $1</div>'
        );

        // Convert line breaks
        formatted = formatted.replace(/\n\n/g, '</p><p style="margin: 12px 0;">');
        formatted = formatted.replace(/\n/g, '<br>');

        // Wrap in paragraph if not structured
        if (!formatted.includes('<div') && !formatted.includes('<p')) {
            formatted = `<p style="margin: 0;">${formatted}</p>`;
        }

        // Special styling based on content type
        if (contentType === 'impact_phrases') {
            formatted = `<div style="font-size: 1.1em; font-weight: 500;">${formatted}</div>`;
        } else if (contentType === 'script') {
            formatted = `<div style="font-family: 'Georgia', serif; line-height: 1.8;">${formatted}</div>`;
        } else if (contentType === 'action_items') {
            formatted = formatted.replace(/\u2022/g, '\u2610');
        }

        return formatted;
    }
};

// Make globally available
window.ComponentRenderers = ComponentRenderers;
