import React from 'react';
import { v4 as uuid } from 'uuid';

import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
    IconButton,
    TextField,
    LinearProgress,
    Fab,
} from '@mui/material';

import { Add, Delete } from '@mui/icons-material';

// important to make from package and not from some children.
// invalid
// import ConfigGeneric from '@iobroker/adapter-react-v5/ConfigGeneric';
// valid
import { I18n, type LegacyConnection, Message } from '@iobroker/adapter-react-v5';
import { ConfigGeneric, type ConfigGenericProps, type ConfigGenericState } from '@iobroker/json-config';

export type Device = {
    enabled: boolean;
    mac: string;
    ip: string;
    desc: string;
    uuid: string;
};

const styles: Record<string, React.CSSProperties> = {
    table: {
        minWidth: 400,
    },
    header: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    td: {
        padding: '2px 16px',
    },
    vendor: {
        maxWidth: 150,
        fontSize: 12,
        textOverflow: 'ellipsis',
        overflow: 'hidden',
    },
};

async function browseHomekit(socket: LegacyConnection, instance: string): Promise<{ ip: string; name: string }[]> {
    const states = await socket.getObjectViewSystem('state', `${instance}.`, `${instance}.\u9999`);
    const devices: { ip: string; name: string }[] = [];

    const ids = Object.keys(states).filter(id => id.endsWith('.address'));
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const value = await socket.getState(id);
        if (value?.val) {
            devices.push({
                ip: value.val as string,
                name: 'homekit-controller',
            });
        }
    }

    return devices;
}

async function browseHomeConnect(socket: LegacyConnection, instance: string): Promise<{ ip: string; name: string }[]> {
    const states = await socket.getObjectViewSystem('state', `${instance}.`, `${instance}.\u9999`);
    const devices: { ip: string; name: string }[] = [];

    // This must be found if it is an address or not
    const ids = Object.keys(states).filter(id => id.endsWith('.address'));
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const value = await socket.getState(id);
        if (value?.val) {
            devices.push({
                ip: value.val as string,
                name: 'homekit-controller',
            });
        }
    }

    return devices;
}

async function browseShelly(socket: LegacyConnection, instance: string): Promise<{ ip: string; name: string }[]> {
    const states = await socket.getObjectViewSystem('state', `${instance}.`, `${instance}.\u9999`);
    const devices: { ip: string; name: string }[] = [];

    const ids = Object.keys(states).filter(id => id.endsWith('.hostname'));
    for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const value = await socket.getState(id);
        if (value?.val) {
            devices.push({
                ip: value.val as string,
                name: 'shelly',
            });
        }
    }

    return devices;
}

async function browseClients(socket: LegacyConnection, instance: string): Promise<{ ip: string; name: string }[]> {
    const clients = await socket.getObjectViewSystem(
        'state',
        `${instance}.info.clients.`,
        `${instance}.info.clients.\u9999`,
    );
    const devices: { ip: string; name: string }[] = [];

    const objs = Object.values(clients);
    for (let i = 0; i < objs.length; i++) {
        if (objs[i]?.native?.ip) {
            devices.push({
                ip: objs[i].native.ip as string,
                name: instance.split('.')[0],
            });
        }
    }
    return devices;
}

async function browseUpnp(socket: LegacyConnection, instance: string): Promise<{ ip: string; name: string }[]> {
    const objects = await socket.getObjectViewSystem('device', `${instance}.`, `${instance}.\u9999`);
    const objs = Object.values(objects);
    const devices: { ip: string; name: string }[] = [];
    for (let i = 0; i < objs.length; i++) {
        if (objs[i]?.type === 'device' && objs[i]?.native?.ip) {
            devices.push({
                ip: objs[i].native.ip as string,
                name: instance.split('.')[0],
            });
        }
    }

    return devices;
}

