// Floating Action System JavaScript

const FloatingActions = {
    config: {
        showSettings: true,
        showAuthorNote: true,
        autoInit: true
    },

    themeKey: 'site_theme',

    noteState: {
        notes: [],
        currentIndex: 0,
        loaded: false
    },

    createHTML: function(options = {}) {
        const config = { ...this.config, ...options };

        let actionsHTML = '';
        if (config.showSettings || config.showAuthorNote) {
            actionsHTML = '<div class="floating-action-stack" id="floatingActionStack">';

            actionsHTML += `
                <button class="floating-btn floating-scroll-top-btn" onclick="FloatingActions.scrollToTop()" title="Back to top">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M18 15l-6-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            `;

            if (config.showAuthorNote) {
                actionsHTML += `
                    <button class="floating-btn floating-note-btn" onclick="FloatingActions.toggleAuthorNote()" title="Author note">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                `;
            }

            if (config.showSettings) {
                actionsHTML += `
                    <button class="floating-btn floating-settings-btn" onclick="FloatingActions.toggleTheme()" title="Theme: Light">
                        <svg class="theme-icon theme-icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <svg class="theme-icon theme-icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3c-.06.35-.09.71-.09 1.08A8 8 0 0 0 19.92 12c.37 0 .73-.03 1.08-.09z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                `;
            }

            actionsHTML += '</div>';
        }

        const authorNoteHTML = config.showAuthorNote ? `
            <div class="floating-note-panel" id="floatingAuthorNote">
                <div class="note-header">
                    <h3>Note.</h3>
                    <button class="note-close" onclick="FloatingActions.toggleAuthorNote()">✕</button>
                </div>
                <div class="note-content" id="authorNoteContent">
                    <div class="note-loading">Loading note...</div>
                </div>
                <div class="note-nav" id="authorNoteNav" style="display: none;">
                    <button class="note-nav-btn" id="prevNoteBtn" onclick="FloatingActions.previousNote()">Prev</button>
                    <span class="note-index" id="noteIndex"></span>
                    <button class="note-nav-btn" id="nextNoteBtn" onclick="FloatingActions.nextNote()">Next</button>
                </div>
            </div>
        ` : '';

        return actionsHTML + authorNoteHTML;
    },

    init: function(options = {}) {
        this.applyStoredTheme();

        const htmlContent = this.createHTML(options);
        document.body.insertAdjacentHTML('beforeend', htmlContent);
        this.setupEventListeners();
        this.updateThemeButtonTitle();
    },

    setupEventListeners: function() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const notePanel = document.getElementById('floatingAuthorNote');
                if (notePanel && notePanel.classList.contains('active')) {
                    notePanel.classList.remove('active');
                }
            }
        });

        this.setupScrollToTopVisibility();
    },

    setupScrollToTopVisibility: function() {
        const handleWindowScroll = () => {
            const scrollTopBtn = document.querySelector('.floating-scroll-top-btn');
            if (!scrollTopBtn) return;

            if (window.scrollY > 120) {
                scrollTopBtn.classList.add('visible');
            } else {
                scrollTopBtn.classList.remove('visible');
            }
        };

        window.addEventListener('scroll', handleWindowScroll, { passive: true });
        handleWindowScroll();
    },

    toggleAuthorNote: async function() {
        const notePanel = document.getElementById('floatingAuthorNote');
        if (!notePanel) return;

        const isVisible = notePanel.classList.contains('active');
        if (isVisible) {
            notePanel.classList.remove('active');
            return;
        }

        notePanel.classList.add('active');

        if (!this.noteState.loaded) {
            await this.loadAuthorNotes();
            this.renderCurrentNote();
        }
    },

    loadAuthorNotes: async function() {
        const noteFiles = [
            '/content/notes/author-note-1.txt',
            '/content/notes/author-note-2.txt'
        ];

        const notes = [];
        for (const path of noteFiles) {
            try {
                const response = await fetch(path);
                if (!response.ok) continue;
                const text = await response.text();
                if (text.trim()) notes.push(text);
            } catch (_error) {
                // Ignore individual note load failures.
            }
        }

        this.noteState.notes = notes.length > 0 ? notes : ['No notes available.'];
        this.noteState.currentIndex = 0;
        this.noteState.loaded = true;
    },

    renderCurrentNote: function() {
        const content = document.getElementById('authorNoteContent');
        const nav = document.getElementById('authorNoteNav');
        const index = document.getElementById('noteIndex');
        const prevBtn = document.getElementById('prevNoteBtn');
        const nextBtn = document.getElementById('nextNoteBtn');

        if (!content) return;

        const total = this.noteState.notes.length;
        const current = this.noteState.currentIndex;

        content.textContent = this.noteState.notes[current];

        if (nav && index && prevBtn && nextBtn) {
            nav.style.display = total > 1 ? 'flex' : 'none';
            index.textContent = `${current + 1} / ${total}`;
            prevBtn.disabled = current === 0;
            nextBtn.disabled = current === total - 1;
        }
    },

    previousNote: function() {
        if (this.noteState.currentIndex > 0) {
            this.noteState.currentIndex -= 1;
            this.renderCurrentNote();
        }
    },

    nextNote: function() {
        if (this.noteState.currentIndex < this.noteState.notes.length - 1) {
            this.noteState.currentIndex += 1;
            this.renderCurrentNote();
        }
    },

    isLoggedIn: function() {
        const token = localStorage.getItem('admin_token');
        const expires = localStorage.getItem('admin_expires');

        if (!token || !expires) return false;
        if (Date.now() > parseInt(expires, 10)) {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_expires');
            return false;
        }

        return true;
    },

    refresh: function() {
        const existingStack = document.getElementById('floatingActionStack');
        const existingAuthorNote = document.getElementById('floatingAuthorNote');

        if (existingStack) existingStack.remove();
        if (existingAuthorNote) existingAuthorNote.remove();

        this.init();
    },

    scrollToTop: function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    toggleTheme: function() {
        const root = document.documentElement;
        const currentTheme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

        this.applyTheme(nextTheme);
    },

    applyStoredTheme: function() {
        const savedTheme = localStorage.getItem(this.themeKey);
        if (savedTheme === 'dark' || savedTheme === 'light') {
            this.applyTheme(savedTheme, false);
            return;
        }

        this.applyTheme('light', false);
    },

    applyTheme: function(theme, save = true) {
        const root = document.documentElement;

        const normalizedTheme = theme === 'dark' ? 'dark' : 'light';
        // Keep explicit theme on the root so OS-level prefers-color-scheme rules
        // do not override manual light/dark selection.
        root.setAttribute('data-theme', normalizedTheme);

        if (save) {
            localStorage.setItem(this.themeKey, normalizedTheme);
        }

        this.updateThemeButtonTitle();
    },

    updateThemeButtonTitle: function() {
        const settingsBtn = document.querySelector('.floating-settings-btn');
        if (!settingsBtn) return;

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        settingsBtn.title = isDark ? 'Switch to light mode' : 'Switch to dark mode';
        settingsBtn.classList.toggle('is-dark', isDark);
    },

    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

if (FloatingActions.config.autoInit) {
    document.addEventListener('DOMContentLoaded', function() {
        FloatingActions.init({
            showSettings: true,
            showAuthorNote: true
        });
    });
}

function toggleAuthorNote() {
    FloatingActions.toggleAuthorNote();
}

function scrollToTop() {
    FloatingActions.scrollToTop();
}
