// SolveX Portfolio - Main Entry Point

import { App } from './core/App.js';
import { initGlassHero } from './sections/GlassHero.js';

// Global app instance
let app = null;

// Initialize when DOM is ready
async function init() {
    // Glass cube hero (own canvas); the page still works if it fails
    try { initGlassHero(); } catch (e) { console.warn('Glass hero skipped:', e); }

    const canvas = document.getElementById('gl');

    // Check WebGL support
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
        console.error('WebGL not supported');
        document.body.classList.remove('loading');
        const pct = document.getElementById('pct');
        if (pct) pct.remove();
        canvas.style.display = 'none';
        document.body.innerHTML += '<div style="padding:2rem;text-align:center;color:var(--mute)">WebGL 2 is required but not supported in this browser.</div>';
        return;
    }

    try {
        app = new App({
            canvas,
            whatsappNumber: '2349138935346'
        });

        await app.init();

        // Hide the empty 3D placeholders (the three service circles, the three work boxes,
        // the contact bubbles and the wireframe ball). The real content lives in the HTML sections.
        ['services', 'work', 'contact'].forEach((key) => {
            const section = app[key];
            if (!section || !section.container) return;
            section.setEnabled = () => { section.container.visible = false; };
            section.container.visible = false;
        });
        if (app.lineNetwork && app.lineNetwork.getGroup) {
            app.lineNetwork.getGroup().visible = false;
        }

        // Expose for debugging
        window.solvexApp = app;

        console.log('🚀 SolveX Portfolio loaded');
    } catch (error) {
        console.error('Failed to initialize SolveX Portfolio:', error);

        // Fallback: remove loading state
        document.body.classList.remove('loading');
        const pct = document.getElementById('pct');
        if (pct) pct.remove();

        // Show error message
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'padding:2rem;text-align:center;color:var(--accent);font-family:var(--font-ui)';
        errorDiv.innerHTML = `<strong>3D Initialization Failed</strong><br><small>${error.message}</small><br><button onclick="location.reload()" class="btn" style="margin-top:1rem">Retry</button>`;
        document.body.appendChild(errorDiv);
    }
}

// Start initialization
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Handle page visibility for performance
document.addEventListener('visibilitychange', () => {
    if (app) {
        if (document.hidden) {
            app.clock.pause();
        } else {
            app.clock.resume();
        }
    }
});

// Cleanup on unload
window.addEventListener('beforeunload', () => {
    if (app) {
        app.dispose();
    }
});