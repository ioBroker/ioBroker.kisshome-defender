export type MACAddress = string;
export type Device = {
    enabled: boolean;
    mac: MACAddress;
    ip: string;
    desc: string;
    uuid: string;
};

export interface DefenderAdapterConfig {
    /** Registered email address */
    email: string;
    /** Fritzbox IP address */
    fritzbox: string;
    /** Fritzbox login */
    login: string;
    /** Fritzbox password */
    password: string;
    /** Working directory */
    tempDir: string;
    /** Fritzbox interface */
    iface: string;
    /** Monitored devices */
    devices: Device[];
    /** if recording is enabled */
    recordingEnabled: boolean;
    /** Information about the Docker setup */
    docker: {
        /** If the adapter starts a Docker container itself */
        selfHosted: boolean;
        /** Url of the foreign docker container */
        url: string;
        /** Docker volume */
        volume: string;
    };
    /** Level of anomaly sensitivity */
    anomalySensitivity: 'low' | 'medium' | 'high';
    /** If the user wants to allow training with own data */
    allowTraining: boolean;
    /** Interval in seconds to save the pcap data at least every x seconds */
    saveThresholdSeconds: number;
    /** If the user does not want to receive email notifications */
    emailDisabled: boolean;
}

type DetectionAlert = {
    type: 'Warning' | 'Alert' | 'Info';
    description: string;
    first_occurrence: string;
    number_occurrences: number;
    score: number;
};

type DetectionML = {
    type: 'Warning' | 'Alert' | 'Info';
    description: string;
    first_occurrence: string;
    number_occurrences: number;
    score: number;
};

type Detection = {
    mac: string;
    suricata: DetectionAlert[];
    ml: DetectionML;
};

export interface DeviceStatistics {
    mac: MACAddress;
    external_ips: {
        [ip: string]: { country: string; data_volume_bytes: number };
    };
    data_volume: {
        packet_count: number;
        data_volume_bytes: number;
    };
}
type Statistics = {
    suricataTotalRules: number;
    suricataAnalysisDurationMs: number;
    analysisDurationMs: number;
    totalBytes: number;
    packets: number;
    devices: DeviceStatistics[];
};

type Result = {
    status: string;
};

type AnalysisJson = {
    file: string;
    time: string;
    result: Result;
    statistics: Statistics;
    detections: Detection[];
};

export interface StatisticsResult {
    analysisDurationMs: number;
    totalBytes: number;
    packets: number;
    time: string;
    devices: DeviceStatistics[];
    uuid: string;
}

export interface StoredStatisticsResult {
    analysisDurationMs: number;
    totalBytes: number;
    packets: number;
    results: StatisticsResult[];
    countries: { [country: string]: number };
    names?: { [mac: MACAddress]: { ip: string; desc: string; vendor?: string } };
}

export interface DetectionWithUUID extends Detection {
    scanUUID: string;
    uuid: string;
    time: string;
}

export type UXEventType = 'click' | 'down' | 'up' | 'show' | 'hide' | 'change' | 'create';
export interface UXEvent {
    id: string;
    event: UXEventType;
    isTouchEvent?: boolean;
    ts: number;
    data?: string;
}

export type DataRequestType =
    | 'dataVolumePerDevice'
    | 'dataVolumePerCountry'
    | 'dataVolumePerDaytime'
    | 'dataVolumePerDay'
    | 'allStatistics';

export interface DataVolumePerDeviceResult {
    [mac: MACAddress]: { series: [number, number][]; info?: { ip: string; desc: string } };
}

export interface DataVolumePerCountryResult {
    [mac: MACAddress]: { countries: { [country: string]: number }; info?: { ip: string; desc: string } };
}

export interface DataVolumePerDaytimeResult {
    [mac: string]: {
        dayTime: { '0'?: number; '1'?: number; '2'?: number; '3'?: number };
        info?: { ip: string; desc: string };
    };
}
