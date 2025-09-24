import React, { Component } from 'react';

import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    LinearProgress,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
    Fab,
    Menu,
} from '@mui/material';
import { I18n, type LegacyConnection, type ThemeType } from '@iobroker/adapter-react-v5';
import { Close, ExpandMore, Info, Notifications } from '@mui/icons-material';

import type {
    DeviceStatistics,
    MACAddress,
    ReportUxHandler,
    StoredAnalysisResult,
    StoredStatisticsResult,
} from '../types';

import { bytes2string, isTouch } from './utils';
import { StatusIcon } from './StatusTab';

const styles: Record<string, React.CSSProperties> = {
    title: {
        fontSize: '1.2em',
        fontWeight: 'bold',
        marginBottom: 8,
        display: 'inline-block',
    },
    value: {
        fontSize: '1em',
        marginBottom: 16,
        marginLeft: 8,
        display: 'inline-block',
    },
    row: {},
};

interface DetectionsTabProps {
    instance: string;
    lastSeenID: string;
    reportUxEvent: ReportUxHandler;
    alive: boolean;
    themeType: ThemeType;
    socket: LegacyConnection;
    group: 'A' | 'B';
    showDetectionWithUUID: string;
    results: StoredStatisticsResult | null;
    onResultsDialogOpen: (opened: boolean) => void;
    secondPeriod: boolean;
    isMobile: boolean;
}

interface DetectionsTabState {
    detailed: boolean;
    showOnlyAlarmsAndWarnings: boolean;
    lastRequest: number;
    requestRunning: boolean;
    openedItem: string;
    recordingRunning: boolean;
    recordingCaptured: number;
    recordingNextWrite: number;
    detectionRunning: boolean;
    showDetectionWithUUID: string;
    showTooltip: null | HTMLElement;
}

export default class DetectionsTab extends Component<DetectionsTabProps, DetectionsTabState> {
    private updateTimeout: ReturnType<typeof setTimeout> | null = null;
    private showTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(props: DetectionsTabProps) {
        super(props);
        this.state = {
            detailed: false,
            lastRequest: 0,
            requestRunning: false,
            showOnlyAlarmsAndWarnings: window.localStorage.getItem('kisshome-defender-alarms') === 'true',
            openedItem: this.props.showDetectionWithUUID || '',
            recordingCaptured: 0,
            recordingRunning: false,
            recordingNextWrite: 0,
            detectionRunning: false,
            showDetectionWithUUID: this.props.showDetectionWithUUID || '',
            showTooltip: null,
        };
    }

    async componentDidMount(): Promise<void> {
        const recordingRunningId = `kisshome-defender.${this.props.instance}.info.recording.running`;
        const recordingCapturedId = `kisshome-defender.${this.props.instance}.info.recording.capturedFull`;
        const recordingNextWriteId = `kisshome-defender.${this.props.instance}.info.recording.nextWrite`;
        const detectionRunningId = `kisshome-defender.${this.props.instance}.info.analysis.running`;

        const recordingRunning = await this.props.socket.getState(recordingRunningId);
        const recordingCaptured = await this.props.socket.getState(recordingCapturedId);
        const recordingNextWrite = await this.props.socket.getState(recordingNextWriteId);
        const detectionRunning = await this.props.socket.getState(detectionRunningId);

        this.onRecordingRunningChanged(recordingRunningId, recordingRunning);
        this.onRecordingCapturedChanged(recordingCapturedId, recordingCaptured);
        this.onRecordingNextTimeChanged(recordingNextWriteId, recordingNextWrite);
        this.onDetectionRunningChanged(detectionRunningId, detectionRunning);

        await this.props.socket.subscribeState(recordingRunningId, this.onRecordingRunningChanged);
        await this.props.socket.subscribeState(recordingCapturedId, this.onRecordingCapturedChanged);
        await this.props.socket.subscribeState(recordingNextWriteId, this.onRecordingNextTimeChanged);
        await this.props.socket.subscribeState(detectionRunningId, this.onDetectionRunningChanged);

        if (this.state.showDetectionWithUUID) {
            this.setState({ openedItem: this.state.showDetectionWithUUID, detailed: true }, () => {
                this.props.onResultsDialogOpen(true);
                this.props.reportUxEvent({
                    id: 'kisshome-defender-detection',
                    event: 'show',
                    ts: Date.now(),
                    data: this.state.showDetectionWithUUID,
                });

                this.showTimeout = setTimeout(() => {
                    // Scroll to Element with ID
                    const element = document.getElementById(this.state.showDetectionWithUUID);
                    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    this.showTimeout = null;
                    this.setState({ showDetectionWithUUID: '' });
                }, 300);
            });
        }
    }

