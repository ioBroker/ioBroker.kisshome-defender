// @ts-expect-error no types
import { get_gateway_ip } from 'network';
import { toMAC } from '@network-utils/arp-lookup';
import { toVendor } from '@network-utils/vendor-lookup';
import { Socket } from 'node:net';

import type { Device, MACAddress } from '../types';

// This function is used trigger the OS to resolve IP to MAC address
async function httpPing(ip: string): Promise<boolean> {
    // try to open the TCP socket to this IP
    const client = new Socket();
    return await new Promise<boolean>(resolve => {
        let timeout: NodeJS.Timeout | null = setTimeout(() => {
            timeout = null;
            resolve(false);
        }, 200);
        client.connect(18001, ip, () => {
            client.destroy();
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
                resolve(true);
            }
        });
        client.on('error', () => {
            client.destroy();
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
                resolve(false);
            }
        });
    });
}

export async function getMacForIp(ip: string): Promise<{ mac: MACAddress; vendor?: string; ip: string } | null> {
    // trigger the OS to resolve IP to MAC address
    await httpPing(ip);
    const mac = await toMAC(ip);
    if (mac) {
        return { mac: mac.toUpperCase(), vendor: toVendor(mac), ip };
    }
    return null;
}

export function validateIpAddress(ip: string): boolean {
    if (!ip) {
        return true;
    }
    if (typeof ip !== 'string') {
        return false;
    }
    ip = ip.trim();
    if (!ip) {
        return true;
    }
    if (!ip.match(/^\d+\.\d+\.\d+\.\d+$/)) {
        return false;
    }
    const parts = ip
        .trim()
        .split('.')
        .map(part => parseInt(part, 10));
    return !parts.find(part => part < 0 || part > 0xff);
}

export function getVendorForMac(mac: MACAddress): string {
    return toVendor(mac);
}

export function getDefaultGateway(): Promise<string> {
    return new Promise((resolve, reject) =>
        get_gateway_ip((err: string, ip: string) => {
            if (err) {
                return reject(new Error(err));
            }
            return resolve(ip);
        }),
    );
}

export function getTimestamp(): string {
    const now = new Date();
    return `${now.getUTCFullYear()}-${(now.getUTCMonth() + 1).toString().padStart(2, '0')}-${now.getUTCDate().toString().padStart(2, '0')}_${now.getUTCHours().toString().padStart(2, '0')}-${now.getUTCMinutes().toString().padStart(2, '0')}-${now.getUTCSeconds().toString().padStart(2, '0')}`;
}

export function getDescriptionObject(IPs: Device[]): { [mac: MACAddress]: { ip: string; desc: string } } {
    const desc: { [mac: string]: { ip: string; desc: string } } = {};

    IPs.sort((a, b) => a.ip.localeCompare(b.ip)).forEach(ip => {
        if (ip.mac) {
            desc[ip.mac] = { ip: ip.ip, desc: ip.desc };
        }
    });

    return desc;
}

export function getDescriptionFile(IPs: Device[]): string {
    const desc: { [mac: MACAddress]: { ip: string; desc: string } } = getDescriptionObject(IPs);

    return JSON.stringify(desc, null, 2);
}

export function size2text(size: number): string {
    if (size < 1024) {
        return `${size} B`;
    }
    if (size < 1024 * 1024) {
        return `${Math.round((size * 10) / 1024) / 10} kB`;
    }
    return `${Math.round((size * 10) / (1024 * 1024) / 10)} MB`;
}

export function fileNameToDate(fileName: string): Date {
    // File name is in format YYYY-MM-DD_T.json
    const datePart = fileName.split('_')[0]; // Get the date part
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day); // Month is 0-based in JavaScript
}

export function normalizeMacAddress(mac: string | undefined): MACAddress {
    if (!mac) {
        return '';
    }
    mac = mac
        .toUpperCase()
        .trim()
        .replace(/[\s:-]/g, '');
    // convert to 00:11:22:33:44:55
    return mac.replace(/(..)(..)(..)(..)(..)(..)/, '$1:$2:$3:$4:$5:$6');
}