const ADAPTERS: {
    adapter: string;
    attr?: string;
    browse?: (socket: LegacyConnection, instance: string) => Promise<{ ip: string; name: string }[]>;
    arrayAttr?: string;
    clients?: boolean;
}[] = [
    { adapter: 'broadlink2', attr: 'additional' },
    //     { adapter: 'cameras' },
    { adapter: 'harmony', attr: 'devices', arrayAttr: 'ip' },
    { adapter: 'hm-rpc', attr: 'homematicAddress' },
    // { adapter: 'hmip' }, not possible. It communicates with the cloud
    { adapter: 'homeconnect', browse: browseHomeConnect },
    { adapter: 'homekit-controller', attr: 'discoverIp', browse: browseHomekit },
    { adapter: 'hue', attr: 'bridge' },
    { adapter: 'knx', attr: 'bind' },
    { adapter: 'lgtv', attr: 'ip' },
    { adapter: 'loxone', attr: 'host' },
    //    { adapter: 'meross' }, not possible. It communicates with the cloud
    { adapter: 'mihome-vacuum', attr: 'ip' },
    { adapter: 'modbus', attr: 'params.bind', clients: true },
    { adapter: 'mqtt', attr: 'url', clients: true }, // read clients IP addresses
    { adapter: 'mqtt-client', attr: 'host' },
    { adapter: 'lcn', attr: 'host' },
    { adapter: 'knx', attr: 'gwip' },
    { adapter: 'onvif' },
    { adapter: 'openknx', attr: 'gwip' },
    { adapter: 'broadlink2', attr: 'additional' },
    { adapter: 'proxmox', attr: 'ip' },
    { adapter: 'samsung', attr: 'ip' },
    { adapter: 'shelly', browse: browseShelly },
    { adapter: 'sonoff', clients: true },
    { adapter: 'sonos', attr: 'devices', arrayAttr: 'ip' },
    { adapter: 'tr-064', attr: 'iporhost' },
    //    { adapter: 'tuya' }, not possible. It communicates with the cloud
    { adapter: 'unify', attr: 'controllerIp' },
    { adapter: 'upnp', browse: browseUpnp },
    { adapter: 'wled', attr: 'devices', arrayAttr: 'ip' },
    { adapter: 'wifilight', attr: 'devices', arrayAttr: 'ip' },
];

function validateMacAddress(mac: string): boolean {
    if (!mac) {
        return true;
    }
    if (typeof mac !== 'string') {
        return false;
    }
    mac = mac.trim().toUpperCase().replace(/\s/g, '');
    if (!mac) {
        return true;
    }
    if (mac.match(/^([0-9A-F]{2}[:-]){5}([0-9A-F]{2})$/)) {
        return true;
    }
    return !!mac.match(/^([0-9A-F]{12})$/);
}

function normalizeMacAddress(mac: string | undefined): string {
    if (!mac || !validateMacAddress(mac)) {
        return mac || '';
    }
    mac = mac
        .toUpperCase()
        .trim()
        .replace(/[\s:-]/g, '');
    // convert to 00:11:22:33:44:55
    return mac.replace(/(..)(..)(..)(..)(..)(..)/, '$1:$2:$3:$4:$5:$6');
}

