import React, { Component } from 'react';

import { Button, CircularProgress, Link, Paper } from '@mui/material';
import { Check, Close, Warning } from '@mui/icons-material';

import { I18n, type LegacyConnection, type ThemeType } from '@iobroker/adapter-react-v5';
import type { ReportUxHandler, StoredStatisticsResult } from '../types';
import { bytes2string, findAdminLink, isTouch } from './utils';

interface StatusTabProps {
    instance: string;
    socket: LegacyConnection;
    reportUxEvent: ReportUxHandler;
    alive: boolean;
    themeType: ThemeType;
    lastSeenID: string; // Last seen ID for scan analysis
    onNavigateToDetections: () => void; // Optional callback for navigation
    results: StoredStatisticsResult | null;
    isMobile: boolean;
}

interface StatusTabState {
    recordingEnabled: boolean;
    recordingRunning: boolean;
    recordingCaptured: number;
    idsStatus: 'Running' | 'Started' | 'Configuring' | 'Analyzing' | 'Error' | 'No connection' | 'Unknown';
    adminLink: string;
}

const styles: Record<'title' | 'row' | 'result', React.CSSProperties> = {
    title: {
        paddingLeft: 10,
        alignItems: 'center',
    },
    row: {
        height: 38,
    },
    result: {
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        height: 38,
    },
};

export function StatusIcon(props: {
    ok: boolean;
    warning?: boolean;
    size?: number;
    style?: React.CSSProperties;
}): React.JSX.Element {
    return (
        <span
            style={{
                borderRadius: !props.ok && props.warning ? undefined : 30,
                backgroundColor: props.ok ? 'green' : props.warning ? undefined : 'red',
                width: props.size || 30,
                height: props.size || 30,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                ...props.style,
            }}
        >
            {props.ok ? (
                <Check
                    style={{ color: 'white', width: props.size || 30, height: props.size || 30, fill: 'currentColor' }}
                />
            ) : props.warning ? (
                <Warning
                    style={{ color: 'red', width: props.size || 30, height: props.size || 30, fill: 'currentColor' }}
                />
            ) : (
                <Close
                    style={{ color: 'white', width: props.size || 30, height: props.size || 30, fill: 'currentColor' }}
                />
            )}
        </span>
    );
}

export default class StatusTab extends Component<StatusTabProps, StatusTabState> {
    constructor(props: StatusTabProps) {
        super(props);
        this.state = {
            recordingEnabled: false,
            idsStatus: 'Unknown',
            recordingCaptured: 0,
            recordingRunning: false,
            adminLink: '',
        };
    }

    async componentDidMount(): Promise<void> {
        const idsStatusId = `kisshome-defender.${this.props.instance}.info.ids.status`;
        const recordingEnabledId = `kisshome-defender.${this.props.instance}.info.recording.enabled`;
        const recordingRunningId = `kisshome-defender.${this.props.instance}.info.recording.running`;
        const recordingCapturedId = `kisshome-defender.${this.props.instance}.info.recording.capturedFull`;

        const idsStatus = await this.props.socket.getState(idsStatusId);
        const recordingEnabled = await this.props.socket.getState(recordingEnabledId);
        const recordingRunning = await this.props.socket.getState(recordingRunningId);
        const recordingCaptured = await this.props.socket.getState(recordingCapturedId);

        this.onIdsStatusChanged(idsStatusId, idsStatus);
        this.onRecordingEnabledChanged(recordingEnabledId, recordingEnabled);
        this.onRecordingRunningChanged(recordingRunningId, recordingRunning);
        this.onRecordingCapturedChanged(recordingCapturedId, recordingCaptured);

        await this.props.socket.subscribeState(idsStatusId, this.onIdsStatusChanged);
        await this.props.socket.subscribeState(recordingEnabledId, this.onRecordingEnabledChanged);
        await this.props.socket.subscribeState(recordingRunningId, this.onRecordingRunningChanged);
        await this.props.socket.subscribeState(recordingCapturedId, this.onRecordingCapturedChanged);

        // Read configuration from the adapter
        this.setState({
            adminLink: await findAdminLink(this.props.socket, this.props.instance),
        });
    }

