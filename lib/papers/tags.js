import { state } from '../state.js';

export function updateTagVisuals() {
    document.querySelectorAll('.tag').forEach(tagElement => {
        const tag = tagElement.dataset.tag;
        if (state.selectedTags.size === 0) {
            tagElement.classList.remove('tag--selected', 'tag--deselected');
            tagElement.setAttribute('aria-pressed', 'false');
        } else if (state.selectedTags.has(tag)) {
            tagElement.classList.add('tag--selected');
            tagElement.classList.remove('tag--deselected');
            tagElement.setAttribute('aria-pressed', 'true');
        } else {
            tagElement.classList.add('tag--deselected');
            tagElement.classList.remove('tag--selected');
            tagElement.setAttribute('aria-pressed', 'false');
        }
    });
}