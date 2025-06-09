import http from 'node:http';
import axios from 'axios';

const SIMULATE = process.env.SIMULATE === 'true' || process.env.SIMULATE === '1';

export type Context = {
    terminate: boolean;
    controller: AbortController | null;
    filtered: {
        packets: Buffer[];
        totalBytes: number;
        totalPackets: number;
        buffer?: Buffer;
    };
    full: {
        packets: Buffer[];
        totalBytes: number;
        totalPackets: number;
        buffer?: Buffer;
    };
    first: boolean;
    modifiedMagic: boolean; // little Endian with longer header
    networkType: number;
    lastSaved: number;
    started: number;
    libpCapFormat: boolean; // BigEndian with longer header
};

export const MAX_PACKET_LENGTH = 96;
const debug = false;
const NO_FILTER = false;

function analyzePacket(context: Context): boolean {
    if (!context.filtered.buffer) {
        return false;
    }
    const len = context.filtered.buffer.byteLength || 0;
    // Normal header is 16 bytes
    // modifiedMagic is true if the header is in Little-Endian format, and extended packet header (8 bytes more)
    // libpCapFormat is true if the header is in Big-Endian format and extended packet header (8 bytes more)

    // first 4 bytes are timestamp in seconds
    // next 4 bytes are timestamp in microseconds
    // next 4 bytes are packet length saved in file
    // next 4 bytes are packet length sent over the network
    // by modified
    // next 4 bytes ifindex
    // next 2 bytes is protocol
    // next byte is pkt_type: broadcast/multicast/etc. indication
    // next byte is padding
    const headerLength = context.libpCapFormat || context.modifiedMagic ? 24 : 16;

    if (len < headerLength) {
        return false;
    }

    const seconds = context.libpCapFormat
        ? context.filtered.buffer.readUInt32BE(0)
        : context.filtered.buffer.readUInt32LE(0);
    const microseconds = context.libpCapFormat
        ? context.filtered.buffer.readUInt32BE(4)
        : context.filtered.buffer.readUInt32LE(4);
    const packageLen = context.libpCapFormat
        ? context.filtered.buffer.readUInt32BE(8)
        : context.filtered.buffer.readUInt32LE(8);
    const packageLenSent = context.libpCapFormat
        ? context.filtered.buffer.readUInt32BE(12)
        : context.filtered.buffer.readUInt32LE(12);
    if (debug) {
        let MAC1;
        let MAC2;
        if (context.networkType === 0x69) {
            MAC1 = context.filtered.buffer.subarray(headerLength + 4, headerLength + 4 + 6);
            MAC2 = context.filtered.buffer.subarray(headerLength + 4 + 6, headerLength + 4 + 12);
        } else {
            MAC1 = context.filtered.buffer.subarray(headerLength, headerLength + 6);
            MAC2 = context.filtered.buffer.subarray(headerLength + 6, headerLength + 12);
        }
        console.log(
            `Packet: ${new Date(seconds * 1000 + Math.round(microseconds / 1000)).toISOString()} ${packageLen} ${packageLenSent} ${MAC1.toString('hex')} => ${MAC2.toString('hex')}`,
        );
    }

    if (packageLen > 10000) {
        // error of capturing
        throw new Error(`Packet length is too big: ${packageLen}`);
    }

    if (len < headerLength + packageLen) {
        return false;
    }

    // next 6 bytes are MAC address of a source
    // next 6 bytes are MAC address of destination
    const offset = headerLength + 12;
    let maxBytes = 0;

    if (offset + 2 <= len) {
        // next 2 bytes are Ethernet type
        const ethType = context.filtered.buffer.readUInt16BE(offset);

        // If IPv4
        if (ethType === 0x0800) {
            const ipHeaderStart = offset + 2;
            const ipVersionAndIHL = context.filtered.buffer[ipHeaderStart];
            const ipHeaderLength = (ipVersionAndIHL & 0x0f) * 4; // IHL field gives the length of the IP header

            // read protocol type (TCP/UDP/ICMP/etc.)
            const protocolType = context.filtered.buffer[ipHeaderStart + 9]; // Protocol field in IP header

            if (protocolType === 6) {
                // TCP
                const tcpHeaderStart = ipHeaderStart + ipHeaderLength;
                const tcpOffsetAndFlags = context.filtered.buffer[tcpHeaderStart + 12];
                const tcpHeaderLength = (tcpOffsetAndFlags >> 4) * 4; // Data offset in TCP header
                maxBytes = ipHeaderLength + tcpHeaderLength + 14; // Total length: IP header + TCP header + Ethernet header
            } else if (protocolType === 17) {
                // UDP
                maxBytes = ipHeaderLength + 8 + 14; // IP header + 8 bytes UDP header + Ethernet header
            } else {
                maxBytes = 0;
            }
        }

        // todo: which more protocols to collect?
        // If ICMP
        // if (ethType === 1) {
        //     return offset + 40;
        // }

        // If IPv6
        // if (ethType === 0x86DD) {
        //     return offset + 40;
        // }
    }

    if (maxBytes) {
        if (packageLen < maxBytes) {
            // remove from buffer packageLen + 16 bytes
            const packetBuffer = context.filtered.buffer.subarray(0, headerLength + packageLen);
            if (context.libpCapFormat) {
                // write header in LE notation
                packetBuffer.writeUInt32LE(seconds, 0);
                packetBuffer.writeUInt32LE(microseconds, 4);
                packetBuffer.writeUInt32LE(packageLen, 8);
                packetBuffer.writeUInt32LE(packageLenSent, 12);
                const ifindex = packetBuffer.readUInt32BE(16);
                const protocol = packetBuffer.readUInt16BE(20);
                packetBuffer.writeUInt32LE(ifindex, 16);
                packetBuffer.writeUInt16LE(protocol, 20);
            }
            context.filtered.packets.push(packetBuffer);
            context.filtered.totalBytes += headerLength + packageLen;
            if (debug) {
                console.log(`Saved packet: ${headerLength + packageLen}`);
            }
        } else {
            const packetBuffer = context.filtered.buffer.subarray(0, headerLength + maxBytes);
            if (context.libpCapFormat) {
                // write header in LE notation
                packetBuffer.writeUInt32LE(seconds, 0);
                packetBuffer.writeUInt32LE(microseconds, 4);
                packetBuffer.writeUInt32LE(packageLenSent, 12);
                const ifindex = packetBuffer.readUInt32BE(16);
                const protocol = packetBuffer.readUInt16BE(20);
                packetBuffer.writeUInt32LE(ifindex, 16);
                packetBuffer.writeUInt16LE(protocol, 20);
            }
            // save new length in the packet
            packetBuffer.writeUInt32LE(maxBytes, 8);

            context.filtered.packets.push(packetBuffer);
            context.filtered.totalBytes += headerLength + maxBytes;
            if (debug) {
                console.log(`Saved packet: ${headerLength + maxBytes}`);
            }
        }
        context.filtered.totalPackets++;
    }

    // remove this packet
    context.filtered.buffer = context.filtered.buffer.subarray(headerLength + packageLen);

    return true;
}

