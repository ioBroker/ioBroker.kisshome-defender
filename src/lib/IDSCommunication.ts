import http from 'node:http';
import dns from 'node:dns';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import axios from 'axios';
import FormData from 'form-data';
import { getAbsoluteDefaultDataDir } from '@iobroker/adapter-core'; // Get common adapter utils

import type {
    DefenderAdapterConfig,
    Detection,
    DetectionWithUUID,
    DeviceStatistics,
    MACAddress,
    StatisticsResult,
    StoredStatisticsResult,
} from '../types';
import { DockerManager } from './DockerManager';
import { fileNameToDate } from './utils';

const MAX_FILES_ON_DISK = 3; // Maximum number of files to keep on disk
const DOCKER_CONTAINER_NAME = 'iobroker-defender-ids';

export class IDSCommunication {
    private readonly adapter: ioBroker.Adapter;
    private idsUrl: string;
    private readonly ownPort = 18001; // Default port for IDS communication and it can be changed if needed
    private readonly config: DefenderAdapterConfig;
    private readonly metaData?: { [mac: MACAddress]: { ip: string; desc: string } };
    private lastStatus: {
        Result: 'Success' | 'Error';
        Message?: {
            Status: 'Running' | 'Started' | 'Configuring' | 'Analyzing' | 'Exited' | 'No connection';
            'Has Federated Learning server connection'?: 'True' | 'False';
            Error?: string;
        };
    } | null = null;
    private webServer: http.Server | null = null;
    private ownIp: string | null = null;
    private statusInterval: NodeJS.Timeout | null = null;
    private dockerManager: DockerManager | null = null;
    private configSent = false;
    private readonly workingFolder: string;
    private readonly statisticsDir: string;
    private currentStatus: 'Running' | 'Started' | 'Configuring' | 'Analyzing' | 'Exited' | 'No connection' | '' = '';
    private currentConnectedToFederatedServer?: 'True' | 'False' | '';
    private uploadStatus: {
        status: 'idle' | 'waitingOnResponse' | 'sendingFile';
        fileName?: string;
    } = {
        status: 'idle',
    };
    private lastCheckedDate = '';

