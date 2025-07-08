import { I18n } from '@iobroker/adapter-core';
import type { DefenderAdapterConfig, Device, UXEvent } from '../types';
import type { Context } from './recording';
import { existsSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { createHash } from 'node:crypto';
import axios, { type AxiosResponse } from 'axios';
import { getDescriptionFile, getTimestamp, size2text } from './utils';
const SYNC_INTERVAL = 3_600_000; // 1 hour;
export const PCAP_HOST = 'kisshome-experiments.if-is.net';

export default class CloudSync {
    private readonly adapter: ioBroker.Adapter;
    private readonly config: DefenderAdapterConfig;
    private syncRunning: boolean = false;
    private readonly workingDir: string;
    private syncTimer: NodeJS.Timeout | null = null;
    private readonly context: Context;
    private readonly uuid: string;
    private readonly IPs: Device[];
    private readonly version: string;
    private emailOk: boolean | null = null;
    private readonly ready: Promise<void>;
    private justSending = '';
    private collectUxEvents: UXEvent[] | null = null;
    private timeoutUxEvents: NodeJS.Timeout | null = null;

    constructor(
        adapter: ioBroker.Adapter,
        options: {
            workingDir: string;
            context: Context;
            uuid: string;
            IPs: Device[];
            version: string;
        },
    ) {
        this.version = options.version;
        this.adapter = adapter;
        this.config = this.adapter.config as unknown as DefenderAdapterConfig;
        this.workingDir = options.workingDir;
        this.context = options.context;
        this.uuid = options.uuid;
        this.IPs = options.IPs;
        this.saveMetaFile();
        this.ready = new Promise(resolve => this.init(resolve));
    }

    async analyseError(response: AxiosResponse): Promise<void> {
        if (response.status === 404) {
            this.adapter.log.error(
                `${I18n.translate('Cannot register on the kisshome-cloud')}: ${I18n.translate('Unknown email address')}`,
            );
        } else if (response.status === 403) {
            this.adapter.log.error(
                `${I18n.translate('Cannot register on the kisshome-cloud')}: ${I18n.translate('UUID changed. Please contact us via kisshome@internet-sicherheit.de')}`,
            );
            await this.adapter.registerNotification('kisshome-defender', 'uuid', 'UUID changed');
        } else if (response.status === 401) {
            this.adapter.log.error(
                `${I18n.translate('Cannot register on the kisshome-cloud')}: ${I18n.translate('invalid password')}`,
            );
        } else if (response.status === 422) {
            this.adapter.log.error(
                `${I18n.translate('Cannot register on the kisshome-cloud')}: ${I18n.translate('missing email, public key or uuid')}`,
            );
        } else {
            this.adapter.log.error(
                `${I18n.translate('Cannot register on the kisshome-cloud')}: ${response.data || response.statusText || response.status}`,
            );
        }
    }

    async init(callback: () => void): Promise<void> {
        try {
            // register on the cloud
            const response = await axios.post(
                `https://${PCAP_HOST}/api/v2/checkEmail?email=${encodeURIComponent(this.config.email)}&uuid=${encodeURIComponent(this.uuid)}`,
                {
                    timeout: 10_000, // 10-second timeout
                },
            );

            if (response.status === 200) {
                if (response.data?.command === 'terminate') {
                    this.adapter.log.warn(I18n.translate('Server requested to terminate the adapter'));
                    const obj = await this.adapter.getForeignObjectAsync(`system.adapter.${this.adapter.namespace}`);
                    if (obj?.common?.enabled) {
                        obj.common.enabled = false;
                        await this.adapter.setForeignObjectAsync(obj._id, obj);
                    }
                } else {
                    this.emailOk = true;
                    this.adapter.log.info(I18n.translate('Successfully registered on the cloud'));
                }
            } else {
                this.emailOk = false;
                await this.analyseError(response);
            }
        } catch (error) {
            if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
                // timeout: retry in 5 seconds
                this.adapter.log.warn(`${I18n.translate('Cannot register on the kisshome-cloud')}: timeout`);
            } else if (error.response) {
                this.emailOk = false;
                await this.analyseError(error.response);
            } else {
                this.emailOk = false;
                this.adapter.log.error(`${I18n.translate('Cannot register on the kisshome-cloud')}: ${error}`);
            }
        }

        if (this.emailOk === null && !this.context.terminate) {
            setTimeout(() => {
                void this.init(callback);
            }, 5_000);
        } else {
            callback();
        }
    }

    start(): void {
        this.syncJob();
    }

    private syncJob(): void {
        // Send the data every hour to the cloud
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
            this.syncTimer = null;
        }

        if (this.context.terminate) {
            return;
        }

        const started = Date.now();

        void this.startCloudSynchronization()
            .catch(e => {
                this.adapter.log.error(`[RSYNC] ${I18n.translate('Cannot synchronize')}: ${e}`);
            })
            .then(() => {
                const duration = Date.now() - started;
                this.syncTimer = setTimeout(
                    () => {
                        this.syncTimer = null;
                        this.syncJob();
                    },
                    SYNC_INTERVAL - duration > 0 ? SYNC_INTERVAL - duration : 0,
                );
            });
    }

    stop(): void {
        if (this.syncTimer) {
            clearTimeout(this.syncTimer);
            this.syncTimer = null;
        }
        if (this.timeoutUxEvents) {
            clearTimeout(this.timeoutUxEvents);
            this.timeoutUxEvents = null;
        }
        if (this.collectUxEvents?.length) {
            this.saveUxEvents(this.collectUxEvents);
            this.collectUxEvents = null;
        }
    }

    async isEmailOk(): Promise<boolean> {
        await this.ready;
        return this.emailOk!;
    }

    static calculateMd5(content: Buffer): string {
        const hash = createHash('md5');
        hash.update(content);
        return hash.digest('hex');
    }

    private async sendOneFileToCloud(fileName: string, size?: number): Promise<void> {
        try {
            if (!existsSync(fileName)) {
                this.adapter.log.warn(
                    `[RSYNC] ${I18n.translate('File "%s" does not exist. Size: %s', fileName, size ? size2text(size) : 'unknown')}`,
                );
                return;
            }
            const data = readFileSync(fileName);
            const name = basename(fileName);
            const len = data.length;

            const md5 = CloudSync.calculateMd5(data);
            this.justSending = fileName;

            // check if the file was sent successfully
            try {
                const responseCheck = await axios.get(
                    `https://${PCAP_HOST}/api/v2/upload/${encodeURIComponent(this.config.email)}/${encodeURIComponent(name)}?uuid=${encodeURIComponent(this.uuid)}`,
                );
                if (responseCheck.data?.command === 'terminate') {
                    const obj = await this.adapter.getForeignObjectAsync(`system.adapter.${this.adapter.namespace}`);
                    if (obj?.common?.enabled) {
                        obj.common.enabled = false;
                        await this.adapter.setForeignObjectAsync(obj._id, obj);
                    }
                    return;
                }

                if (responseCheck.status === 200 && responseCheck.data === md5) {
                    // file already uploaded, do not upload it again
                    if (name.endsWith('.pcap') || name.includes('ux_events')) {
                        this.justSending = '';
                        unlinkSync(fileName);
                    }
                    return;
                }
            } catch {
                // ignore
            }

            const responsePost = await axios({
                method: 'post',
                url: `https://${PCAP_HOST}/api/v2/upload/${encodeURIComponent(this.config.email)}/${encodeURIComponent(name)}?&uuid=${encodeURIComponent(this.uuid)}`,
                data,
                headers: { 'Content-Type': 'application/vnd.tcpdump.pcap' },
            });

            // check if the file was sent successfully
            const response = await axios.get(
                `https://${PCAP_HOST}/api/v2/upload/${encodeURIComponent(this.config.email)}/${encodeURIComponent(name)}?&uuid=${encodeURIComponent(this.uuid)}`,
            );
            if (response.status === 200 && response.data === md5) {
                if (name.endsWith('.pcap')) {
                    unlinkSync(fileName);
                }
                this.adapter.log.debug(
                    `[RSYNC] ${I18n.translate('Sent file "%s"(%s) to the cloud', fileName, size2text(len))} (${size ? size2text(size) : I18n.translate('unknown')}): ${responsePost.status}`,
                );
            } else {
                this.adapter.log.warn(
                    `[RSYNC] ${I18n.translate('File sent to server, but check fails (%s). "%s" to the cloud', size ? size2text(size) : I18n.translate('unknown'), fileName)}: status=${responsePost.status}, len=${len}, response=${response.data}`,
                );
            }
        } catch (e) {
            this.adapter.log.error(
                `[RSYNC] ${I18n.translate('Cannot send file "%s" to the cloud', fileName)} (${size ? size2text(size) : I18n.translate('unknown')}): ${e}`,
            );
        }
    }

    private saveMetaFile(): string {
        const text = getDescriptionFile(this.IPs);
        const newFile = `${this.workingDir}/${getTimestamp()}_v${this.version}_meta.json`;

        try {
            // find the latest file
            let changed = false;
            let files = readdirSync(this.workingDir);
            // sort descending
            files.sort((a, b) => b.localeCompare(a));

            // if two JSON files are coming after each other, the older one must be deleted
            for (let f = files.length - 1; f > 0; f--) {
                if (files[f].endsWith('_meta.json') && files[f - 1].endsWith('_meta.json')) {
                    unlinkSync(`${this.workingDir}/${files[f]}`);
                    changed = true;
                }
            }
            // read the list anew as it was changed
            if (changed) {
                files = readdirSync(this.workingDir);
                // sort descending
                files.sort((a, b) => b.localeCompare(a));
            }

            // find the latest file and delete all other _meta.json files
            const latestFile = files.find(f => f.endsWith('_meta.json'));

            // if existing meta file found
            if (latestFile) {
                // compare the content
                const oldFile = readFileSync(`${this.workingDir}/${latestFile}`, 'utf8');
                if (oldFile !== text) {
                    this.adapter.log.debug(I18n.translate('Meta file updated'));
                    // delete the old JSON file only if no pcap files exists
                    if (files[0].endsWith('_meta.json')) {
                        unlinkSync(`${this.workingDir}/${latestFile}`);
                    }
                    writeFileSync(newFile, text);
                    return newFile;
                }
                return `${this.workingDir}/${latestFile}`;
            }
            this.adapter.log.info(I18n.translate('Meta file created'));
            // if not found => create new one
            writeFileSync(newFile, text);
            return newFile;
        } catch (e) {
            this.adapter.log.warn(`${I18n.translate('Cannot save meta file "%s"', newFile)}: ${e}`);
            return '';
        }
    }

    public reportUxEvents(uxEvents: UXEvent[]): void {
        this.collectUxEvents ||= [];
        this.collectUxEvents.push(...uxEvents);

        this.timeoutUxEvents ||= setTimeout(() => {
            this.timeoutUxEvents = null;
            if (this.collectUxEvents?.length) {
                this.saveUxEvents(this.collectUxEvents);
                this.collectUxEvents = null;
            }
        }, 120_000);
    }

    private saveUxEvents(uxEvents: UXEvent[]): void {
        // Find UX events files
        let fileName: string;
        const files = readdirSync(this.workingDir)
            .filter(f => f.includes('ux_events') && f.endsWith('.json'))
            .sort();
        if (!files.length || files[files.length - 1] === this.justSending) {
            // create a new file
            fileName = `${this.workingDir}/${getTimestamp()}_ux_events.json`;
        } else {
            // use the last file
            fileName = `${this.workingDir}/${files[files.length - 1]}`;
        }
        let existingEvents: UXEvent[] = [];
        if (existsSync(fileName)) {
            try {
                existingEvents = JSON.parse(readFileSync(fileName, 'utf8')) as UXEvent[];
            } catch (e) {
                this.adapter.log.warn(`${I18n.translate('Cannot read UX events file "%s"', fileName)}: ${e}`);
            }
        }
        existingEvents.push(...uxEvents);

        // save the file
        try {
            writeFileSync(fileName, JSON.stringify(existingEvents, null, 2), 'utf8');
            this.adapter.log.debug(
                `[RSYNC] ${I18n.translate('Saved UX events to file "%s"', fileName)} (${size2text(Buffer.byteLength(JSON.stringify(existingEvents, null, 2)))})`,
            );
        } catch (e) {
            this.adapter.log.warn(`${I18n.translate('Cannot save UX events file "%s"', fileName)}: ${e}`);
        }
    }

    async startCloudSynchronization(): Promise<void> {
        await this.ready;

        if (this.context.terminate) {
            this.adapter.log.debug(`[RSYNC] ${I18n.translate('Requested termination. No synchronization')}`);
            return;
        }

        if (!this.emailOk) {
            this.adapter.log.warn(`[RSYNC] ${I18n.translate('Email not registered. No synchronization')}`);
            return;
        }

        // if UX events are collected, save them
        if (this.collectUxEvents?.length) {
            this.saveUxEvents(this.collectUxEvents);
            this.collectUxEvents = null;
        }

        // calculate the total number of bytes
        let totalBytes = 0;
        this.adapter.log.debug(`[RSYNC] ${I18n.translate('Start synchronization...')}`);

        // calculate the total number of bytes in pcap files
        let pcapFiles: string[];
        let allFiles: string[];
        const sizes: Record<string, number> = {};
        try {
            allFiles = readdirSync(this.workingDir);
            pcapFiles = allFiles.filter(f => f.endsWith('.pcap'));
            for (const file of pcapFiles) {
                sizes[file] = statSync(`${this.workingDir}/${file}`).size;
                totalBytes += sizes[file];
            }
        } catch (e) {
            this.adapter.log.error(
                `[RSYNC] ${I18n.translate('Cannot read working directory "%s" for sync', this.workingDir)}: ${e}`,
            );

            return;
        }

        if (!totalBytes) {
            this.adapter.log.debug(`[RSYNC] ${I18n.translate('No files to sync')}`);
            return;
        }

        if (this.syncRunning) {
            this.adapter.log.warn(`[RSYNC] ${I18n.translate('Synchronization still running...')}`);
            return;
        }

        this.syncRunning = true;
        await this.adapter.setState('info.cloudSync.running', true, true);

        this.adapter.log.debug(`[RSYNC] ${I18n.translate('Syncing files to the cloud')} (${size2text(totalBytes)})`);

        // send files to the cloud

        // first send meta files
        let sent = false;
        for (let i = 0; i < allFiles.length; i++) {
            const file = allFiles[i];
            if (file.endsWith('.json')) {
                await this.sendOneFileToCloud(`${this.workingDir}/${file}`);
                sent = true;
            }
        }
        if (!sent) {
            // create meta file anew and send it to the cloud
            const fileName = this.saveMetaFile();
            if (fileName) {
                await this.sendOneFileToCloud(fileName);
            } else {
                this.adapter.log.debug(`[RSYNC] ${I18n.translate('Cannot create META file. No synchronization')}`);
                return;
            }
        }

        // send all pcap files
        for (let i = 0; i < pcapFiles.length; i++) {
            const file = pcapFiles[i];
            await this.sendOneFileToCloud(`${this.workingDir}/${file}`, sizes[file]);
        }
        this.syncRunning = false;
        await this.adapter.setState('info.cloudSync.running', false, true);
    }
}
