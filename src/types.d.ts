export type MACAddress = string;
export type Device = {
    enabled: boolean;
    mac: MACAddress;
    ip: string;
    desc: string;
    uuid: string;
};
export interface IDSStatusMessage {
    status: 'Started' | 'Configuring' | 'Running' | 'Analyzing' | 'Error' | 'No connection' | 'Exited';
    error?: string;
    version?: string;
    training?: { [mac: MACAddress]: { progress: number; description: string } };
}
export interface IDSStatus {
    result: 'Success' | 'Error';
    message?: IDSStatusMessage;
    configuration?: {
        callback_url: string;
        allow_training: boolean;
        meta_json: string;
    };
}

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
        /** Docker port */
        port: number | string;
        /** Port bind */
        bind: string;
    };
    /** If the user wants to allow training with own data */
    allowTraining: boolean;
    /** Interval in seconds to save the pcap data at least every x seconds */
    saveThresholdSeconds: number;
    /** If the user does not want to receive email notifications */
    emailDisabled: boolean;
}

type Detection = {
    type: 'Alert' | 'Normal';
    description: string;
    first_occurrence: string;
    number_occurrences: number;
    score: number;
};

type DetectionsForDevice = {
    mac: MACAddress;
    suricata: Detection[];
    ml: Detection;

    isAlert: boolean; // Worst type of detection for this device added by adapter
    worstScore: number; // Worst score of detection for this device added by adapter
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

export interface Statistics {
    suricataTotalRules: number;
    suricataAnalysisDurationMs: number;
    analysisDurationMs: number;
    totalBytes: number;
    packets: number;
    devices: DeviceStatistics[];
}

type AnalysisResult = {
    file: `${string}.pcap`;
    time: string;
    result: {
        status: 'success';
        error?: string;
    };
    statistics: Statistics;
    detections: DetectionsForDevice[];
};

type StoredAnalysisResult = {
    uuid: string;
    time: string;
    isAlert: boolean; // If the analysis result is an alert
    score: number; // Worst score of all detections in this result
    // If the analysis result is part of today's report
    todayReport?: {
        averageDuration: number;
        minimalDuration: number;
        maximalDuration: number;
        totalDuration: number;
        numberOfAnalyses: number;
        numberOfProblems: number;
        maxScore: number;
    };

    statistics: Statistics;
    detections: DetectionsForDevice[];
};

export interface StoredStatisticsResult {
    analysisDurationMs: number;
    totalBytes: number;
    packets: number;
    results: StoredAnalysisResult[];
    countries: { [country: string]: number };
    names?: { [mac: MACAddress]: { ip: string; desc: string; vendor?: string } };
}

export interface DetectionsForDeviceWithUUID extends DetectionsForDevice {
    scanUUID: string; // UUID of the scan that created this detection
    uuid: string; // Own UUID for the detection
    time: string; // time of first occurrence or nothing
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
    [mac: MACAddress]: {
        dayTime: { '0'?: number; '1'?: number; '2'?: number; '3'?: number };
        info?: { ip: string; desc: string };
    };
}
export type ReportUxEventType = 'click' | 'down' | 'up' | 'show' | 'hide' | 'change';
export type ReportUxHandler = (event: {
    id: string;
    event: ReportUxEventType;
    isTouchEvent?: boolean;
    ts: number;
    data?: string;
    mobile?: boolean;
}) => void;
