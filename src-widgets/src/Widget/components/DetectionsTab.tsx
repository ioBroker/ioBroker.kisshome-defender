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
    Typography,
} from '@mui/material';
import { I18n, type LegacyConnection, type ThemeType } from '@iobroker/adapter-react-v5';
import { Close, ExpandMore, ErrorOutline as Warning, Warning as Alarm, Info } from '@mui/icons-material';

import type { ReportUxHandler, StatisticsResult, StoredStatisticsResult, DetectionWithUUID } from '../types';

import { bytes2string, time2string } from './utils';
import { StatusIcon } from './StatusTab';

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
    detections?: DetectionWithUUID[] | null;
    lastSeenID: string;
    reportUxEvent: ReportUxHandler;
    alive: boolean;
    themeType: ThemeType;
    socket: LegacyConnection;
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
}

export default class DetectionsTab extends Component<DetectionsTabProps, DetectionsTabState> {
    private updateTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(props: DetectionsTabProps) {
        super(props);
        this.state = {
            detailed: false,
            lastRequest: 0,
            requestRunning: false,
            showOnlyAlarmsAndWarnings: false,
            results: null,
            alive: props.alive,
            openedItem: '',
            recordingCaptured: 0,
            recordingRunning: false,
            recordingNextWrite: 0,
            detectionRunning: false,
        };
    }

