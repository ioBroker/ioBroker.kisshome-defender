import { Adapter, type AdapterOptions, I18n } from '@iobroker/adapter-core';
import { join } from 'node:path';
import { readFileSync, existsSync, mkdirSync, openSync, writeSync, closeSync, readdirSync, unlinkSync } from 'node:fs';
import axios from 'axios';

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
import type { DataRequestType, DefenderAdapterConfig, Device, MACAddress, UXEvent } from './types';
import CloudSync, { PCAP_HOST } from './lib/CloudSync';
import { IDSCommunication } from './lib/IDSCommunication';
import Statistics from './lib/Statistics';

// save files every 60 minutes
const SAVE_DATA_EVERY_MS = 3_600_000;
// save files if bigger than 50 Mb
const SAVE_DATA_IF_BIGGER = 50 * 1024 * 1024;

export class KISSHomeResearchAdapter extends Adapter {
    declare config: DefenderAdapterConfig;

    protected tempDir: string = '';

    private uniqueMacs: MACAddress[] = [];

    private sid: string = '';

    private sidCreated: number = 0;

    private startTimeout: ioBroker.Timeout | undefined;

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

    private recordingEnabled: boolean = false;

    private static macCache: { [ip: string]: { mac: MACAddress; vendor?: string } } = {};

    private IPs: Device[] = [];

    private cloudSync: CloudSync | null = null;

    private idsCommunication: IDSCommunication | null = null;

    private statistics: Statistics | null = null;

    private questionnaireTimer: ioBroker.Timeout | null | undefined = null;

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
        if (typeof msg === 'object' && msg.message) {
            switch (msg.command) {
                case 'getDefaultGateway':
                    if (msg.callback) {
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
                                        msg.message.password === this.config.password
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
                    if (msg.callback) {
                        try {
                            const devices: Device[] = msg.message as Device[];
                            const result = await this.getMacForIps(devices);
                            this.sendTo(msg.from, msg.command, { result }, msg.callback);
                        } catch (e) {
                            this.sendTo(msg.from, msg.command, { error: e.message }, msg.callback);
                        }
                    }
                    break;

                case 'getData': {
                    if (msg.callback) {
                        const requestType: DataRequestType = msg.message.type || 'allStatistics';
                        if (requestType === 'dataVolumePerDevice') {
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
                            this.sendTo(msg.from, msg.command, this.statistics?.getAllStatistics(), msg.callback);
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
            }
        }
    }

    async onReady(): Promise<void> {
        // read UUID
        const uuidObj = await this.getForeignObjectAsync('system.meta.uuid');
        if (uuidObj?.native?.uuid) {
            this.uuid = uuidObj.native.uuid;
        } else {
            this.log.error('Cannot read UUID');
            return;
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

        this.questionnaireTimer = this.setTimeout(() => {
            this.questionnaireTimer = null;
            this.readQuestionnaire();
        }, 60 * 60 * 1000); // every hour

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
                I18n.translate(
                    'You must register this email first on https://kisshome-research.if-is.net/#register.',
                ),
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

        this.recordingEnabled = (((await this.getStateAsync('info.recording.enabled')) || {}).val as boolean) || false;
        this.cloudSync = new CloudSync(this, {
            workingDir: this.workingCloudDir,
            context: this.context,
            uuid: this.uuid,
            IPs: this.IPs,
            version: this.versionPack,
        });
        this.idsCommunication = new IDSCommunication(
            this,
            this.config,
            getDescriptionObject(this.IPs),
            this.workingIdsDir,
        );

        if (this.recordingEnabled) {
            // Send the data every hour to the cloud
            this.cloudSync.start();
            if (await this.cloudSync.isEmailOk()) {
                // start the monitoring
                await this.startRecording().catch(e => {
                    this.log.error(`[PCAP] ${I18n.translate('Cannot start recording')}: ${e}`);
                });

                //await this.idsCommunication.start();
            }
        } else {
            // Start communication with IDS
            await this.idsCommunication.start();
            this.log.warn(I18n.translate('Recording is not enabled. Do nothing.'));
        }
    }

    readQuestionnaire() {
        if (this.questionnaireTimer) {
            this.clearTimeout(this.questionnaireTimer);
            this.questionnaireTimer = null;
        }
        // Read the questionnaire file
        axios.get(`https://${PCAP_HOST}/api/v1/questionnaire?email=${encodeURIComponent(this.config.email)}`)
            .then(async (response) => {
                if (response.status === 200 && typeof response.data === 'object' && response.data?.id) {
                    // Check if the questionnaire file has changed
                    const state = await this.getStateAsync('info.cloudSync.questionary');
                    if (state?.val) {
                        const questionary = JSON.parse(state.val as string);
                        if (questionary.id !== response.data.id) {
                            // Save the new questionnaire
                            await this.setStateAsync('info.cloudSync.questionary', JSON.stringify(response.data), true);
                            this.log.info(`${I18n.translate('New questionnaire received')}: ${response.data.id}`);
                        }
                    } else {
                        // Save the questionnaire for the first time
                        await this.setStateAsync('info.cloudSync.questionary', JSON.stringify(response.data), true);
                        this.log.info(`${I18n.translate('New questionnaire received')}: ${response.data.id}`);
                    }
                }
            })
            .catch(e => {
                this.log.error(`${I18n.translate('Cannot read questionnaire')}: ${e}`);
            });


        this.questionnaireTimer = this.setTimeout(() => {
            this.questionnaireTimer = null;
            this.readQuestionnaire();
        }, 60 * 60 * 1000); // every hour
    }

    onStateChange(id: string, state: ioBroker.State | null | undefined): void {
        if (state) {
            if (id === `${this.namespace}.info.recording.enabled` && !state.ack) {
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
                    }
                }
            }
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

            this.log.debug(I18n.translate('Saved file %s with %s', fileName, size2text(offset)));
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

            this.log.debug(I18n.translate('Saved file %s with %s', fileName, size2text(offset)));

            this.idsCommunication?.triggerUpdate();
        }

        this.context.lastSaved = Date.now();
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
                        await this.setState(
                            'info.recording.capturedFiltered',
                            this.context.filtered.totalPackets,
                            true,
                        );
                    }
                    if (this.context.full.packets?.length) {
                        await this.setState('info.recording.capturedFull', this.context.full.totalPackets, true);
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
                                Date.now() - this.context.lastSaved >= SAVE_DATA_EVERY_MS
                            ) {
                                this.savePacketsToFile();

                                this.cloudSync?.startCloudSynchronization().catch(e => {
                                    this.log.error(`[RSYNC] ${I18n.translate('Cannot synchronize')}: ${e}`);
                                });
                            }
                        }, 10000);
                    }

                    await this.setState('info.recording.capturedFull', this.context.full.totalPackets, true);
                    await this.setState('info.recording.capturedFiltered', this.context.filtered.totalPackets, true);
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

    async onUnload(callback: () => void): Promise<void> {
        this.context.terminate = true;

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