    componentDidUpdate(prevProps: DetectionsTabProps): void {
        if (this.props.showDetectionWithUUID !== prevProps.showDetectionWithUUID) {
            if (this.props.showDetectionWithUUID && !this.state.detailed) {
                this.setState(
                    {
                        showDetectionWithUUID: this.props.showDetectionWithUUID,
                        openedItem: this.props.showDetectionWithUUID,
                        detailed: true,
                    },
                    () => {
                        this.props.onResultsDialogOpen(true);
                        this.props.reportUxEvent({
                            id: 'kisshome-defender-detection',
                            event: 'show',
                            ts: Date.now(),
                            data: this.state.showDetectionWithUUID,
                        });

                        this.showTimeout = setTimeout(() => {
                            // Scroll to Element with ID
                            const element = document.getElementById(this.state.showDetectionWithUUID);
                            element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            this.showTimeout = null;
                            this.setState({ showDetectionWithUUID: '' });
                        }, 300);
                    },
                );
            } else {
                this.setState({ showDetectionWithUUID: this.props.showDetectionWithUUID });
            }
        }
    }

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

    onRecordingNextTimeChanged = (_id: string, state: ioBroker.State | null | undefined): void => {
        if ((state?.val || '') !== this.state.recordingNextWrite) {
            this.setState({
                recordingNextWrite: new Date(state?.val as string).getTime(),
            });
        }
    };

    onDetectionRunningChanged = (_id: string, state: ioBroker.State | null | undefined): void => {
        if (!!state?.val !== this.state.detectionRunning) {
            this.setState({
                detectionRunning: !!state?.val,
            });
        }
    };

