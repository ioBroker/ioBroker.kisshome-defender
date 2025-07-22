import React, { Component } from 'react';

import { Button, CircularProgress, Link, Paper, Switch } from '@mui/material';
import { Check, Close } from '@mui/icons-material';

import type { VisContext } from '@iobroker/types-vis-2';
import { I18n, type ThemeType } from '@iobroker/adapter-react-v5';
import type { DetectionWithUUID, ReportUxHandler } from '../types';
import { bytes2string, findAdminLink } from './utils';

interface StatusTabProps {
    context: VisContext;
    instance: string;
    reportUxEvent: ReportUxHandler;
    alive: boolean;
    themeType: ThemeType;
    detections: DetectionWithUUID[] | null;
    lastSeenID: string; // Last seen ID for detections
    onNavigateToDetections: () => void; // Optional callback for navigation
}

interface StatusTabState {
    recordingEnabled: boolean;
    recordingRunning: boolean;
    recordingCaptured: number;
    idsStatus: 'Running' | 'Started' | 'Configuring' | 'Analyzing' | 'Exited' | 'No connection' | 'Unknown';
    federatedServer: boolean;
    adminLink: string;
}

const styles: Record<'title' | 'row' | 'result', React.CSSProperties> = {
    title: {
        minWidth: 220,
    },
    row: {
        height: 38,
    },
    result: {
        width: 180,
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        height: 38,
    },
};

