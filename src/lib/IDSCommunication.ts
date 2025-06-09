import http from 'node:http';
import dns from 'node:dns';
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

export class IDSCommunication {
    private readonly adapter: ioBroker.Adapter;
    private readonly idsUrl: string;
    private readonly ownPort = 18001; // Default port for IDS communication and it can be changed if needed
    private readonly config: DefenderAdapterConfig;
    private readonly metaData?: { [mac: MACAddress]: { ip: string; desc: string } };
    private lastStatus: {
        Result: 'Success' | 'Error';
        Message?: {
            Status: 'Running' | 'Stopped' | 'Error' | 'No connection';
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
        this.idsUrl = (this.config.docker?.selfHosted ? '' : this.config.docker?.url) || 'http://localhost:5000';

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
        } else if (parsed.hostname.match(/^[0-9a-fA-F:]+$/)) {
            // If IPv6, we assume the first address is the one to use
            const ipv6 = IDSCommunication.findSuitableIpv6Address(parsed.hostname);
            if (!ipv6) {
                this.adapter.log.warn(`No suitable IPv6 address found for ${parsed.hostname}`);
                return '::1'; // Fallback to localhost
            }
        } else {
            // resolve the hostname to an IP address
            this.adapter.log.warn(`Unsupported hostname format: ${parsed.hostname}`);
            try {
                const ips = await dns.promises.lookup(parsed.hostname, { family: 4, all: true });
                if (ips.length === 0) {
                    this.adapter.log.warn(`No IPv4 addresses found for ${parsed.hostname}`);
                    return '127.0.0.1';
                }
                for (const ip of ips) {
                    if (ip.family === 4) {
                        const ipv4 = IDSCommunication.findSuitableIpv4Address(ip.address);
                        if (ipv4) {
                            return ipv4;
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
            } catch {
                // ignore
            }
            this.adapter.log.warn(`No addresses found for ${parsed.hostname}`);
        }
        return '127.0.0.1';
    }

    private async _sendConfig(): Promise<void> {
        const formData = new FormData();

        this.ownIp ||= await this.getOwnIpAddress();

        // Beispiel: Wenn meta_json ein JSON-String ist
        const metaJsonString = JSON.stringify(this.metaData);
        formData.append('meta_json', metaJsonString, {
            filename: 'meta.json', // Der Dateiname ist oft auch für String-Daten erforderlich
            contentType: 'application/json',
        });

        formData.append('callback_url', `http://${this.ownIp}:${this.ownPort}`);
        formData.append('allow_training', this.config.allowTraining ? 'true' : 'false');

        try {
            const response = await axios.post(`${this.idsUrl}/configure`, formData, {
                headers: {
                    ...formData.getHeaders(),
                },
            });
            this.adapter.log.info(`Config successful: ${response.status} ${response.data}`);
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
            const response = await axios.get(`${this.idsUrl}/status`);
            this.adapter.log.info(`Status: ${response.status} ${response.data}`);
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
            if (axios.isAxiosError(error)) {
                this.adapter.log.error(`Error getting status: ${error.message}`);
                if (error.response) {
                    this.adapter.log.error(`Response data: ${JSON.stringify(error.response.data)}`);
                    this.adapter.log.error(`Response status: ${error.response.status}`);
                }
            } else {
                this.adapter.log.error(`An unexpected error occurred: ${error}`);
            }

            this.lastStatus = {
                Result: 'Error',
                Message: {
                    Status: 'No connection',
                    Error: error.response.data || 'No response data',
                },
            };
        }
        // Update variables
        void this.adapter.setState('info.ids.status', this.lastStatus?.Message?.Status || 'No connection', true);
        void this.adapter.setState(
            'info.ids.connectedToFederatedServer',
            this.lastStatus?.Message?.['Has Federated Learning server connection'] === 'True',
            true,
        );
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

        // Save detected events if available
        if (data.detections?.length) {
            const newDetections = data.detections;
            void this.adapter.getStateAsync('info.detections').then(state => {
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
                    detection.uuid = crypto.randomUUID(); // Generate a unique ID for the detection
                    this.adapter.log.warn(
                        `Detection: ${detection.type} for device ${detection.mac} (${detection.country}) at ${detection.time}: ${detection.description}`,
                    );
                    detections.push(detection);
                    // save it in the state
                }

                void this.adapter.setState('info.detections', JSON.stringify(detections), true);
            });
        }

        if (data.statistics) {
            void this.aggregateStatistics(data.statistics);
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
                name: 'iobroker-defender-ids',
                autoUpdate: true,
                autoStart: false,
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
            this._getStatus()
                .then(() => {
                    if (this.lastStatus) {
                        this.adapter.log.info(`Current status: ${JSON.stringify(this.lastStatus)}`);
                    } else {
                        this.adapter.log.warn('No status available');
                    }
                })
                .catch(error => {
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
        formData.append('file', readFileSync(filePath), { filename: fileName });

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
            }
        }

        if (this.uploadStatus.status === 'idle') {
            // Get the first file in the IDS folder
            const files = readdirSync(this.workingFolder)
                .filter(file => file.endsWith('.pcap'))
                .sort();

            if (files.length) {
                void this.sendFile(files[0]);
            }
        }
    }
}
