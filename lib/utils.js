// Shared utility functions

/**
 * Convert papers data from key-indexed to DOI-indexed format
 */
export function convertToDoiIndexed(data) {
    if (!data || typeof data !== 'object') return {};

    // Check if already in new format (DOI-indexed with _key)
    const firstEntry = Object.values(data)[0];
    if (firstEntry && firstEntry._key !== undefined) {
        return data; // Already in new format
    }

    const result = {};
    for (const [key, paper] of Object.entries(data)) {
        if (paper._doi) {
            result[paper._doi] = { ...paper, _key: key };
        } else {
            // Papers without DOI - generate a temporary identifier
            const tempId = `temp_${key}`;
            result[tempId] = { ...paper, _key: key };
        }
    }
    return result;
}