function analyzePacketFull(context: Context): boolean {
    if (!context.full.buffer) {
        return false;
    }
    const len = context.full.buffer.byteLength || 0;
    // Normal header is 16 bytes
    // modifiedMagic is true if the header is in Little-Endian format, and extended packet header (8 bytes more)
    // libpCapFormat is true if the header is in Big-Endian format and extended packet header (8 bytes more)

    // first 4 bytes are timestamp in seconds
    // next 4 bytes are timestamp in microseconds
    // next 4 bytes are packet length saved in file
    // next 4 bytes are packet length sent over the network
    // by modified
    // next 4 bytes ifindex
    // next 2 bytes is protocol
    // next byte is pkt_type: broadcast/multicast/etc. indication
    // next byte is padding
    const headerLength = context.libpCapFormat || context.modifiedMagic ? 24 : 16;

    if (len < headerLength) {
        return false;
    }

    const seconds = context.libpCapFormat ? context.full.buffer.readUInt32BE(0) : context.full.buffer.readUInt32LE(0);
    const microseconds = context.libpCapFormat
        ? context.full.buffer.readUInt32BE(4)
        : context.full.buffer.readUInt32LE(4);
    const packageLen = context.libpCapFormat
        ? context.full.buffer.readUInt32BE(8)
        : context.full.buffer.readUInt32LE(8);
    const packageLenSent = context.libpCapFormat
        ? context.full.buffer.readUInt32BE(12)
        : context.full.buffer.readUInt32LE(12);
    if (debug) {
        let MAC1;
        let MAC2;
        if (context.networkType === 0x69) {
            MAC1 = context.full.buffer.subarray(headerLength + 4, headerLength + 4 + 6);
            MAC2 = context.full.buffer.subarray(headerLength + 4 + 6, headerLength + 4 + 12);
        } else {
            MAC1 = context.full.buffer.subarray(headerLength, headerLength + 6);
            MAC2 = context.full.buffer.subarray(headerLength + 6, headerLength + 12);
        }
        console.log(
            `Packet: ${new Date(seconds * 1000 + Math.round(microseconds / 1000)).toISOString()} ${packageLen} ${packageLenSent} ${MAC1.toString('hex')} => ${MAC2.toString('hex')}`,
        );
    }

    if (packageLen > 10000) {
        // error of capturing
        throw new Error(`Packet length is too big: ${packageLen}`);
    }

    if (len < headerLength + packageLen) {
        return false;
    }

    // next 6 bytes are MAC address of a source
    // next 6 bytes are MAC address of destination
    const offset = headerLength + 12;
    let save = false;

    if (offset + 2 <= len) {
        // next 2 bytes are Ethernet type
        const ethType = context.full.buffer.readUInt16BE(offset);

        // If IPv4
        if (ethType === 0x0800) {
            const ipHeaderStart = offset + 2;

            // read protocol type (TCP/UDP/ICMP/etc.)
            const protocolType = context.full.buffer[ipHeaderStart + 9]; // Protocol field in IP header

            if (protocolType === 6) {
                // TCP
                save = true; // Total length: IP header + TCP header + Ethernet header
            } else if (protocolType === 17) {
                // UDP
                save = true; // IP header + 8 bytes UDP header + Ethernet header
            } else {
                save = false;
            }
        }
    }

    if (save) {
        const packetBuffer = context.full.buffer.subarray(0, headerLength + packageLen);
        if (context.libpCapFormat) {
            // write header in LE notation
            packetBuffer.writeUInt32LE(seconds, 0);
            packetBuffer.writeUInt32LE(microseconds, 4);
            packetBuffer.writeUInt32LE(packageLenSent, 12);
            const ifindex = packetBuffer.readUInt32BE(16);
            const protocol = packetBuffer.readUInt16BE(20);
            packetBuffer.writeUInt32LE(ifindex, 16);
            packetBuffer.writeUInt16LE(protocol, 20);
        }
        // save new length in the packet
        packetBuffer.writeUInt32LE(packageLen, 8);

        context.full.packets.push(packetBuffer);
        context.full.totalBytes += headerLength + packageLen;
        if (debug) {
            console.log(`Saved packet: ${headerLength + packageLen}`);
        }

        context.full.totalPackets++;
    }

    // remove this packet
    context.full.buffer = context.full.buffer.subarray(headerLength + packageLen);

    return true;
}

