export type Device = {
    enabled: boolean;
    mac: string;
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
    };
    /** Level of anomaly sensitivity */
    anomalySensitivity: 'low' | 'medium' | 'high';
    /** If the user wants to allow training with own data */
    allowTraining: boolean;
    /** Interval in seconds to save the pcap data at least every x seconds */
    saveThresholdSeconds: number;
}
