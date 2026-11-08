/**
 * Pure logic of the element: formatting and what it computes from the results of the adapter. The same as the vis-2
 * widget does it (`src-widgets/src/Widget/components/`), without React and without the DOM - the element and the
 * smoke test use it alike.
 */
import type {
    DeviceStatistics,
    MACAddress,
    StoredAnalysisResult,
    StoredStatisticsResult,
} from '../../src-widgets/src/Widget/types';

export type {
    DataVolumePerCountryResult,
    DataVolumePerDaytimeResult,
    DataVolumePerDeviceResult,
    MACAddress,
    StoredAnalysisResult,
    StoredStatisticsResult,
} from '../../src-widgets/src/Widget/types';

const GIGABYTE = 1024 * 1024 * 1024;
const MEGABYTE = 1024 * 1024;
const KILOBYTE = 1024;

/**
 * Bytes as text - the same as `bytes2string()` of `src-widgets/src/Widget/components/utils.ts`, which cannot be
 * imported: that file brings the types of `@iobroker/gui-components` with it
 *
 * @param bytes the number of bytes
 * @param maxValue the biggest value of a scale: all values of it get the same unit
 * @param noFloat without a decimal place, for the labels of a scale
 */
export function bytes2string(bytes: number, maxValue?: number, noFloat?: boolean): string {
    if (bytes === undefined || bytes === null || isNaN(bytes)) {
        return '--';
    }
    if (maxValue !== undefined && maxValue > GIGABYTE) {
        return `${(bytes / GIGABYTE).toFixed(1).replace('.', ',')}Gb`;
    }

    if (maxValue !== undefined && maxValue > MEGABYTE) {
        const mb = bytes / MEGABYTE;
        return `${mb.toFixed(maxValue > 12 * MEGABYTE && noFloat ? 0 : 1).replace('.', ',')}Mb`;
    }
    if (bytes < KILOBYTE) {
        return `${bytes}b`;
    }
    if (maxValue !== undefined) {
        if (bytes < 1024 * 1024) {
            const kb = bytes / KILOBYTE;
            return `${kb.toFixed(maxValue > 12 * KILOBYTE && noFloat ? 0 : 1).replace('.', ',')}kb`;
        }
        if (bytes < GIGABYTE) {
            const mb = bytes / MEGABYTE;
            return `${mb.toFixed(maxValue > 12 * MEGABYTE && noFloat ? 0 : 1).replace('.', ',')}Mb`;
        }
        return `${(bytes / GIGABYTE).toFixed(maxValue > 12 * GIGABYTE && noFloat ? 0 : 1).replace('.', ',')}Gb`;
    }

    if (bytes < MEGABYTE) {
        const kb = bytes / KILOBYTE;
        return `${kb.toFixed(noFloat ? 0 : 1).replace('.', ',')}kb`;
    }
    if (bytes < GIGABYTE) {
        const mb = bytes / MEGABYTE;
        return `${mb.toFixed(noFloat ? 0 : 1).replace('.', ',')}Mb`;
    }
    return `${(bytes / GIGABYTE).toFixed(noFloat ? 0 : 1).replace('.', ',')}Gb`;
}

/**
 * A round top of a scale of bytes, with five steps to it - `getNiceMax()` of the statistics tab
 *
 * @param value the biggest value
 */
export function getNiceMax(value: number): number {
    if (value > MEGABYTE) {
        const mb = Math.ceil(value / MEGABYTE);
        const base = Math.pow(10, Math.floor(Math.log10(mb)));
        return Math.ceil(mb / base) * base * MEGABYTE;
    }
    if (value < KILOBYTE) {
        return KILOBYTE * 5;
    }
    const kb = Math.ceil(value / KILOBYTE);
    const base = Math.pow(10, Math.floor(Math.log10(kb)));
    return Math.ceil(kb / base) * base * KILOBYTE;
}

/**
 * Seconds as `h:mm:ss` or `m:ss`
 *
 * @param seconds the duration
 */
