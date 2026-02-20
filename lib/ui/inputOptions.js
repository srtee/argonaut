// Input options module - input/save option UI

import { getSessionId } from '../auth.js';
import { loadPapers } from './load.js';

let urlInput;

export function initInputOptionsDOM() {
    urlInput = document.getElementById('urlInput');
}

/**
 * Update input option UI state
 */
export function updateInputOptionUI(selectedValue) {
    console.log('updateInputOptionUI: selectedValue =', selectedValue);

    // Hide all option contents and remove active class
    document.querySelectorAll('.input-section__option').forEach(option => {
        option.classList.remove('input-section__option--active');
        const content = option.querySelector('.input-section__content');
        if (content) {
            content.style.display = 'none';
        }
    });

    // Show the selected option
    const selectedOption = document.querySelector(`.input-section__option[data-input="${selectedValue}"]`);
    console.log('updateInputOptionUI: selectedOption =', selectedOption);

    if (selectedOption) {
        selectedOption.classList.add('input-section__option--active');
        const selectedContent = selectedOption.querySelector('.input-section__content');
        console.log('updateInputOptionUI: selectedContent =', selectedContent);
        if (selectedContent) {
            selectedContent.style.display = 'block';
        }

        // Load gist options if "gist" is selected and user is authenticated
        if (selectedValue === 'gist' && getSessionId()) {
            import('../github.js').then(({ loadGistOptionsForLoadSelector }) => {
                loadGistOptionsForLoadSelector();
            });
            import('../auth.js').then(({ updateGistVisibility }) => {
                updateGistVisibility();
            });
        }
    }
}

/**
 * Initialize input option state on page load
 */
export function initInputOptions() {
    const selectedRadio = document.querySelector('input[name="inputMethod"]:checked');
    console.log('initInputOptions: selectedRadio =', selectedRadio?.id);

    if (selectedRadio) {
        // Update UI state directly to ensure proper display
        updateInputOptionUI(selectedRadio.value);
    } else {
        // Default to "url" if nothing is selected
        const urlRadio = document.getElementById('inputMethodUrl');
        if (urlRadio) {
            urlRadio.checked = true;
            updateInputOptionUI('url');
        }
    }

    // Check for inputURL parameter and auto-load
    checkInputURLParameter();
}

/**
 * Check for inputURL parameter and auto-load
 */
function checkInputURLParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    const inputURL = urlParams.get('inputURL');

    if (inputURL) {
        console.log('[URL Parameter] Found inputURL:', inputURL);
        // Update the URL input field
        if (urlInput) {
            urlInput.value = inputURL;
        }
        // Select the URL option
        const urlRadio = document.getElementById('inputMethodUrl');
        if (urlRadio) {
            urlRadio.checked = true;
            updateInputOptionUI('url');
        }
        // Auto-load the papers
        setTimeout(() => {
            loadPapers('url');
        }, 100);
        // Clean up URL parameter after loading
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}
