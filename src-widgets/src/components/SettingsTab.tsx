import React, { Component } from 'react';

import type { VisContext } from '@iobroker/types-vis-2';
import { Button, LinearProgress, Link, MenuItem, Paper, Select, Slider, Switch } from '@mui/material';
import { I18n } from '@iobroker/adapter-react-v5';

interface SettingsTabProps {
    context: VisContext;
    instance: string;
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

    async findAdminLink(host: string): Promise<string> {
        const adminInstances = await this.props.context.socket.getAdapterInstances('admin');
        // Find active admin instance
        let activeAdmin = adminInstances.find(instance => instance.common.enabled && instance.common.host === host);
        activeAdmin ||= adminInstances.find(instance => instance.common.enabled);
        activeAdmin ||= adminInstances[0];
        if (activeAdmin) {
            return `http${activeAdmin.native.secure ? 's' : ''}://${activeAdmin.common.host === host ? window.location.hostname : activeAdmin.common.host}:${activeAdmin.native.port}/#tab-instances/config/system.adapter.kisshome-defender.${this.props.instance}/_instances`;
        }
        return '';
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
                adminLink: await this.findAdminLink(obj.common.host),
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
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                {this.state.adminLink ? (
                    <div style={{ width: '100%' }}>
                        <div style={{ fontWeight: 'bold', minWidth: 250 }}>{I18n.t('Manage monitored devices')}</div>
                        <Link
                            href={this.state.adminLink}
                            target="settings"
                        />
                    </div>
                ) : null}
                <div style={{ width: '100%' }}>
                    <div style={{ fontWeight: 'bold', minWidth: 250 }}>{I18n.t('Protection enabled')}</div>
                    <Switch
                        checked={this.state.enabled}
                        onChange={async (event, checked) => {
                            await this.props.context.socket.setState(
                                `kisshome-defender.${this.props.instance}.info.recording.enabled`,
                                checked,
                            );
                        }}
                    />
                </div>
                <div style={{ width: '100%', display: 'flex' }}>
                    <div style={{ fontWeight: 'bold', minWidth: 250 }}>{I18n.t('Save threshold in seconds')}</div>
                    <Slider
                        style={{ flexGrow: 1 }}
                        min={2}
                        max={60}
                        value={this.state.newConfig.saveThresholdSeconds!}
                        onChange={(event, value) => {
                            this.setState({
                                newConfig: {
                                    anomalySensitivity: this.state.newConfig!.anomalySensitivity,
                                    saveThresholdSeconds: value as number,
                                },
                            });
                        }}
                    />
                </div>
                <div style={{ width: '100%', display: 'flex' }}>
                    <div style={{ fontWeight: 'bold', minWidth: 250 }}>{I18n.t('Anomaly sensitivity')}</div>
                    <Select
                        value={this.state.newConfig.anomalySensitivity || 'medium'}
                        onChange={event =>
                            this.setState({
                                newConfig: {
                                    anomalySensitivity: event.target.value as 'low' | 'medium' | 'high',
                                    saveThresholdSeconds: this.state.newConfig!.saveThresholdSeconds,
                                },
                            })
                        }
                    >
                        <MenuItem value="low">{I18n.t('Low')}</MenuItem>
                        <MenuItem value="medium">{I18n.t('Medium')}</MenuItem>
                        <MenuItem value="high">{I18n.t('High')}</MenuItem>
                    </Select>
                </div>
                {settingsChanged ? (
                    <div style={{ width: '100%' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={async () => {
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
                                        configObj.native.saveThresholdSeconds =
                                            this.state.newConfig!.saveThresholdSeconds;
                                        void this.props.context.socket.setObject(
                                            `system.adapter.kisshome-defender.${this.props.instance}`,
                                            configObj,
                                        );
                                    },
                                );
                            }}
                        >
                            {I18n.t('Apply new settings')}
                        </Button>
                    </div>
                ) : null}
            </Paper>
        );
    }
}