function StatusIcon(props: { ok: boolean }): React.JSX.Element {
    return (
        <span
            style={{
                borderRadius: 30,
                backgroundColor: props.ok ? 'green' : 'red',
                width: 30,
                height: 30,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            {props.ok ? <Check style={{ color: 'white' }} /> : <Close style={{ color: 'white' }} />}
        </span>
    );
}

export default class StatusTab extends Component<StatusTabProps, StatusTabState> {
    constructor(props: StatusTabProps) {
        super(props);
        this.state = {
            federatedServer: false,
            recordingEnabled: false,
            idsStatus: 'Unknown',
            recordingCaptured: 0,
            recordingRunning: false,
            adminLink: '',
        };
    }

    async componentDidMount(): Promise<void> {
        const idsStatusId = `kisshome-defender.${this.props.instance}.info.ids.status`;
        const federatedServerId = `kisshome-defender.${this.props.instance}.info.ids.connectedToFederatedServer`;
        const recordingEnabledId = `kisshome-defender.${this.props.instance}.info.recording.enabled`;
        const recordingRunningId = `kisshome-defender.${this.props.instance}.info.recording.running`;
        const recordingCapturedId = `kisshome-defender.${this.props.instance}.info.recording.capturedFull`;

        const idsStatus = await this.props.context.socket.getState(idsStatusId);
        const federatedServer = await this.props.context.socket.getState(federatedServerId);
        const recordingEnabled = await this.props.context.socket.getState(recordingEnabledId);
        const recordingRunning = await this.props.context.socket.getState(recordingRunningId);
        const recordingCaptured = await this.props.context.socket.getState(recordingCapturedId);

        this.onIdsStatusChanged(idsStatusId, idsStatus);
        this.onFederatedStatusChanged(federatedServerId, federatedServer);
        this.onRecordingEnabledChanged(recordingEnabledId, recordingEnabled);
        this.onRecordingRunningChanged(recordingRunningId, recordingRunning);
        this.onRecordingCapturedChanged(recordingCapturedId, recordingCaptured);

        await this.props.context.socket.subscribeState(idsStatusId, this.onIdsStatusChanged);
        await this.props.context.socket.subscribeState(federatedServerId, this.onFederatedStatusChanged);
        await this.props.context.socket.subscribeState(recordingEnabledId, this.onRecordingEnabledChanged);
        await this.props.context.socket.subscribeState(recordingRunningId, this.onRecordingRunningChanged);
        await this.props.context.socket.subscribeState(recordingCapturedId, this.onRecordingCapturedChanged);

        // Read configuration from the adapter
        this.setState({
            adminLink: await findAdminLink(this.props.context.socket, this.props.instance),
        });
    }

    componentWillUnmount(): void {
        this.props.context.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance}.info.ids.status`,
            this.onIdsStatusChanged,
        );
        this.props.context.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance}.info.ids.connectedToFederatedServer`,
            this.onFederatedStatusChanged,
        );
        this.props.context.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance}.info.recording.enabled`,
            this.onRecordingEnabledChanged,
        );
        this.props.context.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance}.info.recording.running`,
            this.onRecordingRunningChanged,
        );
        this.props.context.socket.unsubscribeState(
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
                        | 'Exited'
                        | 'No connection'
                        | 'Unknown') || 'Unknown',
            });
        }
    };

    onFederatedStatusChanged = (_id: string, state: ioBroker.State | null | undefined): void => {
        if (!!state?.val !== this.state.federatedServer) {
            this.setState({
                federatedServer: !!state?.val,
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
        if (this.state.idsStatus === 'Exited') {
            return 'red';
        }
        if (this.state.idsStatus === 'No connection' || this.state.idsStatus === 'Unknown') {
            return 'orange';
        }
        return 'green';
    }

    render(): React.JSX.Element {
        let unseenAlertsCount = 0;
        let unseenWarningsCount = 0;
        let unseenInfoCount = 0;
        const detectionsTest: React.JSX.Element[] = [];
        if (this.props.detections?.length && this.props.detections[0].uuid !== this.props.lastSeenID) {
            for (let i = 0; i < this.props.detections.length; i += 1) {
                if (this.props.detections[i].uuid !== this.props.lastSeenID) {
                    if (this.props.detections[i].type === 'Alert') {
                        unseenAlertsCount += 1;
                    } else if (this.props.detections[i].type === 'Warning') {
                        unseenWarningsCount += 1;
                    } else if (this.props.detections[i].type === 'Info') {
                        unseenInfoCount += 1;
                    }
                } else {
                    break; // We found the last seen ID, so we can stop counting
                }
            }
            let currentColor: string | undefined = undefined;
            if (unseenAlertsCount > 0) {
                currentColor = 'red';
                detectionsTest.push(
                    <span style={{ color: currentColor }}>
                        {I18n.t('kisshome-defender_Alerts')} - {unseenAlertsCount} ⚠
                    </span>,
                );
            }

            if (unseenWarningsCount > 0) {
                if (detectionsTest.length) {
                    detectionsTest.push(<span style={{ color: currentColor }}>, </span>);
                }
                currentColor = 'orange';
                detectionsTest.push(
                    <span style={{ color: 'orange' }}>
                        {I18n.t('kisshome-defender_Warnings')} - {unseenWarningsCount} ⚠
                    </span>,
                );
            }

            if (unseenInfoCount > 0) {
                if (detectionsTest.length) {
                    detectionsTest.push(<span style={{ color: currentColor }}>, </span>);
                }
                detectionsTest.push(
                    <span>
                        {I18n.t('kisshome-defender_Info')} - {unseenInfoCount} 🛈
                    </span>,
                );
            }
        }
        let problem = '';
        if (!this.props.alive) {
            problem = I18n.t('kisshome-defender_Instance is not running');
        } else if (this.state.idsStatus === 'Exited') {
            problem = I18n.t('kisshome-defender_Detection engine exited');
        } else if (!this.state.recordingRunning) {
            problem = I18n.t('kisshome-defender_Recording is not running. Please check the log for more details');
        }

        return (
            <div
                className="status-tab"
                style={{
                    width: 'calc(100% - 20px)',
                    height: 'calc(100% - 20px)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 10,
                    gap: 20,
                }}
            >
                <Paper
                    style={{
                        flexGrow: 1,
                        padding: 10,
                        border: `2px solid ${this.props.themeType === 'dark' ? 'white' : 'black'}`,
                        borderRadius: 0,
                        backgroundColor: this.props.context.themeType === 'dark' ? undefined : '#E6E6E6',
                        boxShadow: 'none',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: '1.3rem',
                    }}
                >
                    {this.props.alive ? null : (
                        <div
                            style={{ ...styles.row, display: 'flex', alignItems: 'center', gap: 10, width: undefined }}
                        >
                            <div style={styles.result}>
                                <StatusIcon ok={this.props.alive} />
                            </div>
                            <div style={styles.title}>{I18n.t('kisshome-defender_Instance is not running')}</div>
                        </div>
                    )}
                    {this.props.alive && this.state.adminLink ? null : (
                        <div
                            style={{ ...styles.row, display: 'flex', alignItems: 'center', gap: 10, width: undefined }}
                        >
                            <Link
                                href={this.state.adminLink}
                                target="settings"
                                onClick={e => {
                                    this.props.reportUxEvent({
                                        id: 'kisshome-defender-settings-admin-link',
                                        event: 'click',
                                        data: this.state.adminLink,
                                        ts: Date.now(),
                                        isTouchEvent: e instanceof TouchEvent,
                                    });
                                }}
                            >
                                {I18n.t('kisshome-defender_Enable the instance in the admin')}
                            </Link>
                        </div>
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
                    <table>
                        <tbody>
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
                                    <td style={{ ...styles.result, fontSize: 8 }}>
                                        <StatusIcon ok={this.state.federatedServer} />
                                    </td>
                                    <td style={styles.title}>
                                        {this.state.federatedServer
                                            ? I18n.t('kisshome-defender_Connected to federated server')
                                            : I18n.t('kisshome-defender_Not connected to federated server')}
                                    </td>
                                </tr>
                            ) : null}
                            {this.props.alive && this.state.recordingRunning ? (
                                <tr style={styles.row}>
                                    <td style={{ ...styles.result, fontSize: 8 }}>
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
                    <Button
                        variant="contained"
                        color={this.state.recordingEnabled ? 'grey' : 'primary'}
                        style={{ position: 'absolute', top: 80, right: 30 }}
                        onClick={async event => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-status-recording-enabled',
                                event: 'change',
                                ts: Date.now(),
                                isTouchEvent: event instanceof TouchEvent,
                            });

                            await this.props.context.socket.setState(
                                `kisshome-defender.${this.props.instance}.info.recording.enabled`,
                                !this.state.recordingEnabled,
                            );
                        }}
                    >
                        {this.state.recordingEnabled
                            ? I18n.t('kisshome-defender_Deactivate protection')
                            : I18n.t('kisshome-defender_Activate protection')}
                    </Button>
                </Paper>
                <Paper
                    style={{
                        height: 80,
                        padding: 10,
                        border: `2px solid ${this.props.themeType === 'dark' ? 'white' : 'black'}`,
                        borderRadius: 0,
                        backgroundColor: this.props.context.themeType === 'dark' ? undefined : '#E6E6E6',
                        boxShadow: 'none',
                        cursor: this.props.detections?.length ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.3rem',
                    }}
                    onClick={() => {
                        if (this.props.detections?.length) {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-status-detections',
                                event: 'click',
                                ts: Date.now(),
                            });
                            this.props.onNavigateToDetections();
                        }
                    }}
                >
                    {unseenAlertsCount || unseenWarningsCount ? (
                        <div>
                            <div style={{ ...styles.title, display: 'inline-block' }}>
                                {I18n.t('kisshome-defender_Actual information')}:
                            </div>
                            {detectionsTest}
                        </div>
                    ) : this.props.detections?.length ? (
                        <div>{I18n.t('kisshome-defender_No unseen detections')}</div>
                    ) : (
                        <div>{I18n.t('kisshome-defender_No detections')}</div>
                    )}
                </Paper>
            </div>
        );
    }
}