function validateIpAddress(ip: string): boolean {
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

function normalizeIpAddress(ip: string): string {
    if (!ip || !validateIpAddress(ip)) {
        return ip;
    }
    const parts = ip.trim().split('.');
    return parts.map(part => parseInt(part, 10)).join('.');
}

interface ConfigCustomInstancesSelectorState extends ConfigGenericState {
    instances: {
        id: string;
        name: string;
        native: Record<string, any>;
    }[];
    ips: { ip: string; type: string; desc: string; uuid: string; mac?: string }[];
    resolving: boolean;
    alive: boolean;
    showMessage: boolean;
    IP2MAC: Record<string, string>;
    MAC2VENDOR: Record<string, string>;
    runningRequest?: boolean;
    modelStatus: { [mac: string]: number };
}

class ConfigCustomInstancesSelector extends ConfigGeneric<ConfigGenericProps, ConfigCustomInstancesSelectorState> {
    private resolveDone = false;

    private validateTimeout: ReturnType<typeof setTimeout> | null = null;
    private statusPolling: ReturnType<typeof setInterval> | null = null;

    async componentDidMount(): Promise<void> {
        super.componentDidMount();

        let address: string[] = [];
        // get own ip address
        const config = await this.props.oContext.socket.getObject(
            `system.adapter.kisshome-defender.${this.props.oContext.instance}`,
        );
        if (config?.common.host) {
            const host = await this.props.oContext.socket.getObject(`system.host.${config.common.host}`);
            if (host?.common?.address) {
                address = host.common.address;
            }
        }

        const instancesObjs = await this.props.oContext.socket.getAdapterInstances();
        const instances: {
            id: string;
            name: string;
            native: Record<string, any>;
        }[] = instancesObjs
            .filter(
                instance =>
                    instance?.common?.adminUI &&
                    (instance.common.adminUI.config !== 'none' || instance.common.adminUI.tab),
            )
            .map(instance => ({
                id: instance._id.replace(/^system\.adapter\./, ''),
                name: instance.common.name,
                native: instance.native,
            }))
            .sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0));

        const devices: Device[] = ConfigGeneric.getValue(this.props.data, 'devices') || [];
        devices.forEach(item => {
            if (!item.uuid) {
                item.uuid = uuid();
            }
        });

        const ips = await this.collectIpAddresses(instances, address, devices);

        const newState: Partial<ConfigCustomInstancesSelectorState> = {
            instances,
            ips,
            IP2MAC: {},
            MAC2VENDOR: {},
            alive: this.props.alive,
            resolving: false,
            showMessage: false,
            modelStatus: {},
        };
        this.resolveDone = false;

        this.setState(newState as ConfigCustomInstancesSelectorState);
        await this.props.oContext.socket.subscribeState(
            `system.adapter.kisshome-defender.${this.props.oContext.instance}.alive`,
            this.onAliveChanged,
        );
        // get vendor and MAC-Address information
        if (this.props.alive) {
            this.resolveMACs();
        }
        this.disableFritzBox();
        this.checkDevices(devices);
        this.getModelStatus();
        this.pollModelStatus();
    }

    getModelStatus(): void {
        if (this.state.alive) {
            void this.props.oContext.socket
                .sendTo(`kisshome-defender.${this.props.oContext.instance}`, 'getModelStatus', null)
                .then(result => {
                    if (result.modelStatus) {
                        this.setState({
                            modelStatus: result.modelStatus as { [mac: string]: number },
                        });
                    }
                });
        }
    }

    pollModelStatus(): void {
        if (this.state.alive) {
            this.statusPolling ||= setInterval(() => {
                if (!this.state.alive) {
                    if (this.statusPolling) {
                        clearInterval(this.statusPolling);
                        this.statusPolling = null;
                    }
                    return;
                }
                this.getModelStatus();
            }, 10_000);
        } else {
            if (this.statusPolling) {
                clearInterval(this.statusPolling);
                this.statusPolling = null;
            }
        }
    }

    resolveMACs(): void {
        this.resolveDone = true;

        this.setState({ runningRequest: true }, () => {
            const devices = [...(ConfigGeneric.getValue(this.props.data, 'devices') || [])];

            // merge together devices and ips
            const requestIps: { ip: string; mac: string }[] = [];
            devices.forEach(item => {
                const ip = normalizeIpAddress(item.ip);
                const mac = normalizeMacAddress(item.mac);
                if (ip && validateIpAddress(ip)) {
                    requestIps.push({ ip, mac });
                } else if (mac && validateMacAddress(mac)) {
                    requestIps.push({ ip, mac });
                }
            });
            this.state.ips.forEach(item => {
                const ip = normalizeIpAddress(item.ip);
                const mac = normalizeMacAddress(item.mac);
                if (ip && validateIpAddress(ip) && !requestIps.find(i => i.ip === ip)) {
                    requestIps.push({ ip, mac });
                } else if (mac && validateMacAddress(mac) && !requestIps.find(i => i.ip === ip)) {
                    requestIps.push({ ip, mac });
                }
            });

            return this.props.oContext.socket
                .sendTo(`kisshome-defender.${this.props.oContext.instance}`, 'getMacForIps', requestIps)
                .then(result => {
                    if (result?.error) {
                        this.setState({ runningRequest: false });
                        return;
                    }
                    const typedResult = result as {
                        result?: { mac: string; vendor: string; ip: string }[];
                    };

                    const IP2MAC = { ...(this.state.IP2MAC || {}) };
                    const MAC2VENDOR = { ...(this.state.MAC2VENDOR || {}) };
                    const ips: { ip: string; type: string; desc: string; uuid: string; mac?: string }[] = JSON.parse(
                        JSON.stringify(this.state.ips),
                    );

                    // result: { result: { mac: string; vendor?: string, ip: string }[] }
                    typedResult?.result?.forEach(item => {
                        const ip = item.ip;
                        const pos = ips.findIndex(i => i.ip === ip);
                        if (pos !== -1) {
                            ips[pos].mac = item.mac;
                        }
                        IP2MAC[normalizeIpAddress(ip)] = item.mac;
                        MAC2VENDOR[normalizeMacAddress(item.mac)] = item.vendor;
                    });

                    let changed = false;
                    // detect changed MAC addresses in saved information
                    devices.forEach(item => {
                        const pos = ips.findIndex(i => i.ip === item.ip);
                        if (pos !== -1) {
                            if (ips[pos].mac && item.mac !== ips[pos].mac) {
                                changed = true;
                                item.mac = ips[pos].mac;
                            }
                        }
                    });

                    this.setState({ ips, IP2MAC, MAC2VENDOR, runningRequest: false });

                    if (changed) {
                        void this.onChange('devices', devices);
                    }
                })
                .catch(e => {
                    if (e.toString() !== 'no results') {
                        window.alert(`Cannot get MAC addresses: ${e}`);
                    }
                    this.setState({ runningRequest: false });
                });
        });
    }

    static getAttr(obj: any, attr: string | string[]): any {
        if (Array.isArray(attr)) {
            const name = attr.shift();
            if (name && typeof obj[name] === 'object') {
                return ConfigCustomInstancesSelector.getAttr(obj[name], attr);
            }

            return !attr.length && name ? obj[name] : null;
        }

        return ConfigCustomInstancesSelector.getAttr(obj, attr.split('.'));
    }

    static isIp(ip: string): 'ipv6' | 'ipv4' | null {
        if (typeof ip === 'string') {
            if (ip.match(/^\d+\.\d+\.\d+\.\d+$/)) {
                return 'ipv4';
            }
            if (ip.match(/^[\da-fA-F:]+$/)) {
                return 'ipv6';
            }
        }
        return null;
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
        this.props.oContext.socket.unsubscribeState(
            `system.adapter.kisshome-defender.${this.props.oContext.instance}.alive`,
            this.onAliveChanged,
        );
        if (this.validateTimeout) {
            clearTimeout(this.validateTimeout);
            this.validateTimeout = null;
        }
        if (this.statusPolling) {
            clearInterval(this.statusPolling);
            this.statusPolling = null;
        }
    }

    onAliveChanged = (id: string, state: ioBroker.State | null | undefined): void => {
        if (this.state.alive !== !!state?.val) {
            this.setState({ alive: !!state?.val }, () => {
                if (this.state.alive) {
                    if (this.resolveDone) {
                        this.validateAddresses();
                    } else {
                        this.resolveMACs();
                    }
                    this.pollModelStatus();
                }
            });
        }
    };

    validateAddresses(): void {
        this.validateTimeout && clearTimeout(this.validateTimeout);

        this.validateTimeout = setTimeout(() => {
            this.validateTimeout = null;
            if (!this.state.alive) {
                return;
            }
            // read MAC-Addresses for all IPs
            const unknownMacs: Device[] = [];
            const devices: Device[] = ConfigGeneric.getValue(this.props.data, 'devices') || [];
            const IP2MAC = { ...this.state.IP2MAC };
            const MAC2VENDOR = { ...this.state.MAC2VENDOR };
            devices.forEach(item => {
                const ip = normalizeIpAddress(item.ip);
                const mac = normalizeMacAddress(item.mac);
                if (ip && validateIpAddress(item.ip) && !IP2MAC[ip]) {
                    IP2MAC[ip] = '-';
                    unknownMacs.push(item);
                    if (item.mac && validateMacAddress(item.mac) && !MAC2VENDOR[mac]) {
                        MAC2VENDOR[mac] = '-';
                    }
                } else if (item.mac && validateMacAddress(item.mac) && !MAC2VENDOR[mac]) {
                    MAC2VENDOR[mac] = '-';
                    unknownMacs.push(item);
                }
            });
            if (unknownMacs.length) {
                this.setState({ resolving: true, IP2MAC, MAC2VENDOR }, () => {
                    void this.props.oContext.socket
                        .sendTo(`kisshome-defender.${this.props.oContext.instance}`, 'getMacForIps', unknownMacs)
                        .then(result => {
                            if (result?.error) {
                                this.setState({ resolving: false });
                                return;
                            }
                            const typedResult = result as {
                                result?: { mac: string; vendor: string; ip: string }[];
                            };

                            const IP2MAC = { ...this.state.IP2MAC };
                            const MAC2VENDOR = { ...this.state.MAC2VENDOR };
                            // result: { result: { mac: string; vendor?: string, ip: string }[] }
                            let changedState = false;
                            typedResult?.result?.forEach(item => {
                                item.ip = normalizeMacAddress(item.ip);
                                item.mac = normalizeMacAddress(item.mac);
                                if (item.mac && IP2MAC[item.ip] !== item.mac) {
                                    IP2MAC[item.ip] = item.mac;
                                    changedState = true;
                                }
                                if (item.vendor && MAC2VENDOR[item.mac] !== item.vendor) {
                                    MAC2VENDOR[item.mac] = item.vendor;
                                    changedState = true;
                                }
                            });
                            if (changedState) {
                                this.setState({ IP2MAC, MAC2VENDOR, resolving: false });
                            }
                        });
                });
            }
        }, 1000);
    }

    async collectIpAddresses(
        instances: {
            id: string;
            name: string;
            native: Record<string, any>;
        }[],
        ownAddresses: string[],
        knownDevices: Device[],
    ): Promise<{ ip: string; type: string; desc: string; uuid: string }[]> {
        let result: {
            ip: string;
            type: string;
            desc: string;
            uuid: string;
        }[] = [];

        instances ||= this.state.instances;
        for (let i = 0; i < instances.length; i++) {
            const adapter = ADAPTERS.find(item => item.adapter === instances[i].name);
            if (adapter && instances[i].native) {
                const attr = adapter.attr;
                if (attr && instances[i].native[attr]) {
                    if (adapter.arrayAttr) {
                        if (Array.isArray(instances[i].native[attr])) {
                            for (let j = 0; j < instances[i].native[attr].length; j++) {
                                const item = instances[i].native[attr][j];
                                const ip = ConfigCustomInstancesSelector.getAttr(item, adapter.arrayAttr);
                                const type = ConfigCustomInstancesSelector.isIp(ip);
                                if (type) {
                                    const knownDevice = knownDevices.find(iItem => iItem.ip === ip);

                                    result.push({
                                        ip,
                                        type,
                                        desc: instances[i].name,
                                        uuid: knownDevice?.uuid || uuid(),
                                    });
                                }
                            }
                        }
                    } else {
                        const ip = ConfigCustomInstancesSelector.getAttr(instances[i].native, attr);
                        const type = ConfigCustomInstancesSelector.isIp(ip);
                        if (type) {
                            const knownDevice = knownDevices.find(iItem => iItem.ip === ip);
                            result.push({
                                ip,
                                type,
                                desc: instances[i].name,
                                uuid: knownDevice?.uuid || uuid(),
                            });
                        }
                    }
                }

                if (adapter.browse) {
                    try {
                        const devices = await adapter.browse(
                            this.props.oContext.socket as unknown as LegacyConnection,
                            instances[i].id.replace('system.adapter.', ''),
                        );
                        devices.forEach(item => {
                            const type = ConfigCustomInstancesSelector.isIp(item.ip);
                            if (type) {
                                const knownDevice = knownDevices.find(iItem => iItem.ip === item.ip);
                                result.push({
                                    ip: item.ip,
                                    type,
                                    desc: item.name || instances[i].name,
                                    uuid: knownDevice?.uuid || uuid(),
                                });
                            }
                        });
                    } catch (error) {
                        console.error(`Cannot collect "${JSON.stringify(instances[i])}": ${error as Error}`);
                    }
                }

                if (adapter.clients) {
                    try {
                        const devices = await browseClients(
                            this.props.oContext.socket as unknown as LegacyConnection,
                            instances[i].id.replace('system.adapter.', ''),
                        );
                        devices.forEach(item => {
                            const type = ConfigCustomInstancesSelector.isIp(item.ip);
                            if (type) {
                                const knownDevice = knownDevices.find(iItem => iItem.ip === item.ip);
                                result.push({
                                    ip: item.ip,
                                    type,
                                    desc: item.name || instances[i].name,
                                    uuid: knownDevice?.uuid || uuid(),
                                });
                            }
                        });
                    } catch (error) {
                        console.error(`Cannot collect "${JSON.stringify(instances[i])}": ${error as Error}`);
                    }
                }
            } else {
                // check common settings like host, ip, address
                if (
                    instances[i].native.ip &&
                    typeof instances[i].native.ip === 'string' &&
                    // Check if it is an IP4 address
                    instances[i].native.ip.match(/^\d+\.\d+\.\d+\.\d+$/)
                ) {
                    const knownDevice = knownDevices.find(iItem => iItem.ip === instances[i].native.ip);
                    result.push({
                        ip: instances[i].native.ip,
                        type: 'ipv4',
                        desc: instances[i].name,
                        uuid: knownDevice?.uuid || uuid(),
                    });
                } else if (
                    instances[i].native.host &&
                    typeof instances[i].native.host === 'string' &&
                    // Check if it is an IP4 address
                    instances[i].native.host.match(/^\d+\.\d+\.\d+\.\d+$/)
                ) {
                    const knownDevice = knownDevices.find(iItem => iItem.ip === instances[i].native.host);
                    result.push({
                        ip: instances[i].native.host,
                        type: 'ipv4',
                        desc: instances[i].name,
                        uuid: knownDevice?.uuid || uuid(),
                    });
                }
            }
        }

        result = result.filter(
            item =>
                !ownAddresses.includes(item.ip) &&
                item.ip !== '0.0.0.0' &&
                item.ip !== 'localhost' &&
                item.ip !== '127.0.0.1' &&
                item.ip !== '::1' &&
                item.type === 'ipv4', // take only ipv4 addresses
        );

        // filter duplicates
        const unique: {
            ip: string;
            type: string;
            desc: string;
            uuid: string;
        }[] = [];
        for (let i = 0; i < result.length; i++) {
            if (!unique.find(item => item.ip === result[i].ip)) {
                unique.push(result[i]);
            }
        }

        return unique;
    }

    renderMessage(): React.JSX.Element | null {
        if (!this.state.showMessage) {
            return null;
        }

        return (
            <Message
                text={I18n.t('custom_kisshome_You cannot record the traffic of Fritz!Box')}
                onClose={() => this.setState({ showMessage: false })}
            />
        );
    }

    disableFritzBox(): void {
        const devices: Device[] = ConfigGeneric.getValue(this.props.data, 'devices') || [];
        const fritzBox: string = ConfigGeneric.getValue(this.props.data, 'fritzbox');
        let changed = false;
        devices.forEach(item => {
            if (item.ip === fritzBox && item.enabled) {
                changed = true;
                item.enabled = false;
            }
        });
        if (changed) {
            void this.onChange('devices', devices);
        }
    }

    checkDevices(devices: Device[]): void {
        if (devices.find(item => (item.desc || '').length < 3)) {
            this.props.onError('devices', I18n.t('custom_kisshome_name_too_short'));
        } else if (devices.find(item => !item.ip && !item.mac)) {
            this.props.onError('devices', I18n.t('custom_kisshome_name_ip_and_mac_missing'));
        } else if (devices.find(item => !validateIpAddress(item.ip))) {
            this.props.onError('devices', I18n.t('custom_kisshome_name_invalid_ip'));
        } else if (devices.find(item => !validateMacAddress(item.mac))) {
            this.props.onError('devices', I18n.t('custom_kisshome_name_invalid_mac'));
        } else {
            // try to find duplicates that are enabled
            const IPs = devices.filter(item => item.enabled && item.ip).map(item => item.ip);

            if (IPs.length !== new Set(IPs).size) {
                this.props.onError('devices', I18n.t('custom_kisshome_duplicate_ip'));
            } else {
                const MACs = devices.filter(item => item.enabled && item.mac).map(item => item.mac);
                if (MACs.length !== new Set(MACs).size) {
                    this.props.onError('devices', I18n.t('custom_kisshome_duplicate_mac'));
                } else {
                    this.props.onError('devices');
                }
            }
        }
    }

    renderItem(): React.JSX.Element {
        const devices: Device[] = ConfigGeneric.getValue(this.props.data, 'devices') || [];
        const fritzBox: string = ConfigGeneric.getValue(this.props.data, 'fritzbox');

        devices.forEach(item => {
            if (!item.uuid) {
                item.uuid = uuid();
            }
        });

        const notFound = this.state.ips
            ? devices.filter(iItem => !this.state.ips.find(item => item.ip === iItem.ip && item.uuid === iItem.uuid))
            : devices;

        const allEnabled =
            devices.every(item => item.enabled) &&
            (this.state.ips ? this.state.ips.every(item => devices.find(iItem => iItem.ip === item.ip)) : true);

        return (
            <TableContainer>
                {this.renderMessage()}
                {this.state.runningRequest || this.state.resolving ? (
                    <LinearProgress />
                ) : (
                    <div style={{ height: 2, width: '100%' }} />
                )}
                <Table
                    style={styles.table}
                    size="small"
                >
                    <TableHead>
                        <TableRow>
                            <TableCell style={{ ...styles.header, width: 120 }}>
                                <Checkbox
                                    title={
                                        allEnabled
                                            ? I18n.t('custom_kisshome_unselect_all')
                                            : I18n.t('custom_kisshome_select_all')
                                    }
                                    checked={allEnabled}
                                    indeterminate={!allEnabled && devices.length > 0}
                                    disabled={this.state.runningRequest}
                                    onClick={() => {
                                        const _devices = [
                                            ...(ConfigGeneric.getValue(this.props.data, 'devices') || []),
                                        ];
                                        if (allEnabled) {
                                            _devices.forEach(item => (item.enabled = false));
                                            for (let i = _devices.length - 1; i >= 0; i--) {
                                                if (this.state.ips.find(item => item.ip === _devices[i].ip)) {
                                                    _devices.splice(i, 1);
                                                }
                                            }
                                        } else {
                                            _devices.forEach(item => (item.enabled = true));
                                            this.state.ips.forEach(item => {
                                                if (
                                                    !_devices.find(iItem => item.ip === iItem.ip) &&
                                                    item.ip !== fritzBox
                                                ) {
                                                    _devices.push({
                                                        ip: item.ip,
                                                        mac: item.mac,
                                                        desc: item.desc,
                                                        enabled: true,
                                                        uuid: item.uuid,
                                                    });
                                                }
                                            });
                                            _devices.forEach(item => (item.enabled = true));
                                        }
                                        void this.onChange('devices', _devices);
                                    }}
                                />
                                <Fab
                                    onClick={() => {
                                        const _devices = [
                                            ...(ConfigGeneric.getValue(this.props.data, 'devices') || []),
                                        ];
                                        _devices.push({ ip: '', mac: '', desc: '', enabled: true, uuid: uuid() });
                                        void this.onChange('devices', _devices);
                                        this.checkDevices(_devices);
                                    }}
                                    size="small"
                                    disabled={this.state.runningRequest}
                                >
                                    <Add />
                                </Fab>
                            </TableCell>
                            <TableCell style={styles.header}>{I18n.t('custom_kisshome_ip')}</TableCell>
                            <TableCell style={styles.header}>{I18n.t('custom_kisshome_mac')}</TableCell>
                            <TableCell style={styles.header}>{I18n.t('custom_kisshome_vendor')}</TableCell>
                            <TableCell style={styles.header}>{I18n.t('custom_kisshome_name')}</TableCell>
                            <TableCell
                                style={styles.header}
                                title={'custom_kisshome_training_status_tooltip'}
                            >
                                {I18n.t('custom_kisshome_training_status')}
                            </TableCell>
                            <TableCell style={styles.header} />
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {this.state.ips?.map(row => (
                            <TableRow key={row.uuid}>
                                <TableCell
                                    scope="row"
                                    style={styles.td}
                                >
                                    <Checkbox
                                        checked={!!devices.find(item => item.uuid === row.uuid)?.enabled}
                                        disabled={this.state.runningRequest}
                                        onClick={() => {
                                            const _devices = [
                                                ...(ConfigGeneric.getValue(this.props.data, 'devices') || []),
                                            ];
                                            const pos = _devices.findIndex(item => item.uuid === row.uuid);
                                            if (pos === -1) {
                                                // check if maybe the device with this IP already exists
                                                const posIp = _devices.findIndex(item => item.ip === row.ip);
                                                if (posIp !== -1) {
                                                    // Modify the ips list
                                                    const ips: {
                                                        ip: string;
                                                        type: string;
                                                        desc: string;
                                                        uuid: string;
                                                        mac?: string;
                                                    }[] = JSON.parse(JSON.stringify(this.state.ips));
                                                    const ipsItem = ips.find(item => item.uuid === row.uuid);
                                                    if (ipsItem) {
                                                        ipsItem.uuid = _devices[posIp].uuid;
                                                    }
                                                    _devices[posIp].enabled = true;
                                                    this.setState({ ips }, () => this.onChange('devices', _devices));
                                                } else {
                                                    if (row.ip === fritzBox) {
                                                        this.setState({ showMessage: true });
                                                        return;
                                                    }
                                                    _devices.push({
                                                        ip: row.ip,
                                                        mac: row.mac,
                                                        desc: row.desc,
                                                        enabled: true,
                                                        uuid: row.uuid,
                                                    });
                                                }
                                            } else {
                                                _devices.splice(pos, 1);
                                            }
                                            void this.onChange('devices', _devices);
                                        }}
                                    />
                                </TableCell>
                                <TableCell style={styles.td}>{row.ip}</TableCell>
                                <TableCell style={styles.td}>{row.mac || ''}</TableCell>
                                <TableCell style={{ ...styles.td, ...styles.vendor }}>
                                    {this.state.MAC2VENDOR?.[normalizeMacAddress(row.mac)] || ''}
                                </TableCell>
                                <TableCell style={styles.td}>{row.desc}</TableCell>
                                <TableCell style={styles.td}>
                                    {row.mac && this.state.modelStatus?.[row.mac]
                                        ? this.state.modelStatus[row.mac]
                                        : '--'}
                                </TableCell>
                                <TableCell style={styles.td} />
                            </TableRow>
                        ))}
                        {notFound.map(row => {
                            const normalizedIp = normalizeIpAddress(row.ip);
                            const normalizedMac = normalizeMacAddress(row.mac);
                            const possibleMac = this.state.IP2MAC?.[normalizedIp];
                            const duplicateIp =
                                row.ip && row.enabled && devices.filter(it => row.ip === it.ip).length > 1
                                    ? I18n.t('custom_kisshome_duplicate_ip')
                                    : '';
                            const duplicateMac =
                                row.mac && row.enabled && devices.filter(it => row.mac === it.mac).length > 1
                                    ? I18n.t('custom_kisshome_duplicate_mac')
                                    : '';

                            return (
                                <TableRow key={row.uuid}>
                                    <TableCell
                                        scope="row"
                                        style={styles.td}
                                    >
                                        <Checkbox
                                            checked={!!row.enabled}
                                            disabled={this.state.runningRequest}
                                            onClick={() => {
                                                const _devices = [
                                                    ...(ConfigGeneric.getValue(this.props.data, 'devices') || []),
                                                ];
                                                const dev = _devices.find(item => item.uuid === row.uuid);
                                                if (dev) {
                                                    if (!dev.enabled && row.ip === fritzBox) {
                                                        this.setState({ showMessage: true });
                                                        return;
                                                    }

                                                    dev.enabled = !dev.enabled;
                                                    void this.onChange('devices', _devices);
                                                }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell style={styles.td}>
                                        <TextField
                                            fullWidth
                                            error={!!duplicateIp || !validateIpAddress(row.ip) || (!row.ip && !row.mac)}
                                            helperText={
                                                duplicateIp ||
                                                (validateIpAddress(row.ip)
                                                    ? !row.ip && !row.mac
                                                        ? I18n.t('custom_kisshome_name_ip_and_mac_missing')
                                                        : ''
                                                    : I18n.t('custom_kisshome_name_invalid_ip'))
                                            }
                                            value={row.ip}
                                            disabled={this.state.runningRequest}
                                            placeholder="192.168.x.y"
                                            onChange={e => {
                                                const _devices = [
                                                    ...(ConfigGeneric.getValue(this.props.data, 'devices') || []),
                                                ];
                                                const dev = _devices.find(item => item.uuid === row.uuid);
                                                if (dev) {
                                                    dev.ip = e.target.value;
                                                    if (dev.ip === fritzBox && dev.enabled) {
                                                        setTimeout(() => this.disableFritzBox(), 300);
                                                    }

                                                    void this.onChange('devices', _devices);
                                                    this.validateAddresses();
                                                    this.checkDevices(_devices);
                                                }
                                            }}
                                            onBlur={() => {
                                                if (row.ip.trim()) {
                                                    if (normalizedIp !== row.ip) {
                                                        const _devices = [
                                                            ...(ConfigGeneric.getValue(this.props.data, 'devices') ||
                                                                []),
                                                        ];
                                                        const dev = _devices.find(item => item.uuid === row.uuid);
                                                        if (dev) {
                                                            dev.ip = normalizedIp;
                                                            void this.onChange('devices', _devices);
                                                            this.checkDevices(_devices);
                                                        }
                                                    }
                                                }
                                            }}
                                            variant="standard"
                                        />
                                    </TableCell>
                                    <TableCell style={styles.td}>
                                        <TextField
                                            fullWidth
                                            value={row.mac}
                                            disabled={this.state.runningRequest}
                                            error={
                                                !!duplicateMac || !validateMacAddress(row.mac) || (!row.ip && !row.mac)
                                            }
                                            helperText={
                                                duplicateMac ||
                                                (validateMacAddress(row.mac)
                                                    ? !row.ip && !row.mac
                                                        ? I18n.t('custom_kisshome_name_ip_and_mac_missing')
                                                        : ''
                                                    : I18n.t('custom_kisshome_name_invalid_mac'))
                                            }
                                            placeholder={possibleMac || 'XX:XX:XX:XX:XX:XX'}
                                            onChange={e => {
                                                const _devices = [
                                                    ...(ConfigGeneric.getValue(this.props.data, 'devices') || []),
                                                ];
                                                const dev = _devices.find(item => item.uuid === row.uuid);
                                                if (dev) {
                                                    dev.mac = e.target.value;
                                                    void this.onChange('devices', _devices);
                                                    this.validateAddresses();
                                                    this.checkDevices(_devices);
                                                }
                                            }}
                                            onBlur={() => {
                                                if (row.mac.trim()) {
                                                    const normalized = normalizedMac;
                                                    if (normalized !== row.mac) {
                                                        const _devices = [
                                                            ...(ConfigGeneric.getValue(this.props.data, 'devices') ||
                                                                []),
                                                        ];
                                                        const dev = _devices.find(item => item.uuid === row.uuid);
                                                        if (dev) {
                                                            dev.mac = normalized;
                                                            void this.onChange('devices', _devices);
                                                            this.checkDevices(_devices);
                                                        }
                                                    }
                                                }
                                            }}
                                            variant="standard"
                                        />
                                    </TableCell>
                                    <TableCell style={{ ...styles.td, ...styles.vendor }}>
                                        {row.mac
                                            ? this.state.MAC2VENDOR?.[normalizedMac] || ''
                                            : possibleMac
                                              ? this.state.MAC2VENDOR?.[possibleMac] || ''
                                              : ''}
                                    </TableCell>
                                    <TableCell style={styles.td}>
                                        <TextField
                                            fullWidth
                                            value={row.desc}
                                            disabled={this.state.runningRequest}
                                            onChange={e => {
                                                const _devices = [
                                                    ...(ConfigGeneric.getValue(this.props.data, 'devices') || []),
                                                ];
                                                const dev = _devices.find(item => item.uuid === row.uuid);
                                                if (dev) {
                                                    dev.desc = e.target.value;
                                                    void this.onChange('devices', _devices);
                                                    // check that all devices have a name
                                                    this.checkDevices(_devices);
                                                }
                                            }}
                                            helperText={
                                                (row.desc || '').length >= 3
                                                    ? ''
                                                    : I18n.t('custom_kisshome_name_too_short')
                                            }
                                            error={(row.desc || '').length < 3}
                                            variant="standard"
                                        />
                                    </TableCell>
                                    <TableCell style={styles.td}>
                                        {row.mac && this.state.modelStatus?.[normalizedMac]
                                            ? this.state.modelStatus[normalizedMac]
                                            : '--'}
                                    </TableCell>
                                    <TableCell style={styles.td}>
                                        <IconButton
                                            disabled={this.state.runningRequest}
                                            onClick={() => {
                                                const _devices = [
                                                    ...(ConfigGeneric.getValue(this.props.data, 'devices') || []),
                                                ];
                                                const devIndex = _devices.findIndex(item => item.uuid === row.uuid);
                                                if (devIndex !== -1) {
                                                    _devices.splice(devIndex, 1);
                                                    void this.onChange('devices', _devices);
                                                    this.checkDevices(_devices);
                                                }
                                            }}
                                        >
                                            <Delete />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        );
    }
}

export default ConfigCustomInstancesSelector;
