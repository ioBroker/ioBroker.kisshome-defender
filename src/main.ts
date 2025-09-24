import { Adapter, type AdapterOptions, I18n } from '@iobroker/adapter-core';
import { join } from 'node:path';
import { readFileSync, existsSync, mkdirSync, openSync, writeSync, closeSync, readdirSync, unlinkSync } from 'node:fs';
import axios from 'axios';
import { randomUUID, createHash } from 'node:crypto';
import schedule, { type Job } from 'node-schedule';

import {
    getDefaultGateway,
    getMacForIp,
    getVendorForMac,
    validateIpAddress,
    getTimestamp,
    getDescriptionObject,
    size2text,
} from './lib/utils';

import {
    startRecordingOnFritzBox,
    type Context,
    MAX_PACKET_LENGTH,
    stopAllRecordingsOnFritzBox,
    getRecordURL,
} from './lib/recording';
import { getFritzBoxFilter, getFritzBoxInterfaces, getFritzBoxToken, getFritzBoxUsers } from './lib/fritzbox';
import type {
    DataRequestType,
    DefenderAdapterConfig,
    Device,
    MACAddress,
    StoredStatisticsResult,
    UXEvent,
} from './types';
import CloudSync, { PCAP_HOST } from './lib/CloudSync';
import { IDSCommunication, CHANGE_TIME } from './lib/IDSCommunication';
import Statistics from './lib/Statistics';

// save files every 60 minutes
const SAVE_DATA_EVERY_MS = 3_600_000;
// save files if bigger than 50 Mb
const SAVE_DATA_IF_BIGGER = 50 * 1024 * 1024;

function secondsToMs(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;

    const sDisplay = s.toString().padStart(2, '0');
    return `${m}:${sDisplay} ${I18n.translate('minutes')}`;
}

export class KISSHomeResearchAdapter extends Adapter {
    declare config: DefenderAdapterConfig;
    protected tempDir: string = '';
    private uniqueMacs: MACAddress[] = [];
    private sid: string = '';
    private emailAlarmText: string = '';
    private sidCreated = 0;
    private startTimeout: ioBroker.Timeout | undefined;
    private nextSave = 0;
    private group: 'A' | 'B' = 'A';
    private visProject: { project: string; view: string; widget: string } | null = null;
    private context: Context = {
        terminate: false,
        controller: null,
        first: false,
        filtered: {
            packets: [],
            totalBytes: 0,
            totalPackets: 0,
            buffer: Buffer.from([]),
        },
        full: {
            packets: [],
            totalBytes: 0,
            totalPackets: 0,
            buffer: Buffer.from([]),
        },
        modifiedMagic: false,
        libpCapFormat: false,
        networkType: 1,
        started: 0,
        lastSaved: 0,
    };
    private readonly versionPack: string;
    private recordingRunning: boolean = false;
    private workingCloudDir: string = '';
    private workingIdsDir: string = '';
    private lastDebug: number = 0;
    private monitorInterval: ioBroker.Interval | undefined;
    private uuid: string = '';
    private iotInstance: string = '';
    private recordingEnabled: boolean = false;
    private static macCache: { [ip: string]: { mac: MACAddress; vendor?: string } } = {};
    private IPs: Device[] = [];
    private cloudSync: CloudSync | null = null;
    private idsCommunication: IDSCommunication | null = null;
    private statistics: Statistics | null = null;
    private questionnaireTimer: ioBroker.Timeout | null | undefined = null;
    private dailyReportSchedule: Job | null = null;
    private secondPartSchedule: Job | null = null;

