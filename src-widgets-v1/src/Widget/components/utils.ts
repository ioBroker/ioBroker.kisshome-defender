import type { LegacyConnection } from '@iobroker/adapter-react-v5';

export const MOBILE_WIDTH = 600;

export function bytes2string(bytes: number, maxValue?: number, noFloat?: boolean): string {
    if (maxValue !== undefined && maxValue > 1024 * 1024 * 1024) {
        // Use a part of GB
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1).replace('.', ',')}Gb`;
    }

    if (maxValue !== undefined && maxValue > 1024 * 1024) {
        const mb = bytes / (1024 * 1024);
        // Use a part of MB
        return `${mb.toFixed(maxValue > 20 && noFloat ? 0 : 1).replace('.', ',')}Mb`;
    }
    if (bytes < 1024) {
        return `${bytes}b`;
    }
    if (bytes < 1024 * 1024) {
        const kb = bytes / 1024;
        return `${kb.toFixed(noFloat ? 0 : 1).replace('.', ',')}kb`;
    }
    if (bytes < 1024 * 1024 * 1024) {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(noFloat ? 0 : 1).replace('.', ',')}Mb`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(noFloat ? 0 : 1).replace('.', ',')}Gb`;
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
