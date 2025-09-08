import React, { Component } from 'react';

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

import logo from './assets/kisshome-defender.svg';
import { I18n, type ThemeType, type LegacyConnection } from '@iobroker/adapter-react-v5';

import StatusTab, { StatusIcon } from './components/StatusTab';
import StatisticsTab from './components/StatisticsTab';
import DetectionsTab from './components/DetectionsTab';
import SettingsTab from './components/SettingsTab';
import type {
    ReportUxEventType,
    ReportUxHandler,
    StoredAnalysisResult,
    StoredStatisticsResult,
    UXEvent,
} from './types';
import Questionnaire, { type QuestionnaireJson } from './components/Questionnaire';

function isMobile(): boolean {
    return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

interface KisshomeDefenderProps {
    instance?: string;
    socket: LegacyConnection;
    editMode: boolean;
    themeType: ThemeType;
    lang: ioBroker.Languages;
    view: string;
    id: string;
}

interface KisshomeDefenderState {
    tab: 'status' | 'statistics' | 'detections' | 'settings';
    results: StoredStatisticsResult | null;
    lastSeenID: string; // Last seen ID for detections
    questionnaire: QuestionnaireJson | null; // Questionnaire data
    showQuestionnaire: QuestionnaireJson | null; // Currently shown questionnaire
    alive: boolean;
    group: 'A' | 'B';
    secondPeriod: boolean; // 1-2 week or 3-4 week period
    showNewAlert: StoredAnalysisResult | null; // ID of the new alert to show
    ignoreForNext10Minutes: boolean;
    showDetectionWithUUID: string;
    resultsDialogOpened: boolean; // If set, ignore new alerts until this date
}

const styles: Record<string, React.CSSProperties> = {
    tabLabel: {
        textTransform: 'none',
    },
};

export default class KisshomeDefenderMain extends Component<KisshomeDefenderProps, KisshomeDefenderState> {
    private uxEvents: UXEvent[] | null = null;
    private uxEventsTimeout: ReturnType<typeof setTimeout> | null = null;
    private isMobile = isMobile();
    private ignoreNewAlerts: Date | null = null;
    private lastCreated = '';
    private lastShownAlertDialog = '';

    constructor(props: KisshomeDefenderProps) {
        super(props);

        const ignoreText: string | null = window.localStorage.getItem('ignoreNewAlerts');
        this.ignoreNewAlerts = ignoreText ? new Date(ignoreText) : null;
        const position = this.getPath();
        let showDetectionWithUUID = '';
        let tab = (window.localStorage.getItem('kisshome-defender-tab') as KisshomeDefenderState['tab']) || 'status';
        if (position) {
            tab = position.tab as KisshomeDefenderState['tab'];
            showDetectionWithUUID = position.alarm || '';
        }

        this.state = {
            alive: false,
            tab,
            results: null,
            lastSeenID: '',
            questionnaire: null,
            showQuestionnaire: null,
            group: 'A', // Default group
            showNewAlert: null,
            ignoreForNext10Minutes: false,
            showDetectionWithUUID,
            resultsDialogOpened: false,
            secondPeriod: false,
        };
    }

    async componentDidMount(): Promise<void> {
        const instance = this.props.instance || '0';
        const socket = this.props.socket;

        // Any initialization logic can be added here
        this.reportUxEvent({
            id: 'kisshome-defender-widget',
            event: 'show',
            ts: Date.now(),
            data: window.navigator.userAgent,
        });

        const idLastSeen = `kisshome-defender.${instance}.info.analysis.lastSeen`;
        const stateLastSeen = await socket.getState(idLastSeen);
        this.onStateLastSeen(idLastSeen, stateLastSeen);
        await socket.subscribeState(idLastSeen, this.onStateLastSeen);

        const idLastShownAlert = `kisshome-defender.${instance}.info.analysis.lastShownAlert`;
        const stateLastShownAlert = await socket.getState(idLastShownAlert);
        this.onStateLastShownAlertSeen(idLastShownAlert, stateLastShownAlert);
        await socket.subscribeState(idLastShownAlert, this.onStateLastShownAlertSeen);

        const idQuestionnaire = `kisshome-defender.${instance}.info.cloudSync.questionnaire`;
        const stateQuestionnaire = await socket.getState(idQuestionnaire);
        this.onStateQuestionnaire(idQuestionnaire, stateQuestionnaire);
        await socket.subscribeState(idQuestionnaire, this.onStateQuestionnaire);

        const aliveId = `system.adapter.kisshome-defender.${instance}.alive`;
        const state = await socket.getState(aliveId);
        this.onStateAlive(aliveId, state, true);
        await socket.subscribeState(aliveId, this.onStateAlive);

        const groupState = await socket.getState(`kisshome-defender.${instance}.info.ids.group`);
        const secondPeriodState = await socket.getState(`kisshome-defender.${instance}.info.ids.period`);
        this.setState({
            group: (groupState?.val as 'A' | 'B') === 'B' ? 'B' : 'A',
            secondPeriod: !!secondPeriodState?.val,
        });

        const idLastCreated = `kisshome-defender.${instance}.info.analysis.lastCreated`;
        const stateLastCreated = await socket.getState(idLastCreated);
        this.onStateLastCreated(idLastCreated, stateLastCreated);
        await socket.subscribeState(idLastCreated, this.onStateLastCreated);

        window.addEventListener('hashchange', this.onHashChange, false);
    }

    componentWillUnmount(): void {
        window.removeEventListener('hashchange', this.onHashChange, false);
        // Any cleanup logic can be added here
        this.reportUxEvent({
            id: 'kisshome-defender-widget',
            event: 'hide',
            ts: Date.now(),
        });
        const instance = this.props.instance || '0';
        const socket = this.props.socket;

        // Send UX events if any
        if (this.uxEventsTimeout) {
            clearTimeout(this.uxEventsTimeout);
            this.uxEventsTimeout = null;
            const uxEvents = this.uxEvents;
            this.uxEvents = null;
            void socket.sendTo(`kisshome-defender.${instance}`, 'reportUxEvents', uxEvents);
        }

        socket.unsubscribeState(`kisshome-defender.${instance}.info.analysis.lastCreated`, this.onStateLastCreated);
        socket.unsubscribeState(`kisshome-defender.${instance}.info.analysis.lastSeen`, this.onStateLastSeen);
        socket.unsubscribeState(
            `kisshome-defender.${instance}.info.analysis.lastShownAlert`,
            this.onStateLastShownAlertSeen,
        );
        socket.unsubscribeState(
            `kisshome-defender.${instance}.info.cloudSync.questionnaire`,
            this.onStateQuestionnaire,
        );
        socket.unsubscribeState(`system.adapter.kisshome-defender.${instance}.alive`, this.onStateAlive);
    }

    navigate(tab: KisshomeDefenderState['tab'], alarm?: string): void {
        let hash = `#${this.props.view}/${this.props.id}/${tab}`;
        if (alarm) {
            hash += `/${alarm}`;
        }
        window.localStorage.setItem('kisshome-defender-tab', tab);
        window.location.hash = hash;
    }

    onHashChange = (): void => {
        const position = this.getPath();
        if (position) {
            if (position.tab !== this.state.tab) {
                this.setState({
                    tab: position.tab as KisshomeDefenderState['tab'],
                    showDetectionWithUUID: position.alarm || '',
                    resultsDialogOpened: false,
                });
            } else if (position.tab === 'detections' && position.alarm !== this.state.showDetectionWithUUID) {
                this.setState({ showDetectionWithUUID: position.alarm || '' });
            }
        }
    };

    onStateAlive = (id: string, state: ioBroker.State | null | undefined, doUpdateData?: boolean): void => {
        if (id === `system.adapter.kisshome-defender.${this.props.instance || 0}.alive`) {
            if (!!state?.val !== this.state.alive) {
                this.setState({ alive: !!state?.val }, () => !doUpdateData && this.requestData());
            }
        }
    };

    onStateQuestionnaire = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === `kisshome-defender.${this.props.instance || 0}.info.cloudSync.questionnaire`) {
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
        if (id === `kisshome-defender.${this.props.instance || 0}.info.analysis.lastSeen`) {
            if ((state?.val || '') !== this.state.lastSeenID) {
                this.lastShownAlertDialog ||= state?.val as string;
                this.setState({ lastSeenID: (state?.val as string) || '' }, () => {
                    if (this.state.showNewAlert && this.state.showNewAlert.uuid === this.state.lastSeenID) {
                        // If the shown alert is the last seen, hide it
                        this.setState({ showNewAlert: null });
                    }
                });
            }
        }
    };

    onStateLastShownAlertSeen = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === `kisshome-defender.${this.props.instance || 0}.info.analysis.lastShownAlert`) {
            if ((state?.val || '') !== this.lastShownAlertDialog) {
                this.lastShownAlertDialog = (state?.val as string) || this.state.lastSeenID;
            }
        }
    };

    onStateLastCreated = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === `kisshome-defender.${this.props.instance || 0}.info.analysis.lastCreated`) {
            if (state?.val !== this.lastCreated) {
                this.lastCreated = state?.val as string;
                void this.requestData();
            }
        }
    };

    async requestData(): Promise<void> {
        const instance = this.props.instance || '0';
        const socket = this.props.socket;

        if (this.state.alive) {
            const result = await socket.sendTo(`kisshome-defender.${instance}`, 'getData', {
                type: 'allStatistics',
            });
            if (result) {
                const typedResult = result as StoredStatisticsResult;
                const newState: Partial<KisshomeDefenderState> = {
                    results: typedResult,
                };
                // Find out if there is a new alert
                if (typedResult.results && typedResult.results.length) {
                    // Find the last alert in the results
                    for (let i = typedResult.results.length - 1; i >= 0; i--) {
                        // Get the latest alert
                        if (typedResult.results[i].isAlert) {
                            // If it is not the last seen, show it
                            if (typedResult.results[i].uuid !== this.lastShownAlertDialog) {
                                this.lastShownAlertDialog = typedResult.results[i].uuid;
                                if (
                                    (!this.ignoreNewAlerts || this.ignoreNewAlerts <= new Date()) &&
                                    !this.state.resultsDialogOpened
                                ) {
                                    // If we are not ignoring new alerts, show it
                                    newState.showNewAlert = typedResult.results[i];
                                }
                                void socket.setState(
                                    `kisshome-defender.${instance}.info.analysis.lastShownAlert`,
                                    typedResult.results[i].uuid,
                                    true,
                                );
                            }
                            break;
                        }
                    }

                    this.setState(newState as KisshomeDefenderState);
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
            void this.props.socket.sendTo(`kisshome-defender.${this.props.instance || 0}`, 'reportUxEvents', uxEvents);
        }, 10_000);
    };

    renderQuestionnaire(): React.JSX.Element | null {
        if (!this.state.showQuestionnaire || this.props.editMode || !this.state.alive) {
            return null;
        }
        return (
            <Questionnaire
                themeType={this.props.themeType}
                json={this.state.showQuestionnaire}
                instance={this.props.instance || '0'}
                socket={this.props.socket}
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

    getPath(): { tab: string; alarm?: string } | null {
        // #view/widget/tab/alarm
        const [view, widget, tab, alarm] = (window.location.hash || '').replace(/^#/, '').split('/');
        if (view === this.props.view && widget === this.props.id) {
            return { tab: tab || '', alarm: alarm || '' };
        }
        return null;
    }

    renderAlarm(): React.JSX.Element | null {
        if (this.state.showQuestionnaire && !this.props.editMode && this.state.alive) {
            // It is questionnaire opened, do not show alarm
            return null;
        }
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
                                this.navigate('detections', showDetectionWithUUID);
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

    render(): React.JSX.Element | React.JSX.Element[] | null {
        return (
            <Card
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: this.props.themeType === 'dark' ? undefined : '#E6E6E6',
                }}
            >
                {this.renderQuestionnaire()}
                {this.renderAlarm()}
                <Toolbar
                    variant="dense"
                    style={{ width: 'calc(100% - 48px)', display: 'flex', backgroundColor: '#333E50', color: 'white' }}
                >
                    <span style={{ textTransform: 'uppercase' }}>KISSHome</span>
                    <img
                        src={logo}
                        style={{ height: 32, marginRight: 8, marginLeft: 16 }}
                        alt="KISShome Defender"
                    />
                    <Tabs
                        className="Mui-horizontal-tabs"
                        style={{ flexGrow: 1 }}
                        value={this.state.tab || 'status'}
                        onChange={(_event, value: string) => {
                            this.navigate(value as KisshomeDefenderState['tab'], '');
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
                            themeType={this.props.themeType}
                            alive={this.state.alive}
                            reportUxEvent={this.reportUxEvent}
                            instance={this.props.instance || '0'}
                            socket={this.props.socket}
                            results={this.state.results}
                            lastSeenID={this.state.lastSeenID}
                            onNavigateToDetections={() => {
                                this.navigate('detections');
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
                            socket={this.props.socket}
                            reportUxEvent={this.reportUxEvent}
                            instance={this.props.instance || '0'}
                            themeType={this.props.themeType}
                            lang={this.props.lang}
                        />
                    ) : null}
                    {this.state.tab === 'detections' ? (
                        <DetectionsTab
                            alive={this.state.alive}
                            results={this.state.results}
                            socket={this.props.socket}
                            lastSeenID={this.state.lastSeenID}
                            reportUxEvent={this.reportUxEvent}
                            instance={this.props.instance || '0'}
                            themeType={this.props.themeType}
                            group={this.state.group}
                            showDetectionWithUUID={this.state.showDetectionWithUUID}
                            onResultsDialogOpen={opened => this.setState({ resultsDialogOpened: opened })}
                            secondPeriod={this.state.secondPeriod}
                        />
                    ) : null}
                    {this.state.tab === 'settings' ? (
                        <SettingsTab
                            reportUxEvent={this.reportUxEvent}
                            socket={this.props.socket}
                            instance={this.props.instance || '0'}
                            themeType={this.props.themeType}
                        />
                    ) : null}
                </div>
            </Card>
        );
    }
}
