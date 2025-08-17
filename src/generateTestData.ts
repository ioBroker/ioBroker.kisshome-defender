import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

import type { DetectionsForDevice, StoredAnalysisResult, StoredStatisticsResult } from './types';
import { getTimestamp } from './lib/utils';

const workingDir = 'C:/pWork/iobroker-data/kisshome-defender';

const result: StoredStatisticsResult = {
    analysisDurationMs: 0,
    totalBytes: 0,
    packets: 0,
    results: [],
    countries: {},
};

const MACs: string[] = [
    '00:11:22:33:44:55',
    '66:77:88:99:AA:BB',
    'CC:DD:EE:FF:00:11',
    '22:33:44:55:66:77',
    '88:99:AA:BB:CC:DD',
];

for (let i = -7; i <= 0; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    for (let h = 0; h < 24; h++) {
        const time = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            h,
            Math.floor(Math.random() * 60),
            0,
        ).toISOString();

        const oneResult: StoredAnalysisResult = {
            uuid: randomUUID(),
            time,
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

            oneResult.statistics.packets += packets;
            oneResult.statistics.totalBytes += bytes;
            oneResult.statistics.devices.push({
                mac,
                data_volume: {
                    packet_count: 5,
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

            result.totalBytes += bytes;
            result.packets += packets;

            const score = Math.floor(Math.random() * 1000) / 10; // Random score between 0 and 100
            const scoreMl = Math.floor(Math.random() * 1000) / 10; // Random score between 0 and 100
            // Generate for each MAC a detection
            const detection: DetectionsForDevice = {
                mac,
                suricata: [
                    {
                        type: score > 90 ? 'Alert' : score > 70 ? 'Warning' : 'Info',
                        description: score > 90 ? 'Dangerous alert' : score > 70 ? 'Just warning' : 'Nothing special',
                        first_occurrence: time,
                        number_occurrences: score > 70 ? Math.floor(Math.random() * 5) + 1 : 0, // Random occurrences between 1 and 5
                        score, // Random score between 0 and 99
                    },
                ],
                ml: {
                    type: scoreMl > 90 ? 'Alert' : scoreMl > 70 ? 'Warning' : 'Info',
                    description: scoreMl > 90 ? 'Dangerous ML alert' : scoreMl > 70 ? 'Just ML warning' : 'OK',
                    first_occurrence: time,
                    number_occurrences: scoreMl > 70 ? Math.floor(Math.random() * 3) + 1 : 0, // Random occurrences between 1 and 3
                    score: scoreMl, // Random score between 0 and 49
                },
                worstType: 'Alert', // Assuming the worst type is Alert for this example
            };
            oneResult.detections.push(detection);
        }

        result.results.push(oneResult);
    }
}

writeFileSync(join(workingDir, `${getTimestamp()}.json`), JSON.stringify(result, null, 2));