    public constructor(options: Partial<AdapterOptions> = {}) {
        super({
            ...options,
            name: 'kisshome-defender',
            useFormatDate: true,
        });

        const pack = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
        this.versionPack = pack.version.replace(/\./g, '-');

        this.on('ready', () => this.onReady());
        this.on('unload', callback => this.onUnload(callback));
        this.on('message', this.onMessage.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
    }

    async onMessage(msg: ioBroker.Message): Promise<void> {
        if (typeof msg === 'object') {
            switch (msg.command) {
                case 'getDockerVolume':
                    if (msg.callback) {
                        this.sendTo(msg.from, msg.command, this.idsCommunication?.getDockerVolumePath(), msg.callback);
                    }
                    break;

                case 'getDefaultGateway':
                    if (msg.callback && msg.message) {
                        if (msg.message.value !== '0.0.0.0') {
                            this.sendTo(msg.from, msg.command, msg.message.value, msg.callback);
                        } else {
                            try {
                                const ip = await getDefaultGateway();
                                this.sendTo(msg.from, msg.command, ip, msg.callback);
                            } catch (e) {
                                this.sendTo(msg.from, msg.command, { error: e.message }, msg.callback);
                            }
                        }
                    }
                    break;

                case 'getUsers': {
                    if (msg.callback) {
                        try {
                            if (msg.message?.ip || this.config.fritzbox) {
                                const users = await getFritzBoxUsers(msg.message?.ip || this.config.fritzbox);
                                this.sendTo(msg.from, msg.command, users, msg.callback);
                            } else {
                                this.sendTo(msg.from, msg.command, [], msg.callback);
                            }
                        } catch (e) {
                            this.sendTo(msg.from, msg.command, { error: e.message }, msg.callback);
                        }
                    }
                    break;
                }

                case 'getFilter': {
                    if (msg.callback) {
                        try {
                            if (
                                msg.message?.ip ||
                                (this.config.fritzbox && msg.message?.login) ||
                                (this.config.login && msg.message?.password) ||
                                this.config.password
                            ) {
                                const filter = await getFritzBoxFilter(
                                    msg.message?.ip || this.config.fritzbox,
                                    msg.message?.login || this.config.login,
                                    msg.message?.password || this.config.password,
                                );
                                this.sendTo(
                                    msg.from,
                                    msg.command,
                                    {
                                        text: filter
                                            ? I18n.translate('Fritz!Box supports Filter-Feature')
                                            : I18n.translate('Fritz!Box does not support Filter-Feature'),
                                        style: {
                                            color: filter ? 'green' : 'red',
                                        },
                                    },
                                    msg.callback,
                                );
                            } else {
                                this.sendTo(msg.from, msg.command, false, msg.callback);
                            }
                        } catch (e) {
                            this.sendTo(msg.from, msg.command, { error: e.message }, msg.callback);
                        }
                    }
                    break;
                }

                case 'getModelStatus': {
                    this.sendTo(
                        msg.from,
                        msg.command,
                        { modelStatus: this.idsCommunication?.getModelStatus() || {} },
                        msg.callback,
                    );
                    break;
                }

                case 'getInterfaces': {
                    if (msg.callback) {
                        try {
                            if (
                                msg.message?.ip ||
                                (this.config.fritzbox && msg.message?.login) ||
                                (this.config.login && msg.message?.password) ||
                                this.config.password
                            ) {
                                const ifaces = await getFritzBoxInterfaces(
                                    msg.message?.ip || this.config.fritzbox,
                                    msg.message?.login,
                                    msg.message?.password,
                                    msg.message?.login === this.config.login &&
                                        msg.message?.password === this.config.password
                                        ? this.sid
                                        : undefined,
                                );
                                const lan1 = ifaces?.find(i => i.label === '1-lan');
                                if (lan1) {
                                    lan1.label += ' (default)';
                                }
                                const index = ifaces?.findIndex(it => it === lan1);
                                // place lan1 on the first position
                                if (ifaces && index && index !== -1) {
                                    ifaces.splice(0, 0, ifaces.splice(index, 1)[0]);
                                }

                                this.sendTo(msg.from, msg.command, ifaces, msg.callback);
                            } else {
                                this.sendTo(msg.from, msg.command, [], msg.callback);
                            }
                        } catch (e) {
                            this.sendTo(msg.from, msg.command, { error: e.message }, msg.callback);
                        }
                    }
                    break;
                }

                case 'getMacForIps':
                    if (msg.callback && msg.message) {
                        try {
                            const devices: Device[] = msg.message as Device[];
                            const result = await this.getMacForIps(devices);
                            this.sendTo(msg.from, msg.command, { result }, msg.callback);
                        } catch (e) {
                            this.sendTo(msg.from, msg.command, { error: e.message }, msg.callback);
                        }
                    }
                    break;

                case 'getTotals': {
                    if (msg.callback) {
                        this.sendTo(msg.from, msg.command, this.statistics?.getTotals(), msg.callback);
                    }
                    break;
                }

                case 'getData': {
                    if (msg.callback && msg.message) {
                        const requestType: DataRequestType = msg.message.type || 'allStatistics';
                        if (requestType === 'dataVolumePerDay') {
                            this.sendTo(msg.from, msg.command, this.statistics?.getDataVolumePerDay(), msg.callback);
                        } else if (requestType === 'dataVolumePerDevice') {
                            this.sendTo(msg.from, msg.command, this.statistics?.getDataVolumePerDevice(), msg.callback);
                        } else if (requestType === 'dataVolumePerCountry') {
                            this.sendTo(
                                msg.from,
                                msg.command,
                                this.statistics?.getDataVolumePerCountry(),
                                msg.callback,
                            );
                        } else if (requestType === 'dataVolumePerDaytime') {
                            this.sendTo(
                                msg.from,
                                msg.command,
                                this.statistics?.getDataVolumePerDaytime(),
                                msg.callback,
                            );
                        } else {
                            const results = this.statistics?.getAllStatistics();
                            const result: StoredStatisticsResult = {
                                analysisDurationMs: 0,
                                totalBytes: 0,
                                packets: 0,
                                results: results || [],
                                countries: {},
                                names: {},
                            };

                            // aggregate results
                            for (let r = 0; r < result.results.length; r++) {
                                result.analysisDurationMs += result.results[r].statistics.analysisDurationMs;
                                result.totalBytes += result.results[r].statistics.totalBytes;
                                result.packets += result.results[r].statistics.packets;
                                result.results[r].statistics.devices.forEach(device => {
                                    const ips = Object.keys(device.external_ips);
                                    ips.forEach(ip => {
                                        const country = device.external_ips[ip].country;
                                        result.countries[country] ||= 0;
                                        result.countries[country] += device.external_ips[ip].data_volume_bytes;
                                    });
                                });
                            }

                            this.IPs.forEach(item => {
                                result.names![item.mac.toLowerCase()] = {
                                    ip: item.ip || '',
                                    desc: item.desc || '',
                                    vendor: KISSHomeResearchAdapter.macCache[item.ip]?.vendor || '',
                                };
                            });

                            if (process.env.TEST) {
                                // Add test data
                                const testData: Record<string, { ip: string; desc: string }> = {
                                    '00:06:78:A6:8F:F0': {
                                        ip: '192.168.188.113',
                                        desc: 'denon',
                                    },
                                    '12:72:74:40:F2:D0': {
                                        ip: '192.168.188.119',
                                        desc: 'upnp',
                                    },
                                    '0A:B4:FE:A0:2F:1A': {
                                        ip: '192.168.188.122',
                                        desc: 'upnp',
                                    },
                                    'B0:B2:1C:18:CB:7C': {
                                        ip: '192.168.188.126',
                                        desc: 'shelly',
                                    },
                                    '24:A1:60:20:85:08': {
                                        ip: '192.168.188.131',
                                        desc: 'shelly',
                                    },
                                    '3C:61:05:DC:AD:24': {
                                        ip: '192.168.188.133',
                                        desc: 'shelly',
                                    },
                                    '8C:98:06:07:AA:80': {
                                        ip: '192.168.188.156',
                                        desc: 'upnp',
                                    },
                                    'D8:BB:C1:0A:1C:89': {
                                        ip: '192.168.188.157',
                                        desc: 'shelly',
                                    },
                                    '8C:98:06:08:61:3D': {
                                        ip: '192.168.188.158',
                                        desc: 'upnp',
                                    },
                                    'B0:B2:1C:18:F4:A8': {
                                        ip: '192.168.188.168',
                                        desc: 'shelly',
                                    },
                                    'E0:98:06:B5:7B:65': {
                                        ip: '192.168.188.29',
                                        desc: 'shelly',
                                    },
                                    '8C:CE:4E:E1:8E:F9': {
                                        ip: '192.168.188.31',
                                        desc: 'shelly',
                                    },
                                    '00:17:88:4B:A3:FC': {
                                        ip: '192.168.188.32',
                                        desc: 'hue',
                                    },
                                    '22:A6:2F:E7:25:3B': {
                                        ip: '192.168.188.35',
                                        desc: 'upnp',
                                    },
                                    '40:F5:20:01:A5:99': {
                                        ip: '192.168.188.36',
                                        desc: 'shelly',
                                    },
                                    'E0:98:06:B4:B5:8C': {
                                        ip: '192.168.188.39',
                                        desc: 'shelly',
                                    },
                                    'E0:98:06:B5:22:8B': {
                                        ip: '192.168.188.41',
                                        desc: 'shelly',
                                    },
                                    '22:A6:2F:4A:82:CB': {
                                        ip: '192.168.188.43',
                                        desc: 'upnp',
                                    },
                                    '00:04:20:FC:3A:C7': {
                                        ip: '192.168.188.49',
                                        desc: 'upnp',
                                    },
                                    '34:94:54:7A:EB:E4': {
                                        ip: '192.168.188.51',
                                        desc: 'shelly',
                                    },
                                    '70:2A:D5:CD:77:03': {
                                        ip: '192.168.188.54',
                                        desc: 'upnp',
                                    },
                                    '80:C7:55:7B:86:C0': {
                                        ip: '192.168.188.56',
                                        desc: 'upnp',
                                    },
                                    '00:11:32:B2:A0:50': {
                                        ip: '192.168.188.66',
                                        desc: 'synology',
                                    },
                                    '44:17:93:CE:4B:50': {
                                        ip: '192.168.188.70',
                                        desc: 'shelly',
                                    },
                                    'DC:A6:32:93:B7:AF': {
                                        ip: '192.168.188.90',
                                        desc: 'hm-rpc',
                                    },
                                    '64:1C:AE:46:50:F3': {
                                        ip: '192.168.188.92',
                                        desc: 'upnp',
                                    },
                                    '00:07:E9:13:37:46': {
                                        ip: '192.168.178.2',
                                        desc: 'qemu',
                                    },
                                };

                                for (const mac in testData) {
                                    if (testData[mac] && !result.names![mac.toLowerCase()]) {
                                        result.names![mac.toLowerCase()] = {
                                            ip: testData[mac].ip,
                                            desc: testData[mac].desc,
                                            vendor: KISSHomeResearchAdapter.macCache[testData[mac].ip]?.vendor || '',
                                        };
                                    }
                                }
                            }

                            result.analysisDurationMs = Math.floor(result.analysisDurationMs);

                            this.sendTo(msg.from, msg.command, result, msg.callback);
                        }
                    }
                    break;
                }

                case 'reportUxEvents': {
                    if (msg.message) {
                        // Save UX events to the file
                        this.cloudSync?.reportUxEvents(msg.message as UXEvent[]);
                    }
                    break;
                }

                case 'questionnaireAnswer': {
                    // Send the questionnaire answer to the server
                    if (msg.message && typeof msg.message === 'object' && this.config.email) {
                        try {
                            const response = await axios.post(
                                `https://${PCAP_HOST}/api/v2/questionnaire?email=${encodeURIComponent(this.config.email)}&uuid=${encodeURIComponent(this.uuid)}`,
                                msg.message,
                            );
                            if (response.status === 200 || response.status === 201) {
                                if (msg.callback) {
                                    this.sendTo(msg.from, msg.command, { result: 'ok' }, msg.callback);
                                }
                                this.log.info(`${I18n.translate('Questionnaire answer sent successfully')}`);
                            } else {
                                this.log.error(
                                    `${I18n.translate('Failed to send questionnaire answer')}: ${response.statusText}`,
                                );
                                if (msg.callback) {
                                    this.sendTo(
                                        msg.from,
                                        msg.command,
                                        { error: I18n.translate('Cannot send answer') },
                                        msg.callback,
                                    );
                                }
                            }
                        } catch (e) {
                            this.log.error(`${I18n.translate('Error sending questionnaire answer')}: ${e}`);
                            if (msg.callback) {
                                this.sendTo(
                                    msg.from,
                                    msg.command,
                                    { error: I18n.translate('Cannot send answer') },
                                    msg.callback,
                                );
                            }
                        }
                        // If the state has the same ID => delete it
                        const state = await this.getStateAsync('info.cloudSync.questionnaire');
                        if (state?.val) {
                            const questionnaire = JSON.parse(state.val as string);
                            if (questionnaire.id === msg.message.id) {
                                // Clear questionnaire
                                await this.setStateAsync(
                                    'info.cloudSync.questionnaire',
                                    JSON.stringify({ id: questionnaire.id, done: true }),
                                    true,
                                );
                            }
                        }
                    } else {
                        // Cannot happen, but just in case
                        this.log.warn(I18n.translate('No email provided for questionnaire answer or empty message'));
                        if (msg.callback) {
                            this.sendTo(
                                msg.from,
                                msg.command,
                                { error: I18n.translate('Invalid answer') },
                                msg.callback,
                            );
                        }
                    }
                    break;
                }

                case 'questionnaireCancel': {
                    // Send the questionnaire answer to the server
                    if (msg.message && typeof msg.message === 'object') {
                        // If the state has the same ID => delete it
                        const state = await this.getStateAsync('info.cloudSync.questionnaire');
                        if (state?.val) {
                            const questionnaire = JSON.parse(state.val as string);
                            if (questionnaire.id === msg.message.id) {
                                // Clear questionnaire
                                await this.setStateAsync(
                                    'info.cloudSync.questionnaire',
                                    JSON.stringify({ id: questionnaire.id, done: true }),
                                    true,
                                );
                            }
                        }
                        if (msg.callback) {
                            this.sendTo(msg.from, msg.command, { result: 'ok' }, msg.callback);
                        }
                    }
                    break;
                }

                case 'detectNow': {
                    this.triggerWriteFile();
                    break;
                }
            }
        }
    }

    generateEmail(message: string, title: string): string {
        this.emailAlarmText ||= readFileSync(`${__dirname}/emails/alert.html`, 'utf8');

        return this.emailAlarmText.replace('{{title}}', title).replace('{{message}}', message);
    }

    async onReady(): Promise<void> {
        // read UUID
        const uuidObj = await this.getForeignObjectAsync('system.meta.uuid');
        if (uuidObj?.native?.uuid) {
            this.uuid = uuidObj.native.uuid;
            const hash = createHash('sha256')
                .update((this.config.email || '').trim().toLowerCase())
                .digest();
            this.group = hash[hash.length - 1] & 1 ? 'B' : 'A';
            await this.setState('info.ids.group', this.group, true);
        } else {
            this.log.error('Cannot read UUID');
            return;
        }

        const statePeriod = await this.getStateAsync('info.ids.period');
        if (new Date(CHANGE_TIME).getTime() <= Date.now() && !statePeriod?.val) {
            await this.setStateAsync('info.ids.period', true, true);
        } else if (new Date(CHANGE_TIME).getTime() > Date.now() && (!statePeriod || statePeriod.val)) {
            await this.setStateAsync('info.ids.period', false, true);
        }

        await I18n.init(__dirname, this);

        // remove running flag
        const runningState = await this.getStateAsync('info.connection');
        if (runningState?.val) {
            await this.setState('info.connection', false, true);
            await this.setState('info.recording.running', false, true);
        }

        let captured = await this.getStateAsync('info.recording.capturedFull');
        if (captured?.val) {
            await this.setState('info.recording.capturedFull', 0, true);
        }

        captured = await this.getStateAsync('info.recording.capturedFiltered');
        if (captured?.val) {
            await this.setState('info.recording.capturedFiltered', 0, true);
        }

        if (!this.config.fritzbox) {
            this.log.error(`Fritz!Box is not defined`);
            return;
        }

        // Check the second(time interval) threshold for saving data
        if (!this.config.saveThresholdSeconds) {
            this.config.saveThresholdSeconds = SAVE_DATA_EVERY_MS / 1000;
        } else {
            this.config.saveThresholdSeconds =
                parseInt(this.config.saveThresholdSeconds.toString(), 10) || SAVE_DATA_EVERY_MS / 1000;
        }

        if (this.config.saveThresholdSeconds < 120) {
            this.log.warn(
                I18n.translate(
                    'The saveThresholdSeconds is set to %s seconds, but it should be at least 120 seconds to avoid too frequent saves.',
                    this.config.saveThresholdSeconds,
                ),
            );
            this.config.saveThresholdSeconds = 120;
        } else if (this.config.saveThresholdSeconds > 3600) {
            this.log.warn(
                I18n.translate(
                    'The saveThresholdSeconds is set to %s seconds, but it should be less than 3600 seconds to avoid too infrequent saves.',
                    this.config.saveThresholdSeconds,
                ),
            );
            this.config.saveThresholdSeconds = 3600;
        }

        this.readQuestionnaire();

        // try to get MAC addresses for all IPs
        this.IPs = this.config.devices.filter(
            item => item.enabled && (item.ip || item.mac) && item.ip !== this.config.fritzbox,
        );
        const tasks = this.IPs.filter(ip => !ip.mac);

        let fritzMac: MACAddress = '';
        try {
            // determine the MAC of Fritzbox
            const fritzEntry = await this.getMacForIps([
                { ip: this.config.fritzbox, mac: '', enabled: true, desc: 'FritzBox', uuid: '1' },
            ]);
            fritzMac = fritzEntry[0]?.mac || '';
        } catch {
            this.log.debug(`Cannot determine MAC addresses of Fritz!Box`);
        }

        if (tasks.length) {
            try {
                const macs = await this.getMacForIps(tasks);
                for (let i = 0; i < tasks.length; i++) {
                    const mac = macs[i];
                    if (mac?.mac) {
                        const item = this.IPs.find(t => t.ip === mac.ip);
                        if (item) {
                            item.mac = mac.mac;
                        }
                    }
                }
                // print out the IP addresses without MAC addresses
                const missing = this.IPs.filter(item => !item.mac);
                if (missing.length) {
                    this.log.warn(
                        `${I18n.translate('Cannot get MAC addresses for the following IPs')}: ${missing.map(t => t.ip).join(', ')}`,
                    );
                }
            } catch (e) {
                if (e.toString().includes('no results')) {
                    this.log.warn(
                        `${I18n.translate('Cannot get MAC addresses for the following IPs')}: ${tasks.map(t => t.ip).join(', ')}`,
                    );
                } else {
                    this.log.error(`Cannot get MAC addresses: ${e}`);
                }
            }
        }

        // take only unique MAC addresses and not the MAC address of Fritz!Box
        this.uniqueMacs = [];
        this.IPs.forEach(
            item =>
                !this.uniqueMacs.includes(item.mac) &&
                item.mac?.trim() &&
                item.mac !== fritzMac &&
                this.uniqueMacs.push(item.mac),
        );
        this.uniqueMacs = this.uniqueMacs.filter(mac => mac);

        // detect temp directory
        this.tempDir = this.config.tempDir || '/run/shm';
        if (!existsSync(this.tempDir)) {
            if (existsSync('/run/shm')) {
                this.tempDir = '/run/shm';
            } else if (existsSync('/tmp')) {
                this.tempDir = '/tmp';
            } else {
                this.log.warn(
                    I18n.translate(
                        'Cannot find any temporary directory. Please specify manually in the configuration. For best performance it should be a RAM disk',
                    ),
                );
                return;
            }
        }
        this.log.info(I18n.translate('Using "%s" as temporary directory', this.tempDir));

        this.tempDir = this.tempDir.replace(/\\/g, '/');

        if (this.tempDir.endsWith('/')) {
            this.tempDir = this.tempDir.substring(0, this.tempDir.length - 1);
        }

        this.workingCloudDir = `${this.tempDir}/cloud_pcaps`;
        this.workingIdsDir = `${this.tempDir}/ids_pcaps`;

        // create cloud directory
        try {
            if (!existsSync(this.workingCloudDir)) {
                mkdirSync(this.workingCloudDir);
            }
        } catch (e) {
            this.log.error(
                `${I18n.translate('Cannot create %s working directory', 'cloud')} "${this.workingCloudDir}": ${e}`,
            );
            return;
        }

        // create ids directory
        try {
            if (!existsSync(this.workingIdsDir)) {
                mkdirSync(this.workingIdsDir);
            }
        } catch (e) {
            this.log.error(
                `${I18n.translate('Cannot create %s working directory', 'IDS')} "${this.workingIdsDir}": ${e}`,
            );
            return;
        }

        // this.clearWorkingCloudDir();
        // this.clearWorkingIdsDir();

        if (!this.config.email) {
            this.log.error(I18n.translate('No email provided. Please provide an email address in the configuration.'));
            this.log.error(
                I18n.translate('You must register this email first on https://kisshome-research.if-is.net/#register.'),
            );
            return;
        }

        await this.setState('info.recording.running', false, true);
        await this.setState('info.recording.triggerWrite', false, true);

        this.statistics = new Statistics(this, this.IPs);
        if (!this.uniqueMacs.length) {
            this.log.warn(
                `[PCAP] ${I18n.translate('No any MAC addresses provided for recording. Please provide some MAC addresses or Ip addresses, that could be resolved to MAC address')}`,
            );
            return;
        }

        this.subscribeStates('info.recording.enabled');
        this.subscribeStates('info.recording.triggerWrite');
        // Delete it later
        this.subscribeStates('info.ids.simulate');
        const simulationActivated = await this.getStateAsync('info.ids.simulate');

        this.recordingEnabled = (((await this.getStateAsync('info.recording.enabled')) || {}).val as boolean) || false;
        this.cloudSync = new CloudSync(this, {
            workingDir: this.workingCloudDir,
            context: this.context,
            uuid: this.uuid,
            IPs: this.IPs,
            version: this.versionPack,
        });

        console.log(
            I18n.translate(
                'Saved UX events to file "%s"',
                `${this.cloudSync.workingDir}/${getTimestamp()}_ux_events.json`,
            ),
        );

        this.idsCommunication = new IDSCommunication(this, this.config, getDescriptionObject(this.IPs), {
            workingFolder: this.workingIdsDir,
            generateEvent: this.generateEvent,
            group: this.group,
            workingCloudDir: this.workingCloudDir,
        });

        if (this.recordingEnabled) {
            // Send the data every hour to the cloud
            this.cloudSync.start();
            if (await this.cloudSync.isEmailOk()) {
                // start the monitoring
                try {
                    await this.startRecording();
                } catch (e) {
                    this.log.error(`[PCAP] ${I18n.translate('Cannot start recording')}: ${e}`);
                }

                // Start communication with IDS
                await this.idsCommunication.start();
                this.idsCommunication.activateSimulation(!!simulationActivated?.val, true);
            }
            // } else {
            //     // TODO: Delete it later as the test is not needed
            //     await this.idsCommunication.start();
            //     this.idsCommunication.activateSimulation(!!simulationActivated?.val, true);
            // }
        }
        // else {
        //     // TODO: Delete it later as the test is not needed
        //     await this.idsCommunication.start();
        //     this.idsCommunication.activateSimulation(!!simulationActivated?.val, true);
        //     this.log.warn(I18n.translate('Recording is not enabled. Do nothing.'));
        // }
        // Start every day at 20:00 the status report
        this.dailyReportSchedule = schedule.scheduleJob('0 0 18 * * *', () => {
            this.generateStatusReport().catch(e => {
                this.log.error(`Cannot send status report: ${e}`);
            });
        });
        if (new Date(CHANGE_TIME).getTime() > Date.now()) {
            this.secondPartSchedule = schedule.scheduleJob(new Date(CHANGE_TIME), () => {
                void this.setStateAsync('info.ids.period', true, true);
            });
        }
        this.subscribeStates('info.ids.period');
    }

    readQuestionnaire(): void {
        if (this.questionnaireTimer) {
            this.clearTimeout(this.questionnaireTimer);
            this.questionnaireTimer = null;
        }
        // Read the questionnaire file
        axios
            .get(
                `https://${PCAP_HOST}/api/v2/questionnaire?email=${encodeURIComponent(this.config.email)}&uuid=${encodeURIComponent(this.uuid)}`,
            )
            .then(async response => {
                if (response.status === 200 && typeof response.data === 'object' && response.data?.id) {
                    // Check if the questionnaire file has changed
                    const state = await this.getStateAsync('info.cloudSync.questionnaire');
                    if (state?.val) {
                        const questionnaire = JSON.parse(state.val as string);
                        if (questionnaire.id !== response.data.id) {
                            // Save the new questionnaire
                            await this.setStateAsync(
                                'info.cloudSync.questionnaire',
                                JSON.stringify(response.data),
                                true,
                            );
                            this.log.info(`${I18n.translate('New questionnaire received')}: ${response.data.id}`);
                        }
                    } else {
                        // Save the questionnaire for the first time
                        await this.setStateAsync('info.cloudSync.questionnaire', JSON.stringify(response.data), true);
                        this.log.info(`${I18n.translate('New questionnaire received')}: ${response.data.id}`);
                    }
                }
            })
            .catch(e => {
                this.log.error(`${I18n.translate('Cannot read questionnaire')}: ${e}`);
            });

        this.questionnaireTimer = this.setTimeout(
            () => {
                this.questionnaireTimer = null;
                this.readQuestionnaire();
            },
            60 * 60 * 1000,
        ); // every hour
    }

    onStateChange(id: string, state: ioBroker.State | null | undefined): void {
        if (state) {
            if (id === `${this.namespace}.info.ids.period` && !state.ack) {
                void this.generateStatusReport(!!state?.val);
            } else if (id === `${this.namespace}.info.recording.enabled` && !state.ack) {
                if (state.val) {
                    // If recording is not running
                    if (!this.recordingEnabled) {
                        this.recordingEnabled = true;
                        this.context.terminate = false;
                        this.startRecording().catch(e => {
                            this.log.error(`${I18n.translate('Cannot start recording')}: ${e}`);
                        });
                        // Send the data every hour to the cloud
                        this.cloudSync?.start();
                        void this.idsCommunication?.start();
                    }
                } else if (this.recordingEnabled) {
                    this.recordingEnabled = false;
                    this.context.terminate = true;
                    if (this.context.controller) {
                        this.context.controller.abort();
                        this.context.controller = null;
                    }
                    this.cloudSync?.stop();
                    void this.idsCommunication?.destroy();
                }
            } else if (id === `${this.namespace}.info.recording.triggerWrite` && !state.ack) {
                if (state.val) {
                    this.triggerWriteFile();
                }
            } else if (id === `${this.namespace}.info.ids.simulate` && !state.ack) {
                // Simulate IDS events
                this.idsCommunication?.activateSimulation(!!state.val);
            }
        }
    }

    triggerWriteFile(): void {
        if (this.recordingRunning) {
            void this.setState('info.recording.triggerWrite', false, true).catch(e =>
                this.log.error(`${I18n.translate('Cannot set triggerWrite')}: ${e}`),
            );
            this.savePacketsToFile();

            setTimeout(() => {
                this.cloudSync?.startCloudSynchronization().catch(e => {
                    this.log.error(`[RSYNC] ${I18n.translate('Cannot synchronize')}: ${e}`);
                });
            }, 2000);

            this.idsCommunication?.triggerUpdate();
        }
    }

    restartRecording(): void {
        if (this.startTimeout) {
            clearTimeout(this.startTimeout);
        }
        this.startTimeout = this.setTimeout(() => {
            this.startTimeout = undefined;
            this.startRecording().catch(e => {
                this.log.error(`${I18n.translate('Cannot start recording')}: ${e}`);
            });
        }, 10000);
    }

    savePacketsToFile(): void {
        if (this.context.filtered.packets.length) {
            const packetsToSave = this.context.filtered.packets;
            this.context.filtered.packets = [];
            this.context.filtered.totalBytes = 0;

            const timeStamp = getTimestamp();
            const fileName = `${this.workingCloudDir}/${timeStamp}.pcap`;
            // get file descriptor of a file
            const fd = openSync(fileName, 'w');
            let offset = 0;
            const magic = packetsToSave[0].readUInt32LE(0);
            const STANDARD_MAGIC = 0xa1b2c3d4;
            // https://wiki.wireshark.org/Development/LibpcapFileFormat
            const MODIFIED_MAGIC = 0xa1b2cd34;

            // do not save a header if it is already present
            // write header
            if (magic !== STANDARD_MAGIC && magic !== MODIFIED_MAGIC) {
                // create PCAP header
                const byteArray = Buffer.alloc(6 * 4);
                // magic number
                byteArray.writeUInt32LE(
                    this.context.modifiedMagic || this.context.libpCapFormat ? MODIFIED_MAGIC : STANDARD_MAGIC,
                    0,
                );
                // major version
                byteArray.writeUInt16LE(2, 4);
                // minor version
                byteArray.writeUInt16LE(4, 6);
                // reserved
                byteArray.writeUInt32LE(0, 8);
                // reserved
                byteArray.writeUInt32LE(0, 12);
                // SnapLen
                byteArray.writeUInt16LE(MAX_PACKET_LENGTH, 16);
                // network type
                byteArray.writeUInt32LE(this.context.networkType, 20);
                writeSync(fd, byteArray, 0, byteArray.length, 0);
                offset = byteArray.length;
            }

            for (let i = 0; i < packetsToSave.length; i++) {
                const packet = packetsToSave[i];
                writeSync(fd, packet, 0, packet.length, offset);
                offset += packet.length;
            }

            closeSync(fd);

            this.log.debug(I18n.translate('Saved file "%s" with %s', fileName, size2text(offset)));
        }

        if (this.context.full.packets.length) {
            const packetsToSave = this.context.full.packets;
            this.context.full.packets = [];
            this.context.full.totalBytes = 0;

            const timeStamp = getTimestamp();
            const fileName = `${this.workingIdsDir}/${timeStamp}.pcap`;
            // get file descriptor of a file
            const fd = openSync(fileName, 'w');
            let offset = 0;
            const magic = packetsToSave[0].readUInt32LE(0);
            const STANDARD_MAGIC = 0xa1b2c3d4;
            // https://wiki.wireshark.org/Development/LibpcapFileFormat
            const MODIFIED_MAGIC = 0xa1b2cd34;

            // do not save a header if it is already present
            // write header
            if (magic !== STANDARD_MAGIC && magic !== MODIFIED_MAGIC) {
                // create PCAP header
                const byteArray = Buffer.alloc(6 * 4);
                // magic number
                byteArray.writeUInt32LE(
                    this.context.modifiedMagic || this.context.libpCapFormat ? MODIFIED_MAGIC : STANDARD_MAGIC,
                    0,
                );
                // major version
                byteArray.writeUInt16LE(2, 4);
                // minor version
                byteArray.writeUInt16LE(4, 6);
                // reserved
                byteArray.writeUInt32LE(0, 8);
                // reserved
                byteArray.writeUInt32LE(0, 12);
                // SnapLen
                byteArray.writeUInt16LE(MAX_PACKET_LENGTH, 16);
                // network type
                byteArray.writeUInt32LE(this.context.networkType, 20);
                writeSync(fd, byteArray, 0, byteArray.length, 0);
                offset = byteArray.length;
            }

            for (let i = 0; i < packetsToSave.length; i++) {
                const packet = packetsToSave[i];
                writeSync(fd, packet, 0, packet.length, offset);
                offset += packet.length;
            }

            closeSync(fd);

            this.log.debug(I18n.translate('Saved file "%s" with %s', fileName, size2text(offset)));

            this.idsCommunication?.triggerUpdate();
        }

        this.context.lastSaved = Date.now();
    }

    async findVisProject(): Promise<{ project: string; view: string; widget: string }> {
        if (this.visProject) {
            return this.visProject;
        }

        try {
            const projects = await this.readDirAsync('vis-2.0', '');
            for (const file of projects) {
                if (file.isDir) {
                    try {
                        // read views
                        const views = await this.readFileAsync('vis-2.0', `${file.file}/vis-views.json`);
                        if (views?.file) {
                            const viewsObj: any = JSON.parse(views.file.toString());
                            for (const view in viewsObj) {
                                if (view !== '___settings') {
                                    // Scan widgets
                                    const widgets = viewsObj[view].widgets;
                                    for (const widget in widgets) {
                                        if (widget.startsWith('w')) {
                                            const widgetObj: any = widgets[widget];
                                            if (widgetObj?.tpl === 'tplKisshomeDefender') {
                                                this.visProject = { project: file.file, view, widget };
                                                return this.visProject;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        this.log.warn(`Cannot read vis project ${file.file}: ${e}`);
                    }
                }
            }
        } catch {
            // ignore
        }

        // try vis 1.x

        try {
            const projects = await this.readDirAsync('vis.0', '');
            for (const file of projects) {
                if (file.isDir) {
                    // read views
                    try {
                        const views = await this.readFileAsync('vis.0', `${file.file}/vis-views.json`);
                        if (views?.file) {
                            const viewsObj: any = JSON.parse(views.file.toString());
                            for (const view in viewsObj) {
                                if (view !== '___settings') {
                                    // Scan widgets
                                    const widgets = viewsObj[view].widgets;
                                    for (const widget in widgets) {
                                        if (widget.startsWith('w')) {
                                            const widgetObj: any = widgets[widget];
                                            if (widgetObj?.tpl === 'tplKisshomeDefender') {
                                                this.visProject = { project: file.file, view, widget };
                                                return this.visProject;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        this.log.warn(`Cannot read vis project ${file.file}: ${e}`);
                    }
                }
            }
        } catch {
            // ignore
        }

        return { project: '', view: '', widget: '' };
    }

    async startRecording(): Promise<void> {
        if (!this.uniqueMacs.length) {
            this.log.error(
                `[PCAP] ${I18n.translate('No any MAC addresses provided for recording. Please provide some MAC addresses or Ip addresses, that could be resolved to MAC address')}`,
            );
            return;
        }

        // take sid from fritzbox
        if (!this.sid || !this.sidCreated || Date.now() - this.sidCreated >= 3_600_000) {
            try {
                this.sid =
                    (await getFritzBoxToken(
                        this.config.fritzbox,
                        this.config.login,
                        this.config.password,
                        (text: string) => this.log.warn(text),
                    )) || '';
                this.sidCreated = Date.now();
            } catch (e) {
                this.sid = '';
                this.sidCreated = 0;
                this.log.error(`[PCAP] ${I18n.translate('Cannot get SID from Fritz!Box')}: ${e}`);
            }
        }

        if (this.sid) {
            this.log.debug(`[PCAP] ${I18n.translate('Use SID')}: ${this.sid}`);

            let captured = await this.getStateAsync('info.recording.capturedFull');
            if (captured?.val) {
                await this.setState('info.recording.capturedFull', 0, true);
            }

            captured = await this.getStateAsync('info.recording.capturedFiltered');
            if (captured?.val) {
                await this.setState('info.recording.capturedFiltered', 0, true);
            }

            this.context.controller = new AbortController();

            this.context.filtered.packets = [];
            this.context.filtered.totalBytes = 0;
            this.context.filtered.totalPackets = 0;

            this.context.full.packets = [];
            this.context.full.totalBytes = 0;
            this.context.full.totalPackets = 0;

            this.context.lastSaved = Date.now();

            // stop all recordings
            const response = await stopAllRecordingsOnFritzBox(this.config.fritzbox, this.sid);
            if (response) {
                this.log.info(`[PCAP] ${I18n.translate('Stopped all recordings on Fritz!Box')}: ${response}`);
            }
            this.log.debug(
                `[PCAP] ${I18n.translate('Starting recording on')} ${this.config.fritzbox}/"${this.config.iface}"...`,
            );
            this.log.debug(
                `[PCAP] ${getRecordURL(this.config.fritzbox, this.sid, this.config.iface, this.uniqueMacs)}`,
            );

            startRecordingOnFritzBox(
                this.config.fritzbox,
                this.sid,
                this.config.iface,
                this.uniqueMacs,
                async (error: Error | null) => {
                    if (this.monitorInterval) {
                        this.clearInterval(this.monitorInterval);
                        this.monitorInterval = undefined;
                    }

                    this.savePacketsToFile();

                    this.context.filtered.totalBytes = 0;
                    this.context.filtered.totalPackets = 0;

                    this.context.full.totalBytes = 0;
                    this.context.full.totalPackets = 0;

                    if (error?.message === 'Unauthorized') {
                        this.sid = '';
                        this.sidCreated = 0;
                    }

                    if (this.recordingRunning) {
                        this.log.info(`[PCAP] ${I18n.translate('Recording stopped.')}`);
                        this.recordingRunning = false;
                        await this.setState('info.connection', false, true);
                        await this.setState('info.recording.running', false, true);
                    }

                    if (this.context.filtered.packets?.length) {
                        await this.setState('info.recording.capturedFiltered', this.context.filtered.totalBytes, true);
                    }
                    if (this.context.full.packets?.length) {
                        await this.setState('info.recording.capturedFull', this.context.full.totalBytes, true);
                    }
                    if (error) {
                        if (!this.context.terminate || !error.toString().includes('aborted')) {
                            this.log.error(`[PCAP] ${I18n.translate('Error while recording')}: ${error.toString()}`);
                        }
                    }
                    if (!this.context.terminate) {
                        this.restartRecording();
                    }
                },
                this.context,
                async (): Promise<void> => {
                    if (!this.recordingRunning) {
                        this.log.debug(`[PCAP] ${I18n.translate('Recording started!')}`);
                        this.recordingRunning = true;
                        await this.setState('info.connection', true, true);
                        await this.setState('info.recording.running', true, true);

                        this.monitorInterval ||= this.setInterval(() => {
                            if (Date.now() - this.lastDebug > 60000) {
                                this.log.debug(
                                    `[PCAP] ${I18n.translate('Captured %s packets (%s)', this.context.full.totalPackets, size2text(this.context.full.totalBytes))}`,
                                );
                                this.lastDebug = Date.now();
                            }
                            // save if a file is bigger than 50 Mb
                            if (
                                this.context.full.totalBytes > SAVE_DATA_IF_BIGGER ||
                                // save every 20 minutes
                                Date.now() - this.context.lastSaved >= this.config.saveThresholdSeconds * 1000
                            ) {
                                this.savePacketsToFile();

                                this.cloudSync?.startCloudSynchronization().catch(e => {
                                    this.log.error(`[RSYNC] ${I18n.translate('Cannot synchronize')}: ${e}`);
                                });
                            }
                            if (this.nextSave !== this.context.lastSaved + this.config.saveThresholdSeconds * 1000) {
                                this.nextSave = this.context.lastSaved + this.config.saveThresholdSeconds * 1000;
                                void this.setState(
                                    'info.recording.nextWrite',
                                    new Date(this.nextSave).toISOString(),
                                    true,
                                );
                            }
                        }, 10000);
                    }

                    await this.setState('info.recording.capturedFull', this.context.full.totalBytes, true);
                    await this.setState('info.recording.capturedFiltered', this.context.filtered.totalBytes, true);
                },
                (text: string, level: 'info' | 'warn' | 'error' | 'debug' = 'info') => {
                    this.log[level](`[PCAP] ${text}`);
                },
            );
        } else {
            this.log.warn(
                `[PCAP] ${I18n.translate('Cannot login into Fritz!Box. Could be wrong credentials or Fritz!Box is not available')}`,
            );
            // try to get the token in 10 seconds again. E.g., if Fritz!Box is rebooting
            this.restartRecording();
        }
    }

    async getMacForIps(devices: Device[]): Promise<{ mac: MACAddress; vendor?: string; ip: string; found: boolean }[]> {
        const result: { mac: MACAddress; vendor?: string; ip: string; found: boolean }[] = [];
        let error = '';
        for (const dev of devices) {
            if (dev.ip && KISSHomeResearchAdapter.macCache[dev.ip]) {
                result.push({ ...KISSHomeResearchAdapter.macCache[dev.ip], ip: dev.ip, found: true });
                continue;
            }
            if (!dev.mac && dev.ip && validateIpAddress(dev.ip)) {
                try {
                    const mac = await getMacForIp(dev.ip);
                    if (mac) {
                        result.push({ ...mac, found: true });
                        KISSHomeResearchAdapter.macCache[dev.ip] = { mac: mac.mac, vendor: mac.vendor };
                    } else {
                        this.log.warn(I18n.translate('Cannot resolve MAC address of "%s"', dev.ip));
                    }
                } catch (e) {
                    error = e.message;
                }
            } else {
                const item = {
                    mac: dev.mac,
                    ip: dev.ip,
                    vendor: dev.mac ? getVendorForMac(dev.mac) : '',
                    found: false,
                };
                result.push(item);
            }
        }

        if (!result.length && devices.length) {
            throw new Error(error || 'no results');
        }

        return result;
    }

    async generateStatusReport(simulatePeriod?: boolean): Promise<void> {
        // Collect statistics for today: average time, min, max, total
        const report = this.statistics?.getReportForToday();
        if (!report /* || report.maxScore > 10*/) {
            return;
        }

        this.idsCommunication?.aggregateStatistics(
            {
                time: new Date().toISOString(),
                statistics: {
                    suricataTotalRules: 0,
                    suricataAnalysisDurationMs: 0,
                    analysisDurationMs: 0,
                    totalBytes: 0,
                    packets: 0,
                    devices: [],
                },
                detections: [],
                file: `today.pcap`,
                result: { status: 'success' },
            },
            randomUUID(),
            false,
            report.maxScore,
            report,
        );

        const subject = I18n.translate('Status Report');
        const message: string[] = [];
        if (
            simulatePeriod === true ||
            (simulatePeriod === undefined && new Date(CHANGE_TIME).getTime() <= Date.now())
        ) {
            // week 3+
            message.push(I18n.translate("Attached you will find information about today's checks."));
            message.push('');
            message.push(
                `- ${I18n.translate('Average check time')}: ${secondsToMs(Math.round(report.averageDuration / 1000))}`,
            );
            message.push(
                `- ${I18n.translate('Minimum check time')}: ${secondsToMs(Math.round(report.minimalDuration / 1000))}`,
            );
            message.push(
                `- ${I18n.translate('Maximum check time')}: ${secondsToMs(Math.round(report.maximalDuration / 1000))}`,
            );
            message.push(
                `- ${I18n.translate('Duration of checks')}: ${secondsToMs(Math.round(report.totalDuration / 1000))}`,
            );
            message.push('');
            message.push(
                I18n.translate('No anomalies were detected during the checks. Therefore, everything is in order.'),
            );
        } else {
            // week 1-2
            if (this.group === 'A') {
                message.push(
                    I18n.translate('No anomalies were detected during the checks. Therefore, everything is in order.'),
                );
            } else {
                message.push(
                    I18n.translate(
                        'During the checks, a maximum anomaly score of %s was detected. Therefore, everything is in order.',
                        report.maxScore,
                    ),
                );
            }
        }

        if (!this.config.emailDisabled) {
            // email
            try {
                await axios.post(
                    `https://${PCAP_HOST}/api/v2/sendEmail/${encodeURIComponent(this.config.email)}?uuid=${encodeURIComponent(this.uuid)}`,
                    {
                        subject,
                        text: this.generateEmail(message.join('<br>\n'), subject),
                    },
                );
            } catch (e) {
                this.log.error(`${I18n.translate('Cannot send email')}: ${e}`);
                return;
            }
        }
        this.iotInstance = await this.getAliveIotInstance();

        if (this.iotInstance) {
            const data = await this.findVisProject();

            void this.setForeignStateAsync(
                `${this.iotInstance}.app.message`,
                JSON.stringify({
                    message,
                    title: subject,
                    expire: 3600,
                    priority: 'normal',
                    payload: {
                        openUrl: `https://iobroker.pro/vis-2/?${data.project || 'main'}#${data.view || 'kisshome'}/${data.widget}`,
                    },
                }),
            );
        }
    }

    async getAliveIotInstance(): Promise<string> {
        // iobroker.iot
        // find iobroker.iot instance
        const instances = await this.getObjectViewAsync('system', 'instance', {
            startkey: 'system.adapter.iot.',
            endkey: 'system.adapter.iot.\u9999',
        });

        // Find alive iobroker.iot instance
        for (const instance of instances?.rows || []) {
            const aliveState = await this.getForeignStateAsync(`${instance.value._id}.alive`);
            if (aliveState?.val) {
                return instance.id.replace('system.adapter.', '');
            }
        }

        return '';
    }

    generateEvent = async (scanUUID: string, message: string, subject: string): Promise<void> => {
        // admin
        await this.registerNotification('kisshome-defender', 'alert', message);

        if (!this.config.emailDisabled) {
            // email
            try {
                await axios.post(
                    `https://${PCAP_HOST}/api/v2/sendEmail/${encodeURIComponent(this.config.email)}?uuid=${encodeURIComponent(this.uuid)}`,
                    {
                        subject,
                        text: this.generateEmail(message, subject),
                    },
                );
            } catch (e) {
                this.log.error(`${I18n.translate('Cannot send email')}: ${e}`);
                return;
            }
        }

        // iobroker.iot
        // find iobroker.iot instance
        this.iotInstance = await this.getAliveIotInstance();

        if (this.iotInstance) {
            const data = await this.findVisProject();

            void this.setForeignStateAsync(
                `${this.iotInstance}.app.message`,
                JSON.stringify({
                    message,
                    title: subject,
                    expire: 3600,
                    priority: 'high',
                    payload: {
                        openUrl: `https://iobroker.pro/vis-2/?${data.project || 'main'}#${data.view || 'kisshome'}/${data.widget}/${scanUUID}`,
                    },
                }),
            );
        }
    };

    async onUnload(callback: () => void): Promise<void> {
        this.context.terminate = true;

        if (this.dailyReportSchedule) {
            this.dailyReportSchedule.cancel();
            this.dailyReportSchedule = null;
        }

        if (this.secondPartSchedule) {
            this.secondPartSchedule.cancel();
            this.secondPartSchedule = null;
        }

        if (this.recordingRunning) {
            this.recordingRunning = false;
            await this.setState('info.connection', false, true);
            await this.setState('info.recording.running', false, true);
        }

        if (this.questionnaireTimer) {
            this.clearTimeout(this.questionnaireTimer);
            this.questionnaireTimer = null;
        }

        this.cloudSync?.stop();
        await this.idsCommunication?.destroy();

        if (this.startTimeout) {
            clearTimeout(this.startTimeout);
            this.startTimeout = undefined;
        }

        if (this.context.controller) {
            this.context.controller.abort();
            this.context.controller = null;
        }

        try {
            callback();
        } catch {
            // ignore
        }
    }

    clearWorkingCloudDir(): void {
        try {
            const files = readdirSync(this.workingCloudDir);
            for (const file of files) {
                if (file.endsWith('.pcap')) {
                    try {
                        unlinkSync(`${this.workingCloudDir}/${file}`);
                    } catch (e) {
                        this.log.error(
                            `${I18n.translate('Cannot delete file "%s"', `${this.workingCloudDir}/${file}`)}: ${e}`,
                        );
                    }
                } else if (!file.endsWith('.json')) {
                    // delete unknown files
                    try {
                        unlinkSync(`${this.workingCloudDir}/${file}`);
                    } catch (e) {
                        this.log.error(
                            `${I18n.translate('Cannot delete file "%s"')} ${this.workingCloudDir}/${file}: ${e}`,
                        );
                    }
                }
            }
        } catch (e) {
            this.log.error(`${I18n.translate('Cannot read working directory "%s"')} "${this.workingCloudDir}": ${e}`);
        }
    }

    clearWorkingIdsDir(): void {
        try {
            const files = readdirSync(this.workingIdsDir);
            for (const file of files) {
                try {
                    unlinkSync(`${this.workingIdsDir}/${file}`);
                } catch (e) {
                    this.log.error(
                        `${I18n.translate('Cannot delete file "%s"', `${this.workingIdsDir}/${file}`)}: ${e}`,
                    );
                }
            }
        } catch (e) {
            this.log.error(`${I18n.translate('Cannot read working directory "%s"')} "${this.workingIdsDir}": ${e}`);
        }
    }
}

if (require.main !== module) {
    // Export the constructor in compact mode
    module.exports = (options: Partial<AdapterOptions> | undefined) => new KISSHomeResearchAdapter(options);
} else {
    // otherwise start the instance directly
    (() => new KISSHomeResearchAdapter())();
}
