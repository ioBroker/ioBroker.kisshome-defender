import React, { Component } from 'react';

import { Card, Tab, Tabs, Toolbar } from '@mui/material';

import logo from './assets/kisshome-defender.svg';
import { I18n, type ThemeType, type LegacyConnection } from '@iobroker/adapter-react-v5';

import StatusTab from './components/StatusTab';
import StatisticsTab from './components/StatisticsTab';
import DetectionsTab from './components/DetectionsTab';
import SettingsTab from './components/SettingsTab';
import type { DetectionWithUUID, ReportUxEventType, ReportUxHandler, UXEvent } from './types';
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
}

interface KisshomeDefenderState {
    tab: 'status' | 'statistics' | 'detections' | 'settings';
    detections: DetectionWithUUID[] | null;
    lastSeenID: string; // Last seen ID for detections
    questionnaire: QuestionnaireJson | null; // Questionnaire data
    showQuestionnaire: QuestionnaireJson | null; // Currently shown questionnaire
    alive: boolean;
    group: 'A' | 'B';
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

    constructor(props: KisshomeDefenderProps) {
        super(props);
        this.state = {
            alive: false,
            tab: (window.localStorage.getItem('kisshome-defender-tab') as KisshomeDefenderState['tab']) || 'status',
            detections: null,
            lastSeenID: '',
            questionnaire: null,
            showQuestionnaire: null,
            group: 'A', // Default group
        };
    }

    async componentDidMount(): Promise<void> {
        // Any initialization logic can be added here
        this.reportUxEvent({
            id: 'kisshome-defender-widget',
            event: 'show',
            ts: Date.now(),
            data: window.navigator.userAgent,
        });

        const idDetections = `kisshome-defender.${this.props.instance || 0}.info.detections.json`;
        const stateDetections = await this.props.socket.getState(idDetections);
        this.onStateDetections(idDetections, stateDetections);
        await this.props.socket.subscribeState(idDetections, this.onStateDetections);

        const idLastSeen = `kisshome-defender.${this.props.instance || 0}.info.detections.lastSeen`;
        const stateLastSeen = await this.props.socket.getState(idLastSeen);
        this.onStateLastSeen(idLastSeen, stateLastSeen);
        await this.props.socket.subscribeState(idLastSeen, this.onStateLastSeen);

        const idQuestionnaire = `kisshome-defender.${this.props.instance || 0}.info.cloudSync.questionnaire`;
        const stateQuestionnaire = await this.props.socket.getState(idQuestionnaire);
        this.onStateQuestionnaire(idQuestionnaire, stateQuestionnaire);
        await this.props.socket.subscribeState(idQuestionnaire, this.onStateQuestionnaire);

        const aliveId = `system.adapter.kisshome-defender.${this.props.instance || 0}.alive`;
        const state = await this.props.socket.getState(aliveId);
        this.onStateAlive(aliveId, state);
        await this.props.socket.subscribeState(aliveId, this.onStateAlive);

        const groupState = await this.props.socket.getState(
            `kisshome-defender.${this.props.instance || 0}.info.ids.group`,
        );
        this.setState({ group: (groupState?.val as 'A' | 'B') === 'B' ? 'B' : 'A' });
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
            void this.props.socket.sendTo(`kisshome-defender.${this.props.instance || 0}`, 'reportUxEvents', uxEvents);
        }

        this.props.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance || 0}.info.detections.json`,
            this.onStateDetections,
        );
        this.props.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance || 0}.info.detections.lastSeen`,
            this.onStateLastSeen,
        );
        this.props.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance || 0}.info.cloudSync.questionnaire`,
            this.onStateQuestionnaire,
        );
        this.props.socket.unsubscribeState(
            `system.adapter.kisshome-defender.${this.props.instance || 0}.alive`,
            this.onStateAlive,
        );
    }

    onStateAlive = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === `system.adapter.kisshome-defender.${this.props.instance || 0}.alive`) {
            if (!!state?.val !== this.state.alive) {
                this.setState({ alive: !!state?.val });
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

    onStateDetections = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === `kisshome-defender.${this.props.instance || 0}.info.detections.json`) {
            this.setState({ detections: state?.val ? JSON.parse(state.val as string) : [] });
        }
    };

    onStateLastSeen = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === `kisshome-defender.${this.props.instance || 0}.info.detections.lastSeen`) {
            if ((state?.val || '') !== this.state.lastSeenID) {
                this.setState({ lastSeenID: (state?.val as string) || '' });
            }
        }
    };

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
                        className="Mui-horizontal-tabs"
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
                            themeType={this.props.themeType}
                            alive={this.state.alive}
                            reportUxEvent={this.reportUxEvent}
                            instance={this.props.instance || '0'}
                            socket={this.props.socket}
                            detections={this.state.detections}
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
                            socket={this.props.socket}
                            detections={this.state.detections}
                            lastSeenID={this.state.lastSeenID}
                            reportUxEvent={this.reportUxEvent}
                            instance={this.props.instance || '0'}
                            themeType={this.props.themeType}
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
