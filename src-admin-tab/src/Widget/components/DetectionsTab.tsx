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
} from '@mui/material';
import { I18n, type LegacyConnection, type ThemeType } from '@iobroker/adapter-react-v5';
import { Close, ExpandMore, ErrorOutline as Warning, Warning as Alarm, Info } from '@mui/icons-material';

import type { ReportUxHandler, StoredAnalysisResult, StoredStatisticsResult } from '../types';

import { bytes2string } from './utils';
import { StatusIcon } from './StatusTab';
import type { DetectionsForDeviceWithUUID } from '../../../../src/types';
// const CHANGE_TIME = '2025-10-16T00:00:00Z'; // Calculation time

const styles: Record<string, React.CSSProperties> = {
    title: {
        fontSize: '1.2em',
        fontWeight: 'bold',
        marginBottom: 8,
        display: 'inline-block',
        minWidth: 250,
    },
    value: {
        fontSize: '1em',
        marginBottom: 16,
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
}

interface DetectionsTabState {
    detailed: boolean;
    showOnlyAlarmsAndWarnings: boolean;
    lastRequest: number;
    requestRunning: boolean;
    results: StoredStatisticsResult | null;
    alive: boolean;
    openedItem: string;
    recordingRunning: boolean;
    recordingCaptured: number;
    recordingNextWrite: number;
    detectionRunning: boolean;
    showDetectionWithUUID: string;
}

export default class DetectionsTab extends Component<DetectionsTabProps, DetectionsTabState> {
    private updateTimeout: ReturnType<typeof setTimeout> | null = null;
    private showTimeout: ReturnType<typeof setTimeout> | null = null;
    private lastAnalysis: string | null = null;

    constructor(props: DetectionsTabProps) {
        super(props);
        this.state = {
            detailed: false,
            lastRequest: 0,
            requestRunning: false,
            showOnlyAlarmsAndWarnings: false,
            results: null,
            alive: props.alive,
            openedItem: this.props.showDetectionWithUUID || '',
            recordingCaptured: 0,
            recordingRunning: false,
            recordingNextWrite: 0,
            detectionRunning: false,
            showDetectionWithUUID: this.props.showDetectionWithUUID || '',
        };
    }

    async componentDidMount(): Promise<void> {
        const recordingRunningId = `kisshome-defender.${this.props.instance}.info.recording.running`;
        const recordingCapturedId = `kisshome-defender.${this.props.instance}.info.recording.capturedFull`;
        const recordingNextWriteId = `kisshome-defender.${this.props.instance}.info.recording.nextWrite`;
        const detectionRunningId = `kisshome-defender.${this.props.instance}.info.detections.running`;
        const lastAnalysisId = `kisshome-defender.${this.props.instance}.info.detections.lastAnalysis`;

        const recordingRunning = await this.props.socket.getState(recordingRunningId);
        const recordingCaptured = await this.props.socket.getState(recordingCapturedId);
        const recordingNextWrite = await this.props.socket.getState(recordingNextWriteId);
        const detectionRunning = await this.props.socket.getState(detectionRunningId);
        const lastAnalysis = await this.props.socket.getState(lastAnalysisId);

        this.onRecordingRunningChanged(recordingRunningId, recordingRunning);
        this.onRecordingCapturedChanged(recordingCapturedId, recordingCaptured);
        this.onRecordingNextTimeChanged(recordingNextWriteId, recordingNextWrite);
        this.onDetectionRunningChanged(detectionRunningId, detectionRunning);
        await this.onLastAnalysisChanged(lastAnalysisId, lastAnalysis);

        await this.props.socket.subscribeState(recordingRunningId, this.onRecordingRunningChanged);
        await this.props.socket.subscribeState(recordingCapturedId, this.onRecordingCapturedChanged);
        await this.props.socket.subscribeState(recordingNextWriteId, this.onRecordingNextTimeChanged);
        await this.props.socket.subscribeState(detectionRunningId, this.onDetectionRunningChanged);
        await this.props.socket.subscribeState(lastAnalysisId, this.onLastAnalysisChanged);

        if (this.state.showDetectionWithUUID) {
            this.setState({ openedItem: this.state.showDetectionWithUUID, detailed: true }, () => {
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

    onLastAnalysisChanged = async (_id: string, state: ioBroker.State | null | undefined): Promise<void> => {
        if (state?.val !== this.lastAnalysis) {
            this.lastAnalysis = state?.val as string;
            try {
                await this.requestData();
            } catch (e) {
                console.error(`Error in DetectionsTab: ${e}`);
            }
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
            `kisshome-defender.${this.props.instance}.info.detections.running`,
            this.onRecordingCapturedChanged,
        );
        this.props.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance}.info.detections.lastAnalysis`,
            this.onLastAnalysisChanged,
        );
    }

    setStateAsync(state: Partial<DetectionsTabState>): Promise<void> {
        return new Promise(resolve => {
            this.setState(state as unknown as DetectionsTabState, resolve);
        });
    }

    async requestData(): Promise<void> {
        if (!this.state.lastRequest && Date.now() - this.state.lastRequest > 30_000) {
            if (this.state.alive) {
                await this.setStateAsync({ requestRunning: true });
                const result = await this.props.socket.sendTo(`kisshome-defender.${this.props.instance}`, 'getData', {
                    type: 'allStatistics',
                });
                if (result) {
                    this.setState({
                        requestRunning: false,
                        lastRequest: Date.now(),
                        results: result as StoredStatisticsResult,
                    });
                } else {
                    this.setState({ requestRunning: false });
                }
            }
        }

        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }
        if (this.state.alive) {
            this.updateTimeout = setTimeout(() => {
                this.updateTimeout = null;
                void this.requestData();
            }, 60_000);
        }
    }

    renderLastDetection(): React.JSX.Element {
        const item = this.state.results?.results?.[0];
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
                    <div style={styles.title}>{I18n.t('kisshome-defender_Last control')}:</div>
                    <div style={styles.value}>{new Date(item.time).toLocaleString()}</div>
                </div>
                {this.state.recordingRunning ? (
                    <div style={styles.row}>
                        <div style={styles.title}>{I18n.t('kisshome-defender_Next control')}:</div>
                        <div style={styles.value}>{`${nextControlText} (${reachedText})`}</div>
                    </div>
                ) : null}
                {this.state.recordingRunning ? (
                    <div
                        style={{
                            paddingTop: 30,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 10,
                            justifyContent: 'space-between',
                        }}
                    >
                        <Button
                            style={{ maxWidth: 300, whiteSpace: 'nowrap' }}
                            disabled={this.state.detectionRunning}
                            variant="contained"
                            color="grey"
                            onClick={async e => {
                                this.props.reportUxEvent({
                                    id: 'kisshome-defender-detections-trigger-detection',
                                    event: 'click',
                                    ts: Date.now(),
                                    isTouchEvent: e instanceof TouchEvent,
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
                        <div style={{ maxWidth: 150, flexGrow: 1 }}>
                            {this.state.detectionRunning ? <LinearProgress /> : null}
                        </div>
                    </div>
                ) : null}
            </div>
        );
    }

    renderOneDetectionDetails(item: StoredAnalysisResult, worstType: '' | 'Warning' | 'Alert'): React.JSX.Element {
        // const backgroundColor1 = this.props.themeType === 'dark' ? '#303030' : '#eee';
        // const backgroundColor2 = this.props.themeType === 'dark' ? '#404040' : '#f0f0f0';

        let text: string;
        let title: string;
        if (!worstType) {
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

        return (
            <AccordionDetails>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        fontWeight: 'bold',
                        gap: 16,
                        fontSize: '1.8rem',
                        marginBottom: 16,
                        justifyContent: 'flex-start',
                    }}
                >
                    <StatusIcon
                        ok={!worstType}
                        warning
                        size={48}
                    />
                    {title}
                </div>
                <div style={{ fontSize: '1.5rem', fontStyle: 'italic' }}>{text}</div>
                <Table size="small">
                    <TableHead>
                        <TableCell>{I18n.t('kisshome-defender_Device')}</TableCell>
                        <TableCell>{I18n.t('kisshome-defender_Number of packets')}</TableCell>
                        <Tooltip title={scoreTooltip}>
                            <TableCell style={{ fontWeight: 'bold' }}>
                                {I18n.t('kisshome-defender_Anomaly Score')}*
                            </TableCell>
                        </Tooltip>
                        <TableCell style={{ fontWeight: 'bold' }}>{I18n.t('kisshome-defender_Status')}</TableCell>
                    </TableHead>
                    <TableBody>
                        {item.detections.map((detection, index) => {
                            const desc = this.state.results?.names?.[detection.mac.toLowerCase()];
                            const name = desc ? desc.desc || desc.ip || '' : '';
                            const result: React.JSX.Element[] = [];
                            // Find for this device the statistics
                            const statistics = item.statistics.devices.find(
                                device => device.mac.toLowerCase() === detection.mac.toLowerCase(),
                            );
                            if (detection.ml) {
                                result.push(
                                    <TableRow key={`${index}-ml`}>
                                        <TableCell>
                                            {name ? (
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>{name}</div>
                                                    <div
                                                        style={{
                                                            fontSize: 'smaller',
                                                            opacity: 0.8,
                                                            fontStyle: 'italic',
                                                        }}
                                                    >
                                                        {detection.mac}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ fontWeight: 'bold' }}>{detection.mac}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {statistics?.data_volume ? statistics.data_volume.packet_count : '--'}
                                        </TableCell>
                                        <TableCell
                                            style={{
                                                backgroundColor: detection.ml.score > 10 ? 'red' : undefined,
                                                color: detection.ml.score > 10 ? 'white' : undefined,
                                            }}
                                        >
                                            {this.props.group === 'A'
                                                ? detection.ml.score <= 10
                                                    ? I18n.t('kisshome-defender_No anomaly')
                                                    : I18n.t('kisshome-defender_Anomaly')
                                                : `${detection.ml.score}/100`}
                                        </TableCell>
                                        <TableCell
                                            style={{
                                                color: detection.ml.score > 10 ? 'red' : undefined,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-start',
                                                gap: 10,
                                                minHeight: 50,
                                            }}
                                        >
                                            <StatusIcon
                                                ok={detection.ml.score <= 10}
                                                warning
                                            />{' '}
                                            {detection.ml.description || I18n.t('kisshome-defender_Unusual activity')}
                                        </TableCell>
                                    </TableRow>,
                                );
                            }
                            detection.suricata.forEach((sr, idx) => {
                                result.push(
                                    <TableRow key={`${index}-${idx}`}>
                                        <TableCell>
                                            {name ? (
                                                <div>
                                                    <div style={{ fontWeight: 'bold' }}>{name}</div>
                                                    <div
                                                        style={{
                                                            fontSize: 'smaller',
                                                            opacity: 0.8,
                                                            fontStyle: 'italic',
                                                        }}
                                                    >
                                                        {detection.mac}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div style={{ fontWeight: 'bold' }}>{detection.mac}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {statistics?.data_volume ? statistics.data_volume.packet_count : '--'}
                                        </TableCell>
                                        <TableCell
                                            style={{
                                                backgroundColor: sr.score > 10 ? 'red' : undefined,
                                                color: sr.score > 10 ? 'white' : undefined,
                                            }}
                                        >
                                            {this.props.group === 'A'
                                                ? sr.score <= 10
                                                    ? I18n.t('kisshome-defender_No anomaly')
                                                    : I18n.t('kisshome-defender_Anomaly')
                                                : `${sr.score}/100`}
                                        </TableCell>
                                        <TableCell
                                            style={{
                                                color: sr.score > 10 ? 'red' : undefined,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-start',
                                                gap: 10,
                                                minHeight: 50,
                                            }}
                                        >
                                            <StatusIcon
                                                ok={sr.score <= 10}
                                                warning
                                            />{' '}
                                            {sr.description}
                                        </TableCell>
                                    </TableRow>,
                                );
                            });
                            return result;
                        })}
                    </TableBody>
                </Table>
            </AccordionDetails>
        );
    }

    renderOneDetection(item: StoredAnalysisResult): React.JSX.Element {
        const detections = item.detections || [];
        const worstDetection = detections?.reduce(
            (worst, current) => {
                if (!worst || (current.worstType === 'Alert' && worst.worstType !== 'Alert')) {
                    return current;
                }
                if (current.worstType === 'Warning' && worst.worstType !== 'Alert') {
                    return current;
                }
                if (!current.worstType && worst.worstType !== 'Alert' && worst.worstType !== 'Warning') {
                    return current;
                }
                return worst;
            },
            null as DetectionsForDeviceWithUUID | null,
        );

        return (
            <Accordion
                id={item.uuid}
                key={item.uuid}
                sx={{
                    '& .MuiButtonBase-root': {
                        backgroundColor: this.props.themeType === 'dark' ? '#505050' : '#f5f5f5',
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
                            isTouchEvent: e instanceof TouchEvent,
                        });
                    } else if (this.state.openedItem === item.uuid) {
                        this.setState({ openedItem: '' });
                        this.props.reportUxEvent({
                            id: 'kisshome-defender-detection',
                            event: 'hide',
                            ts: Date.now(),
                            data: item.uuid,
                            isTouchEvent: e instanceof TouchEvent,
                        });
                    }
                }}
                expanded={this.state.openedItem === item.uuid}
            >
                <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography component="span">
                        {I18n.t('kisshome-defender_Test result at %s', new Date(item.time).toLocaleString())}
                    </Typography>
                    {worstDetection?.worstType === 'Warning' ? (
                        <Warning style={{ marginLeft: 8, color: 'orange' }} />
                    ) : worstDetection?.worstType === 'Alert' ? (
                        <Alarm style={{ marginLeft: 8, color: 'red' }} />
                    ) : !worstDetection?.worstType ? (
                        <Info style={{ marginLeft: 8 }} />
                    ) : null}
                </AccordionSummary>
                {this.state.openedItem === item.uuid
                    ? this.renderOneDetectionDetails(item, worstDetection.worstType)
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

        return (
            <Dialog
                open={!0}
                onClose={() => this.setState({ detailed: false })}
                maxWidth="lg"
                fullWidth
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
                            control={
                                <Checkbox
                                    onClick={e => {
                                        this.props.reportUxEvent({
                                            id: 'kisshome-defender-detections-only-alarms',
                                            event: 'change',
                                            ts: Date.now(),
                                            data: this.state.showOnlyAlarmsAndWarnings ? 'false' : 'true',
                                            isTouchEvent: e instanceof TouchEvent,
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
                        onClick={e => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-detections-close',
                                event: 'click',
                                ts: Date.now(),
                                isTouchEvent: e instanceof TouchEvent,
                            });
                            this.setState({ detailed: false });
                        }}
                        startIcon={<Close />}
                    >
                        {I18n.t('kisshome-defender_Close')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    render(): React.JSX.Element {
        if (this.state.alive !== this.props.alive) {
            setTimeout(() => {
                this.setState({ alive: this.props.alive, lastRequest: 0 }, () => {
                    void this.requestData();
                });
            }, 50);
        }

        if (!this.state.alive) {
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

        const results = this.state.results?.results || [];
        const onlyWarningsAndAlerts =
            this.state.results?.results?.filter(item =>
                // If any detection has a worstType of Alert or Warning
                item.detections.find(detection => detection.worstType === 'Alert' || detection.worstType === 'Warning'),
            ) || [];
        return (
            <div
                style={{
                    width: 'calc(100% - 20px)',
                    height: 'calc(100% - 20px)',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: 10,
                    gap: 20,
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
                        height: 80,
                        padding: '10px 40px 10px 10px',
                        cursor: results?.length ? 'pointer' : undefined,
                        border: `2px solid ${this.props.themeType === 'dark' ? 'white' : 'black'}`,
                        borderRadius: 0,
                        backgroundColor: this.props.themeType === 'dark' ? undefined : '#E6E6E6',
                        boxShadow: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        fontSize: '1.3rem',
                    }}
                >
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={!results?.length}
                        onClick={e => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-detections-show-results',
                                event: 'click',
                                ts: Date.now(),
                                isTouchEvent: e instanceof TouchEvent,
                            });
                            this.setState({ detailed: true });
                        }}
                    >
                        {I18n.t('kisshome-defender_Show results')}
                    </Button>
                    {onlyWarningsAndAlerts?.length
                        ? `${I18n.t('kisshome-defender_Unusual activities detected')}: ${onlyWarningsAndAlerts?.length}`
                        : I18n.t('kisshome-defender_Everything OK')}
                    <StatusIcon
                        ok={!onlyWarningsAndAlerts?.length}
                        warning
                        size={52}
                    />
                </Paper>
            </div>
        );
    }
}