export function secondsToHms(seconds: number): string {
    const d = Number(seconds) || 0;
    const h = Math.floor(d / 3600);
    const m = Math.floor((d % 3600) / 60);
    const s = Math.floor((d % 3600) % 60);
    return `${h > 0 ? `${h}:` : ''}${h ? m.toString().padStart(2, '0') : m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Seconds as `m:ss`
 *
 * @param seconds the duration
 */
export function secondsToMs(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;
}

/**
 * How many of the alerts are newer than the last one the user saw
 *
 * @param results the results of the analyses, oldest first
 * @param lastSeenID the UUID of the last alert the user saw (`info.analysis.lastSeen`)
 */
export function countUnseenAlerts(results: StoredAnalysisResult[], lastSeenID: string): number {
    const alerts = results.filter(item => item.isAlert);
    if (!lastSeenID) {
        return alerts.length;
    }
    const index = alerts.findIndex(item => item.uuid === lastSeenID);
    // if the last seen one is not among them, all are new
    return index === -1 ? alerts.length : alerts.length - index - 1;
}

/**
 * The newest alert
 *
 * @param results the results of the analyses, oldest first
 */
export function getNewestAlert(results: StoredAnalysisResult[] | undefined): StoredAnalysisResult | null {
    for (let i = (results?.length || 0) - 1; i >= 0; i--) {
        if (results![i].isAlert) {
            return results![i];
        }
    }
    return null;
}

/**
 * The last result of an analysis, not a daily status report
 *
 * @param results the results of the analyses, oldest first
 */
export function getLastControl(results: StoredAnalysisResult[] | undefined): StoredAnalysisResult | null {
    for (let i = (results?.length || 0) - 1; i >= 0; i--) {
        if (!results![i].todayReport) {
            return results![i];
        }
    }
    return null;
}

/** How a device fared in one analysis */
export interface DeviceRow {
    mac: MACAddress;
    /** The description or the IP of the configuration, empty if it is unknown */
    name: string;
    alert: boolean;
    /** 0..100 */
    score: number;
    /** What was found, empty if nothing */
    description: string[];
    /** The number of packets, null if unknown */
    packets: number | null;
}

/**
 * The devices of one analysis, worst first - like `renderOneDetectionDetails()` of the detections tab
 *
 * @param item the analysis
 * @param names the names of the devices, from `getData`
 * @param onlyAnomaly true for the group A or the second period: only anomaly or not, without the score
 */
export function getDeviceRows(
    item: StoredAnalysisResult,
    names: StoredStatisticsResult['names'],
    onlyAnomaly: boolean,
): DeviceRow[] {
    const devices: Record<MACAddress, DeviceRow> = {};
    for (const detection of item.detections || []) {
        const mac: MACAddress = detection.mac.toLowerCase();
        const desc = names?.[mac];
        devices[mac] ||= {
            mac,
            name: desc ? desc.desc || desc.ip || '' : '',
            alert: false,
            score: 0,
            description: [],
            packets: null,
        };
        const device = devices[mac];
        if (detection.ml) {
            device.score = Math.max(device.score, detection.ml.score);
            device.alert = detection.ml.type === 'Alert';
            if (detection.ml.description && device.alert) {
                device.description.push(detection.ml.description);
            }
        }
        for (const sr of detection.suricata || []) {
            device.score = Math.max(device.score, sr.score);
            device.alert = sr.type === 'Alert' ? true : device.alert;
            if (sr.description && sr.type === 'Alert') {
                device.description.push(sr.description);
            }
        }
        const statistics: DeviceStatistics | undefined = item.statistics?.devices?.find(
            dev => dev.mac.toLowerCase() === mac,
        );
        device.packets = statistics?.data_volume ? statistics.data_volume.packet_count : null;
    }

    return Object.values(devices).sort((a, b) => {
        let scoreA = a.score || 0;
        let scoreB = b.score || 0;
        if (onlyAnomaly) {
            scoreA = scoreA >= 10 ? 1 : 0;
            scoreB = scoreB >= 10 ? 1 : 0;
        }
        // first by score, then by name, then by MAC
        if (scoreA && scoreB && scoreA !== scoreB) {
            return scoreB - scoreA;
        }
        if (scoreA && !scoreB) {
            return -1;
        }
        if (!scoreA && scoreB) {
            return 1;
        }
        if (a.name && b.name && a.name !== b.name) {
            return a.name.localeCompare(b.name);
        }
        if (a.name && !b.name) {
            return -1;
        }
        if (!a.name && b.name) {
            return 1;
        }
        return a.mac.localeCompare(b.mac);
    });
}

/** The durations of today's analyses in seconds, null if there was none today */
export interface TodayDurations {
    average: number;
    min: number;
    max: number;
    total: number;
}

/**
 * The durations of the analyses since midnight
 *
 * @param results the results of the analyses
 * @param now the current time in ms
 */
export function getTodayDurations(results: StoredAnalysisResult[], now: number): TodayDurations | null {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const durations = results
        .filter(item => new Date(item.time).getTime() >= today.getTime())
        .map(item => (item.statistics?.analysisDurationMs || 0) / 1000);
    if (!durations.length) {
        return null;
    }
    const total = durations.reduce((a, b) => a + b, 0);
    return {
        average: total / durations.length,
        min: Math.min(...durations),
        max: Math.max(...durations),
        total,
    };
}

/** A part of a text with `<strong>` in it */
export interface TextPart {
    text: string;
    strong: boolean;
}

/**
 * A translated text with `<strong>...</strong>` in parts, so that it is drawn without `innerHTML`
 *
 * @param text e.g. `<strong>No anomalies</strong> were detected`
 */
export function splitStrong(text: string): TextPart[] {
    const parts: TextPart[] = [];
    const re = /<strong>(.*?)<\/strong>/gi;
    let last = 0;
    for (let match = re.exec(text); match; match = re.exec(text)) {
        if (match.index > last) {
            parts.push({ text: text.substring(last, match.index), strong: false });
        }
        parts.push({ text: match[1], strong: true });
        last = match.index + match[0].length;
    }
    if (last < text.length) {
        parts.push({ text: text.substring(last), strong: false });
    }
    return parts;
}

/**
 * The address of the settings of the instance in admin - `findAdminLink()` of the vis-2 widget, with the admin
 * instances read by `getObjectViewSystem` instead of `getAdapterInstances`
 *
 * @param instanceObj the object of the instance, for its host
 * @param admins the instances of admin
 * @param instance `kisshome-defender.0`
 * @param hostname the host name of the page
 * @returns empty if there is no admin
 */
export function getAdminLink(
    instanceObj: ioBroker.Object | null | undefined,
    admins: ioBroker.InstanceObject[],
    instance: string,
    hostname: string,
): string {
    if (!instanceObj?.common) {
        return '';
    }
    const host = (instanceObj.common as ioBroker.InstanceCommon).host;
    const admin =
        admins.find(item => item.common.enabled && item.common.host === host) ||
        admins.find(item => item.common.enabled) ||
        admins[0];
    if (!admin) {
        return '';
    }
    const address = admin.common.host === host ? hostname : admin.common.host;
    return `http${admin.native.secure ? 's' : ''}://${address}:${admin.native.port}/#tab-instances/config/system.adapter.${instance}/_instances`;
}
