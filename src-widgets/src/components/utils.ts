export function bytes2string(bytes: number, maxValue?: number): string {
    if (maxValue !== undefined && maxValue > 1024 * 1024) {
        // Use a part of MB
        return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')}Mb`;
    }
    if (bytes < 1024) {
        return `${bytes}b`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1).replace('.', ',')}kb`;
    }
    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')}Mb`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1).replace('.', ',')}Gb`;
}