    async componentDidMount(): Promise<void> {
        const recordingRunningId = `kisshome-defender.${this.props.instance}.info.recording.running`;
        const recordingCapturedId = `kisshome-defender.${this.props.instance}.info.recording.capturedFull`;
        const recordingNextWriteId = `kisshome-defender.${this.props.instance}.info.recording.recordingNextWrite`;
        const detectionRunningId = `kisshome-defender.${this.props.instance}.info.detections.running`;

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

        try {
            await this.requestData();
        } catch (e) {
            console.error(`Error in DetectionsTab: ${e}`);
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
            `kisshome-defender.${this.props.instance}.info.recording.recordingNextWrite`,
            this.onRecordingCapturedChanged,
        );
        this.props.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance}.info.detections.running`,
            this.onRecordingCapturedChanged,
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

        /*
        const detections = this.props.detections?.filter(d => d.scanUUID === item.uuid);
        const worstDetection = detections?.reduce(
            (worst, current) => {
                if (!worst || (current.type === 'Alert' && worst.type !== 'Alert')) {
                    return current;
                }
                if (current.type === 'Warning' && worst.type !== 'Alert') {
                    return current;
                }
                if (current.type === 'Info' && worst.type !== 'Alert' && worst.type !== 'Warning') {
                    return current;
                }
                return worst;
            },
            null as DetectionWithUUID | null,
        );
        */
        const nextControlText = I18n.t(
            'kisshome-defender_In %s minutes or when the maximal file size is reached',
            Math.floor(this.state.recordingNextWrite - Date.now() / 60_000),
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
                {/*<div style={styles.row}>
                    <div style={styles.title}>{I18n.t('kisshome-defender_Checked packets')}:</div>
                    <div style={styles.value}>{item.packets}</div>
                </div>
                <div style={styles.row}>
                    <div style={styles.title}>{I18n.t('kisshome-defender_Spent time')}:</div>
                    <div style={styles.value}>{time2string(item.analysisDurationMs)}</div>
                </div>
                <div style={styles.row}>
                    <div style={styles.title}>{I18n.t('kisshome-defender_Total bytes')}:</div>
                    <div style={styles.value}>{bytes2string(item.totalBytes)}</div>
                </div>
                <div style={styles.row}>
                    <div style={styles.title}>{I18n.t('kisshome-defender_Detected problems')}:</div>
                    <div style={styles.value}>
                        {detections?.length || 0}
                        {worstDetection?.type === 'Warning' ? (
                            <Warning style={{ marginLeft: 8, color: 'orange' }} />
                        ) : worstDetection?.type === 'Alert' ? (
                            <Alarm style={{ marginLeft: 8, color: 'red' }} />
                        ) : worstDetection?.type === 'Info' ? (
                            <Info style={{ marginLeft: 8 }} />
                        ) : null}
                    </div>
                </div>*/}
                {this.state.recordingRunning ? (
                    <div style={styles.row}>
                        <div style={styles.title}>{I18n.t('kisshome-defender_Next control')}:</div>
                        <div style={styles.value}>{`${nextControlText} ${reachedText}`}</div>
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
                            {I18n.t('Execute control now')}
                        </Button>
                        <div style={{ maxWidth: 150 }}>{this.state.detectionRunning ? <LinearProgress /> : null}</div>
                    </div>
                ) : null}
            </div>
        );
    }

    renderOneDetection(item: StatisticsResult): React.JSX.Element {
        const detections = this.props.detections?.filter(d => d.scanUUID === item.uuid);
        const worstDetection = detections?.reduce(
            (worst, current) => {
                if (!worst || (current.type === 'Alert' && worst.type !== 'Alert')) {
                    return current;
                }
                if (current.type === 'Warning' && worst.type !== 'Alert') {
                    return current;
                }
                if (current.type === 'Info' && worst.type !== 'Alert' && worst.type !== 'Warning') {
                    return current;
                }
                return worst;
            },
            null as DetectionWithUUID | null,
        );

        const backgroundColor1 = this.props.themeType === 'dark' ? '#303030' : '#eee';
        const backgroundColor2 = this.props.themeType === 'dark' ? '#404040' : '#f0f0f0';

        return (
            <Accordion
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
                    {worstDetection?.type === 'Warning' ? (
                        <Warning style={{ marginLeft: 8, color: 'orange' }} />
                    ) : worstDetection?.type === 'Alert' ? (
                        <Alarm style={{ marginLeft: 8, color: 'red' }} />
                    ) : worstDetection?.type === 'Info' ? (
                        <Info style={{ marginLeft: 8 }} />
                    ) : null}
                </AccordionSummary>
                <AccordionDetails>
                    <div style={styles.row}>
                        <div style={styles.title}>{I18n.t('kisshome-defender_Checked packets')}:</div>
                        <div style={styles.value}>{item.packets}</div>
                    </div>
                    <div style={styles.row}>
                        <div style={styles.title}>{I18n.t('kisshome-defender_Spent time')}:</div>
                        <div style={styles.value}>{time2string(item.analysisDurationMs)}</div>
                    </div>
                    <div style={styles.row}>
                        <div style={styles.title}>{I18n.t('kisshome-defender_Total bytes')}:</div>
                        <div style={styles.value}>{bytes2string(item.totalBytes)}</div>
                    </div>
                    <div style={styles.row}>
                        <div style={styles.title}>{I18n.t('kisshome-defender_Detected problems')}:</div>
                        <div style={styles.value}>{detections?.length || 0}</div>
                    </div>
                    {detections?.length ? (
                        <div style={{ marginLeft: 20 }}>
                            {detections.map((detection, index) => {
                                const desc = this.state.results?.names?.[detection.mac.toLowerCase()];

                                return (
                                    <div
                                        key={index}
                                        style={{
                                            backgroundColor: index % 2 === 0 ? backgroundColor1 : backgroundColor2,
                                            padding: 8,
                                            borderRadius: 4,
                                            marginBottom: 8,
                                        }}
                                    >
                                        <div
                                            style={styles.row}
                                            key={`${item.uuid}-${index}`}
                                        >
                                            <div style={{ ...styles.title, minWidth: 172 }}>
                                                {I18n.t('kisshome-defender_Detection %s', index + 1)}:
                                            </div>
                                            <div style={styles.value}>
                                                <div
                                                    style={{ display: 'flex', gap: 8 }}
                                                    title={
                                                        detection.type === 'Alert'
                                                            ? I18n.t('kisshome-defender_Alert')
                                                            : detection.type === 'Info'
                                                              ? I18n.t('kisshome-defender_Info')
                                                              : I18n.t('kisshome-defender_Warning')
                                                    }
                                                >
                                                    <span>{detection.description}</span>
                                                    {detection.type === 'Alert' ? (
                                                        <Alarm style={{ color: 'red' }} />
                                                    ) : (
                                                        <Warning style={{ color: 'orange' }} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div style={styles.row}>
                                            <div style={{ ...styles.title, minWidth: 172 }} />
                                            <div style={styles.value}>
                                                <span style={{ marginRight: 8, fontWeight: 'bold' }}>
                                                    {I18n.t('kisshome-defender_Device')}:
                                                </span>
                                                <span>
                                                    {desc ? (
                                                        <span>
                                                            {desc.desc}
                                                            {desc.vendor ? ` / ${desc.vendor}` : ''}
                                                        </span>
                                                    ) : null}
                                                    <span style={{ opacity: 0.7, fontSize: 'smaller', marginLeft: 8 }}>
                                                        [{desc?.ip}
                                                        {desc?.ip ? ` / ${detection.mac}` : detection.mac}]
                                                    </span>
                                                </span>
                                            </div>
                                        </div>
                                        <div style={styles.row}>
                                            <div style={{ ...styles.title, minWidth: 172 }} />
                                            <div
                                                style={styles.value}
                                                title={JSON.stringify(detection, null, 2)}
                                            >
                                                <span style={{ marginRight: 8, fontWeight: 'bold' }}>
                                                    {I18n.t('kisshome-defender_Time')}:
                                                </span>
                                                <span>{new Date(item.time).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : null}
                </AccordionDetails>
            </Accordion>
        );
    }

    renderDetections(): React.JSX.Element | null {
        let results = this.state.results?.results || [];
        if (this.state.showOnlyAlarmsAndWarnings && this.props.detections?.length) {
            results =
                this.props.detections && this.state.results?.results
                    ? this.state.results.results.filter(item => {
                          if (this.props.detections) {
                              return this.props.detections.find(d => d.scanUUID === item.uuid);
                          }
                          return false;
                      })
                    : [];
        }

        return (
            <Dialog
                open={this.state.detailed}
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
                    {this.props.detections?.length ? (
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
                {this.renderDetections()}
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
                    variant="outlined"
                    style={{
                        height: 80,
                        padding: '10px 40px 10px 10px',
                        cursor: 'pointer',
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
                    {this.props.detections?.length
                        ? `${I18n.t('kisshome-defender_Unusual activities detected')}: ${this.props.detections?.length}`
                        : I18n.t('kisshome-defender_Everything OK')}
                    <StatusIcon
                        ok={!this.props.detections?.length}
                        warning
                        size={52}
                    />
                </Paper>
            </div>
        );
    }
}
