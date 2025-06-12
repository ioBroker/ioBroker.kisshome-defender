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
    Tooltip,
    Typography,
} from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';
import { Close, ExpandMore, Warning, Alarm } from '@mui/icons-material';
import type { VisContext } from '@iobroker/types-vis-2';

import type { StatisticsResult, StoredStatisticsResult } from '../types';
import type { DetectionWithUUID } from '../../../src/types';

interface DetectionsTabProps {
    context: VisContext;
    instance: string;
    detections?: DetectionWithUUID[] | null;
    lastSeenID: string;
    reportUxEvent: (event: {
        id: string;
        event: 'click' | 'down' | 'up' | 'show' | 'hide' | 'change';
        isTouchEvent?: boolean;
        ts: number;
        data?: string;
    }) => void;
}
interface DetectionsTabState {
    detailed: boolean;
    showOnlyAlarmsAndWarnings: boolean;
    alive: boolean;
    lastRequest: number;
    requestRunning: boolean;
    results: StoredStatisticsResult | null;
}

function bytes2string(bytes: number, maxValue?: number): string {
    if (maxValue !== undefined && maxValue > 1024 * 1024) {
        // Use a part of MB
        return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')}Mb`;
    }
    if (bytes < 1024) {
        return `${bytes}b`;
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1).replace('.', ',')}kb`;
    }
    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')}Mb`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1).replace('.', ',')}Gb`;
}

export default class DetectionsTab extends Component<DetectionsTabProps, DetectionsTabState> {
    private updateTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(props: DetectionsTabProps) {
        super(props);
        this.state = {
            detailed: false,
            alive: false,
            lastRequest: 0,
            requestRunning: false,
            showOnlyAlarmsAndWarnings: false,
            results: null,
        };
    }

    async componentDidMount(): Promise<void> {
        const id = `system.adapter.kisshome-defender.${this.props.instance}.alive`;
        const state = await this.props.context.socket.getState(id);
        this.onStateAlive(id, state);
        await this.props.context.socket.subscribeState(id, this.onStateAlive);
    }

    componentWillUnmount(): void {
        this.props.context.socket.unsubscribeState(
            `system.adapter.kisshome-defender.${this.props.instance}.alive`,
            this.onStateAlive,
        );

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

    onStateAlive = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === `system.adapter.kisshome-defender.${this.props.instance}.alive`) {
            if (!!state?.val !== this.state.alive) {
                this.setState({ alive: !!state?.val }, () => {
                    if (this.state.alive) {
                        void this.requestData();
                    }
                });
            }
        }
    };

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
        return (
            <div className="last-detection">
                <h3>Last Detection</h3>
                <p>No detections yet.</p>
            </div>
        );
    }

    renderOneDetection(item: StatisticsResult): React.JSX.Element {
        const detection = this.props.detections?.find(d => d.scanUUID === item.uuid);

        return (
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography component="span">{new Date(item.time).toLocaleString()}</Typography>
                    {detection?.type === 'Warning' ? <Warning /> : detection?.type === 'Alert' ? <Alarm /> : null}
                </AccordionSummary>
                <AccordionDetails>
                    <pre>{JSON.stringify(item, null, 2)}</pre>
                </AccordionDetails>
            </Accordion>
        );
    }

    renderDetections(): React.JSX.Element | null {
        let results = this.state.results?.results || [];
        if (this.state.showOnlyAlarmsAndWarnings) {
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
                    <Button
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
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
                {this.renderDetections()}
                <div style={{ flexGrow: 1 }}>{this.renderLastDetection()}</div>
                <Tooltip
                    title={I18n.t('kisshome-defender_Click to see all detections')}
                    placement="top"
                >
                    <div
                        style={{ height: 80, padding: 16, cursor: 'pointer' }}
                        onClick={() => this.setState({ detailed: true })}
                    >
                        {I18n.t('kisshome-defender_Results')}: {result}
                    </div>
                </Tooltip>
            </div>
        );
    }
}
