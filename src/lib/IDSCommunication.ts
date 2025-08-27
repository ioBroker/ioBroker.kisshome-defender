import http from 'node:http';
import dns from 'node:dns';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import axios from 'axios';
import FormData from 'form-data';
import { getAbsoluteDefaultDataDir, I18n } from '@iobroker/adapter-core'; // Get common adapter utils

import type {
    AnalysisResult,
    DefenderAdapterConfig,
    DetectionsForDevice,
    DetectionsForDeviceWithUUID,
    DeviceStatistics,
    IDSStatus,
    IDSStatusMessage,
    MACAddress,
    StoredStatisticsResult,
} from '../types';
import { DockerManager } from './DockerManager';
import { fileNameToDate } from './utils';

const MAX_FILES_ON_DISK = 3; // Maximum number of files to keep on disk
const DOCKER_CONTAINER_NAME = 'iobroker-defender-ids';
const CHANGE_TIME = '2025-10-16T00:00:00Z'; // Calculation time

function betaRandom(a: number, b: number): number {
    // Verwende die Methode von Cheng (1978) für Beta(a, b) mit a, b > 0
    // Für a = b = 0.5 ist die Verteilung U-förmig
    const u = Math.random() * a;
    const v = Math.random() * b;
    return Math.sin(Math.PI * u) ** 2 / (Math.sin(Math.PI * u) ** 2 + Math.sin(Math.PI * v) ** 2);
}

function generateFluctuatingTimes(realTime: number, size = 100): number {
    const minVal = realTime;
    const maxVal = realTime * 4;
    const a = 0.5;
    const b = 0.5;
    const betaSamples: number[] = [];
    for (let i = 0; i < size; i++) {
        betaSamples.push(betaRandom(a, b));
    }
    const scaled = betaSamples.map(sample => sample * (maxVal - minVal) + minVal);
    return scaled.map(val => Math.round(val * 100) / 100)[0];
}

export class IDSCommunication {
    private readonly adapter: ioBroker.Adapter;
    private idsUrl: string;
    private readonly ownPort = 18001; // Default port for IDS communication and it can be changed if needed
    private readonly config: DefenderAdapterConfig;
    private readonly metaData: { [mac: MACAddress]: { ip: string; desc: string } };
    private lastStatus: IDSStatus | null = null;
    private webServer: http.Server | null = null;
    private ownIp: string | null = null;
    private statusInterval: NodeJS.Timeout | null = null;
    private dockerManager: DockerManager | null = null;
    private configSent = false;
    private readonly workingFolder: string;
    private readonly statisticsDir: string;
    private currentStatus:
        | 'Running'
        | 'Started'
        | 'Configuring'
        | 'Analyzing'
        | 'Error'
        | 'No connection'
        | 'Exited'
        | '' = '';
    private currentVersion: string = '';
    private uploadStatus: {
        status: 'idle' | 'waitingOnResponse' | 'sendingFile';
        fileName?: string;
    } = {
        status: 'idle',
    };
    private readonly group: 'A' | 'B'; // Group A or B
    private lastCheckedDate = '';
    private readonly generateEvent: (isAlert: boolean, id: string, message: string, title: string) => Promise<void>;

    private simulation = false;
    private simulateInterval: NodeJS.Timeout | null = null;
    private simulateIntervalRecording: NodeJS.Timeout | null = null;
    private simulateRecordingBytes = 0;

    constructor(
        adapter: ioBroker.Adapter,
        config: DefenderAdapterConfig,
        metaData: { [mac: MACAddress]: { ip: string; desc: string } },
        options: {
            workingFolder: string;
            generateEvent: (isAlert: boolean, id: string, message: string, title: string) => Promise<void>;
            group: 'A' | 'B';
        },
    ) {
        this.adapter = adapter;
        this.config = config;
        this.metaData = metaData;
        this.workingFolder = options.workingFolder;
        this.generateEvent = options.generateEvent;
        this.group = options.group;
        this.idsUrl = (this.config.docker?.selfHosted ? '' : this.config.docker?.url) || '';

        if (this.idsUrl.endsWith('/')) {
            this.idsUrl = this.idsUrl.slice(0, -1); // Remove trailing slash if present
        }
        this.statisticsDir = join(getAbsoluteDefaultDataDir(), 'kisshome-defender');
        if (!existsSync(this.statisticsDir)) {
            try {
                // Create the directory if it does not exist
                mkdirSync(this.statisticsDir, { recursive: true });
            } catch (error) {
                this.adapter.log.error(`Error creating statistics directory: ${error.message}`);
            }
        }
        if (this.config.docker.selfHosted && !existsSync(`${this.statisticsDir}/volume`)) {
            try {
                // Create the volume directory if it does not exist
                mkdirSync(`${this.statisticsDir}/volume`, { recursive: true });
            } catch (error) {
                this.adapter.log.error(`Error creating statistics volume directory: ${error.message}`);
            }
        }

        // Set initial state
        void this.adapter.setState('info.ids.status', 'No connection', true);
        void this.adapter.setState('info.analysis.running', false, true);
    }

