/* =============================================================================
   XENTAURI PI SCREEN - Scene Graph Renderer
   ============================================================================= */

/**
 * Scene Graph renderer for Xentauri.
 * Handles rendering of complete scene graphs with layout and components.
 */
const SceneRenderer = {
    // Current scene reference
    currentScene: null,

    // Current custom layout HTML (Sprint 5.2)
    currentCustomLayout: null,

    // Container element
    container: null,

    // -------------------------------------------------------------------------
    // Initialization
    // -------------------------------------------------------------------------

    /**
     * Initialize the scene renderer.
     * @param {string|Element} containerSelector - Container element or selector
     */
    init(containerSelector) {
        if (typeof containerSelector === 'string') {
            this.container = document.querySelector(containerSelector);
        } else {
            this.container = containerSelector;
        }

        if (!this.container) {
            console.error('[SceneRenderer] Container not found');
            return false;
        }

        Helpers.debug('SceneRenderer', 'Initialized');
        return true;
    },

    // -------------------------------------------------------------------------
    // Scene Rendering
    // -------------------------------------------------------------------------

    /**
     * Render a complete scene graph.
     * @param {Object} scene - Scene graph data
     */
    render(scene) {
        if (!this.container) {
            console.error('[SceneRenderer] Container not initialized');
            return;
        }

        Helpers.debug('SceneRenderer', 'Rendering scene', {
            sceneId: scene.scene_id,
            components: scene.components?.length || 0,
            layout: scene.layout?.intent
        });

        // Clear current content
        this.clear();

        // Create scene container with global styles
        const sceneEl = document.createElement('div');
        sceneEl.className = 'scene-container';
        sceneEl.id = scene.scene_id || 'scene';

        // Apply global styles
        const globalStyle = scene.global_style || {};
        sceneEl.style.cssText = `
            width: 100%;
            height: 100%;
            background: ${globalStyle.background || '#0f0f23'};
            font-family: ${globalStyle.font_family || 'Inter'}, -apple-system, BlinkMacSystemFont, sans-serif;
            color: ${globalStyle.text_color || '#ffffff'};
            padding: ${CONFIG.LAYOUT.DEFAULT_PADDING};
            box-sizing: border-box;
        `;

        // Apply layout
        this.applyLayout(sceneEl, scene.layout);

        // Render each component
        const components = scene.components || [];
        components.forEach(comp => {
            const element = this.renderComponent(comp);
            sceneEl.appendChild(element);
        });

        // Add to container
        this.container.appendChild(sceneEl);

        // Store current scene
        this.currentScene = scene;

        Helpers.debug('SceneRenderer', `Scene rendered: ${scene.layout?.intent || 'default'} layout with ${components.length} components`);
    },

    /**
     * Clear the current scene or custom layout.
     */
    clear() {
        if (this.container) {
            // Cleanup any intervals from clock components
            const clocks = this.container.querySelectorAll('[data-interval-id]');
            clocks.forEach(el => {
                const intervalId = el.dataset.intervalId;
                if (intervalId) {
                    clearInterval(parseInt(intervalId));
                }
            });

            this.container.innerHTML = '';
        }
        this.currentScene = null;
        this.currentCustomLayout = null;
    },

    // -------------------------------------------------------------------------
    // Layout Application
    // -------------------------------------------------------------------------

    /**
     * Apply layout to a container.
     * @param {Element} container - Container element
     * @param {Object} layout - Layout specification
     */
    applyLayout(container, layout) {
        const intent = layout?.intent || 'fullscreen';
        const gap = layout?.gap || CONFIG.LAYOUT.DEFAULT_GAP;

        switch (intent) {
            case 'fullscreen':
                container.style.display = 'flex';
                break;

            case 'sidebar':
                container.style.display = 'grid';
                container.style.gridTemplateColumns = '3fr 1fr';
                container.style.gap = gap;
                break;

            case 'dashboard':
                container.style.display = 'grid';
                container.style.gridTemplateColumns = '1fr 1fr';
                container.style.gridTemplateRows = '1fr 1fr';
                container.style.gap = gap;
                break;

            case 'stack':
                container.style.display = 'flex';
                container.style.flexDirection = 'column';
                container.style.gap = gap;
                break;

            case 'overlay':
                container.style.position = 'relative';
                break;

            default:
                // Default to flex
                container.style.display = 'flex';
        }

        Helpers.debug('SceneRenderer', `Applied layout: ${intent}`);
    },

    // -------------------------------------------------------------------------
    // Component Rendering
    // -------------------------------------------------------------------------

    /**
     * Render a single component.
     * @param {Object} component - Component data
     * @returns {Element} Rendered component element
     */
    renderComponent(component) {
        const wrapper = document.createElement('div');
        wrapper.className = `component component-${component.type}`;
        wrapper.id = component.id;

        // Apply position (for grid layouts)
        if (component.position) {
            if (component.position.grid_column) {
                wrapper.style.gridColumn = component.position.grid_column;
            }
            if (component.position.grid_row) {
                wrapper.style.gridRow = component.position.grid_row;
            }
            if (component.position.flex) {
                wrapper.style.flex = component.position.flex;
            }
            if (component.position.z_index) {
                wrapper.style.zIndex = component.position.z_index;
            }
        }

        // Apply component style with fallback defaults
        const defaultStyle = {
            background: component.priority === 'primary' ? '#1a1a2e' : '#16213e',
            text_color: '#ffffff',
            border_radius: CONFIG.LAYOUT.DEFAULT_BORDER_RADIUS,
            padding: '20px'
        };
        const style = { ...defaultStyle, ...(component.style || {}) };

        wrapper.style.background = style.background;
        wrapper.style.color = style.text_color;
        wrapper.style.borderRadius = style.border_radius;
        wrapper.style.padding = style.padding;

        if (style.shadow) {
            wrapper.style.boxShadow = style.shadow;
        }

        // Render content based on type
        const content = this.renderComponentContent(component);
        wrapper.appendChild(content);

        return wrapper;
    },

    /**
     * Render component content based on type.
     * @param {Object} component - Component data
     * @returns {Element} Rendered content element
     */
    renderComponentContent(component) {
        const { type, data, props } = component;

        // Get renderer for this component type
        const renderer = ComponentRenderers[type];

        if (renderer) {
            return renderer.call(ComponentRenderers, data, props);
        }

        // Unknown component type
        Helpers.debug('SceneRenderer', `Unknown component type: ${type}`);
        return ComponentRenderers.unknown(type);
    },

    // -------------------------------------------------------------------------
    // Idle Screen
    // -------------------------------------------------------------------------

    // -------------------------------------------------------------------------
    // Custom Layout Rendering (Sprint 5.2)
    // -------------------------------------------------------------------------

    /**
     * Render custom HTML layout.
     * DEMO MODE: Uses innerHTML for full JS support.
     * WARNING: Not secure for production - enables XSS.
     *
     * @param {string} html - HTML string from Opus
     * @param {Object} sceneFallback - Scene to use if custom layout fails
     * @returns {boolean} True if rendering succeeded
     */
    renderCustomLayout(html, sceneFallback = null) {
        if (!this.container) {
            console.error('[SceneRenderer] Container not initialized');
            return false;
        }

        if (!html || typeof html !== 'string') {
            console.error('[SceneRenderer] Invalid HTML provided');
            return false;
        }

        Helpers.debug('SceneRenderer', 'Rendering custom layout (DEMO MODE - JS enabled)', {
            htmlLength: html.length,
            hasFallback: !!sceneFallback
        });

        // Clear current content
        this.clear();

        // Create wrapper for the custom layout
        const wrapper = document.createElement('div');
        wrapper.id = 'custom-layout-wrapper';
        wrapper.style.cssText = `
            width: 100%;
            height: 100%;
            position: absolute;
            top: 0;
            left: 0;
            overflow: hidden;
        `;

        // Extract body content if full HTML document
        let contentHtml = html;

        // If it's a full HTML document, extract just the body and styles
        if (html.toLowerCase().includes('<!doctype') || html.toLowerCase().includes('<html')) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            // Get all styles and transform selectors
            const styles = doc.querySelectorAll('style');
            let styleContent = '';
            styles.forEach(style => {
                // Transform body/html selectors to target wrapper
                let css = style.textContent;
                css = this._transformCssSelectors(css);
                styleContent += `<style>${css}</style>`;
            });

            // Get body content
            const bodyContent = doc.body ? doc.body.innerHTML : html;

            // Get body inline styles and apply to wrapper
            if (doc.body) {
                const bodyStyle = doc.body.getAttribute('style');
                if (bodyStyle) {
                    wrapper.style.cssText += '; ' + bodyStyle;
                }
                // Copy body classes
                if (doc.body.className) {
                    wrapper.className = doc.body.className + ' custom-layout-wrapper';
                }
            }

            // Combine styles + body
            contentHtml = styleContent + bodyContent;
        }

        // DEMO MODE: Direct innerHTML injection (enables JS)
        // WARNING: This is NOT secure - only for demo purposes
        wrapper.innerHTML = contentHtml;

        // Add wrapper to DOM FIRST so scripts can find elements
        this.container.appendChild(wrapper);

        // Setup DOMContentLoaded interception BEFORE executing scripts
        const domReadyCallbacks = [];
        const originalAddEventListener = document.addEventListener.bind(document);
        document.addEventListener = function(type, fn, options) {
            if (type === 'DOMContentLoaded') {
                domReadyCallbacks.push(fn);
            } else {
                originalAddEventListener(type, fn, options);
            }
        };

        const windowOriginalAddEventListener = window.addEventListener.bind(window);
        window.addEventListener = function(type, fn, options) {
            if (type === 'load' || type === 'DOMContentLoaded') {
                domReadyCallbacks.push(fn);
            } else {
                windowOriginalAddEventListener(type, fn, options);
            }
        };

        // Execute any scripts in the content
        // NOTE: Using eval() instead of script replacement for reliable execution
        const scripts = wrapper.querySelectorAll('script');
        scripts.forEach(oldScript => {
            if (oldScript.src) {
                // External scripts: load via new script tag
                const newScript = document.createElement('script');
                newScript.src = oldScript.src;
                oldScript.parentNode.replaceChild(newScript, oldScript);
            } else {
                // Inline scripts: execute via eval to preserve global scope
                let jsCode = oldScript.textContent;
                jsCode = jsCode.replace(/document\.body/g, "document.getElementById('custom-layout-wrapper')");
                try {
                    // Use indirect eval (1,eval) to run in GLOBAL scope
                    // Direct eval() runs in local scope, indirect eval runs globally
                    (1, eval)(jsCode);
                } catch (e) {
                    console.error('[SceneRenderer] Script execution error:', e);
                    console.error('[SceneRenderer] Failed script preview:', jsCode.substring(0, 200));
                }
                // Remove old script tag
                oldScript.remove();
            }
        });

        // Restore original addEventListener
        document.addEventListener = originalAddEventListener;
        window.addEventListener = windowOriginalAddEventListener;

        // Execute captured DOMContentLoaded callbacks
        domReadyCallbacks.forEach(fn => {
            try {
                fn();
            } catch (e) {
                console.error('[SceneRenderer] Error in DOMContentLoaded callback:', e);
            }
        });

        // Store reference
        this.currentCustomLayout = html;
        this.currentScene = null;

        Helpers.debug('SceneRenderer', 'Custom layout rendered (DEMO MODE)');
        return true;
    },

    /**
     * Transform CSS selectors: body/html -> #custom-layout-wrapper
     * @param {string} css - CSS string to transform
     * @returns {string} Transformed CSS
     */
    _transformCssSelectors(css) {
        // body { ... } -> #custom-layout-wrapper { ... }
        css = css.replace(/\bbody\s*\{/gi, '#custom-layout-wrapper {');

        // html { ... } -> #custom-layout-wrapper { ... }
        css = css.replace(/\bhtml\s*\{/gi, '#custom-layout-wrapper {');

        // html, body { ... } -> #custom-layout-wrapper { ... }
        css = css.replace(/\bhtml\s*,\s*body\s*\{/gi, '#custom-layout-wrapper {');
        css = css.replace(/\bbody\s*,\s*html\s*\{/gi, '#custom-layout-wrapper {');

        // body.class or body#id -> #custom-layout-wrapper.class or #custom-layout-wrapper#id
        css = css.replace(/\bbody([.#])/gi, '#custom-layout-wrapper$1');

        // body > or body + or body ~ -> #custom-layout-wrapper > etc.
        css = css.replace(/\bbody\s*([>+~])/gi, '#custom-layout-wrapper $1');

        // body element (body div) -> #custom-layout-wrapper element
        css = css.replace(/\bbody\s+(?=[a-z.*#\[])/gi, '#custom-layout-wrapper ');

        // 100vh -> 100% (vh doesn't work correctly in nested context)
        css = css.replace(/100vh/g, '100%');
        css = css.replace(/100vw/g, '100%');

        return css;
    },

    /**
     * Check if a custom layout is currently displayed.
     * @returns {boolean}
     */
    hasCustomLayout() {
        return this.currentCustomLayout !== null;
    },

    // -------------------------------------------------------------------------
    // Idle Screen
    // -------------------------------------------------------------------------

    /**
     * Show idle screen.
     */
    showIdleScreen() {
        this.clear();

        const idle = document.createElement('div');
        idle.className = 'idle-screen';
        idle.innerHTML = `
            <h1>\uD83D\uDDA5\uFE0F Xentauri</h1>
            <p>Device: <strong>${CONFIG.DEVICE_NAME}</strong></p>
            <p class="waiting">Waiting for commands...</p>
        `;

        this.container.appendChild(idle);
    },

    // -------------------------------------------------------------------------
    // Utilities
    // -------------------------------------------------------------------------

    /**
     * Get current scene.
     * @returns {Object|null} Current scene or null
     */
    getCurrentScene() {
        return this.currentScene;
    },

    /**
     * Check if a scene is currently displayed.
     * @returns {boolean}
     */
    hasScene() {
        return this.currentScene !== null;
    }
};

// Make globally available
window.SceneRenderer = SceneRenderer;
