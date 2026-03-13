import { PaperData } from './types.js';

export function convertToDoiIndexed(data: Record<string, PaperData>): Record<string, PaperData> {
    if (!data || typeof data !== 'object') return {} as Record<string, PaperData>;

    const firstEntry = Object.values(data)[0];
    if (firstEntry && firstEntry._key !== undefined) {
        return data;
    }

    const result: Record<string, PaperData> = {};
    for (const [key, paper] of Object.entries(data)) {
        if (paper._doi) {
            result[paper._doi] = { ...paper, _key: key };
        } else {
            const tempId = `temp_${key}`;
            result[tempId] = { ...paper, _key: key };
        }
    }
    return result;
}