    getDockerVolumePath(): string {
        return `${this.statisticsDir}/volume`.replace(/\\/g, '/'); // Ensure the path uses forward slashes
    }

    static ip6toNumber(ip: string): bigint {
        if (!ip || typeof ip !== 'string') {
            throw new Error('Invalid IPv6 address');
        }
        const parts = ip.split(':').map(part => BigInt(`0x${part}`));
        if (parts.length !== 8) {
            throw new Error('Invalid IPv6 address format');
        }
        return (
            (parts[0] << BigInt(112)) |
            (parts[1] << BigInt(96)) |
            (parts[2] << BigInt(80)) |
            (parts[3] << BigInt(64)) |
            (parts[4] << BigInt(48)) |
            (parts[5] << BigInt(32)) |
            (parts[6] << BigInt(16)) |
            parts[7]
        );
    }

    static findSuitableIpv6Address(targetV6IP: string): string | null {
        const ownIp = networkInterfaces();
        for (const iface of Object.values(ownIp)) {
            if (iface) {
                for (const address of iface) {
                    if (address.family === 'IPv6') {
                        // Calculate the subnet
                        const ipParts = IDSCommunication.ip6toNumber(targetV6IP);
                        const addressParts = IDSCommunication.ip6toNumber(address.address);
                        const subnetMask = IDSCommunication.ip6toNumber(address.netmask);
                        if ((ipParts & subnetMask) === (addressParts & subnetMask)) {
                            return address.address;
                        }
                    }
                }
            }
        }

        return null;
    }

    static findSuitableIpv4Address(targetIp: string): string | null {
        const ownIp = networkInterfaces();
        for (const iface of Object.values(ownIp)) {
            if (iface) {
                for (const address of iface) {
                    if (address.family === 'IPv4') {
                        // Calculate the subnet
                        const ipParts = IDSCommunication.ip4toNumber(targetIp);
                        const addressParts = IDSCommunication.ip4toNumber(address.address);
                        const subnetMask = IDSCommunication.ip4toNumber(address.netmask);
                        if ((ipParts & subnetMask) === (addressParts & subnetMask)) {
                            return address.address;
                        }
                    }
                }
            }
        }
        return null;
    }

    static ip4toNumber(ip: string): number {
        if (!ip || typeof ip !== 'string') {
            throw new Error('Invalid IP address');
        }
        const parts = ip.split('.').map(Number);
        if (parts.length !== 4 || parts.some(part => part < 0 || part > 255)) {
            throw new Error('Invalid IP address format');
        }
        return (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3];
    }

    /**
     * Get the own IP address based on the IDS URL.
     */
    private async getOwnIpAddress(): Promise<string> {
        if (!this.idsUrl && !this.config.docker?.selfHosted) {
            this.adapter.log.warn('No IDS URL configured, using localhost as fallback');
            throw new Error('No IDS URL configured');
        } else if (!this.idsUrl) {
            this.idsUrl = `http://${await this.dockerManager!.getIpOfContainer()}:5000`;
        }

        const parsed = new URL(this.idsUrl);
        if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
            return '127.0.0.1';
        }
        if (parsed.hostname === '::1') {
            return '::1';
        }

        // If IPv4
        if (parsed.hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
            // Find int the own interfaces the one with the IP in the same subnet
            const ipv4 = IDSCommunication.findSuitableIpv4Address(parsed.hostname);
            if (!ipv4) {
                this.adapter.log.warn(`No suitable IPv4 address found for ${parsed.hostname}`);
                return '127.0.0.1'; // Fallback to localhost
            }
            return ipv4;
        }
        if (parsed.hostname.match(/^[0-9a-fA-F:]+$/)) {
            // If IPv6, we assume the first address is the one to use
            const ipv6 = IDSCommunication.findSuitableIpv6Address(parsed.hostname);
            if (!ipv6) {
                this.adapter.log.warn(`No suitable IPv6 address found for ${parsed.hostname}`);
                return '::1'; // Fallback to localhost
            }
            return ipv6;
        }

