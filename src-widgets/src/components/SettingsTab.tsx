import React, { Component } from 'react';

import type { VisContext } from '@iobroker/types-vis-2';
import { Button, LinearProgress, Link, MenuItem, Paper, Select, Slider, Switch } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';
import type { ReportUxHandler } from '../types';
import { findAdminLink } from './utils';

interface SettingsTabProps {
    context: VisContext;
    instance: string;
    reportUxEvent: ReportUxHandler;
}

interface SettingsTabState {
    initialConfig: {
        anomalySensitivity: 'low' | 'medium' | 'high';
        saveThresholdSeconds: number;
    } | null;
    newConfig: {
        anomalySensitivity: 'low' | 'medium' | 'high' | null;
        saveThresholdSeconds: number | null;
    } | null;
    adminLink: string;
    enabled: boolean;
}

export default class SettingsTab extends Component<SettingsTabProps, SettingsTabState> {
    constructor(props: SettingsTabProps) {
        super(props);
        this.state = {
            initialConfig: null,
            newConfig: null,
            adminLink: '',
            enabled: false,
        };
    }

    async componentDidMount(): Promise<void> {
        // Read configuration from the adapter
        const obj = await this.props.context.socket.getObject(
            `system.adapter.kisshome-defender.${this.props.instance}`,
        );
        const state = await this.props.context.socket.getState(
            `kisshome-defender.${this.props.instance}.info.recording.enabled`,
        );

        if (obj?.native) {
            this.setState({
                enabled: !!state?.val,
                initialConfig: {
                    anomalySensitivity: (obj.native.anomalySensitivity as 'low' | 'medium' | 'high') || 'medium',
                    saveThresholdSeconds: obj.native.saveThresholdSeconds || 60,
                },
                newConfig: {
                    anomalySensitivity: (obj.native.anomalySensitivity as 'low' | 'medium' | 'high') || 'medium',
                    saveThresholdSeconds: obj.native.saveThresholdSeconds || 60,
                },
                adminLink: await findAdminLink(this.props.context.socket, this.props.instance),
            });
        } else {
            console.error('Failed to load adapter configuration');
        }

        // Subscribe on changes
        await this.props.context.socket.subscribeObject(
            `system.adapter.kisshome-defender.${this.props.instance}`,
            this.onSettingsChanged,
        );
        await this.props.context.socket.subscribeState(
            `kisshome-defender.${this.props.instance}.info.recording.enabled`,
            this.onRunningChanged,
        );
    }

    componentWillUnmount(): void {
        // Unsubscribe from changes
        void this.props.context.socket.unsubscribeObject(
            `system.adapter.kisshome-defender.${this.props.instance}`,
            this.onSettingsChanged,
        );
        void this.props.context.socket.unsubscribeState(
            `kisshome-defender.${this.props.instance}.info.recording.enabled`,
            this.onRunningChanged,
        );
    }

    onRunningChanged = (id: string, state: ioBroker.State | null | undefined): void => {
        if (id === `kisshome-defender.${this.props.instance}.info.recording.enabled`) {
            if (!!state?.val !== this.state.enabled) {
                this.setState({ enabled: !!state?.val });
            }
        }
    };

    onSettingsChanged = (id: string, obj: ioBroker.Object | null | undefined): void => {
        if (id === `system.adapter.kisshome-defender.${this.props.instance}` && obj?.native) {
            // If really changed
            if (
                !this.state.initialConfig ||
                this.state.initialConfig.saveThresholdSeconds !== (obj.native.saveThresholdSeconds || 'medium') ||
                this.state.initialConfig.anomalySensitivity !== (obj.native.anomalySensitivity || 60)
            ) {
                this.setState({
                    initialConfig: {
                        anomalySensitivity: (obj.native.anomalySensitivity as 'low' | 'medium' | 'high') || 'medium',
                        saveThresholdSeconds: obj.native.saveThresholdSeconds || 60,
                    },
                    newConfig: {
                        anomalySensitivity: (obj.native.anomalySensitivity as 'low' | 'medium' | 'high') || 'medium',
                        saveThresholdSeconds: obj.native.saveThresholdSeconds || 60,
                    },
                });
            }
        }
    };

