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

            // Get all styles
            const styles = doc.querySelectorAll('style');
            let styleContent = '';
            styles.forEach(style => {
                styleContent += style.outerHTML;
            });

            // Get body content
            const bodyContent = doc.body ? doc.body.innerHTML : html;

            // Combine styles + body
            contentHtml = styleContent + bodyContent;
        }

        // DEMO MODE: Direct innerHTML injection (enables JS)
        // WARNING: This is NOT secure - only for demo purposes
        wrapper.innerHTML = contentHtml;

        // Execute any scripts in the content
        const scripts = wrapper.querySelectorAll('script');
        scripts.forEach(oldScript => {
            const newScript = document.createElement('script');
            if (oldScript.src) {
                newScript.src = oldScript.src;
            } else {
                newScript.textContent = oldScript.textContent;
            }
            oldScript.parentNode.replaceChild(newScript, oldScript);
        });

        // Add to container
        this.container.appendChild(wrapper);

        // Store reference
        this.currentCustomLayout = html;
        this.currentScene = null;

        Helpers.debug('SceneRenderer', 'Custom layout rendered (DEMO MODE)');
        return true;
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