    componentWillUnmount(): void {
        this.props.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance}.info.ids.status`,
            this.onIdsStatusChanged,
        );
        this.props.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance}.info.recording.enabled`,
            this.onRecordingEnabledChanged,
        );
        this.props.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance}.info.recording.running`,
            this.onRecordingRunningChanged,
        );
        this.props.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance}.info.recording.capturedFull`,
            this.onRecordingCapturedChanged,
        );
    }

    onIdsStatusChanged = (_id: string, state: ioBroker.State | null | undefined): void => {
        if ((state?.val || '') !== this.state.idsStatus) {
            this.setState({
                idsStatus:
                    (state?.val as
                        | 'Running'
                        | 'Started'
                        | 'Configuring'
                        | 'Analyzing'
                        | 'Error'
                        | 'No connection'
                        | 'Unknown') || 'Unknown',
            });
        }
    };

    onRecordingEnabledChanged = (_id: string, state: ioBroker.State | null | undefined): void => {
        if (!!state?.val !== this.state.recordingEnabled) {
            this.setState({
                recordingEnabled: !!state?.val,
            });
        }
    };

    onRecordingRunningChanged = (_id: string, state: ioBroker.State | null | undefined): void => {
        if (!!state?.val !== this.state.recordingRunning) {
            this.setState({
                recordingRunning: !!state?.val,
            });
        }
    };

    onRecordingCapturedChanged = (_id: string, state: ioBroker.State | null | undefined): void => {
        if ((state?.val || 0) !== this.state.recordingCaptured) {
            this.setState({
                recordingCaptured: (state?.val as number) || 0,
            });
        }
    };

    getStatusColor(): 'green' | 'red' | 'orange' {
        if (this.state.idsStatus === 'Error' || (this.state.idsStatus as string) === 'Exited') {
            return 'red';
        }
        if (this.state.idsStatus === 'No connection' || this.state.idsStatus === 'Unknown') {
            return 'orange';
        }
        return 'green';
    }

    render(): React.JSX.Element {
        const results = this.props.results?.results || [];
        const onlyWarningsAndAlerts = results.filter(
            item =>
                // If any detection has a worstType of Alert or Warning
                item.isAlert,
        );

        // Calculate detections after last seen ID
        let unseenWarningsCount = 0;
        if (this.props.lastSeenID) {
            let found = false;
            for (let i = 0; i < onlyWarningsAndAlerts.length; i++) {
                if (found) {
                    unseenWarningsCount++;
                }
                if (onlyWarningsAndAlerts[i].uuid === this.props.lastSeenID) {
                    found = true;
                }
            }
            if (!found) {
                // If lastSeenID is not found, count all warnings and alerts
                unseenWarningsCount = onlyWarningsAndAlerts.length;
            }
        } else {
            unseenWarningsCount = onlyWarningsAndAlerts.length;
        }

        let problem = '';
        if (!this.props.alive) {
            problem = I18n.t('kisshome-defender_Instance is not running');
        } else if (this.state.idsStatus === 'Error') {
            problem = I18n.t('kisshome-defender_Detection engine exited');
        } else if (!this.state.recordingRunning) {
            problem = I18n.t('kisshome-defender_Recording is not running. Please check the log for more details');
        }

        return (
            <div
                className="status-tab"
                style={{
                    width: `calc(100% - ${this.props.isMobile ? 10 : 20}px)`,
                    height: `calc(100% - ${this.props.isMobile ? 10 : 20}px)`,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: this.props.isMobile ? 5 : 10,
                    gap: this.props.isMobile ? 10 : 20,
                }}
            >
                <Paper
                    style={{
                        flexGrow: 1,
                        padding: this.props.isMobile ? 5 : 10,
                        border: `2px solid ${this.props.themeType === 'dark' ? 'white' : 'black'}`,
                        borderRadius: 0,
                        backgroundColor: this.props.themeType === 'dark' ? undefined : '#E6E6E6',
                        boxShadow: 'none',
                        display: 'flex',
                        justifyContent: this.props.isMobile ? 'space-evenly' : 'center',
                        alignItems: 'center',
                        fontSize: this.props.isMobile ? '0.9rem' : '1.3rem',
                        width: `calc(100% - ${this.props.isMobile ? 10 : 20}`,
                        flexDirection: 'column',
                    }}
                >
                    {this.props.alive ? (
                        <Button
                            variant="contained"
                            color="primary"
                            style={this.props.isMobile ? {} : { position: 'absolute', top: 80, right: 30 }}
                            onClick={async e => {
                                this.props.reportUxEvent({
                                    id: 'kisshome-defender-status-recording-enabled',
                                    event: 'change',
                                    ts: Date.now(),
                                    isTouchEvent: isTouch(e),
                                });

                                await this.props.socket.setState(
                                    `kisshome-defender.${this.props.instance}.info.recording.enabled`,
                                    !this.state.recordingEnabled,
                                );
                            }}
                        >
                            {this.state.recordingEnabled
                                ? I18n.t('kisshome-defender_Deactivate protection')
                                : I18n.t('kisshome-defender_Activate protection')}
                        </Button>
                    ) : null}
                    <table>
                        <tbody>
                            {this.props.alive ? null : (
                                <tr
                                    style={{
                                        ...styles.row,
                                        display: 'flex',
                                        alignItems: 'center',
                                        width: undefined,
                                    }}
                                >
                                    <td style={styles.result}>
                                        <StatusIcon ok={this.props.alive} />
                                    </td>
                                    <td style={styles.title}>{I18n.t('kisshome-defender_Instance is not running')}</td>
                                </tr>
                            )}
                            {this.props.alive && this.state.adminLink ? null : (
                                <tr
                                    style={{
                                        ...styles.row,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        width: undefined,
                                    }}
                                >
                                    <td colSpan={2}>
                                        <Link
                                            href={this.state.adminLink}
                                            target="settings"
                                            onClick={e => {
                                                this.props.reportUxEvent({
                                                    id: 'kisshome-defender-settings-admin-link',
                                                    event: 'click',
                                                    data: this.state.adminLink,
                                                    ts: Date.now(),
                                                    isTouchEvent: isTouch(e),
                                                });
                                            }}
                                        >
                                            {I18n.t('kisshome-defender_Enable the instance in the admin')}
                                        </Link>
                                    </td>
                                </tr>
                            )}
                            {this.props.alive ? (
                                <tr style={styles.row}>
                                    <td
                                        style={styles.result}
                                        title={problem}
                                    >
                                        <StatusIcon ok={this.state.recordingRunning} />
                                    </td>
                                    <td style={styles.title}>
                                        {this.state.recordingRunning
                                            ? I18n.t('kisshome-defender_Software activated')
                                            : I18n.t('kisshome-defender_Software not activated')}
                                    </td>
                                </tr>
                            ) : null}
                            {this.props.alive ? (
                                <tr style={styles.row}>
                                    <td style={{ ...styles.result, color: this.getStatusColor() }}>
                                        <StatusIcon ok={this.getStatusColor() === 'green'} />
                                        <span style={{ fontSize: 'smaller', fontStyle: 'italic' }}>
                                            {I18n.t(`kisshome-defender_${this.state.idsStatus}`)}
                                        </span>
                                    </td>
                                    <td style={styles.title}>{I18n.t('kisshome-defender_Detection engine status')}</td>
                                </tr>
                            ) : null}
                            {this.props.alive && this.state.recordingRunning ? (
                                <tr style={styles.row}>
                                    <td style={{ ...styles.result, fontSize: '0.9rem' }}>
                                        <StatusIcon ok />
                                        <CircularProgress />
                                        <span>
                                            {I18n.t(
                                                'kisshome-defender_%s collected',
                                                bytes2string(this.state.recordingCaptured),
                                            )}
                                        </span>
                                    </td>
                                    <td style={styles.title}>{I18n.t('kisshome-defender_Recording is running')}</td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </Paper>
                {this.props.alive ? (
                    <Paper
                        style={{
                            height: this.props.isMobile ? 60 : 80,
                            padding: '10px 40px 10px 10px',
                            border: `2px solid ${this.props.themeType === 'dark' ? 'white' : 'black'}`,
                            borderRadius: 0,
                            backgroundColor: this.props.themeType === 'dark' ? undefined : '#E6E6E6',
                            boxShadow: 'none',
                            cursor: this.props.results?.results.length ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 10,
                            fontSize: '1.3rem',
                        }}
                        onClick={() => {
                            if (this.props.results?.results.length) {
                                this.props.reportUxEvent({
                                    id: 'kisshome-defender-status-detections',
                                    event: 'click',
                                    ts: Date.now(),
                                });
                                this.props.onNavigateToDetections();
                            }
                        }}
                    >
                        <div />
                        {unseenWarningsCount
                            ? `${I18n.t('kisshome-defender_New problem detected')}: ${unseenWarningsCount}`
                            : I18n.t('kisshome-defender_Everything OK')}
                        <StatusIcon
                            style={{ marginLeft: 10 }}
                            ok={!unseenWarningsCount}
                            warning
                            size={this.props.isMobile ? 36 : 52}
                        />
                    </Paper>
                ) : null}
            </div>
        );
    }
}
