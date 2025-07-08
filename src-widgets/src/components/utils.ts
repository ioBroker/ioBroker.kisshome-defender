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

export function time2string(ms: number): string {
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    if (ms < 60_000) {
        return `${(Math.floor(ms / 100) / 10).toString().replace('.', ',')}s`;
    }
    return `${Math.floor(ms / (60_000))}m ${Math.floor((ms % 60_000) / 1000).toString()}s`;
}