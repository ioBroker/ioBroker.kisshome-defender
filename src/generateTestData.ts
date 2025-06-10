import { writeFileSync } from 'fs';
import { join } from 'path';
import type { StatisticsResult, StoredStatisticsResult } from './types';
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

        const oneResult: StatisticsResult = {
            analysisDurationMs: 0,
            totalBytes: 0,
            packets: 0,
            time,
            devices: [],
        };

        for (let a = 0; a < MACs.length; a++) {
            const mac = MACs[a];
            const bytes = Math.floor(Math.random() * 1000000);
            const packets = bytes / 1000; // Assuming 1000 bytes per packet

            oneResult.packets += packets;
            oneResult.totalBytes += bytes;
            oneResult.devices.push({
                mac,
                bytes,
                countries: [
                    {
                        country: 'DE',
                        bytes: Math.floor(bytes * 0.5), // 50% of bytes for Germany
                    },
                    {
                        country: 'US',
                        bytes: Math.floor(bytes * 0.3), // 30% of bytes for US
                    },
                    {
                        country: 'FR',
                        bytes: Math.floor(bytes * 0.2), // 20% of bytes for France
                    },
                ],
            });

            result.totalBytes += bytes;
            result.packets += packets;
        }
        result.results.push(oneResult);
    }
}

writeFileSync(join(workingDir, `${getTimestamp()}.json`), JSON.stringify(result, null, 2));