    componentWillUnmount(): void {
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }

        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }
        this.props.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance}.info.recording.running`,
            this.onRecordingRunningChanged,
        );
        this.props.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance}.info.recording.capturedFull`,
            this.onRecordingCapturedChanged,
        );
        this.props.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance}.info.recording.nextWrite`,
            this.onRecordingCapturedChanged,
        );
        this.props.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance}.info.analysis.running`,
            this.onRecordingCapturedChanged,
        );
    }

    renderLastDetection(): React.JSX.Element {
        let item: StoredAnalysisResult | undefined;
        // Find last not status item
        for (let i = this.props.results.results.length - 1; i >= 0; i--) {
            if (!this.props.results.results[i].todayReport) {
                item = this.props.results.results[i];
                break;
            }
        }
        if (!item) {
            return (
                <div className="last-detection">
                    <h3>{I18n.t('kisshome-defender_Last result')}</h3>
                    <div>{I18n.t('kisshome-defender_No results yet exist')}</div>
                </div>
            );
        }

        const seconds = Math.floor((this.state.recordingNextWrite - Date.now()) / 1000);
        const nextControlText = I18n.t(
            'kisshome-defender_In %s minutes or when the maximal file size is reached',
            seconds > 120 ? Math.round(seconds / 60) : (Math.round(seconds / 6) / 10).toString().replace('.', ','),
        );
        const reachedText = I18n.t(
            'kisshome-defender_%s of %s reached',
            bytes2string(this.state.recordingCaptured),
            '50MB',
        );

        return (
            <div className="last-detection">
                <div style={styles.row}>
                    <div style={{ ...styles.title, minWidth: this.props.isMobile ? undefined : 250 }}>
                        {I18n.t('kisshome-defender_Last control')}:
                    </div>
                    <div style={styles.value}>{new Date(item.time).toLocaleString()}</div>
                </div>
                {this.state.recordingRunning ? (
                    <div style={styles.row}>
                        <div style={{ ...styles.title, minWidth: this.props.isMobile ? undefined : 250 }}>
                            {I18n.t('kisshome-defender_Next control')}:
                        </div>
                        <div style={styles.value}>{`${nextControlText} (${reachedText})`}</div>
                    </div>
                ) : null}
                {this.state.recordingRunning ? (
                    <div
                        style={{
                            paddingTop: 30,
                            paddingRight: this.props.isMobile ? 0 : 30,
                            display: 'flex',
                            gap: 30,
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexDirection: this.props.isMobile ? 'column' : undefined,
                        }}
                    >
                        <Button
                            style={{
                                maxWidth: this.props.isMobile ? undefined : 300,
                                whiteSpace: 'nowrap',
                                width: this.props.isMobile ? '100%' : undefined,
                            }}
                            disabled={this.state.detectionRunning}
                            variant="contained"
                            color="primary"
                            onClick={async e => {
                                this.props.reportUxEvent({
                                    id: 'kisshome-defender-detections-trigger-detection',
                                    event: 'click',
                                    ts: Date.now(),
                                    isTouchEvent: isTouch(e),
                                });
                                await this.props.socket.sendTo(
                                    `kisshome-defender.${this.props.instance}`,
                                    'detectNow',
                                    {},
                                );
                            }}
                        >
                            {I18n.t('kisshome-defender_Execute control now')}
                        </Button>
                        <div
                            style={{
                                flexGrow: this.props.isMobile ? undefined : 1,
                                width: this.props.isMobile ? '100%' : undefined,
                            }}
                        >
                            {this.state.detectionRunning ? <LinearProgress /> : null}
                        </div>
                    </div>
                ) : null}
            </div>
        );
    }

    static secondsToMs(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;

        const sDisplay = s.toString().padStart(2, '0');
        return `${m}:${sDisplay} ${I18n.t('kisshome-defender_minutes')}`;
    }

    static secondsToHms(d: number): string {
        d = Number(d);
        const h = Math.floor(d / 3600);
        const m = Math.floor((d % 3600) / 60);
        const s = Math.floor((d % 3600) % 60);

        const hDisplay = h > 0 ? `${h}:` : '';
        const mDisplay = `${h ? m.toString().padStart(2, '0') : m}:`;
        const sDisplay = s.toString().padStart(2, '0');
        return hDisplay + mDisplay + sDisplay;
    }

    renderStatusReport(item: StoredAnalysisResult): React.JSX.Element {
        if (!item.todayReport) {
            return <div>{I18n.t('kisshome-defender_No status report available.')}</div>;
        }
        const text: React.JSX.Element[] = [];
        const title = I18n.t('kisshome-defender_Status Report');
        if (this.props.secondPeriod) {
            // week 3+
            text.push(
                <div>
                    {I18n.t(
                        'kisshome-defender_Below you will find information about checks on %s.',
                        new Date(item.time).toLocaleDateString(),
                    )}
                </div>,
            );
            text.push(
                <div style={{ marginTop: 20 }}>
                    - <span style={{ fontWeight: 'bold' }}>{I18n.t('kisshome-defender_Average check time')}:</span>{' '}
                    {DetectionsTab.secondsToMs(Math.round(item.todayReport.averageDuration / 1000))}
                </div>,
            );
            text.push(
                <div>
                    - <span style={{ fontWeight: 'bold' }}>{I18n.t('kisshome-defender_Minimum check time')}:</span>{' '}
                    {DetectionsTab.secondsToMs(Math.round(item.todayReport.minimalDuration / 1000))}
                </div>,
            );
            text.push(
                <div>
                    - <span style={{ fontWeight: 'bold' }}>{I18n.t('kisshome-defender_Maximum check time')}:</span>{' '}
                    {DetectionsTab.secondsToMs(Math.round(item.todayReport.maximalDuration / 1000))}
                </div>,
            );
            text.push(
                <div>
                    - <span style={{ fontWeight: 'bold' }}>{I18n.t('kisshome-defender_Duration of checks')}:</span>{' '}
                    {DetectionsTab.secondsToMs(Math.round(item.todayReport.totalDuration / 1000))}
                </div>,
            );
            text.push(
                <div style={{ marginTop: 20 }}>
                    {I18n.t(
                        'kisshome-defender_No anomalies were detected during the checks. Therefore, everything is in order.',
                    )}
                </div>,
            );
        } else {
            let content: string;
            // week 1-2
            if (this.props.group === 'A') {
                content = I18n.t(
                    'kisshome-defender_<strong>No anomalies</strong> were detected during the checks on %s. Therefore, everything is in order.',
                    new Date(item.time).toLocaleDateString(),
                );
            } else {
                content = I18n.t(
                    'kisshome-defender_During the checks on %s, a <strong>maximum anomaly score of %s</strong> was detected. Therefore, everything is in order.',
                    new Date(item.time).toLocaleDateString(),
                    item.todayReport.maxScore,
                );
            }
            text.push(<div dangerouslySetInnerHTML={{ __html: content }} />);
        }
        return (
            <AccordionDetails>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 'bold',
                        gap: 16,
                        fontSize: this.props.isMobile ? '1rem' : '1.8rem',
                        marginBottom: 16,
                        justifyContent: 'flex-start',
                    }}
                >
                    <Info style={{ height: 48, width: 48 }} />
                    {title}
                </div>
                <div style={{ fontSize: this.props.isMobile ? '0.9rem' : '1.5rem' }}>{text}</div>
            </AccordionDetails>
        );
    }

    renderOneDetectionDetailsTable(
        devices: {
            [mac: MACAddress]: {
                type: '' | 'Warning' | 'Alert';
                description: string[];
                score: number;
                name?: string;
                statistics?: DeviceStatistics;
            };
        },
        scoreTooltip: React.JSX.Element,
        macs: MACAddress[],
    ): React.JSX.Element {
        return (
            <Table size="small">
                <TableHead style={{ backgroundColor: this.props.themeType === 'dark' ? '#505050' : '#d3d3d3' }}>
                    <TableCell style={{ width: 250 }}>{I18n.t('kisshome-defender_Device')}</TableCell>
                    <TableCell style={{ width: 120 }}>{I18n.t('kisshome-defender_Number of packets')}</TableCell>
                    <Tooltip title={scoreTooltip}>
                        <TableCell style={{ fontWeight: 'bold', width: 100 }}>
                            {I18n.t('kisshome-defender_Anomaly Score')}*
                        </TableCell>
                    </Tooltip>
                    <TableCell>{I18n.t('kisshome-defender_Status')}</TableCell>
                </TableHead>
                <TableBody>
                    {macs.map(
                        (mac: MACAddress): React.JSX.Element => (
                            <TableRow key={mac}>
                                <TableCell>
                                    {devices[mac].name ? (
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{devices[mac].name}</div>
                                            <div
                                                style={{
                                                    fontSize: 'smaller',
                                                    opacity: 0.8,
                                                    fontStyle: 'italic',
                                                }}
                                            >
                                                {mac}
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ fontWeight: 'bold' }}>{mac}</div>
                                    )}
                                </TableCell>
                                <TableCell style={{ textAlign: 'center' }}>
                                    {devices[mac].statistics?.data_volume
                                        ? devices[mac].statistics.data_volume.packet_count
                                        : '--'}
                                </TableCell>
                                <TableCell
                                    style={{
                                        backgroundColor: devices[mac].type ? 'red' : 'green',
                                        color: 'white',
                                    }}
                                >
                                    {this.props.group === 'A' || this.props.secondPeriod
                                        ? !devices[mac].type
                                            ? I18n.t('kisshome-defender_No anomaly')
                                            : I18n.t('kisshome-defender_Anomaly')
                                        : `${devices[mac].score}/100`}
                                </TableCell>
                                <TableCell
                                    style={{
                                        color: devices[mac].type ? 'red' : undefined,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-start',
                                        gap: 10,
                                        minHeight: 50,
                                    }}
                                >
                                    <StatusIcon
                                        ok={!devices[mac].type}
                                        warning
                                    />{' '}
                                    {devices[mac].description.length
                                        ? devices[mac].description.join(', ')
                                        : I18n.t('kisshome-defender_Ok')}
                                </TableCell>
                            </TableRow>
                        ),
                    )}
                </TableBody>
            </Table>
        );
    }

    renderOneDetectionDetailsList(
        devices: {
            [mac: MACAddress]: {
                type: '' | 'Warning' | 'Alert';
                description: string[];
                score: number;
                name?: string;
                statistics?: DeviceStatistics;
            };
        },
        scoreTooltip: React.JSX.Element,
        macs: MACAddress[],
    ): React.JSX.Element {
        return (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <Menu
                    open={!!this.state.showTooltip}
                    anchorEl={this.state.showTooltip}
                    onClose={() => this.setState({ showTooltip: null })}
                >
                    <div style={{ padding: 10, maxWidth: 400 }}>{scoreTooltip}</div>
                </Menu>
                {macs.map(
                    (mac: MACAddress): React.JSX.Element => (
                        <div
                            key={mac}
                            style={{
                                border: '1px solid #888',
                                padding: 5,
                                backgroundColor: devices[mac].type ? 'rgba(255,0,0,0.1)' : 'rgba(0,255,0,0.1)',
                            }}
                        >
                            <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                                <div>{I18n.t('kisshome-defender_Device')}:</div>
                                {devices[mac].name ? (
                                    <div>
                                        <div style={{ fontWeight: 'bold' }}>{devices[mac].name}</div>
                                        <div
                                            style={{
                                                fontSize: 'smaller',
                                                opacity: 0.8,
                                                fontStyle: 'italic',
                                            }}
                                        >
                                            {mac}
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ fontWeight: 'bold' }}>{mac}</div>
                                )}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                                <div>{I18n.t('kisshome-defender_Number of packets')}:</div>
                                <div>
                                    {devices[mac].statistics?.data_volume
                                        ? devices[mac].statistics.data_volume.packet_count
                                        : '--'}
                                </div>
                            </div>
                            <div
                                style={{
                                    color: 'white',
                                    display: 'flex',
                                    flexDirection: 'row',
                                    gap: 8,
                                }}
                            >
                                <div
                                    style={{ fontWeight: 'bold' }}
                                    onClick={e => this.setState({ showTooltip: e.currentTarget })}
                                >
                                    {I18n.t('kisshome-defender_Score')}:
                                </div>
                                <div>
                                    {this.props.group === 'A' || this.props.secondPeriod
                                        ? !devices[mac].type
                                            ? I18n.t('kisshome-defender_No anomaly')
                                            : I18n.t('kisshome-defender_Anomaly')
                                        : `${devices[mac].score}/100`}
                                </div>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'flex-start',
                                    minHeight: 50,
                                    flexDirection: 'row',
                                    gap: 8,
                                }}
                            >
                                <div>{I18n.t('kisshome-defender_Status')}:</div>
                                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                                    <StatusIcon
                                        size={16}
                                        ok={!devices[mac].type}
                                        warning
                                    />{' '}
                                    {devices[mac].description.length
                                        ? devices[mac].description.join(', ')
                                        : I18n.t('kisshome-defender_Ok')}
                                </div>
                            </div>
                        </div>
                    ),
                )}
            </div>
        );
    }

    renderOneDetectionDetails(item: StoredAnalysisResult): React.JSX.Element {
        let text: string | React.JSX.Element[];
        let title: string;
        if (!item.isAlert) {
            text = I18n.t(
                'kisshome-defender_Your smart devices were checked on %s at %s. No unusual activities were detected.',
                new Date(item.time).toLocaleDateString(),
                new Date(item.time).toLocaleTimeString(),
            );

            title = I18n.t('kisshome-defender_Everything is OK!');
        } else {
            title = I18n.t('kisshome-defender_Unusual activity detected!');
            text = I18n.t(
                'kisshome-defender_Your smart devices were checked on %s at %s. Unusual activity was detected on at least one device.',
                new Date(item.time).toLocaleDateString(),
                new Date(item.time).toLocaleTimeString(),
            );
        }

        if (this.props.secondPeriod) {
            const seconds = Math.round(item.statistics.analysisDurationMs / 1000);
            text += ' ';
            text += I18n.t('kisshome-defender_The control time was %s minutes.', DetectionsTab.secondsToHms(seconds));
            // Add scan details for today
            // Scan-Details (heute): {Hier die echten Kontrollzeiten zur Berechnung verwenden}
            // - Durchschnittliche Kontrollzeit: 1:20 Minuten
            // - Minimale Kontrollzeit: 1:10 Minuten
            // - Maximale Kontrollzeit: 5:39 Minuten
            // - Dauer der Kontrollen: 42:20 Minuten
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todaysDetections = this.props.results?.results.filter(
                d => new Date(d.time).getTime() >= today.getTime(),
            );
            if (todaysDetections?.length) {
                const durations = todaysDetections.map(d => d.statistics.analysisDurationMs / 1000);
                const totalDuration = durations.reduce((a, b) => a + b, 0);
                const avgDuration = totalDuration / durations.length;
                const minDuration = Math.min(...durations);
                const maxDuration = Math.max(...durations);
                text = [
                    <div key="main">{text}</div>,
                    <br key="br" />,
                    <div
                        key="details"
                        style={{ fontWeight: 'bold' }}
                    >
                        {I18n.t('kisshome-defender_Scan details (today)')}:
                    </div>,
                    <div key="details_avg">
                        <span style={{ fontWeight: 'bold' }}>
                            - {I18n.t('kisshome-defender_Average control time')}:
                        </span>{' '}
                        <span>{DetectionsTab.secondsToHms(avgDuration)}</span>
                        <span> {I18n.t('kisshome-defender_minutes')}</span>
                    </div>,
                    <div key="details_min">
                        <span style={{ fontWeight: 'bold' }}>
                            - {I18n.t('kisshome-defender_Minimal control time')}:
                        </span>{' '}
                        <span>{DetectionsTab.secondsToHms(minDuration)}</span>
                        <span> {I18n.t('kisshome-defender_minutes')}</span>
                    </div>,
                    <div key="details_max">
                        <span style={{ fontWeight: 'bold' }}>
                            - {I18n.t('kisshome-defender_Maximal control time')}:
                        </span>{' '}
                        <span>{DetectionsTab.secondsToHms(maxDuration)}</span>
                        <span> {I18n.t('kisshome-defender_minutes')}</span>
                    </div>,
                    <div key="details_total">
                        <span style={{ fontWeight: 'bold' }}>
                            - {I18n.t('kisshome-defender_Duration of controls')}:
                        </span>{' '}
                        <span>{DetectionsTab.secondsToHms(totalDuration)}</span>
                        <span> {I18n.t('kisshome-defender_minutes')}</span>
                    </div>,
                ];
            }
        }

        const scoreTooltip = (
            <div style={{ fontSize: '1rem' }}>
                <b>*{I18n.t('kisshome-defender_Anomaly Score')}</b>: {I18n.t('kisshome-defender_tooltip_score_1')}
                <br />
                <br />
                {I18n.t('kisshome-defender_tooltip_score_2')}
                <br />
                <br />
                {I18n.t('kisshome-defender_tooltip_score_3')}
            </div>
        );
        // Create for every device the combined status
        const devices: {
            [mac: MACAddress]: {
                type: '' | 'Warning' | 'Alert';
                description: string[];
                score: number;
                name?: string;
                statistics?: DeviceStatistics;
            };
        } = {};

        item.detections?.forEach(detection => {
            const mac: MACAddress = detection.mac.toLowerCase();
            const desc = this.props.results?.names?.[mac];
            if (detection.ml || detection.suricata.length) {
                devices[mac] ||= { score: 0, type: '', description: [], name: desc ? desc.desc || desc.ip || '' : '' };
                if (detection.ml) {
                    devices[mac].score = Math.max(devices[mac].score, detection.ml.score);
                    devices[mac].type = detection.ml.type === 'Alert' || detection.ml.type === 'Warning' ? 'Alert' : '';
                    if (detection.ml.description && devices[mac].type) {
                        devices[mac].description.push(detection.ml.description);
                    }
                }
                if (detection.suricata.length) {
                    detection.suricata.forEach(sr => {
                        devices[mac].score = Math.max(devices[mac].score, sr.score);
                        devices[mac].type = sr.type === 'Alert' || sr.type === 'Warning' ? 'Alert' : devices[mac].type;
                        if ((sr.description && sr.type === 'Alert') || sr.type === 'Warning') {
                            devices[mac].description.push(sr.description);
                        }
                    });
                }
            } else {
                devices[mac] ||= { score: 0, type: '', description: [], name: desc ? desc.desc || desc.ip || '' : '' };
            }
            // Find for this device the statistics
            devices[mac].statistics = item.statistics.devices.find(device => device.mac.toLowerCase() === mac);
        });

        const macs: MACAddress[] = Object.keys(devices).sort((a: string, b) => {
            let scoreA = devices[a].score || 0;
            let scoreB = devices[b].score || 0;
            if (this.props.group === 'A' || this.props.secondPeriod) {
                // In group A, only separate between no anomaly (0) and anomaly (1)
                scoreA = scoreA >= 10 ? 1 : 0;
                scoreB = scoreB >= 10 ? 1 : 0;
            }

            // first by score, then by name, then by mac
            if (scoreA && scoreB && scoreA !== scoreB) {
                return scoreB - scoreA;
            }
            if (scoreA && !scoreB) {
                return -1;
            }
            if (!scoreA && scoreB) {
                return 1;
            }

            if (devices[a].name && devices[b].name && devices[a].name !== devices[b].name) {
                return (devices[a].name || '').localeCompare(devices[b].name || '');
            }
            if (devices[a].name && !devices[b].name) {
                return -1;
            }
            if (!devices[a].name && devices[b].name) {
                return 1;
            }
            return a.localeCompare(b);
        });

        return (
            <AccordionDetails>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 'bold',
                        gap: 16,
                        fontSize: this.props.isMobile ? '1rem' : '1.8rem',
                        marginBottom: 16,
                        justifyContent: 'flex-start',
                    }}
                >
                    <StatusIcon
                        ok={!item.isAlert}
                        warning
                        size={48}
                    />
                    {title}
                </div>
                <div style={{ fontSize: this.props.isMobile ? '0.9rem' : '1.5rem', fontStyle: 'italic' }}>{text}</div>
                {this.props.isMobile
                    ? this.renderOneDetectionDetailsList(devices, scoreTooltip, macs)
                    : this.renderOneDetectionDetailsTable(devices, scoreTooltip, macs)}
            </AccordionDetails>
        );
    }

    renderOneDetection(item: StoredAnalysisResult): React.JSX.Element {
        return (
            <Accordion
                id={item.uuid}
                key={item.uuid}
                sx={{
                    '& .MuiButtonBase-root': {
                        backgroundColor: this.props.themeType === 'dark' ? '#505050' : '#f5f5f5',
                        padding: this.props.isMobile ? '0px 6px' : undefined,
                    },
                }}
                onChange={(e, expanded) => {
                    if (expanded) {
                        this.setState({ openedItem: item.uuid });
                        this.props.reportUxEvent({
                            id: 'kisshome-defender-detection',
                            event: 'show',
                            ts: Date.now(),
                            data: item.uuid,
                            isTouchEvent: isTouch(e),
                        });
                    } else if (this.state.openedItem === item.uuid) {
                        this.setState({ openedItem: '' });
                        this.props.reportUxEvent({
                            id: 'kisshome-defender-detection',
                            event: 'hide',
                            ts: Date.now(),
                            data: item.uuid,
                            isTouchEvent: isTouch(e),
                        });
                    }
                }}
                expanded={this.state.openedItem === item.uuid}
            >
                <AccordionSummary expandIcon={<ExpandMore />}>
                    {item.todayReport ? (
                        <Info
                            style={{
                                marginRight: 8,
                                width: this.props.isMobile ? 24 : 28,
                                height: this.props.isMobile ? 24 : 28,
                            }}
                        />
                    ) : (
                        <StatusIcon
                            ok={!item.isAlert}
                            warning
                            size={this.props.isMobile ? 24 : 28}
                            style={{ marginRight: 8 }}
                        />
                    )}
                    <Typography
                        component="span"
                        style={{ fontSize: this.props.isMobile ? '0.9rem' : undefined }}
                    >
                        {item.todayReport
                            ? I18n.t('kisshome-defender_Status report at %s', new Date(item.time).toLocaleString())
                            : I18n.t('kisshome-defender_Test result at %s', new Date(item.time).toLocaleString())}
                    </Typography>
                    <div style={{ display: 'none' }}>{item.uuid}</div>
                </AccordionSummary>
                {this.state.openedItem === item.uuid
                    ? item.todayReport
                        ? this.renderStatusReport(item)
                        : this.renderOneDetectionDetails(item)
                    : null}
            </Accordion>
        );
    }

    renderDetectionsDialog(
        results: StoredAnalysisResult[],
        onlyWarningsAndAlerts: StoredAnalysisResult[],
    ): React.JSX.Element | null {
        if (this.state.showOnlyAlarmsAndWarnings) {
            results = onlyWarningsAndAlerts;
        }
        if (!this.state.detailed) {
            return null;
        }

        results = [...results];

        results.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        const onClose = (e: any): void => {
            this.props.reportUxEvent({
                id: 'kisshome-defender-detections-close',
                event: 'click',
                ts: Date.now(),
                isTouchEvent: isTouch(e),
            });
            // Set all known detections as known
            const firstAlert = results?.find(item => item.isAlert);
            if (firstAlert) {
                void this.props.socket.setState(
                    `kisshome-defender.${this.props.instance || 0}.info.analysis.lastSeen`,
                    firstAlert.uuid,
                    true,
                );
            }

            this.setState({ detailed: false }, () => this.props.onResultsDialogOpen(false));
        };

        return (
            <Dialog
                open={!0}
                onClose={e => onClose(e)}
                maxWidth="lg"
                fullWidth
                fullScreen={this.props.isMobile}
            >
                <DialogTitle>{I18n.t('kisshome-defender_Results')}</DialogTitle>
                <DialogContent>
                    {results ? (
                        results.map(item => this.renderOneDetection(item))
                    ) : (
                        <p>{I18n.t('kisshome-defender_No results available')}</p>
                    )}
                </DialogContent>
                <DialogActions>
                    {onlyWarningsAndAlerts?.length ? (
                        <FormControlLabel
                            label={I18n.t('kisshome-defender_Show only alarms and warnings')}
                            checked={this.state.showOnlyAlarmsAndWarnings}
                            sx={{
                                '& .MuiTypography-root': { fontSize: this.props.isMobile ? '1rem' : '1.3rem' },
                            }}
                            control={
                                <Checkbox
                                    onClick={e => {
                                        this.props.reportUxEvent({
                                            id: 'kisshome-defender-detections-only-alarms',
                                            event: 'change',
                                            ts: Date.now(),
                                            data: this.state.showOnlyAlarmsAndWarnings ? 'false' : 'true',
                                            isTouchEvent: isTouch(e),
                                        });
                                        window.localStorage.setItem(
                                            'kisshome-defender-alarms',
                                            this.state.showOnlyAlarmsAndWarnings ? 'false' : 'true',
                                        );
                                        this.setState({
                                            showOnlyAlarmsAndWarnings: !this.state.showOnlyAlarmsAndWarnings,
                                        });
                                    }}
                                />
                            }
                        />
                    ) : null}
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={onClose}
                        startIcon={this.props.isMobile ? null : <Close />}
                    >
                        {this.props.isMobile ? <Close /> : I18n.t('kisshome-defender_Close')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    render(): React.JSX.Element {
        if (!this.props.alive) {
            return (
                <div
                    style={{
                        width: 'calc(100% - 32px)',
                        height: 'calc(100% - 32px)',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: 16,
                    }}
                >
                    <p>{I18n.t('kisshome-defender_Instance is not running')}</p>
                </div>
            );
        }

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

        return (
            <div
                style={{
                    width: `calc(100% - ${this.props.isMobile ? 10 : 20}px)`,
                    height: `calc(100% - ${this.props.isMobile ? 10 : 20}px)`,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: this.props.isMobile ? 5 : 10,
                    gap: this.props.isMobile ? 5 : 10,
                }}
            >
                {this.renderDetectionsDialog(results, onlyWarningsAndAlerts)}
                <Paper
                    style={{
                        flexGrow: 1,
                        padding: 10,
                        border: `2px solid ${this.props.themeType === 'dark' ? 'white' : 'black'}`,
                        borderRadius: 0,
                        backgroundColor: this.props.themeType === 'dark' ? undefined : '#E6E6E6',
                        boxShadow: 'none',
                    }}
                >
                    {this.renderLastDetection()}
                </Paper>
                <Paper
                    style={{
                        height: this.props.isMobile ? 60 : 80,
                        padding: this.props.isMobile ? '8px 8px 8px 8px' : '10px 40px 10px 10px',
                        cursor: results?.length ? 'pointer' : undefined,
                        border: `2px solid ${this.props.themeType === 'dark' ? 'white' : 'black'}`,
                        borderRadius: 0,
                        backgroundColor: this.props.themeType === 'dark' ? undefined : '#E6E6E6',
                        boxShadow: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: this.props.isMobile ? '1rem' : '1.3rem',
                        gap: 10,
                    }}
                >
                    {this.props.isMobile ? (
                        <Fab
                            style={{
                                width: 36,
                                height: 36,
                                minWidth: 36,
                            }}
                            color="primary"
                            onClick={e => {
                                this.props.reportUxEvent({
                                    id: 'kisshome-defender-detections-show-results',
                                    event: 'click',
                                    ts: Date.now(),
                                    isTouchEvent: isTouch(e),
                                });
                                this.setState({ detailed: true }, () => this.props.onResultsDialogOpen(true));
                            }}
                        >
                            <Notifications />
                        </Fab>
                    ) : (
                        <Button
                            variant="contained"
                            color="primary"
                            disabled={!results?.length}
                            onClick={e => {
                                this.props.reportUxEvent({
                                    id: 'kisshome-defender-detections-show-results',
                                    event: 'click',
                                    ts: Date.now(),
                                    isTouchEvent: isTouch(e),
                                });
                                this.setState({ detailed: true }, () => this.props.onResultsDialogOpen(true));
                            }}
                        >
                            {I18n.t('kisshome-defender_Show results')}
                        </Button>
                    )}
                    {unseenWarningsCount
                        ? `${I18n.t('kisshome-defender_New problem detected')}: ${unseenWarningsCount}`
                        : I18n.t('kisshome-defender_Everything OK')}
                    <StatusIcon
                        ok={!unseenWarningsCount}
                        warning
                        size={this.props.isMobile ? 32 : 52}
                    />
                </Paper>
            </div>
        );
    }
}