    render(): React.JSX.Element {
        if (!this.state.initialConfig || !this.state.newConfig) {
            return <LinearProgress />;
        }

        const settingsChanged =
            this.state.newConfig.saveThresholdSeconds !== this.state.initialConfig.saveThresholdSeconds ||
            this.state.newConfig.anomalySensitivity !== this.state.initialConfig.anomalySensitivity;

        return (
            <Paper
                style={{
                    width: 'calc(100% - 52px)',
                    height: 'calc(100% - 56px)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'start',
                    gap: 16,
                    padding: 16,
                    margin: 10,
                    borderRadius: 0,
                    border: `2px solid ${this.props.context.themeType === 'dark' ? 'white' : 'black'}`,
                    backgroundColor: this.props.context.themeType === 'dark' ? undefined : '#E6E6E6',
                    boxShadow: 'none',
                }}
            >
                {this.state.adminLink ? (
                    <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ fontWeight: 'bold', minWidth: 280 }}>
                            {I18n.t('kisshome-defender_Manage monitored devices')}
                        </div>
                        <Link
                            href={this.state.adminLink}
                            target="settings"
                            onClick={e => {
                                this.props.reportUxEvent({
                                    id: 'kisshome-defender-settings-admin-link',
                                    event: 'click',
                                    data: this.state.adminLink,
                                    ts: Date.now(),
                                    isTouchEvent: e instanceof TouchEvent,
                                });
                            }}
                        >
                            {I18n.t('kisshome-defender_Open in Admin')}
                        </Link>
                    </div>
                ) : null}
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontWeight: 'bold', minWidth: 280 }}>
                        {I18n.t('kisshome-defender_Protection enabled')}
                    </div>
                    <Switch
                        checked={this.state.enabled}
                        onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-protection-enabled',
                                event: 'down',
                                ts: Date.now(),
                                isTouchEvent: event instanceof TouchEvent,
                            });
                        }}
                        onMouseUp={(event: React.MouseEvent<HTMLButtonElement>) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-protection-enabled',
                                event: 'up',
                                ts: Date.now(),
                                isTouchEvent: event instanceof TouchEvent,
                            });
                        }}
                        onChange={async (event, checked) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-protection-enabled',
                                event: 'change',
                                ts: Date.now(),
                                isTouchEvent: event instanceof TouchEvent,
                            });

                            await this.props.context.socket.setState(
                                `kisshome-defender.${this.props.instance}.info.recording.enabled`,
                                checked,
                            );
                        }}
                    />
                </div>
                <div
                    style={{
                        width: 'calc(100% - 32px)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        marginRight: 32,
                    }}
                >
                    <div style={{ fontWeight: 'bold', minWidth: 280 }}>
                        {I18n.t('kisshome-defender_Save threshold in seconds')}
                    </div>
                    <Slider
                        style={{ flexGrow: 1 }}
                        min={2}
                        max={60}
                        valueLabelDisplay="on"
                        valueLabelFormat={val => I18n.t('kisshome-defender_%s minutes', val)}
                        marks={[
                            {
                                value: 2,
                                label: I18n.t('kisshome-defender_%s minutes', 2),
                            },
                            {
                                value: 15,
                                label: I18n.t('kisshome-defender_%s minutes', 15),
                            },
                            {
                                value: 30,
                                label: I18n.t('kisshome-defender_%s minutes', 30),
                            },
                            {
                                value: 45,
                                label: I18n.t('kisshome-defender_%s minutes', 45),
                            },
                            {
                                value: 60,
                                label: I18n.t('kisshome-defender_one hour'),
                            },
                        ]}
                        value={this.state.newConfig.saveThresholdSeconds!}
                        onChange={(event, value) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-save-threshold',
                                event: 'change',
                                ts: Date.now(),
                                isTouchEvent: event instanceof TouchEvent,
                            });
                            this.setState({
                                newConfig: {
                                    anomalySensitivity: this.state.newConfig!.anomalySensitivity,
                                    saveThresholdSeconds: value as number,
                                },
                            });
                        }}
                    />
                </div>
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ fontWeight: 'bold', minWidth: 280 }}>
                        {I18n.t('kisshome-defender_Anomaly sensitivity')}
                    </div>
                    <Select
                        style={{ minWidth: 180 }}
                        variant="standard"
                        value={this.state.newConfig.anomalySensitivity || 'medium'}
                        onChange={event => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-anomaly-sensitivity',
                                event: 'change',
                                ts: Date.now(),
                                isTouchEvent: event instanceof TouchEvent,
                            });
                            this.setState({
                                newConfig: {
                                    anomalySensitivity: event.target.value as 'low' | 'medium' | 'high',
                                    saveThresholdSeconds: this.state.newConfig!.saveThresholdSeconds,
                                },
                            });
                        }}
                    >
                        <MenuItem value="low">{I18n.t('kisshome-defender_Low')}</MenuItem>
                        <MenuItem value="medium">{I18n.t('kisshome-defender_Medium')}</MenuItem>
                        <MenuItem value="high">{I18n.t('kisshome-defender_High')}</MenuItem>
                    </Select>
                </div>
                <div style={{ width: '100%', opacity: settingsChanged ? 1 : 0 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={!settingsChanged}
                        onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-apply',
                                event: 'down',
                                ts: Date.now(),
                                isTouchEvent: event instanceof TouchEvent,
                            });
                        }}
                        onMouseUp={(event: React.MouseEvent<HTMLButtonElement>) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-apply',
                                event: 'up',
                                ts: Date.now(),
                                isTouchEvent: event instanceof TouchEvent,
                            });
                        }}
                        onClick={async (event: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-apply',
                                event: 'click',
                                ts: Date.now(),
                                isTouchEvent: event instanceof TouchEvent,
                            });
                            const configObj = await this.props.context.socket.getObject(
                                `system.adapter.kisshome-defender.${this.props.instance}`,
                            );
                            this.setState(
                                {
                                    initialConfig: {
                                        anomalySensitivity: this.state.newConfig!.anomalySensitivity!,
                                        saveThresholdSeconds: this.state.newConfig!.saveThresholdSeconds!,
                                    },
                                },
                                () => {
                                    configObj.native.anomalySensitivity = this.state.newConfig!.anomalySensitivity;
                                    configObj.native.saveThresholdSeconds = this.state.newConfig!.saveThresholdSeconds;
                                    void this.props.context.socket.setObject(
                                        `system.adapter.kisshome-defender.${this.props.instance}`,
                                        configObj,
                                    );
                                },
                            );
                        }}
                    >
                        {I18n.t('kisshome-defender_Apply new settings')}
                    </Button>
                </div>
            </Paper>
        );
    }
}
