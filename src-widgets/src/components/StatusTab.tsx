import React, { Component } from 'react';

import { Paper, Switch } from '@mui/material';

import type { VisContext } from '@iobroker/types-vis-2';
import type { DetectionWithUUID, ReportUxHandler } from '../types';
import { I18n, type ThemeType } from '@iobroker/adapter-react-v5';

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
}

const styles: Record<'title' | 'row', React.CSSProperties> = {
    title: {
        minWidth: 220,
    },
    row: {
        height: 38,
    },
};

export default class StatusTab extends Component<StatusTabProps, StatusTabState> {
    constructor(props: StatusTabProps) {
        super(props);
        this.state = {
            federatedServer: false,
            recordingEnabled: false,
            idsStatus: 'Unknown',
            recordingCaptured: 0,
            recordingRunning: false,
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
    }

    componentWillUnmount() {
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

    getStatusColor() {
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
        let detectionsTest: React.JSX.Element[] = [];
        if (this.props.detections?.length && this.props.detections[0].uuid !== this.props.lastSeenID) {
            for (let i = 0; i < this.props.detections.length; i += 1) {
                if (this.props.detections[i].uuid !== this.props.lastSeenID) {
                    if (this.props.detections[i].type === 'Alert') {
                        unseenAlertsCount += 1;
                    } else {
                        unseenWarningsCount += 1;
                    }
                } else {
                    break; // We found the last seen ID, so we can stop counting
                }
            }
            if (unseenAlertsCount > 0) {
                detectionsTest.push(
                    <span style={{ color: 'red' }}>
                        {I18n.t('kisshome-defender_Alerts')} - {unseenAlertsCount} ⚠
                    </span>,
                );
            }
            if (unseenWarningsCount > 0) {
                if (detectionsTest) {
                    detectionsTest.push(<span>, </span>);
                }
                detectionsTest.push(
                    <span style={{ color: 'orange' }}>
                        {I18n.t('kisshome-defender_Warnings')} - {unseenWarningsCount}
                    </span>,
                );
            }
        }

        return (
            <div
                className="status-tab"
                style={{ padding: '10px' }}
            >
                <Paper
                    style={{
                        width: 'calc(100% - 20px)',
                        backgroundColor: this.props.themeType === 'dark' ? '#333' : '#ddd',
                        padding: 10,
                    }}
                >
                    <table>
                        <tbody>
                            <tr style={styles.row}>
                                <td colSpan={2}>
                                    <h2>{I18n.t('kisshome-defender_Status')}</h2>
                                </td>
                            </tr>
                            <tr style={styles.row}>
                                <td style={styles.title}>{I18n.t('kisshome-defender_Instance is running')}</td>
                                <td style={{ color: this.props.alive ? 'green' : 'red' }}>
                                    {this.props.alive ? '✓' : '🗙'}
                                </td>
                            </tr>
                            <tr style={styles.row}>
                                <td style={styles.title}>{I18n.t('kisshome-defender_Detection engine status')}</td>
                                <td style={{ color: this.getStatusColor() }}>{I18n.t(`kisshome-defender_${this.state.idsStatus}`)}</td>
                            </tr>
                            <tr style={styles.row}>
                                <td style={styles.title}>{I18n.t('kisshome-defender_Recording enabled')}</td>
                                <td style={{ color: this.state.recordingEnabled ? 'green' : 'red' }}>
                                    <Switch
                                        checked={this.state.recordingEnabled}
                                        onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => {
                                            this.props.reportUxEvent({
                                                id: 'kisshome-defender-status-recording-enabled',
                                                event: 'down',
                                                ts: Date.now(),
                                                isTouchEvent: event instanceof TouchEvent,
                                            });
                                        }}
                                        onMouseUp={(event: React.MouseEvent<HTMLButtonElement>) => {
                                            this.props.reportUxEvent({
                                                id: 'kisshome-defender-status-recording-enabled',
                                                event: 'up',
                                                ts: Date.now(),
                                                isTouchEvent: event instanceof TouchEvent,
                                            });
                                        }}
                                        onChange={async (event, checked) => {
                                            this.props.reportUxEvent({
                                                id: 'kisshome-defender-status-recording-enabled',
                                                event: 'change',
                                                ts: Date.now(),
                                                isTouchEvent: event instanceof TouchEvent,
                                            });

                                            await this.props.context.socket.setState(
                                                `kisshome-defender.${this.props.instance}.info.recording.enabled`,
                                                checked,
                                            );
                                        }}
                                    />
                                </td>
                            </tr>
                            {this.state.recordingEnabled ? (
                                <tr style={styles.row}>
                                    <td style={styles.title}>{I18n.t('kisshome-defender_Recording running')}</td>
                                    <td style={{ color: this.state.recordingRunning ? 'green' : 'red' }}>
                                        {this.state.recordingRunning ? '✓' : '🗙'}
                                    </td>
                                </tr>
                            ) : null}
                            {this.state.recordingRunning ? (
                                <tr style={styles.row}>
                                    <td style={styles.title}>{I18n.t('kisshome-defender_Number of captured packets')}</td>
                                    <td style={{ color: this.state.recordingCaptured ? 'green' : 'orange' }}>
                                        {this.state.recordingCaptured}
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </Paper>
                <Paper
                    style={{
                        width: 'calc(100% - 20px)',
                        paddingLeft: 10,
                        paddingRight: 10,
                        paddingTop: 20,
                        paddingBottom: 20,
                        cursor: this.props.detections?.length ? 'pointer' : 'default',
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
                            <div style={{ ...styles.title, display: 'inline-block' }}>{I18n.t('kisshome-defender_New detections')}:</div>{' '}
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
