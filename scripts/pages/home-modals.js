(function () {
    const modalIds = {
        about: 'aboutModal',
        skills: 'skillsModal',
        contact: 'contactModal'
    };

    let activeModal = null;

    function getModalNameFromUrl() {
        const url = new URL(window.location.href);
        const modal = url.searchParams.get('modal');
        return Object.prototype.hasOwnProperty.call(modalIds, modal) ? modal : null;
    }

    function updateUrl(modalName, push) {
        const url = new URL(window.location.href);

        if (modalName) {
            url.searchParams.set('modal', modalName);
        } else {
            url.searchParams.delete('modal');
        }

        const method = push ? 'pushState' : 'replaceState';
        window.history[method]({}, '', url);
    }

    function setBodyLocked(locked) {
        document.body.style.overflow = locked ? 'hidden' : '';
    }

    function closeActiveModal(syncUrl) {
        if (!activeModal) {
            return;
        }

        activeModal.hidden = true;
        activeModal.classList.remove('is-open');
        activeModal = null;
        setBodyLocked(false);

        if (syncUrl) {
            updateUrl(null, false);
        }
    }

    function openModal(modalName, syncUrl) {
        const modal = document.getElementById(modalIds[modalName]);
        if (!modal) {
            return;
        }

        if (activeModal && activeModal !== modal) {
            closeActiveModal(false);
        }

        modal.hidden = false;
        modal.classList.add('is-open');
        activeModal = modal;
        setBodyLocked(true);

        if (syncUrl) {
            updateUrl(modalName, true);
        }
    }

    function bindTriggers() {
        document.querySelectorAll('[data-modal-target]').forEach((trigger) => {
            trigger.addEventListener('click', (event) => {
                event.preventDefault();
                const modalName = trigger.getAttribute('data-modal-target');
                openModal(modalName, true);
            });
        });
    }

    function bindClosers() {
        document.querySelectorAll('[data-modal-close]').forEach((closer) => {
            closer.addEventListener('click', () => {
                closeActiveModal(true);
            });
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeActiveModal(true);
            }
        });

        window.addEventListener('popstate', () => {
            const modalName = getModalNameFromUrl();
            if (modalName) {
                openModal(modalName, false);
            } else {
                closeActiveModal(false);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        bindTriggers();
        bindClosers();

        const initialModal = getModalNameFromUrl();
        if (initialModal) {
            openModal(initialModal, false);
        }
    });
})();
