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

interface KisshomeDefenderRxData {
    instance: `${number}`;
}

interface KisshomeDefenderState extends VisRxWidgetState {
    tab: 'status' | 'statistics' | 'detections' | 'settings';
}

export default class KisshomeDefender extends (window.visRxWidget as typeof VisRxWidget)<
    KisshomeDefenderRxData,
    KisshomeDefenderState
> {
    constructor(props: VisRxWidgetProps) {
        super(props);
        this.state = {
            ...this.state,
            tab: (window.localStorage.getItem('kisshome-defender-tab') as KisshomeDefenderState['tab']) || 'status',
        };
    }

    static getWidgetInfo(): RxWidgetInfo {
        return {
            id: 'tplKisshomeDefender',
            visSet: 'kisshome-defender',
            visSetLabel: 'set_label', // Label of widget set
            visSetColor: '#ff9c2c', // Color of a widget set
            visWidgetLabel: 'KISShome', // Label of widget
            visName: 'KisshomeDefender',
            visAttrs: [
                {
                    name: 'common', // groupname
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
                height: 185,
                position: 'relative',
            },
            visPrev: 'widgets/kisshome-defender/img/prev_kisshome-defender.png',
        };
    }

    // eslint-disable-next-line class-methods-use-this
    getWidgetInfo(): RxWidgetInfo {
        return KisshomeDefender.getWidgetInfo();
    }

    renderWidgetBody(props: RxRenderWidgetProps): React.JSX.Element | React.JSX.Element[] | null {
        super.renderWidgetBody(props);

        return (
            <Card style={{ width: '100%', height: '100%' }}>
                <Toolbar
                    variant="dense"
                    style={{ width: '100%', display: 'flex' }}
                >
                    <img
                        src={logo}
                        style={{ height: '100%', marginRight: 8, marginLeft: 8 }}
                        alt="KISShome Defender"
                    />
                    <Tabs
                        style={{ flexGrow: 1 }}
                        value={this.state.tab || 'status'}
                        onChange={(_event, value: string) => {
                            this.setState({ tab: value as KisshomeDefenderState['tab'] });
                            window.localStorage.setItem('kisshome-defender-tab', value);
                        }}
                    >
                        <Tab
                            value="status"
                            label={I18n.t('Status')}
                        />
                        <Tab
                            value="statistics"
                            label={I18n.t('Statistics')}
                        />
                        <Tab
                            value="detections"
                            label={I18n.t('Detections')}
                        />
                        <div style={{ flexGrow: 1 }} />
                        <Tab
                            value="settings"
                            label={I18n.t('Settings')}
                        />
                    </Tabs>
                </Toolbar>
                <div style={{ width: '100%', height: 'calc(100% - 48px)' }}>
                    {this.state.tab === 'status' ? (
                        <StatusTab
                            instance={this.state.rxData.instance}
                            context={this.props.context}
                        />
                    ) : null}
                    {this.state.tab === 'statistics' ? (
                        <StatisticsTab
                            instance={this.state.rxData.instance}
                            context={this.props.context}
                        />
                    ) : null}
                    {this.state.tab === 'detections' ? (
                        <DetectionsTab
                            instance={this.state.rxData.instance}
                            context={this.props.context}
                        />
                    ) : null}
                    {this.state.tab === 'settings' ? (
                        <SettingsTab
                            instance={this.state.rxData.instance}
                            context={this.props.context}
                        />
                    ) : null}
                </div>
            </Card>
        );
    }
}
