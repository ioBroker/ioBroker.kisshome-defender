import { LegacyConnection } from '@iobroker/adapter-react-v5';

export function bytes2string(bytes: number, maxValue?: number, noFloat?: boolean): string {
    if (maxValue !== undefined && maxValue > 1024 * 1024) {
        // Use a part of MB
        return `${(bytes / (1024 * 1024)).toFixed(noFloat ? 0 : 1).replace('.', ',')}Mb`;
    }
    if (bytes < 1024) {
        return `${bytes}b`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(noFloat ? 0 : 1).replace('.', ',')}kb`;
    }
    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(noFloat ? 0 : 1).replace('.', ',')}Mb`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(noFloat ? 0 : 1).replace('.', ',')}Gb`;
}

export function time2string(ms: number): string {
    if (ms < 1000) {
        return `${Math.round(ms)}ms`;
    }
    if (ms < 60_000) {
        return `${(Math.floor(ms / 100) / 10).toString().replace('.', ',')}s`;
    }
    return `${Math.floor(ms / 60_000)}m ${Math.floor((ms % 60_000) / 1000).toString()}s`;
}

export async function findAdminLink(socket: LegacyConnection, instance: string): Promise<string> {
    const obj = await socket.getObject(
        `system.adapter.kisshome-defender.${instance}`,
    );

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
