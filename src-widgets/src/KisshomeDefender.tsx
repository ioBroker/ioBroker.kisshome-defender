import React from 'react';

import {
    Button,
    Card,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    FormControlLabel,
    Tab,
    Tabs,
    Toolbar,
} from '@mui/material';

import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetState, VisRxWidgetProps } from '@iobroker/types-vis-2';
import type VisRxWidget from '@iobroker/types-vis-2/visRxWidget';

import logo from './Widget/assets/kisshome-defender.svg';
import { I18n } from '@iobroker/adapter-react-v5';

import StatusTab, { StatusIcon } from './Widget/components/StatusTab';
import StatisticsTab from './Widget/components/StatisticsTab';
import DetectionsTab from './Widget/components/DetectionsTab';
import SettingsTab from './Widget/components/SettingsTab';
import type {
    ReportUxEventType,
    ReportUxHandler,
    StoredAnalysisResult,
    StoredStatisticsResult,
    UXEvent,
} from './Widget/types';
import Questionnaire, { type QuestionnaireJson } from './Widget/components/Questionnaire';

function isMobile(): boolean {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

interface KisshomeDefenderRxData {
    instance: `${number}`;
}

interface KisshomeDefenderState extends VisRxWidgetState {
    tab: 'status' | 'statistics' | 'detections' | 'settings';
    results: StoredStatisticsResult | null;
    lastSeenID: string; // Last seen ID for detections
    questionnaire: QuestionnaireJson | null; // Questionnaire data
    showQuestionnaire: QuestionnaireJson | null; // Currently shown questionnaire
    alive: boolean;
    group: 'A' | 'B';
    showNewAlert: StoredAnalysisResult | null; // ID of the new alert to show
    ignoreForNext10Minutes: boolean;
    showDetectionWithUUID: string;
}

const styles: Record<string, React.CSSProperties> = {
    tabLabel: {
        textTransform: 'none',
    },
};

export default class KisshomeDefender extends (window.visRxWidget as typeof VisRxWidget)<
    KisshomeDefenderRxData,
    KisshomeDefenderState
> {
    private uxEvents: UXEvent[] | null = null;
    private uxEventsTimeout: ReturnType<typeof setTimeout> | null = null;
    private isMobile = isMobile();
    private ignoreNewAlerts: Date | null = null;

    constructor(props: VisRxWidgetProps) {
        super(props);

        const ignoreText: string | null = window.localStorage.getItem('ignoreNewAlerts');
        this.ignoreNewAlerts = ignoreText ? new Date(ignoreText) : null;

        this.state = {
            ...this.state,
            alive: false,
            tab: (window.localStorage.getItem('kisshome-defender-tab') as KisshomeDefenderState['tab']) || 'status',
            results: null,
            lastSeenID: '',
            questionnaire: null,
            showQuestionnaire: null,
            group: 'A', // Default group
            showNewAlert: null,
            ignoreForNext10Minutes: false,
            showDetectionWithUUID: '',
        };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplKisshomeDefender',
            visSet: 'kisshome-defender',
            visSetLabel: 'set_label', // Label of widget set
            visSetColor: '#ff9c2c', // Color of a widget set
            visWidgetLabel: 'KISSHome', // Label of widget
            visName: 'KisshomeDefender',
            visAttrs: [
                {
                    name: 'common', // group name
                    fields: [
                        {
                            label: 'instance',
                            name: 'instance',
                            type: 'instance',
                            adapter: 'kisshome-defender',
                            isShort: true,
                            default: '0',
                        },
                    ],
                },
            ],
            visDefaultStyle: {
                width: '100%',
                height: '100%',
                top: 0,
                left: 0,
            },
            visPrev: 'widgets/kisshome-defender/img/prev_kisshome-defender.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return KisshomeDefender.getWidgetInfo();
    }

    async componentDidMount(): Promise<void> {
        super.componentDidMount();
        // Any initialization logic can be added here
        this.reportUxEvent({
            id: 'kisshome-defender-widget',
            event: 'show',
            ts: Date.now(),
            data: window.navigator.userAgent,
        });

        const idLastSeen = `kisshome-defender.${this.state.rxData.instance || 0}.info.analysis.lastSeen`;
        const stateLastSeen = await this.props.context.socket.getState(idLastSeen);
        this.onStateLastSeen(idLastSeen, stateLastSeen);
        await this.props.context.socket.subscribeState(idLastSeen, this.onStateLastSeen);

        const idQuestionnaire = `kisshome-defender.${this.state.rxData.instance || 0}.info.cloudSync.questionnaire`;
        const stateQuestionnaire = await this.props.context.socket.getState(idQuestionnaire);
        this.onStateQuestionnaire(idQuestionnaire, stateQuestionnaire);
        await this.props.context.socket.subscribeState(idQuestionnaire, this.onStateQuestionnaire);

        const aliveId = `system.adapter.kisshome-defender.${this.state.rxData.instance || 0}.alive`;
        const state = await this.props.context.socket.getState(aliveId);
        this.onStateAlive(aliveId, state);
        await this.props.context.socket.subscribeState(aliveId, this.onStateAlive);

        const groupState = await this.props.context.socket.getState(
            `kisshome-defender.${this.state.rxData.instance || 0}.info.ids.group`,
        );
        this.setState({ group: (groupState?.val as 'A' | 'B') === 'B' ? 'B' : 'A' });

        const idLastCreated = `kisshome-defender.${this.state.rxData.instance || 0}.info.analysis.lastCreated`;
        const stateLastCreated = await this.props.context.socket.getState(idLastCreated);
        this.onStateLastCreated(idLastCreated, stateLastCreated);
        await this.props.context.socket.subscribeState(idLastCreated, this.onStateLastCreated);
    }

    componentWillUnmount(): void {
        // Any cleanup logic can be added here
        this.reportUxEvent({
            id: 'kisshome-defender-widget',
            event: 'hide',
            ts: Date.now(),
        });

        // Send UX events if any
        if (this.uxEventsTimeout) {
            clearTimeout(this.uxEventsTimeout);
            this.uxEventsTimeout = null;
            const uxEvents = this.uxEvents;
            this.uxEvents = null;
            void this.props.context.socket.sendTo(
                `kisshome-defender.${this.state.rxData.instance || 0}`,
                'reportUxEvents',
                uxEvents,
            );
        }
        this.props.context.socket.unsubscribeState(
            `kisshome-defender.${this.state.rxData.instance || 0}.info.analysis.lastCreated`,
            this.onStateLastCreated,
        );
        this.props.context.socket.unsubscribeState(
            `kisshome-defender.${this.state.rxData.instance || 0}.info.analysis.lastSeen`,
            this.onStateLastSeen,
        );
        this.props.context.socket.unsubscribeState(
            `kisshome-defender.${this.state.rxData.instance || 0}.info.cloudSync.questionnaire`,
            this.onStateQuestionnaire,
        );
        this.props.context.socket.unsubscribeState(
            `system.adapter.kisshome-defender.${this.state.rxData.instance || 0}.alive`,
            this.onStateAlive,
        );
    }

    onStateAlive = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === `system.adapter.kisshome-defender.${this.state.rxData.instance || 0}.alive`) {
            if (!!state?.val !== this.state.alive) {
                this.setState({ alive: !!state?.val });
            }
        }
    };

    onStateQuestionnaire = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === `kisshome-defender.${this.state.rxData.instance || 0}.info.cloudSync.questionnaire`) {
            const questionnaire: QuestionnaireJson =
                state?.val && typeof state.val === 'string' && state.val.startsWith('{') ? JSON.parse(state.val) : null;
            if (questionnaire?.done !== undefined) {
                // Do not show questionnaire if it is already done
                this.setState({ questionnaire });
            } else {
                this.setState({ questionnaire, showQuestionnaire: this.state.showQuestionnaire || questionnaire });
            }
        }
    };

    onStateLastSeen = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === `kisshome-defender.${this.state.rxData.instance || 0}.info.detections.lastSeen`) {
            if ((state?.val || '') !== this.state.lastSeenID) {
                this.setState({ lastSeenID: (state?.val as string) || '' });
            }
        }
    };

    onStateLastCreated = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === `kisshome-defender.${this.state.rxData.instance || 0}.info.analysis.lastCreated`) {
            if (state?.val) {
                // Read results anew
                void this.requestData();
            }
        }
    };

    async requestData(): Promise<void> {
        if (this.state.alive) {
            const result = await this.props.context.socket.sendTo(
                `kisshome-defender.${this.state.rxData.instance}`,
                'getData',
                {
                    type: 'allStatistics',
                },
            );
            if (result) {
                const typedResult = result as StoredStatisticsResult;
                const newState: Partial<KisshomeDefenderState> = {
                    results: typedResult,
                };
                // Find out if there is a new alert
                if (typedResult.results && typedResult.results.length) {
                    // Find the last alert in the results
                    for (let i = typedResult.results.length - 1; i >= 0; i--) {
                        if (typedResult.results[i].isAlert) {
                            if (typedResult.results[i].uuid !== this.state.lastSeenID) {
                                if (
                                    (this.ignoreNewAlerts && this.ignoreNewAlerts > new Date()) ||
                                    this.state.tab === 'detections'
                                ) {
                                    // Ignore new alerts if ignoreNewAlerts is set, or we are already in the detections tab
                                    void this.props.context.socket.setState(
                                        `kisshome-defender.${this.state.rxData.instance || 0}.info.analysis.lastSeen`,
                                        typedResult.results[i].uuid,
                                        true,
                                    );
                                } else {
                                    // If we are not ignoring new alerts, show it
                                    newState.showNewAlert = typedResult.results[i];
                                }
                            }
                            break;
                        }
                    }

                    this.setState(newState as any);
                }
            }
        }
    }

    reportUxEvent: ReportUxHandler = (event: {
        id: string;
        event: ReportUxEventType;
        isTouchEvent?: boolean;
        ts: number;
        data?: string;
        mobile?: boolean; // Optional, will be set automatically
    }): void => {
        // Aggregate UX events by 10 seconds
        this.uxEvents ||= [];
        event.mobile = this.isMobile;
        this.uxEvents.push(event);
        this.uxEventsTimeout ||= setTimeout(() => {
            this.uxEventsTimeout = null;
            const uxEvents = this.uxEvents;
            this.uxEvents = null;
            void this.props.context.socket.sendTo(
                `kisshome-defender.${this.state.rxData.instance || 0}`,
                'reportUxEvents',
                uxEvents,
            );
        }, 10_000);
    };

    renderQuestionnaire(): React.JSX.Element | null {
        if (!this.state.showQuestionnaire || this.props.editMode || !this.state.alive) {
            return null;
        }
        return (
            <Questionnaire
                themeType={this.props.context.themeType}
                json={this.state.showQuestionnaire}
                instance={this.state.rxData.instance || '0'}
                socket={this.props.context.socket}
                onClose={() => {
                    if (
                        this.state.questionnaire &&
                        (!this.state.showQuestionnaire ||
                            this.state.showQuestionnaire.id !== this.state.questionnaire.id) &&
                        this.state.questionnaire.done === undefined
                    ) {
                        // Show next queued questionnaire
                        this.setState({ showQuestionnaire: JSON.parse(JSON.stringify(this.state.questionnaire)) });
                    } else {
                        this.setState({ showQuestionnaire: null });
                    }
                }}
                reportUxEvent={this.reportUxEvent}
            />
        );
    }

    renderAlarm(): React.JSX.Element | null {
        if (this.props.editMode) {
            return null;
        }

        if (!this.state.showNewAlert) {
            return null;
        }
        // Find the detection with the ID of showNewAlert
        let anomaliesCount = 0;
        for (const detection of this.state.showNewAlert.detections) {
            if (detection.isAlert) {
                anomaliesCount++;
            }
        }

        let text: string;
        if (anomaliesCount === 1) {
            text = I18n.t(
                'kisshome-defender_During the inspection on %s at %s, an anomaly was detected that could indicate a potential security risk.',
                new Date(this.state.showNewAlert.time).toLocaleDateString(),
                new Date(this.state.showNewAlert.time).toLocaleTimeString(),
            );
        } else {
            text = I18n.t(
                'kisshome-defender_During the inspection on %s at %s, %s anomalies were detected that could indicate a potential security risk.',
                new Date(this.state.showNewAlert.time).toLocaleDateString(),
                new Date(this.state.showNewAlert.time).toLocaleTimeString(),
                anomaliesCount,
            );
        }

        const onClose = (): void => {
            if (this.state.showNewAlert) {
                void this.props.context.socket.setState(
                    `kisshome-defender.${this.state.rxData.instance || '0'}.info.analysis.lastSeen`,
                    this.state.showNewAlert.uuid,
                    true,
                );
                this.reportUxEvent({
                    id: 'kisshome-defender-alert',
                    event: 'hide',
                    ts: Date.now(),
                    data: this.state.showNewAlert.uuid,
                });
            }

            if (this.state.ignoreForNext10Minutes) {
                // Set ignoreNewAlerts to 10 minutes in the future
                this.ignoreNewAlerts = new Date(Date.now() + 10 * 60 * 1000);
                window.localStorage.setItem('ignoreNewAlerts', this.ignoreNewAlerts.toISOString());
            } else {
                this.ignoreNewAlerts = null;
                window.localStorage.removeItem('ignoreNewAlerts');
            }
            this.setState({ showNewAlert: null, ignoreForNext10Minutes: false });
        };

        return (
            <Dialog
                open={!0}
                onClose={onClose}
                maxWidth="md"
                fullWidth
            >
                <DialogContent
                    style={{
                        display: 'flex',
                        padding: 24,
                        alignItems: 'center',
                    }}
                >
                    <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 40 }}>
                        <div
                            style={{
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                            }}
                        >
                            {text}
                        </div>
                        <div
                            style={{
                                cursor: 'pointer',
                            }}
                            onClick={() => {
                                const showDetectionWithUUID = this.state.showNewAlert?.uuid || '';
                                onClose();
                                this.setState({ tab: 'detections', showDetectionWithUUID: showDetectionWithUUID });
                                window.localStorage.setItem('kisshome-defender-tab', 'detections');
                                this.reportUxEvent({
                                    id: 'kisshome-defender-tabs',
                                    event: 'change',
                                    ts: Date.now(),
                                    data: 'detections',
                                });
                            }}
                        >
                            {I18n.t('kisshome-defender_Click here to get more information')}
                        </div>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={!!this.state.ignoreForNext10Minutes}
                                    onChange={(_event, checked) => {
                                        this.setState({ ignoreForNext10Minutes: checked });
                                        this.reportUxEvent({
                                            id: 'kisshome-defender-ignore-alert',
                                            event: 'change',
                                            ts: Date.now(),
                                            data: checked ? 'true' : 'false',
                                        });
                                    }}
                                    color="primary"
                                    style={{ marginLeft: 8 }}
                                />
                            }
                            label={I18n.t('kisshome-defender_Do not show this alert again for 10 minutes')}
                        />
                    </div>
                    <div>
                        <StatusIcon
                            ok={false}
                            warning
                            size={80}
                        />
                    </div>
                </DialogContent>
                <DialogActions>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={onClose}
                    >
                        {I18n.t('kisshome-defender_Ok')}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        return (
            <Card
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: this.props.context.themeType === 'dark' ? undefined : '#E6E6E6',
                }}
            >
                {this.renderQuestionnaire()}
                {this.renderAlarm()}
                <Toolbar
                    variant="dense"
                    style={{ width: 'calc(100% - 48px)', display: 'flex', backgroundColor: '#333E50', color: 'white' }}
                >
                    <span>KISSHOME</span>
                    <img
                        src={logo}
                        style={{ height: 32, marginRight: 8, marginLeft: 16 }}
                        alt="KISShome Defender"
                    />
                    <Tabs
                        style={{ flexGrow: 1 }}
                        value={this.state.tab || 'status'}
                        onChange={(_event, value: string) => {
                            this.setState({ tab: value as KisshomeDefenderState['tab'] });
                            window.localStorage.setItem('kisshome-defender-tab', value);
                            this.reportUxEvent({
                                id: 'kisshome-defender-tabs',
                                event: 'change',
                                ts: Date.now(),
                                data: value,
                            });
                        }}
                    >
                        <Tab
                            value="status"
                            style={{
                                ...styles.tabLabel,
                                color: this.state.tab === 'status' ? '#66ccff' : 'white',
                            }}
                            label={I18n.t('kisshome-defender_Status')}
                        />
                        <Tab
                            value="statistics"
                            style={{
                                ...styles.tabLabel,
                                color: this.state.tab === 'statistics' ? '#66ccff' : 'white',
                            }}
                            label={I18n.t('kisshome-defender_Statistics')}
                        />
                        <Tab
                            value="detections"
                            style={{
                                ...styles.tabLabel,
                                color: this.state.tab === 'detections' ? '#66ccff' : 'white',
                            }}
                            label={I18n.t('kisshome-defender_Detections')}
                        />
                        <div style={{ flexGrow: 1 }} />
                        <Tab
                            value="settings"
                            style={{
                                ...styles.tabLabel,
                                fontStyle: 'italic',
                                color: this.state.tab === 'settings' ? '#66ccff' : 'white',
                            }}
                            label={I18n.t('kisshome-defender_Settings')}
                        />
                    </Tabs>
                </Toolbar>
                <div style={{ width: '100%', height: 'calc(100% - 48px)' }}>
                    {this.state.tab === 'status' ? (
                        <StatusTab
                            themeType={this.props.context.themeType}
                            alive={this.state.alive}
                            reportUxEvent={this.reportUxEvent}
                            instance={this.state.rxData.instance || '0'}
                            socket={this.props.context.socket}
                            results={this.state.results}
                            lastSeenID={this.state.lastSeenID}
                            onNavigateToDetections={() => {
                                this.setState({ tab: 'detections' });
                                window.localStorage.setItem('kisshome-defender-tab', 'detections');
                                this.reportUxEvent({
                                    id: 'kisshome-defender-tabs',
                                    event: 'change',
                                    ts: Date.now(),
                                    data: 'detections',
                                });
                            }}
                        />
                    ) : null}
                    {this.state.tab === 'statistics' ? (
                        <StatisticsTab
                            alive={this.state.alive}
                            reportUxEvent={this.reportUxEvent}
                            instance={this.state.rxData.instance || '0'}
                            socket={this.props.context.socket}
                            themeType={this.props.context.themeType}
                            lang={this.props.context.lang}
                        />
                    ) : null}
                    {this.state.tab === 'detections' ? (
                        <DetectionsTab
                            alive={this.state.alive}
                            results={this.state.results}
                            socket={this.props.context.socket}
                            reportUxEvent={this.reportUxEvent}
                            lastSeenID={this.state.lastSeenID}
                            instance={this.state.rxData.instance || '0'}
                            themeType={this.props.context.themeType}
                            group={this.state.group}
                            showDetectionWithUUID={this.state.showDetectionWithUUID}
                        />
                    ) : null}
                    {this.state.tab === 'settings' ? (
                        <SettingsTab
                            reportUxEvent={this.reportUxEvent}
                            instance={this.state.rxData.instance || '0'}
                            socket={this.props.context.socket}
                            themeType={this.props.context.themeType}
                        />
                    ) : null}
                </div>
            </Card>
        );
    }
}
