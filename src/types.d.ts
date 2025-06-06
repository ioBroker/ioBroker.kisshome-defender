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
    devices: Device[];
    /** if recording is enabled */
    recordingEnabled: boolean;
}
