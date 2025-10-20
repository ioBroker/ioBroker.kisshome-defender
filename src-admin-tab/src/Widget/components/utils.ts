import type { LegacyConnection } from '@iobroker/adapter-react-v5';

export const MOBILE_WIDTH = 600;

const GIGABYTE = 1024 * 1024 * 1024;
const MEGABYTE = 1024 * 1024;
const KILOBYTE = 1024;

export function bytes2string(bytes: number, maxValue?: number, noFloat?: boolean): string {
    if (maxValue !== undefined && maxValue > GIGABYTE) {
        // Use a part of GB
        return `${(bytes / GIGABYTE).toFixed(1).replace('.', ',')}Gb`;
    }

    if (maxValue !== undefined && maxValue > MEGABYTE) {
        const mb = bytes / MEGABYTE;
        // Use a part of MB
        return `${mb.toFixed(maxValue > 12 * MEGABYTE && noFloat ? 0 : 1).replace('.', ',')}Mb`;
    }
    if (bytes < KILOBYTE) {
        return `${bytes}b`;
    }
    if (maxValue !== undefined) {
        if (bytes < 1024 * 1024) {
            const kb = bytes / KILOBYTE;
            return `${kb.toFixed(maxValue > 12 * KILOBYTE && noFloat ? 0 : 1).replace('.', ',')}kb`;
        }
        if (bytes < GIGABYTE) {
            const mb = bytes / MEGABYTE;
            return `${mb.toFixed(maxValue > 12 * MEGABYTE && noFloat ? 0 : 1).replace('.', ',')}Mb`;
        }
        return `${(bytes / GIGABYTE).toFixed(maxValue > 12 * GIGABYTE && noFloat ? 0 : 1).replace('.', ',')}Gb`;
    }

    if (bytes < MEGABYTE) {
        const kb = bytes / KILOBYTE;
        return `${kb.toFixed(noFloat ? 0 : 1).replace('.', ',')}kb`;
    }
    if (bytes < GIGABYTE) {
        const mb = bytes / MEGABYTE;
        return `${mb.toFixed(noFloat ? 0 : 1).replace('.', ',')}Mb`;
    }
    return `${(bytes / GIGABYTE).toFixed(noFloat ? 0 : 1).replace('.', ',')}Gb`;
}

export function isTouch(e: any): boolean {
    return (
        (typeof TouchEvent !== 'undefined' && e instanceof TouchEvent) ||
        (e && typeof e === 'object' && ('touches' in e || 'changedTouches' in e))
    );
}

export async function findAdminLink(socket: LegacyConnection, instance: string): Promise<string> {
    const obj = await socket.getObject(`system.adapter.kisshome-defender.${instance}`);

    if (obj?.native) {
        const host = obj.common.host;
        const adminInstances = await socket.getAdapterInstances('admin');
        // Find active admin instance
        let activeAdmin = adminInstances.find(instance => instance.common.enabled && instance.common.host === host);
        activeAdmin ||= adminInstances.find(instance => instance.common.enabled);
        activeAdmin ||= adminInstances[0];
        if (activeAdmin) {
            return `http${activeAdmin.native.secure ? 's' : ''}://${activeAdmin.common.host === host ? window.location.hostname : activeAdmin.common.host}:${activeAdmin.native.port}/#tab-instances/config/system.adapter.kisshome-defender.${instance}/_instances`;
        }
    } else {
        console.error('Failed to load adapter configuration');
    }
    return '';
}
