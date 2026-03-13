// Save options module - save option UI

import { getSessionId } from '../auth.js';

/**
 * Update save option UI state
 */
export function updateSaveOptionUI(selectedValue) {
    console.log('updateSaveOptionUI: selectedValue =', selectedValue);

    // Hide all option contents and remove active class
    document.querySelectorAll('.save-section__option').forEach(option => {
        option.classList.remove('save-section__option--active');
        const content = option.querySelector('.save-section__option-content');
        if (content) {
            content.style.display = 'none';
        }
    });

    // Show the selected option
    const selectedOption = document.querySelector(`.save-section__option[data-save="${selectedValue}"]`);
    console.log('updateSaveOptionUI: selectedOption =', selectedOption);

    if (selectedOption) {
        selectedOption.classList.add('save-section__option--active');
        const selectedContent = selectedOption.querySelector('.save-section__option-content');
        console.log('updateSaveOptionUI: selectedContent =', selectedContent);
        if (selectedContent) {
            selectedContent.style.display = 'block';
        }

        // Load gist options if "gist" is selected and user is authenticated
        if (selectedValue === 'gist' && getSessionId()) {
            import('../github.js').then(({ loadGistOptionsForSaveSelector }) => {
                loadGistOptionsForSaveSelector();
            });
            import('../auth.js').then(({ updateSaveGistVisibility }) => {
                updateSaveGistVisibility();
            });
        }
    }
}

/**
 * Initialize save option state on page load
 */
export function initSaveOptions() {
    const selectedRadio = document.querySelector('input[name="saveMethod"]:checked');
    console.log('initSaveOptions: selectedRadio =', selectedRadio?.id);

    if (selectedRadio) {
        // Update UI state directly to ensure proper display
        updateSaveOptionUI(selectedRadio.value);
    } else {
        // Default to "file" if nothing is selected
        const fileRadio = document.getElementById('saveMethodFile');
        if (fileRadio) {
            fileRadio.checked = true;
            updateSaveOptionUI('file');
        }
    }
}