    constructor(
        adapter: ioBroker.Adapter,
        config: DefenderAdapterConfig,
        metaData: { [mac: MACAddress]: { ip: string; desc: string } },
        workingFolder: string,
    ) {
        this.adapter = adapter;
        this.config = config;
        this.metaData = metaData;
        this.workingFolder = workingFolder;
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
            this.idsUrl = `http://${this.dockerManager!.getIpOfContainer()}:5000`;
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

        // Just for test
        metaJsonString = JSON.stringify({
                "00:06:78:A6:8F:F0": {
                    "ip": "192.168.188.113",
                    "desc": "denon"
                },
                "12:72:74:40:F2:D0": {
                    "ip": "192.168.188.119",
                    "desc": "upnp"
                },
                "0A:B4:FE:A0:2F:1A": {
                    "ip": "192.168.188.122",
                    "desc": "upnp"
                },
                "B0:B2:1C:18:CB:7C": {
                    "ip": "192.168.188.126",
                    "desc": "shelly"
                },
                "24:A1:60:20:85:08": {
                    "ip": "192.168.188.131",
                    "desc": "shelly"
                },
                "3C:61:05:DC:AD:24": {
                    "ip": "192.168.188.133",
                    "desc": "shelly"
                },
                "8C:98:06:07:AA:80": {
                    "ip": "192.168.188.156",
                    "desc": "upnp"
                },
                "D8:BB:C1:0A:1C:89": {
                    "ip": "192.168.188.157",
                    "desc": "shelly"
                },
                "8C:98:06:08:61:3D": {
                    "ip": "192.168.188.158",
                    "desc": "upnp"
                },
                "B0:B2:1C:18:F4:A8": {
                    "ip": "192.168.188.168",
                    "desc": "shelly"
                },
                "E0:98:06:B5:7B:65": {
                    "ip": "192.168.188.29",
                    "desc": "shelly"
                },
                "8C:CE:4E:E1:8E:F9": {
                    "ip": "192.168.188.31",
                    "desc": "shelly"
                },
                "00:17:88:4B:A3:FC": {
                    "ip": "192.168.188.32",
                    "desc": "hue"
                },
                "22:A6:2F:E7:25:3B": {
                    "ip": "192.168.188.35",
                    "desc": "upnp"
                },
                "40:F5:20:01:A5:99": {
                    "ip": "192.168.188.36",
                    "desc": "shelly"
                },
                "E0:98:06:B4:B5:8C": {
                    "ip": "192.168.188.39",
                    "desc": "shelly"
                },
                "E0:98:06:B5:22:8B": {
                    "ip": "192.168.188.41",
                    "desc": "shelly"
                },
                "22:A6:2F:4A:82:CB": {
                    "ip": "192.168.188.43",
                    "desc": "upnp"
                },
                "00:04:20:FC:3A:C7": {
                    "ip": "192.168.188.49",
                    "desc": "upnp"
                },
                "34:94:54:7A:EB:E4": {
                    "ip": "192.168.188.51",
                    "desc": "shelly"
                },
                "70:2A:D5:CD:77:03": {
                    "ip": "192.168.188.54",
                    "desc": "upnp"
                },
                "80:C7:55:7B:86:C0": {
                    "ip": "192.168.188.56",
                    "desc": "upnp"
                },
                "00:11:32:B2:A0:50": {
                    "ip": "192.168.188.66",
                    "desc": "synology"
                },
                "44:17:93:CE:4B:50": {
                    "ip": "192.168.188.70",
                    "desc": "shelly"
                },
                "DC:A6:32:93:B7:AF": {
                    "ip": "192.168.188.90",
                    "desc": "hm-rpc"
                },
                "64:1C:AE:46:50:F3": {
                    "ip": "192.168.188.92",
                    "desc": "upnp"
                },
                "00:07:E9:13:37:46": {
                    "ip": "192.168.178.2",
                    "desc": "qemu"
                }
            });

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
            this.adapter.log.info(`Config successful: ${response.status} ${JSON.stringify(response.data)}`);
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

    private async _getStatus(): Promise<void> {
        try {
            const response = await axios.get(`${this.idsUrl}/status`, { timeout: 3000 });
            if (this.currentStatus !== response.data.Message?.Status) {
                this.adapter.log.info(`Status: ${response.status} ${JSON.stringify(response.data)}`);
            }
            // {
            //   "Result": "Success",
            //   "Message": {
            //     "Status": "Running",
            //     "Has Federated Learning server connection": "False"
            //   }
            // }
            this.lastStatus = response.data;
            if (!this.configSent) {
                await this._sendConfig();
                this.configSent = true;
            }

            this.triggerUpdate();
        } catch (error) {
            if (this.currentStatus !== 'No connection') {
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
                Result: 'Error',
                Message: {
                    Status: 'No connection',
                    Error: error.response?.data || 'No response data',
                },
            };
        }
        if (this.currentStatus !== (this.lastStatus?.Message?.Status || 'No connection')) {
            this.currentStatus = this.lastStatus?.Message?.Status || 'No connection';
            // Update variables
            void this.adapter.setState('info.ids.status', this.lastStatus?.Message?.Status || 'No connection', true);
        }
        if (
            this.currentConnectedToFederatedServer !==
            (this.lastStatus?.Message?.['Has Federated Learning server connection'] || '')
        ) {
            this.currentConnectedToFederatedServer =
                this.lastStatus?.Message?.['Has Federated Learning server connection'] || '';
            void this.adapter.setState(
                'info.ids.connectedToFederatedServer',
                this.lastStatus?.Message?.['Has Federated Learning server connection'] === 'True',
                true,
            );
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

    aggregateStatistics(statistics: StatisticsResult): void {
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
        data.analysisDurationMs += statistics.analysisDurationMs;
        data.totalBytes += statistics.totalBytes;
        data.packets += statistics.packets;

        statistics.devices.forEach((device: DeviceStatistics) => {
            device.countries?.forEach(country => {
                data.countries[country.country] ||= 0;
                data.countries[country.country] += country.bytes;
            });
        });
        statistics.time = new Date().toISOString();
        data.results.push(statistics);

        writeFileSync(join(this.statisticsDir, fileName), JSON.stringify(data));

        this.deleteOldStatisticsFiles();
    }

    private onData = (data: {
        file: `${string}.pcap`;
        result: {
            status: 'success' | 'error';
            error?: 'Optional error text';
        };
        statistics?: StatisticsResult;
        detections?: Detection[];
    }): string => {
        if (!data || typeof data !== 'object') {
            return 'Invalid data format';
        }
        if (data.file === this.uploadStatus.fileName) {
            this.adapter.log.info(`Received response for file ${data.file}: ${JSON.stringify(data)}`);
            if (data.result.status === 'success') {
                this.adapter.log.info(`File ${data.file} processed successfully`);
            } else {
                this.adapter.log.error(`Error processing file ${data.file}: ${data.result.error}`);
            }
            this.uploadStatus.fileName = undefined;
            this.uploadStatus.status = 'idle';
        } else {
            // Unexpected file name in response, but we delete the file anyway
            this.adapter.log.warn(`Unexpected response from IDS for file ${data.file}`);
            if (this.uploadStatus.status === 'waitingOnResponse') {
                this.adapter.log.warn(
                    `Upload status was 'waitingOnResponse', but received unexpected file name: ${data.file}`,
                );
                this.uploadStatus.status = 'idle';
            }
        }
        if (data.statistics) {
            data.statistics.uuid ||= randomUUID(); // Ensure statistics have a UUID
            void this.aggregateStatistics(data.statistics);
        }

        // Save detected events if available
        if (data.detections?.length) {
            const newDetections = data.detections;
            const useUUD = data.statistics?.uuid || '';
            void this.adapter.getStateAsync('info.detections.json').then(state => {
                let detections: DetectionWithUUID[] = [];
                try {
                    detections = state?.val ? JSON.parse(state.val as string) : [];
                } catch (e) {
                    this.adapter.log.error(`Error parsing detections state: ${e.message}`);
                }
                // delete all detections older than 7 days
                const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
                detections = detections.filter(detection => {
                    const detectionTime = new Date(detection.time).getTime();
                    return detectionTime >= sevenDaysAgo;
                });

                for (let i = 0; i < newDetections.length; i++) {
                    const detection: DetectionWithUUID = newDetections[i] as DetectionWithUUID;
                    detection.scanUUID = useUUD; // Get the parent UUID if available
                    detection.uuid = randomUUID(); // Generate a unique ID for the detection
                    this.adapter.log.warn(
                        `Detection: ${detection.type} for device ${detection.mac} (${detection.country}) at ${detection.time}: ${detection.description}`,
                    );
                    detections.push(detection);
                    // save it in the state
                }

                void this.adapter.setState('info.detections.json', JSON.stringify(detections), true);
            });
        }

        if (data.file && existsSync(`${this.workingFolder}/${data.file}`)) {
            this.adapter.log.info(`Deleting file ${data.file} from working folder`);
            try {
                unlinkSync(`${this.workingFolder}/${data.file}`);
            } catch (error) {
                this.adapter.log.error(`Error deleting file ${data.file}: ${error.message}`);
            }
        }

        // send the next file if available
        setTimeout(() => this.triggerUpdate(), 100);

        return '';
    };

    async manageIdsContainer(): Promise<void> {
        if (this.config.docker?.selfHosted) {
            this.adapter.log.info('Managing IDS container');
            this.dockerManager ||= new DockerManager(this.adapter, {
                image: 'kisshome/ids:stable-backports',
                name: DOCKER_CONTAINER_NAME,
                ports: ['5000'],
                autoUpdate: true,
                autoStart: false,
                removeAfterStop: true,
            });

            await this.dockerManager.start();
        }
    }

    async start(): Promise<void> {
        this.adapter.log.info(`Starting IDSCommunication with URL: ${this.idsUrl}`);
        try {
            await this.manageIdsContainer();
            await this.startWebServer();
            this.adapter.log.info(`Web server started on http://${this.ownIp}:${this.ownPort}`);
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
        }, 10000); // Check status every 10 seconds
    }

    private async startWebServer(): Promise<void> {
        this.ownIp ||= await this.getOwnIpAddress();

        this.webServer = http.createServer((req, res): void => {
            // Get post-data
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString(); // Convert Buffer to string
            });
            req.on('end', () => {
                this.adapter.log.debug(`Received POST data: ${body}`);
                // try to parse the body as JSON
                try {
                    writeFileSync(`${__dirname}/result.json`, body);
                    const jsonData = JSON.parse(body);

                    // Handle the parsed data
                    const error = this.onData(jsonData);
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

        this.webServer.listen(this.ownPort, '0.0.0.0'/*this.ownIp*/, () => {
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

        const filePath = `${this.workingFolder}/${fileName}`;
        const formData = new FormData();
        formData.append('data', readFileSync(filePath), {
            filename: fileName,
            contentType: 'application/octet-stream',
        });

        axios
            .post(`${this.idsUrl}/pcap`, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
            })
            .then(response => {
                if (this.uploadStatus.status === 'sendingFile' && this.uploadStatus.fileName === fileName) {
                    this.adapter.log.info(`File ${fileName} uploaded successfully: ${response.status}`);
                    this.uploadStatus.status = 'waitingOnResponse';
                } else {
                    // Unexpected state. Ignore the response
                    this.adapter.log.warn('Unexpected upload status or file name mismatch. Ignoring response.');
                }
            })
            .catch(error => {
                this.adapter.log.error(`Error uploading file ${fileName}: ${error.message}`);
                this.uploadStatus = { status: 'idle' };
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
