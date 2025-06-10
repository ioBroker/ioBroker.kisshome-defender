// This file reads statistics from a folder with JSON files.
// Every file is named with the date in format YYYY-MM-DD_T.json (T is a daytime, e.g. 0=0-6, 1=6-12, 2=12-18, 3=18-24).
// Every file contains objects with StoredStatisticsResult
// The results will be returned as an option for echarts to display the statistics in a chart.

import type {
    DataVolumePerCountryResult,
    DataVolumePerDaytimeResult,
    DataVolumePerDeviceResult,
    Device,
    MACAddress,
    StatisticsResult,
    StoredStatisticsResult,
} from '../types';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileNameToDate } from './utils';
import { getAbsoluteDefaultDataDir } from '@iobroker/adapter-core';

export default class Statistics {
    private readonly adapter: ioBroker.Adapter;
    private readonly workingDir: string;
    private readonly cache: {
        hash: string;
        results: StatisticsResult[];
    } = {
        hash: '',
        results: [],
    };
    private readonly IPs: Device[];
    private readonly MAC2DESC: { [mac: MACAddress]: { ip: string; desc: string } } = {};

    constructor(adapter: ioBroker.Adapter, IPs: Device[]) {
        this.adapter = adapter;
        this.workingDir = join(getAbsoluteDefaultDataDir(), 'kisshome-defender');
        this.IPs = IPs;
        // Create a map for MAC addresses to IP and description
        this.IPs.forEach(ip => {
            if (ip.mac) {
                this.MAC2DESC[ip.mac] = { ip: ip.ip, desc: ip.desc };
            }
        });
    }

    /**
     * Fetches the data from the statistics files in the working directory.
     */
    private getData(): StatisticsResult[] {
        const files = readdirSync(this.workingDir)
            .filter(file => file.endsWith('.json'))
            .sort();

        const lastWeek = new Date();
        lastWeek.setDate(lastWeek.getDate() - 7);
        lastWeek.setHours(0);
        lastWeek.setMinutes(0);
        lastWeek.setSeconds(0);
        lastWeek.setMilliseconds(0);

        const cache: string[] = [];
        // Read the size of the files
        for (const file of files) {
            const fileDate = fileNameToDate(file);
            // Only include files from the last week
            if (fileDate < lastWeek) {
                continue;
            }
            try {
                const stats = statSync(join(this.workingDir, file));
                cache.push(`${file}_${stats.size}`);
            } catch (error) {
                this.adapter.log.error(`Error reading file ${file}: ${error}`);
            }
        }
        if (this.cache.hash !== cache.join(',')) {
            const results: StatisticsResult[] = [];

            for (const file of files) {
                try {
                    const data: StoredStatisticsResult = JSON.parse(
                        readFileSync(join(this.workingDir, file)).toString(),
                    );
                    // concatenate the results
                    results.push(...data.results);
                } catch (error) {
                    this.adapter.log.error(`Error reading file ${file}: ${error}`);
                }
            }
            this.cache.hash = cache.join(',');
            this.cache.results = results;
        }

        // Array is already sorted by date due to the file naming convention
        return this.cache.results;
    }

    // We have 3 different types of statistics:
    // 1. Data volume per device in time range (1 week) - line chart
    // 2. Data volume per country per device in time range (1 week) - stacked bar chart. Every bar is a device, and the height of the bar is the total data volume for that device.
    // 3. Data volume per daytime (0-6, 6-12, 12-18, 18-24) - bar chart. Every bar is a day, and the height of the bar is the total data volume for that day.
    public getDataVolumePerDevice(): DataVolumePerDeviceResult {
        // For this information, we need all data for the last 7 days.
        const results = this.getData();
        const macs: DataVolumePerDeviceResult = {};
        for (const result of results) {
            const ts = new Date(result.time).getTime(); // Get date in YYYY-MM-DD format
            result.devices.forEach(device => {
                macs[device.mac] ||= { series: [], info: this.MAC2DESC[device.mac] };
                macs[device.mac].series.push([ts, device.bytes]);
            });
        }
        return macs;
    }

    public getDataVolumePerCountry(): DataVolumePerCountryResult {
        // For this information, we need all data for the last 7 days.
        const results = this.getData();

        const macs: DataVolumePerCountryResult = {};
        for (const result of results) {
            result.devices.forEach(device => {
                device.countries?.forEach(country => {
                    macs[device.mac] ||= { countries: {}, info: this.MAC2DESC[device.mac] };
                    macs[device.mac].countries[country.country] ||= 0;
                    macs[device.mac].countries[country.country] += country.bytes;
                });
            });
        }

        return macs;
    }

    public getDataVolumePerDaytime(): DataVolumePerDaytimeResult {
        // For this information, we need all data for the last 7 days.
        const results = this.getData();
        const macs: DataVolumePerDaytimeResult = {};
        for (const result of results) {
            const dayTime = Math.floor(new Date(result.time).getHours() / 6); // 0-3
            result.devices.forEach(device => {
                device.countries?.forEach(country => {
                    macs[device.mac] ||= { dayTime: {}, info: this.MAC2DESC[device.mac] };
                    macs[device.mac].dayTime[dayTime] ||= 0;
                    macs[device.mac].dayTime[dayTime] += country.bytes;
                });
            });
        }

        return macs;
    }

    getAllStatistics(): StatisticsResult[] {
        // Returns all statistics from the last 7 days
        return this.getData();
    }
}
