import React from 'react';

import { Card, Tab, Tabs, Toolbar } from '@mui/material';

import type { RxRenderWidgetProps, RxWidgetInfo, VisRxWidgetState, VisRxWidgetProps } from '@iobroker/types-vis-2';
import type VisRxWidget from '@iobroker/types-vis-2/visRxWidget';

import logo from './assets/kisshome-defender.svg';
import { I18n } from '@iobroker/adapter-react-v5';

import StatusTab from './components/StatusTab';
import StatisticsTab from './components/StatisticsTab';
import DetectionsTab from './components/DetectionsTab';
import SettingsTab from './components/SettingsTab';
import type { DetectionWithUUID, UXEvent } from './types';

interface KisshomeDefenderRxData {
    instance: `${number}`;
}

interface KisshomeDefenderState extends VisRxWidgetState {
    tab: 'status' | 'statistics' | 'detections' | 'settings';
    detections: DetectionWithUUID[] | null;
    lastSeenID: string; // Last seen ID for detections
}

export default class KisshomeDefender extends (window.visRxWidget as typeof VisRxWidget)<
    KisshomeDefenderRxData,
    KisshomeDefenderState
> {
    private uxEvents: UXEvent[] | null = null;
    private uxEventsTimeout: ReturnType<typeof setTimeout> | null = null;

    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = {
            ...this.state,
            tab: (window.localStorage.getItem('kisshome-defender-tab') as KisshomeDefenderState['tab']) || 'status',
            detections: null,
            lastSeenID: '',
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

        const idDetections = `kisshome-defender.${this.state.rxData.instance || 0}.info.detections.json`;
        const stateDetections = await this.props.context.socket.getState(idDetections);
        this.onStateDetections(idDetections, stateDetections);
        await this.props.context.socket.subscribeState(idDetections, this.onStateDetections);

        const idLastSeen = `kisshome-defender.${this.state.rxData.instance || 0}.info.detections.lastSeen`;
        const stateLastSeen = await this.props.context.socket.getState(idLastSeen);
        this.onStateLastSeen(idLastSeen, stateLastSeen);
        await this.props.context.socket.subscribeState(idLastSeen, this.onStateLastSeen);
    }

    componentWillUnmount(): void {
        super.componentWillUnmount();
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
            `kisshome-defender.${this.state.rxData.instance || 0}.info.detections.json`,
            this.onStateDetections,
        );
        this.props.context.socket.unsubscribeState(
            `kisshome-defender.${this.state.rxData.instance || 0}.info.detections.lastSeen`,
            this.onStateLastSeen,
        );
    }

    onStateDetections = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === `kisshome-defender.${this.state.rxData.instance || 0}.info.detections.json`) {
            this.setState({ detections: state?.val ? JSON.parse(state.val as string) : [] });
        }
    };

    onStateLastSeen = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === `kisshome-defender.${this.state.rxData.instance || 0}.info.detections.lastSeen`) {
            if ((state?.val || '') !== this.state.lastSeenID) {
                this.setState({ lastSeenID: (state?.val as string) || '' });
            }
        }
    };

    reportUxEvent = (event: {
        id: string;
        event: 'click' | 'down' | 'up' | 'show' | 'hide' | 'change';
        isTouchEvent?: boolean;
        ts: number;
        data?: string;
    }): void => {
        // Aggregate UX events by 10 seconds
        this.uxEvents ||= [];
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

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        return (
            <Card style={{ width: '100%', height: '100%' }}>
                <Toolbar
                    variant="dense"
                    style={{ width: 'calc(100% - 48px)', display: 'flex' }}
                >
                    <img
                        src={logo}
                        style={{ height: 32, marginRight: 8, marginLeft: 8 }}
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
                            label={I18n.t('kisshome-defender_Status')}
                        />
                        <Tab
                            value="statistics"
                            label={I18n.t('kisshome-defender_Statistics')}
                        />
                        <Tab
                            value="detections"
                            label={I18n.t('kisshome-defender_Detections')}
                        />
                        <div style={{ flexGrow: 1 }} />
                        <Tab
                            value="settings"
                            label={I18n.t('kisshome-defender_Settings')}
                        />
                    </Tabs>
                </Toolbar>
                <div style={{ width: '100%', height: 'calc(100% - 48px)' }}>
                    {this.state.tab === 'status' ? (
                        <StatusTab
                            reportUxEvent={this.reportUxEvent}
                            instance={this.state.rxData.instance || '0'}
                            context={this.props.context}
                        />
                    ) : null}
                    {this.state.tab === 'statistics' ? (
                        <StatisticsTab
                            reportUxEvent={this.reportUxEvent}
                            instance={this.state.rxData.instance || '0'}
                            context={this.props.context}
                        />
                    ) : null}
                    {this.state.tab === 'detections' ? (
                        <DetectionsTab
                            detections={this.state.detections}
                            lastSeenID={this.state.lastSeenID}
                            reportUxEvent={this.reportUxEvent}
                            instance={this.state.rxData.instance || '0'}
                            context={this.props.context}
                        />
                    ) : null}
                    {this.state.tab === 'settings' ? (
                        <SettingsTab
                            reportUxEvent={this.reportUxEvent}
                            instance={this.state.rxData.instance || '0'}
                            context={this.props.context}
                        />
                    ) : null}
                </div>
            </Card>
        );
    }
}