export async function stopAllRecordingsOnFritzBox(ip: string, sid: string): Promise<string> {
    const captureUrl = `http://${ip.trim()}/cgi-bin/capture_notimeout?iface=stopall&capture=Stop&sid=${sid}`;
    const response = await axios.get(captureUrl);
    return response.data;
}

export function getRecordURL(ip: string, sid: string, iface: string, MACs: string[]): string {
    const filter = MACs.filter(m => m?.trim()).length ? `ether host ${MACs.filter(m => m?.trim()).join(' || ')}` : '';

    return `http://${ip.trim()}/cgi-bin/capture_notimeout?ifaceorminor=${encodeURIComponent(iface.trim())}&snaplen=${MAX_PACKET_LENGTH}${filter ? `&filter=${encodeURIComponent(filter)}` : ''}&capture=Start&sid=${sid}`;
}

function _writeHeader(context: Context): boolean {
    // if the header of PCAP file is not written yet
    if (!context.first) {
        // check if we have at least 6 * 4 bytes
        if (context.full.buffer && context.full.buffer.length > 6 * 4) {
            context.first = true;
            const magic = context.full.buffer.readUInt32LE(0);
            context.modifiedMagic = magic === 0xa1b2cd34;
            context.libpCapFormat = magic === 0x34cdb2a1;
            const versionMajor = context.libpCapFormat
                ? context.full.buffer.readUInt16BE(4)
                : context.full.buffer.readUInt16LE(4);
            const versionMinor = context.libpCapFormat
                ? context.full.buffer.readUInt16BE(4 + 2)
                : context.full.buffer.readUInt16LE(4 + 2);
            const reserved1 = context.libpCapFormat
                ? context.full.buffer.readUInt32BE(4 * 2)
                : context.full.buffer.readUInt32LE(4 * 2);
            const reserved2 = context.libpCapFormat
                ? context.full.buffer.readUInt32BE(4 * 3)
                : context.full.buffer.readUInt32LE(4 * 3);
            const snapLen = context.libpCapFormat
                ? context.full.buffer.readUInt32BE(4 * 4)
                : context.full.buffer.readUInt32LE(4 * 4);

            context.networkType = context.libpCapFormat
                ? context.full.buffer.readUInt32BE(4 * 5)
                : context.full.buffer.readUInt32LE(4 * 5);

            if (debug) {
                console.log(
                    `PCAP: ${magic.toString(16)} v${versionMajor}.${versionMinor} res1=${reserved1} res2=${reserved2} snaplen=${snapLen} network=${context.networkType.toString(16)}`,
                );
            }
            // remove header
            context.full.buffer = context.full.buffer.subarray(6 * 4);

            // No return here, because we need to write header to filtered buffer too
        }
        // check if we have at least 6 * 4 bytes
        if (context.filtered.buffer && context.filtered.buffer.length > 6 * 4) {
            context.first = true;
            const magic = context.filtered.buffer.readUInt32LE(0);
            context.modifiedMagic = magic === 0xa1b2cd34;
            context.libpCapFormat = magic === 0x34cdb2a1;
            const versionMajor = context.libpCapFormat
                ? context.filtered.buffer.readUInt16BE(4)
                : context.filtered.buffer.readUInt16LE(4);
            const versionMinor = context.libpCapFormat
                ? context.filtered.buffer.readUInt16BE(4 + 2)
                : context.filtered.buffer.readUInt16LE(4 + 2);
            const reserved1 = context.libpCapFormat
                ? context.filtered.buffer.readUInt32BE(4 * 2)
                : context.filtered.buffer.readUInt32LE(4 * 2);
            const reserved2 = context.libpCapFormat
                ? context.filtered.buffer.readUInt32BE(4 * 3)
                : context.filtered.buffer.readUInt32LE(4 * 3);
            const snapLen = context.libpCapFormat
                ? context.filtered.buffer.readUInt32BE(4 * 4)
                : context.filtered.buffer.readUInt32LE(4 * 4);

            context.networkType = context.libpCapFormat
                ? context.filtered.buffer.readUInt32BE(4 * 5)
                : context.filtered.buffer.readUInt32LE(4 * 5);

            if (debug) {
                console.log(
                    `PCAP: ${magic.toString(16)} v${versionMajor}.${versionMinor} res1=${reserved1} res2=${reserved2} snaplen=${snapLen} network=${context.networkType.toString(16)}`,
                );
            }
            // remove header
            context.filtered.buffer = context.filtered.buffer.subarray(6 * 4);
            return true;
        }

        // wait for more data
        return false;
    }

    return true;
}

