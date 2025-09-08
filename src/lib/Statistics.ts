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
    StoredAnalysisResult,
    StoredStatisticsResult,
} from '../types';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileNameToDate, normalizeMacAddress } from './utils';
import { getAbsoluteDefaultDataDir } from '@iobroker/adapter-core';

export default class Statistics {
    private readonly adapter: ioBroker.Adapter;
    private readonly workingDir: string;
    private readonly cache: {
        hash: string;
        results: StoredAnalysisResult[];
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
                const mac = normalizeMacAddress(ip.mac);
                this.MAC2DESC[mac] = { ip: ip.ip, desc: ip.desc };
            }
        });
    }

    /**
     * Fetches the data from the statistics files in the working directory.
     */
    private getData(onlyToday?: boolean): StoredAnalysisResult[] {
        const files = readdirSync(this.workingDir)
            .filter(file => file.endsWith('.json'))
            .sort();

        const lastWeek = new Date();
        if (!onlyToday) {
            lastWeek.setDate(lastWeek.getDate() - 7);
        }
        lastWeek.setHours(0);
        lastWeek.setMinutes(0);
        lastWeek.setSeconds(0);
        lastWeek.setMilliseconds(0);

        const cache: string[] = [];
        const fileNames: string[] = [];
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
                fileNames.push(file);
            } catch (error) {
                this.adapter.log.error(`Error reading file ${file}: ${error}`);
            }
        }

        if (this.cache.hash !== cache.join(',')) {
            const results: StoredAnalysisResult[] = [];

            for (const file of fileNames) {
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
            result.statistics.devices.forEach(device => {
                const mac = normalizeMacAddress(device.mac);
                macs[mac] ||= { series: [], info: this.MAC2DESC[mac] };
                macs[mac].series.push([ts, device.data_volume.data_volume_bytes]);
            });
        }
        return macs;
    }

    public getDataVolumePerDay(): DataVolumePerDeviceResult {
        // For this information, we need all data for the last 7 days.
        const results = this.getData();
        const macs: DataVolumePerDeviceResult = {};
        for (const result of results) {
            const nextDayTime = new Date(result.time); // Get date in YYYY-MM-DD format
            nextDayTime.setDate(nextDayTime.getDate() + 1); // Set to the next day to avoid multiple entries for the same day
            nextDayTime.setHours(0, 0, 0, 0); // Set time
            const ts = nextDayTime.getTime();
            result.statistics.devices.forEach(device => {
                const mac = normalizeMacAddress(device.mac);
                macs[mac] ||= { series: [], info: this.MAC2DESC[mac] };
                const series = macs[mac].series;
                // Summarize all data for the same day
                if (series.length > 0 && series[series.length - 1][0] === ts) {
                    series[series.length - 1][1] += device.data_volume.data_volume_bytes;
                    return;
                }
                // Add new entry for the day
                series.push([ts, device.data_volume.data_volume_bytes]);
            });
        }
        return macs;
    }

    public getDataVolumePerCountry(): DataVolumePerCountryResult {
        // For this information, we need all data for the last 7 days.
        const results = this.getData();

        const macs: DataVolumePerCountryResult = {};
        for (const result of results) {
            result.statistics.devices.forEach(device => {
                const ips = Object.keys(device.external_ips);
                ips.forEach(ip => {
                    const country = device.external_ips[ip].country;
                    const mac = normalizeMacAddress(device.mac);
                    macs[mac] ||= { countries: {}, info: this.MAC2DESC[mac] };
                    macs[mac].countries[country] ||= 0;
                    macs[mac].countries[country] += device.external_ips[ip].data_volume_bytes;
                });
            });
        }

        return macs;
    }

    public getTotals(): {
        deviceMostCountries?: string;
        dataVolumePerDevice?: string;
    } {
        // For this information, we need all data for the last 7 days.
        const results = this.getData();
        const devices: { [mac: string]: { volume: number; countries: string[] } } = {};
        for (const result of results) {
            result.statistics.devices.forEach(device => {
                const mac = normalizeMacAddress(device.mac);
                devices[mac] ||= { volume: 0, countries: [] };
                devices[mac].volume += device.data_volume.data_volume_bytes;
                const ips = Object.keys(device.external_ips);
                ips.forEach(ip => {
                    const country = device.external_ips[ip].country;
                    if (!devices[mac].countries.includes(country)) {
                        devices[mac].countries.push(country);
                    }
                });
            });
        }
        let deviceMostCountries = '';
        let dataVolumePerDevice = '';

        // Find device with most countries
        const macs = Object.keys(devices);
        for (const mac of macs) {
            const nMac = normalizeMacAddress(mac);
            if (
                !deviceMostCountries ||
                devices[nMac].countries.length > devices[deviceMostCountries].countries.length
            ) {
                deviceMostCountries = nMac;
            }
            if (!dataVolumePerDevice || devices[nMac].volume > devices[deviceMostCountries].volume) {
                dataVolumePerDevice = nMac;
            }
        }

        return {
            deviceMostCountries: this.MAC2DESC[deviceMostCountries]
                ? this.MAC2DESC[deviceMostCountries].desc ||
                  this.MAC2DESC[deviceMostCountries].ip ||
                  deviceMostCountries
                : deviceMostCountries,
            dataVolumePerDevice: this.MAC2DESC[dataVolumePerDevice]
                ? this.MAC2DESC[dataVolumePerDevice].desc ||
                  this.MAC2DESC[dataVolumePerDevice].ip ||
                  dataVolumePerDevice
                : dataVolumePerDevice,
        };
    }

    public getReportForToday(): {
        averageDuration: number;
        minimalDuration: number;
        maximalDuration: number;
        totalDuration: number;
        numberOfAnalyses: number;
        numberOfProblems: number;
        maxScore: number;
    } {
        const results = this.getData(true);
        const resultToday: {
            averageDuration: number;
            minimalDuration: number;
            maximalDuration: number;
            totalDuration: number;
            numberOfAnalyses: number;
            numberOfProblems: number;
            maxScore: number;
        } = {
            averageDuration: 0,
            minimalDuration: Number.MAX_SAFE_INTEGER,
            maximalDuration: 0,
            totalDuration: 0,
            numberOfAnalyses: 0,
            numberOfProblems: 0,
            maxScore: 0,
        };
        for (const result of results) {
            resultToday.numberOfAnalyses++;
            resultToday.totalDuration += result.statistics.analysisDurationMs;
            if (result.statistics.analysisDurationMs < resultToday.minimalDuration) {
                resultToday.minimalDuration = result.statistics.analysisDurationMs;
            }
            if (result.statistics.analysisDurationMs > resultToday.maximalDuration) {
                resultToday.maximalDuration = result.statistics.analysisDurationMs;
            }
            if (result.isAlert) {
                resultToday.numberOfProblems++;
            }
            if (result.score > resultToday.maxScore) {
                resultToday.maxScore = result.score;
            }
        }
        if (resultToday.numberOfAnalyses > 0) {
            resultToday.averageDuration = Math.round(resultToday.totalDuration / resultToday.numberOfAnalyses);
        } else {
            resultToday.minimalDuration = 0;
        }
        return resultToday;
    }

    public getDataVolumePerDaytime(): DataVolumePerDaytimeResult {
        // For this information, we need all data for the last 7 days.
        const results = this.getData();
        const macs: DataVolumePerDaytimeResult = {};
        for (const result of results) {
            const dayTime: 0 | 1 | 2 | 3 = Math.floor(new Date(result.time).getHours() / 6) as 0 | 1 | 2 | 3; // 0-3
            result.statistics.devices.forEach(device => {
                const mac = normalizeMacAddress(device.mac);
                macs[mac] ||= { dayTime: {}, info: this.MAC2DESC[mac] };
                macs[mac].dayTime[dayTime] ||= 0;
                macs[mac].dayTime[dayTime] += device.data_volume.data_volume_bytes;
            });
        }

        return macs;
    }

    getAllStatistics(): StoredAnalysisResult[] {
        // Returns all statistics from the last 7 days
        return this.getData();
    }
}