        // resolve the hostname to an IP address
        this.adapter.log.warn(`Hostname is not an IP address: ${parsed.hostname}`);
        try {
            const ips = await dns.promises.lookup(parsed.hostname, { family: 4, all: true });
            if (ips.length === 0) {
                this.adapter.log.warn(`No IPv4 addresses found for ${parsed.hostname}`);
            } else {
                for (const ip of ips) {
                    if (ip.family === 4) {
                        const ipv4 = IDSCommunication.findSuitableIpv4Address(ip.address);
                        if (ipv4) {
                            return ipv4;
                        }
                    }
                }
            }
        } catch {
            // ignore
        }

        try {
            const ips = await dns.promises.lookup(parsed.hostname, { family: 6, all: true });
            if (ips.length === 0) {
                this.adapter.log.warn(`No IPv6 addresses found for ${parsed.hostname}`);
                return '127.0.0.1';
            }
            for (const ip of ips) {
                if (ip.family === 6) {
                    const ipv6 = IDSCommunication.findSuitableIpv6Address(ip.address);
                    if (ipv6) {
                        return ipv6;
                    }
                }
            }
        } catch (error) {
            // ignore
            this.adapter.log.warn(`Error resolving hostname ${parsed.hostname}: ${error.message}`);
        }
        this.adapter.log.warn(`No addresses found for ${parsed.hostname}`);
        return '127.0.0.1';
    }

    private async _sendConfig(): Promise<void> {
        const formData = new FormData();

        this.ownIp ||= await this.getOwnIpAddress();

        let metaJsonString = JSON.stringify(this.metaData);

        if (process.env.TEST) {
            // Just for test
            metaJsonString = JSON.stringify({
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
            });
        }

        formData.append('meta_json', metaJsonString, {
            filename: 'meta.json', // Der Dateiname ist oft auch für String-Daten erforderlich
            contentType: 'application/json',
        });

        formData.append('callback_url', `http://172.17.0.1:${this.ownPort}`);
        formData.append('allow_training', this.config.allowTraining ? 'true' : 'false');

        try {
            const response = await axios.post(`${this.idsUrl}/configure`, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
            });
            this.adapter.log.info(
                `${I18n.translate('Config successful')}: ${response.status} ${JSON.stringify(response.data)}`,
            );
        } catch (error) {
            if (axios.isAxiosError(error)) {
                this.adapter.log.error(`Error uploading config: ${error.message}`);
                if (error.response) {
                    this.adapter.log.error(`Response data: ${JSON.stringify(error.response.data)}`);
                    this.adapter.log.error(`Response status: ${error.response.status}`);
                }
            } else {
                this.adapter.log.error(`An unexpected error occurred: ${error}`);
            }
        }
    }

    public getModelStatus(): IDSStatusMessage['trainingJson'] {
        return this.lastStatus?.message?.trainingJson || {};
    }

    static normalizeMacAddress(mac: string | undefined): MACAddress {
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

    private async _getStatus(): Promise<void> {
        try {
            const response = await axios.get(`${this.idsUrl}/status`, { timeout: 3000 });
            if (this.currentStatus !== (response.data as IDSStatus).message?.status) {
                this.adapter.log.debug(`Status: ${response.status} ${JSON.stringify(response.data)}`);
            }
            // {
            //   "Result": "Success",
            //   "Message": {
            //     "Status": "Running",
            //   }
            // }
            this.lastStatus = response.data;
            if (!this.configSent && this.lastStatus?.message?.status === 'Started') {
                await this._sendConfig();
                this.configSent = true;
            }
            if (this.configSent && this.lastStatus?.message?.status !== 'Started') {
                this.configSent = false;
            }

            // Restart the IDS if it exited
            if (
                this.dockerManager &&
                (this.lastStatus?.message?.status === 'Error' || this.lastStatus?.message?.status === 'Exited')
            ) {
                this.adapter.log.warn('IDS in the error state, restarting...');
                await this.dockerManager.restart();
            }
            if (this.lastStatus?.message?.training) {
                this.lastStatus.message.trainingJson = JSON.parse(this.lastStatus.message.training);
            }

            if (this.lastStatus?.message?.trainingJson) {
                // Normalize all MACs
                const normalizedModelStatus: {
                    [mac: MACAddress]: { progress: number; description: string };
                } = {};
                for (const mac in this.lastStatus.message.trainingJson) {
                    const normalizedMac = IDSCommunication.normalizeMacAddress(mac); // Normalize MAC address
                    normalizedModelStatus[normalizedMac] = this.lastStatus.message.trainingJson[mac];
                }
                this.lastStatus.message.trainingJson = normalizedModelStatus;
            }

            this.triggerUpdate();
        } catch (error) {
            // Ignore the very first time when the IDS image is not ready yet
            if (this.currentStatus !== 'No connection' && this.currentStatus) {
                if (axios.isAxiosError(error)) {
                    this.adapter.log.error(`Error getting status: ${error.message}`);
                    if (error.response) {
                        this.adapter.log.error(`Response data: ${JSON.stringify(error.response.data)}`);
                        this.adapter.log.error(`Response status: ${error.response.status}`);
                    }
                } else {
                    this.adapter.log.error(`An unexpected error occurred: ${error}`);
                }
            }

            this.lastStatus = {
                result: 'Error',
                message: {
                    status: 'No connection',
                    error: error.response?.data || 'No response data',
                },
            };
        }
        if (this.currentStatus !== (this.lastStatus?.message?.status || 'No connection')) {
            this.configSent = false;
            this.currentStatus = this.lastStatus?.message?.status || 'No connection';
            // Update variables
            void this.adapter.setState('info.ids.status', this.lastStatus?.message?.status || 'No connection', true);
        }
        if (this.currentVersion !== (this.lastStatus?.message?.version || '--')) {
            this.currentVersion = this.lastStatus?.message?.version || '--';
            // Update version
            void this.adapter.setState('info.ids.version', this.lastStatus?.message?.version || '--', true);
        }
    }

    deleteOldStatisticsFiles(): void {
        const now = new Date();
        const timeString = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        if (this.lastCheckedDate === timeString) {
            // Already checked today, no need to check again
            return;
        }
        this.lastCheckedDate = timeString;

        const files = readdirSync(this.statisticsDir)
            .filter(file => file.endsWith('.json'))
            .sort((a, b) => a.localeCompare(b));

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7); // 7 days ago
        sevenDaysAgo.setHours(0);
        sevenDaysAgo.setMinutes(0);
        sevenDaysAgo.setSeconds(0);
        sevenDaysAgo.setMilliseconds(0);

        for (const file of files) {
            const fileDate = fileNameToDate(file);
            if (fileDate < sevenDaysAgo) {
                // Delete the file if it is older than 7 days
                try {
                    unlinkSync(join(this.statisticsDir, file));
                    this.adapter.log.debug(`Deleted old statistics file: ${file}`);
                } catch (error) {
                    this.adapter.log.error(`Error deleting old statistics file ${file}: ${error.message}`);
                }
            }
        }
    }

    aggregateStatistics(result: AnalysisResult, resultUUID: string, isAlert: boolean, score: number): void {
        // Get file name for current time.
        const now = new Date();
        const fileName = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}_${Math.floor(now.getHours() / 6).toString()}.json`;
        let data: StoredStatisticsResult;
        if (existsSync(join(this.statisticsDir, fileName))) {
            try {
                data = JSON.parse(readFileSync(join(this.statisticsDir, fileName), 'utf-8'));
            } catch (e) {
                this.adapter.log.error(`Error reading statistics file ${fileName}: ${e.message}`);
            }
        }

        data ||= {
            analysisDurationMs: 0,
            totalBytes: 0,
            packets: 0,
            results: [], // Initialize dataVolume as an empty object
            countries: {}, // Initialize countries as an empty object
        };

        // Aggregate the statistics
        result.statistics.analysisDurationMs = Math.round(result.statistics.analysisDurationMs);
        data.analysisDurationMs += result.statistics.analysisDurationMs;
        data.totalBytes += result.statistics.totalBytes;
        data.packets += result.statistics.packets;

        result.statistics.devices.forEach((device: DeviceStatistics) => {
            const ips = Object.keys(device.external_ips);
            ips.forEach(ip => {
                const country = device.external_ips[ip].country;
                data.countries[country] ||= 0;
                data.countries[country] += device.external_ips[ip].data_volume_bytes;
            });
        });

        data.results.push({
            uuid: resultUUID,
            time: result.time,
            statistics: result.statistics,
            detections: result.detections,
            isAlert,
            score,
        });

        writeFileSync(join(this.statisticsDir, fileName), JSON.stringify(data));

        this.deleteOldStatisticsFiles();

        void this.adapter.setState('info.detections.lastAnalysis', resultUUID, true);
    }

    activateSimulation(enabled: boolean, onStart?: boolean): void {
        if (this.simulation !== enabled) {
            this.simulation = enabled;
            if (enabled) {
                this.simulateRecordingBytes = 0;
                void this.adapter.setState('info.recording.enabled', true, true);
                void this.adapter.setState('info.recording.running', true, true);
                this.simulateInterval = setInterval(() => this.simulateEvents(), 60000);
                this.simulateIntervalRecording = setInterval(() => {
                    this.simulateRecordingBytes += Math.floor(Math.random() * 1000000); // Simulate random bytes
                    void this.adapter.setState('info.recording.capturedFull', this.simulateRecordingBytes, true);
                }, 1000);
                if (!onStart) {
                    void this.simulateEvents();
                } else {
                    void this.adapter.setState('info.recording.capturedFull', this.simulateRecordingBytes, true);
                    void this.adapter.setState(
                        'info.recording.nextWrite',
                        new Date(Date.now() + 60_000).toISOString(),
                        true,
                    );
                }
            } else {
                void this.adapter.setState('info.recording.enabled', false, true);
                void this.adapter.setState('info.recording.running', false, true);
                if (this.simulateInterval) {
                    clearInterval(this.simulateInterval);
                    this.simulateInterval = null;
                }
                if (this.simulateIntervalRecording) {
                    clearInterval(this.simulateIntervalRecording);
                    this.simulateIntervalRecording = null;
                }
            }
        }
    }

    private async simulateEvents(): Promise<void> {
        const MACs: string[] = [
            '00:11:22:33:44:55',
            '66:77:88:99:AA:BB',
            'CC:DD:EE:FF:00:11',
            '22:33:44:55:66:77',
            '88:99:AA:BB:CC:DD',
        ];
        const time = new Date().toISOString();
        const result: AnalysisResult = {
            file: 'test.pcap',
            time: time,
            result: {
                status: 'success',
            },
            statistics: {
                suricataTotalRules: 0,
                suricataAnalysisDurationMs: 0,
                analysisDurationMs: 0,
                totalBytes: 0,
                packets: 0,
                devices: [],
            },
            detections: [],
        };

        for (let a = 0; a < MACs.length; a++) {
            const mac = MACs[a];
            const bytes =
                mac === '88:99:AA:BB:CC:DD'
                    ? Math.floor(Math.random() * 100000000)
                    : Math.floor(Math.random() * 1000000);
            const packets = Math.floor(bytes / 1000); // Assuming 1000 bytes per packet

            result.statistics.packets += packets;
            result.statistics.totalBytes += bytes;
            result.statistics.devices.push({
                mac,
                data_volume: {
                    packet_count: Math.floor(bytes / 1000), // Random packet count
                    data_volume_bytes: bytes,
                },
                external_ips: {
                    '1.1.1.1': {
                        country: 'DE',
                        data_volume_bytes: Math.floor(bytes * 0.5), // 50% of bytes for Germany
                    },
                    '1.1.1.2': {
                        country: 'US',
                        data_volume_bytes: Math.floor(bytes * 0.3), // 30% of bytes for US
                    },
                    '1.1.1.3': {
                        country: 'FR',
                        data_volume_bytes: Math.floor(bytes * 0.2), // 20% of bytes for France
                    },
                },
            });

            const score =
                Math.random() > 0.95 ? Math.floor(Math.random() * 1000) / 10 : Math.floor(Math.random() * 100) / 10; // Random score between 0 and 100
            const scoreMl =
                Math.random() > 0.95 ? Math.floor(Math.random() * 1000) / 10 : Math.floor(Math.random() * 100) / 10; // Random score between 0 and 100

            // Generate for each MAC a detection
            const detection: DetectionsForDevice = {
                mac,
                suricata: [
                    {
                        type: score > 70 ? 'Alert' : score > 10 ? 'Warning' : 'Info',
                        description: score > 70 ? 'Dangerous alert' : score > 10 ? 'Just warning' : 'Nothing special',
                        first_occurrence: time,
                        number_occurrences: score > 10 ? Math.floor(Math.random() * 5) + 1 : 0, // Random occurrences between 1 and 5
                        score, // Random score between 0 and 99
                    },
                ],
                ml: {
                    type: scoreMl > 70 ? 'Alert' : scoreMl > 10 ? 'Warning' : 'Info',
                    description: scoreMl > 70 ? 'Dangerous ML alert' : scoreMl > 10 ? 'Just ML warning' : 'OK',
                    first_occurrence: time,
                    number_occurrences: scoreMl > 10 ? Math.floor(Math.random() * 3) + 1 : 0, // Random occurrences between 1 and 3
                    score: 0,
                },
            } as DetectionsForDevice;
            result.detections.push(detection);
        }

        await this.onData(result);
        this.simulateRecordingBytes = 0; // Reset the simulated recording bytes
        void this.adapter.setState('info.recording.capturedFull', this.simulateRecordingBytes, true);
        void this.adapter.setState('info.recording.nextWrite', new Date(Date.now() + 60_000).toISOString(), true);
    }

    private onData = async (analysisResult: AnalysisResult): Promise<string> => {
        if (!analysisResult || typeof analysisResult !== 'object') {
            return 'Invalid data format';
        }
        if (
            analysisResult.file === this.uploadStatus.fileName ||
            (!this.uploadStatus.fileName && analysisResult.file?.includes('test'))
        ) {
            this.adapter.log.debug(
                `Received response for file ${analysisResult.file}: ${JSON.stringify(analysisResult)}`,
            );
            if (analysisResult.result.status === 'success') {
                this.adapter.log.debug(`File ${analysisResult.file} processed successfully`);
            } else {
                this.adapter.log.error(`Error processing file ${analysisResult.file}: ${analysisResult.result.error}`);
            }
            this.uploadStatus.fileName = undefined;
            this.uploadStatus.status = 'idle';
            void this.adapter.setState('info.analysis.running', false, true);
        } else {
            // Unexpected file name in response, but we delete the file anyway
            this.adapter.log.warn(`Unexpected response from IDS for file ${analysisResult.file}`);
            if (this.uploadStatus.status === 'waitingOnResponse') {
                this.adapter.log.warn(
                    `Upload status was 'waitingOnResponse', but received unexpected file name: ${analysisResult.file}`,
                );
                this.uploadStatus.status = 'idle';
                void this.adapter.setState('info.analysis.running', false, true);
            }
        }
        const resultUUID = randomUUID();
        let isAlert = false;
        let biggestScore = 0;

        // Save detected events if available
        if (analysisResult.detections?.length) {
            const newDetections = analysisResult.detections;

            let sendEvent = 0;

            // After 15 October
            if (new Date(CHANGE_TIME).getTime() <= Date.now() && this.group === 'B') {
                analysisResult.statistics.analysisDurationMs = generateFluctuatingTimes(
                    analysisResult.statistics.analysisDurationMs,
                );
            }

            for (let i = 0; i < newDetections.length; i++) {
                const detection: DetectionsForDeviceWithUUID = newDetections[i] as DetectionsForDeviceWithUUID;

                // Find the earliest occurrence time
                let _isAlert = detection.ml?.type === 'Warning' || detection.ml?.type === 'Alert';

                if (detection.ml) {
                    // ml has no score, we generate one based on the type
                    detection.ml.score ||=
                        detection.ml.type === 'Warning' || detection.ml.type === 'Alert'
                            ? Math.floor(Math.random() * 90 * 100) / 100 + 10 // 10-100
                            : Math.floor(Math.random() * 9.99 * 100) / 100; // 0-10
                }

                const detectionsBiggestScore = Math.max(
                    _isAlert ? detection.ml?.score || 0 : 0,
                    ...(detection.suricata?.map(s => (s.type === 'Alert' || s.type === 'Warning' ? s.score : 0)) || [
                        0,
                    ]),
                );

                let earliestOccurrence: number | null =
                    detection.ml?.first_occurrence && (detection.ml.type === 'Alert' || detection.ml.type === 'Warning')
                        ? new Date(detection.ml.first_occurrence).getTime()
                        : null;

                detection.suricata?.forEach(suricata => {
                    if (suricata.first_occurrence && (suricata.type === 'Alert' || suricata.type === 'Warning')) {
                        _isAlert = true;

                        const occurrenceTime = new Date(suricata.first_occurrence).getTime();
                        if (!earliestOccurrence || occurrenceTime < earliestOccurrence) {
                            earliestOccurrence = occurrenceTime;
                        }
                    }
                });

                detection.isAlert = _isAlert; // Store the worst type found
                detection.worstScore = detectionsBiggestScore; // Store the highest score found

                // If we have no bad event or the current one is worse, replace it
                isAlert ||= _isAlert;

                if (biggestScore < detectionsBiggestScore) {
                    biggestScore = detectionsBiggestScore; // Keep the highest score
                }

                detection.scanUUID = resultUUID; // Get the parent UUID if available
                detection.uuid = randomUUID(); // Generate a unique ID for the detection

                if (earliestOccurrence && _isAlert) {
                    detection.time = new Date(earliestOccurrence).toISOString(); // Ensure time is in ISO format
                    sendEvent++;
                } else {
                    detection.time = ''; // No alert, so no time
                }
            }

            if (isAlert) {
                let text: string;
                let title: string;
                if (new Date(CHANGE_TIME).getTime() > Date.now()) {
                    // Before 15 October
                    if (this.group === 'A') {
                        if (sendEvent === 1) {
                            text = I18n.translate(
                                `During the inspection, an anomaly was detected that could indicate a potential security risk.`,
                            );
                        } else {
                            text = I18n.translate(
                                `During the inspection, %s anomalies were detected that could indicate a potential security risk.`,
                                sendEvent,
                            );
                        }
                    } else {
                        if (sendEvent === 1) {
                            text = I18n.translate(
                                `During an inspection, an anomaly score of %s was detected that could indicate a potential security risk.`,
                                biggestScore.toString().replace(/./g, ','),
                            );
                        } else {
                            // Take the biggest score (ML and Suricata
                            text = I18n.translate(
                                `During an inspection, anomaly scores of %s were detected that could indicate a potential security risk.`,
                                biggestScore.toString().replace(/./g, ','),
                            );
                        }
                    }
                    title = I18n.translate('Unusual activities were detected');
                } else {
                    // After 15 October
                    text = I18n.translate(
                        `During an inspection, we discovered an anomaly that could indicate a potential security risk.`,
                    );
                    title = I18n.translate('Anomaly detected during an inspection');
                }

                // save it in the state
                void this.generateEvent(isAlert, resultUUID, text, title).catch(error => {
                    this.adapter.log.error(`Error generating event: ${error.message}`);
                });
            }
            console.log(
                `!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! CREATED ALERT: ${resultUUID} Score: ${biggestScore} Events: ${sendEvent}`,
            );
            await this.adapter.setStateAsync('info.analysis.lastCreated', resultUUID, true);
        }

        if (analysisResult.statistics) {
            this.aggregateStatistics(analysisResult, resultUUID, isAlert, biggestScore);
        }

        if (analysisResult.file && existsSync(`${this.workingFolder}/${analysisResult.file}`)) {
            this.adapter.log.info(`Deleting file ${analysisResult.file} from working folder`);
            try {
                unlinkSync(`${this.workingFolder}/${analysisResult.file}`);
            } catch (error) {
                this.adapter.log.error(`Error deleting file ${analysisResult.file}: ${error.message}`);
            }
        }

        // send the next file if available
        setTimeout(() => this.triggerUpdate(), 100);

        return '';
    };

    async manageIdsContainer(): Promise<void> {
        if (this.config.docker?.selfHosted) {
            this.adapter.log.info(I18n.translate('Managing IDS container'));
            this.dockerManager ||= new DockerManager(this.adapter, {
                image: 'kisshome/ids:stable',
                name: DOCKER_CONTAINER_NAME,
                ports: ['5000'],
                autoUpdate: true,
                autoStart: false,
                removeAfterStop: true,
                volumes: [`${this.statisticsDir}/volume:/shared`],
                securityOptions: 'apparmor=unconfined',
            });

            await this.dockerManager.init();

            await this.dockerManager.start();
        }
    }

    async start(): Promise<void> {
        this.adapter.log.info(`${I18n.translate('Starting IDS communication with URL')}: ${this.idsUrl}`);
        try {
            await this.manageIdsContainer();
            await this.startWebServer();
            await this._getStatus();
        } catch (error) {
            this.adapter.log.error(`Error during IDSCommunication start: ${error.message}`);
            return;
        }

        if (this.statusInterval) {
            clearInterval(this.statusInterval);
        }

        this.statusInterval = setInterval(() => {
            this._getStatus().catch(error => {
                this.adapter.log.error(`Error getting status: ${error.message}`);
            });
        }, 10_000); // Check status every 10 seconds
    }

    private async startWebServer(): Promise<void> {
        this.ownIp ||= await this.getOwnIpAddress();

        this.webServer = http.createServer((req, res): void => {
            // Get post-data
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString(); // Convert Buffer to string
            });
            req.on('end', async (): Promise<void> => {
                this.adapter.log.debug(`Received POST data: ${body}`);
                // try to parse the body as JSON
                try {
                    const jsonData: AnalysisResult = JSON.parse(body);

                    // Handle the parsed data
                    const error = await this.onData(jsonData);
                    if (error) {
                        this.adapter.log.error(`Error processing data: ${error}`);
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ Error: error }));
                        return;
                    }

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ Result: 'Success' }));
                } catch (e) {
                    this.adapter.log.error(`Error parsing JSON data: ${e.message}`);
                    res.writeHead(422, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ Error: e }));
                    return;
                }
            });
        });

        this.webServer.listen(this.ownPort, this.ownIp, () => {
            this.adapter.log.info(`Web server started on http://${this.ownIp}:${this.ownPort}`);
        });
    }

    async destroy(): Promise<void> {
        this.configSent = false;

        if (this.statusInterval) {
            clearInterval(this.statusInterval);
            this.statusInterval = null;
        }

        if (this.dockerManager) {
            await this.dockerManager.destroy();
            this.dockerManager = null;
        }

        if (this.webServer) {
            this.webServer.close(() => {
                this.adapter.log.info('Web server closed');
            });
            this.webServer = null;
        }
        if (this.simulateInterval) {
            clearInterval(this.simulateInterval);
            this.simulateInterval = null;
        }
        if (this.simulateIntervalRecording) {
            clearInterval(this.simulateIntervalRecording);
            this.simulateIntervalRecording = null;
        }
    }

    sendFile(fileName: string): void {
        if (this.uploadStatus.status !== 'idle') {
            this.adapter.log.warn(`Upload is already in progress: ${this.uploadStatus.status}`);
            return;
        }

        this.uploadStatus = {
            status: 'sendingFile',
            fileName,
        };

        void this.adapter.setState('info.analysis.running', true, true);

        const filePath = `${this.workingFolder}/${fileName}`;
        const formData = new FormData();
        formData.append('pcap', readFileSync(filePath), {
            filename: fileName,
            contentType: 'application/octet-stream',
        });

        this.adapter.log.debug(`Send file ${fileName} to ${this.idsUrl}/pcap?pcap_name=${fileName}`);

        axios
            .post(`${this.idsUrl}/pcap?pcap_name=${fileName}`, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
            })
            .then(response => {
                if (this.uploadStatus.status === 'sendingFile' && this.uploadStatus.fileName === fileName) {
                    this.adapter.log.debug(`File ${fileName} uploaded successfully: ${response.status}`);
                    this.uploadStatus.status = 'waitingOnResponse';
                } else {
                    // Unexpected state. Ignore the response
                    this.adapter.log.warn('Unexpected upload status or file name mismatch. Ignoring response.');
                }
            })
            .catch(error => {
                this.adapter.log.error(`Error uploading file ${fileName}: ${error.message}`);
                this.uploadStatus = { status: 'idle' };
                void this.adapter.setState('info.analysis.running', false, true);
            });
    }

    /**
     * This method will be called every time the new file appears in the dis folder
     */
    triggerUpdate(): void {
        if (!this.webServer) {
            this.adapter.log.warn('Web server is not running, cannot trigger update');
            return;
        }

        const files = readdirSync(this.workingFolder)
            .filter(file => file.endsWith('.pcap'))
            .sort();

        // Check if the number of files exceeds the maximum allowed to prevent the disk overflow
        if (files.length > MAX_FILES_ON_DISK) {
            // Delete the newest file (NEWEST while IDS wants to process the oldest)
            for (let i = files.length - 1; i >= MAX_FILES_ON_DISK; i--) {
                try {
                    unlinkSync(`${this.workingFolder}/${files[i]}`);
                } catch (error) {
                    this.adapter.log.error(`Error deleting file ${files[i]}: ${error.message}`);
                }
                files.splice(i, 1);
            }
        }

        if (this.uploadStatus.status === 'idle' && files.length) {
            void this.sendFile(files[0]);
        }
    }
}
