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
    Paper,
    Tooltip,
    Typography,
} from '@mui/material';
import { I18n, type ThemeType } from '@iobroker/adapter-react-v5';
import { Close, ExpandMore, ErrorOutline as Warning, Warning as Alarm } from '@mui/icons-material';
import type { VisContext } from '@iobroker/types-vis-2';

import type { ReportUxHandler, StatisticsResult, StoredStatisticsResult } from '../types';
import type { DetectionWithUUID } from '../../../src/types';

import { bytes2string, time2string } from './utils';

const styles: Record<string, React.CSSProperties> = {
    title: {
        fontSize: '1.2em',
        fontWeight: 'bold',
        marginBottom: 8,
        display: 'inline-block',
        minWidth: 200,
    },
    value: {
        fontSize: '1em',
        marginBottom: 16,
        display: 'inline-block',
    },
    row: {},
};

interface DetectionsTabProps {
    context: VisContext;
    instance: string;
    detections?: DetectionWithUUID[] | null;
    lastSeenID: string;
    reportUxEvent: ReportUxHandler;
    alive: boolean;
    themeType: ThemeType;
}

interface DetectionsTabState {
    detailed: boolean;
    showOnlyAlarmsAndWarnings: boolean;
    lastRequest: number;
    requestRunning: boolean;
    results: StoredStatisticsResult | null;
    alive: boolean;
    openedItem: string;
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
        };
    }

    componentDidMount() {
        this.requestData().catch(e => console.error(e));
    }

    componentWillUnmount(): void {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }
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
                const result = await this.props.context.socket.sendTo(
                    `kisshome-defender.${this.props.instance}`,
                    'getData',
                    {
                        type: 'allStatistics',
                    },
                );
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
                    <h3>{I18n.t('kisshome-defender_Last Detection')}</h3>
                    <div>{I18n.t('kisshome-defender_No detections yet done')}</div>
                </div>
            );
        }

        const detections = this.props.detections?.filter(d => d.scanUUID === item.uuid);
        const worstDetection = detections?.reduce(
            (worst, current) => {
                if (!worst || (current.type === 'Alert' && worst.type !== 'Alert')) {
                    return current;
                }
                if (current.type === 'Warning' && worst.type !== 'Alert') {
                    return current;
                }
                return worst;
            },
            null as DetectionWithUUID | null,
        );

        return (
            <div className="last-detection">
                <div style={styles.row}>
                    <div style={styles.title}>{I18n.t('kisshome-defender_Last Detection')}:</div>
                    <div style={styles.value}>{new Date(item.time).toLocaleString()}</div>
                </div>
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
                    <div style={styles.value}>
                        {detections?.length || 0}
                        {worstDetection?.type === 'Warning' ? (
                            <Warning style={{ marginLeft: 8, color: 'orange' }} />
                        ) : worstDetection?.type === 'Alert' ? (
                            <Alarm style={{ marginLeft: 8, color: 'red' }} />
                        ) : null}
                    </div>
                </div>
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
                onChange={(_e, expanded) => {
                    if (expanded) {
                        this.setState({ openedItem: item.uuid });
                        this.props.reportUxEvent({
                            id: 'kisshome-defender-detection',
                            event: 'show',
                            ts: Date.now(),
                            data: item.uuid,
                        });
                    } else if (this.state.openedItem === item.uuid) {
                        this.setState({ openedItem: '' });
                        this.props.reportUxEvent({
                            id: 'kisshome-defender-detection',
                            event: 'hide',
                            ts: Date.now(),
                            data: item.uuid,
                        });
                    }
                }}
                expanded={this.state.openedItem === item.uuid}
            >
                <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography component="span">{new Date(item.time).toLocaleString()}</Typography>
                    {worstDetection?.type === 'Warning' ? (
                        <Warning style={{ marginLeft: 8, color: 'orange' }} />
                    ) : worstDetection?.type === 'Alert' ? (
                        <Alarm style={{ marginLeft: 8, color: 'red' }} />
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
                                                    {I18n.t('kisshome-defender_MAC address')}:
                                                </span>
                                                <span>
                                                    {detection.mac}
                                                    {desc ? (
                                                        <span
                                                            style={{ opacity: 0.7, fontSize: 'smaller', marginLeft: 8 }}
                                                        >
                                                            ([{desc.ip}] {desc.desc}
                                                            {desc.vendor ? ` / ${desc.vendor}` : ''})
                                                        </span>
                                                    ) : null}
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
                    ? this.state.results.results.filter(item =>
                          this.props.detections!.find(d => d.scanUUID === item.uuid),
                      )
                    : [];
        }

        return (
            <Dialog
                open={this.state.detailed}
                onClose={() => this.setState({ detailed: false })}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>{I18n.t('kisshome-defender_Detections')}</DialogTitle>
                <DialogContent>
                    {results ? (
                        results.map(item => this.renderOneDetection(item))
                    ) : (
                        <p>{I18n.t('kisshome-defender_No detections available')}</p>
                    )}
                </DialogContent>
                <DialogActions>
                    {this.props.detections?.length ? (
                        <FormControlLabel
                            label={I18n.t('kisshome-defender_Show only alarms and warnings')}
                            control={
                                <Checkbox
                                    onClick={() => {
                                        this.props.reportUxEvent({
                                            id: 'kisshome-defender-detections-only-alarms',
                                            event: 'change',
                                            ts: Date.now(),
                                            data: this.state.showOnlyAlarmsAndWarnings ? 'false' : 'true',
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
                        onClick={() => this.setState({ detailed: false })}
                        startIcon={<Close />}
                    >
                        {I18n.t('kisshome-defender_Close')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    render(): React.JSX.Element {
        let unseenDetections = 0;
        let result: string;

        if (this.state.alive !== this.props.alive) {
            setTimeout(() => {
                this.setState({ alive: this.props.alive }, () => {
                    void this.requestData();
                });
            }, 50);
        }

        if (this.props.lastSeenID) {
            // Find the last detection with this ID
            const lastDetectionIndex = this.props.detections?.findIndex(
                detection => detection.uuid === this.props.lastSeenID,
            );
            if (
                this.props.detections?.length &&
                lastDetectionIndex !== undefined &&
                lastDetectionIndex !== -1 &&
                lastDetectionIndex < this.props.detections.length - 1
            ) {
                // We have unseen detections
                unseenDetections = this.props.detections.length - (lastDetectionIndex + 1);
                result = I18n.t(
                    'kisshome-defender_Unseen detections %s of total %s in the last 7 days',
                    unseenDetections,
                    this.props.detections.length,
                );
            } else {
                result = I18n.t(
                    'kisshome-defender_Total detections %s in the last 7 days',
                    this.props.detections?.length || 0,
                );
            }
        } else {
            result = I18n.t(
                'kisshome-defender_Total detections %s in the last 7 days',
                this.props.detections?.length || 0,
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
                }}
            >
                {this.renderDetections()}
                <Paper style={{ flexGrow: 1, padding: 10 }}>{this.renderLastDetection()}</Paper>
                <Tooltip
                    title={I18n.t('kisshome-defender_Click to see all detections')}
                    placement="top"
                >
                    <Paper
                        variant="outlined"
                        style={{ height: 80, padding: 10, cursor: 'pointer' }}
                        onClick={() => this.setState({ detailed: true })}
                    >
                        {I18n.t('kisshome-defender_Results')}: {result}
                    </Paper>
                </Tooltip>
            </div>
        );
    }
}
