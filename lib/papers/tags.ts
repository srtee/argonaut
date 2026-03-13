import { state } from '../state.js';

export function updateTagVisuals(): void {
    document.querySelectorAll('.tag').forEach(tagElement => {
        const tag = (tagElement as HTMLElement).dataset.tag;
        if (!tag) return;
        
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