export function startRecordingOnFritzBox(
    ip: string,
    sid: string,
    iface: string,
    MACs: string[],
    onEnd: ((error: Error | null) => void) | null,
    context: Context,
    progress?: () => void,
    log?: (text: string, level: 'info' | 'warn' | 'error' | 'debug') => void,
): void {
    const captureUrl = getRecordURL(ip, sid, iface, MACs);

    context.filtered.buffer = Buffer.from([]);
    context.full.buffer = Buffer.from([]);
    context.first = false;
    let simulateInterval: NodeJS.Timeout | null = null;

    let timeout: NodeJS.Timeout | null = null;
    let lastProgress = Date.now();

    const informProgress = (): void => {
        const now = Date.now();
        // inform about progress every 2 seconds
        if (now - lastProgress > 2000) {
            lastProgress = now;
            progress?.();
        }
    };

    const executeOnEnd = (error: Error | null): void => {
        if (debug) {
            console.log(`FINISH receiving of data...: ${error?.toString()}`);
        }
        if (timeout) {
            clearTimeout(timeout);
            timeout = null;
        }
        if (onEnd) {
            onEnd(error);
            onEnd = null;
        }
    };

    const controller = context.controller || new AbortController();
    context.controller = controller;
    context.started = Date.now();

    console.log(`START capture: ${captureUrl}`);

    if (SIMULATE) {
        if (simulateInterval) {
            clearInterval(simulateInterval);
            simulateInterval = null;
        }

        simulateInterval = setInterval(() => {
            // Write nulls to the buffer to simulate data
            if (context?.terminate) {
                if (simulateInterval) {
                    clearInterval(simulateInterval);
                    simulateInterval = null;
                }
                executeOnEnd(null);
                return;
            }
            const chunkBuffer = Buffer.alloc(1024, 0); // Simulate 1KB of data

            context.full.packets.push(chunkBuffer);
            context.full.totalPackets++;
            context.full.totalBytes += chunkBuffer.length;

            // just save all data to file
            context.filtered.packets.push(chunkBuffer);
            context.filtered.totalPackets++;
            context.filtered.totalBytes += chunkBuffer.length;

            informProgress();
        }, 1000);
    } else {
        const req = http.request(
            captureUrl,
            {
                method: 'GET',
                signal: controller.signal,
            },
            res => {
                if (res.statusCode !== 200) {
                    if (res.statusCode === 401 || res.statusCode === 403) {
                        executeOnEnd(new Error('Unauthorized'));
                        return;
                    }

                    executeOnEnd(new Error(`Unexpected status code: ${res.statusCode}`));
                    try {
                        controller.abort();
                    } catch {
                        // ignore
                    }
                    return;
                }
                res.setEncoding('binary');

                if (debug && log) {
                    log(`Starting receiving of data...: ${JSON.stringify(res.headers)}`, 'debug');
                }

                informProgress();

                res.on('data', (chunk: string) => {
                    const chunkBuffer = Buffer.from(chunk, 'binary');
                    if (debug && log) {
                        log(`Received ${chunkBuffer.length} bytes`, 'debug');
                    }
                    // add data to filtered buffer
                    context.filtered.buffer = context.filtered.buffer
                        ? Buffer.concat([context.filtered.buffer, chunkBuffer])
                        : chunkBuffer;

                    // add data to full buffer
                    context.full.buffer = context.full.buffer
                        ? Buffer.concat([context.full.buffer, chunkBuffer])
                        : chunkBuffer;

                    if (!NO_FILTER) {
                        // if the header of PCAP file is not written yet
                        if (!_writeHeader(context)) {
                            // wait for more data
                            return;
                        }

                        // analyze packets in filtered buffer
                        let more = false;
                        do {
                            try {
                                more = analyzePacket(context);
                            } catch (e) {
                                try {
                                    controller.abort();
                                } catch {
                                    // ignore
                                }
                                executeOnEnd(e);
                                return;
                            }
                        } while (more);

                        // analyze packets in full buffer
                        more = false;
                        do {
                            try {
                                more = analyzePacketFull(context);
                            } catch (e) {
                                try {
                                    controller.abort();
                                } catch {
                                    // ignore
                                }
                                executeOnEnd(e);
                                return;
                            }
                        } while (more);
                    } else {
                        // just save all data to file
                        context.filtered.packets.push(chunkBuffer);
                        context.filtered.totalPackets++;
                        context.filtered.totalBytes += chunkBuffer.length;

                        context.full.packets.push(chunkBuffer);
                        context.full.totalPackets++;
                        context.full.totalBytes += chunkBuffer.length;
                    }

                    informProgress();

                    if (context?.terminate) {
                        try {
                            controller.abort();
                        } catch {
                            // ignore
                        }
                        executeOnEnd(null);
                    }
                });

                res.on('end', () => {
                    if (log) {
                        log(
                            `File closed by fritzbox after ${context.full.totalBytes} bytes received in ${Math.floor((Date.now() - context.started) / 100) / 10} seconds`,
                            'debug',
                        );
                    }
                    if (!context.full.totalBytes && log && Date.now() - context.started < 3000) {
                        log(
                            `No bytes received and file was closed by Fritzbox very fast. May be wrong interface selected`,
                            'info',
                        );
                        log(
                            `Keine Bytes empfangen und Datei wurde von Fritzbox sehr schnell geschlossen. Möglicherweise falsche Schnittstelle ausgewählt`,
                            'info',
                        );
                    }

                    executeOnEnd(null);
                });

                res.on('error', (error: Error) => {
                    if (!error && log) {
                        log(`Error by receiving, but no error provided!`, 'error');
                    }
                    try {
                        controller.abort();
                    } catch {
                        // ignore
                    }
                    executeOnEnd(error);
                });
            },
        );
        req.on('error', error => executeOnEnd(error));

        req.end();
    }
}
