import React, { Component } from 'react';

import { Button, LinearProgress, Link, Paper, Slider, Switch } from '@mui/material';
import { I18n, type LegacyConnection, type ThemeType } from '@iobroker/adapter-react-v5';
import type { ReportUxHandler } from '../types';
import { findAdminLink, isTouch } from './utils';

interface SettingsTabProps {
    instance: string;
    reportUxEvent: ReportUxHandler;
    socket: LegacyConnection;
    themeType: ThemeType;
    isMobile: boolean;
}

interface SettingsTabState {
    initialConfig: {
        saveThresholdSeconds: number;
    } | null;
    newConfig: {
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
        const obj = await this.props.socket.getObject(`system.adapter.kisshome-defender.${this.props.instance}`);
        const state = await this.props.socket.getState(
            `kisshome-defender.${this.props.instance}.info.recording.enabled`,
        );

        if (obj?.native) {
            this.setState({
                enabled: !!state?.val,
                initialConfig: {
                    saveThresholdSeconds: obj.native.saveThresholdSeconds || 3600,
                },
                newConfig: {
                    saveThresholdSeconds: obj.native.saveThresholdSeconds || 3600,
                },
                adminLink: await findAdminLink(this.props.socket, this.props.instance),
            });
        } else {
            console.error('Failed to load adapter configuration');
        }

        // Subscribe on changes
        await this.props.socket.subscribeObject(
            `system.adapter.kisshome-defender.${this.props.instance}`,
            this.onSettingsChanged,
        );
        await this.props.socket.subscribeState(
            `kisshome-defender.${this.props.instance}.info.recording.enabled`,
            this.onRunningChanged,
        );
    }

    componentWillUnmount(): void {
        // Unsubscribe from changes
        void this.props.socket.unsubscribeObject(
            `system.adapter.kisshome-defender.${this.props.instance}`,
            this.onSettingsChanged,
        );
        void this.props.socket.unsubscribeState(
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
                this.state.initialConfig.saveThresholdSeconds !==
                    (parseInt(obj.native.saveThresholdSeconds, 10) || 3600)
            ) {
                this.setState({
                    initialConfig: {
                        saveThresholdSeconds: obj.native.saveThresholdSeconds || 3600,
                    },
                    newConfig: {
                        saveThresholdSeconds: obj.native.saveThresholdSeconds || 3600,
                    },
                });
            }
        }
    };

    renderDesktopScreen(settingsChanged: boolean): React.JSX.Element {
        return (
            <>
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
                                    isTouchEvent: isTouch(e),
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
                        onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-protection-enabled',
                                event: 'down',
                                ts: Date.now(),
                                isTouchEvent: isTouch(e),
                            });
                        }}
                        onMouseUp={(e: React.MouseEvent<HTMLButtonElement>) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-protection-enabled',
                                event: 'up',
                                ts: Date.now(),
                                isTouchEvent: isTouch(e),
                            });
                        }}
                        onChange={async (e, checked) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-protection-enabled',
                                event: 'change',
                                ts: Date.now(),
                                isTouchEvent: isTouch(e),
                            });

                            await this.props.socket.setState(
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
                        value={Math.round(this.state.newConfig?.saveThresholdSeconds || 3600) / 60}
                        onChange={(e, value) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-save-threshold',
                                event: 'change',
                                ts: Date.now(),
                                data: (value as number).toString(),
                                isTouchEvent: isTouch(e),
                            });
                            this.setState({
                                newConfig: {
                                    saveThresholdSeconds: (value as number) * 60,
                                },
                            });
                        }}
                    />
                </div>
                <div style={{ width: '100%', opacity: settingsChanged ? 1 : 0 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={!settingsChanged}
                        onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-apply',
                                event: 'down',
                                ts: Date.now(),
                                isTouchEvent: isTouch(e),
                            });
                        }}
                        onMouseUp={(e: React.MouseEvent<HTMLButtonElement>) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-apply',
                                event: 'up',
                                ts: Date.now(),
                                isTouchEvent: isTouch(e),
                            });
                        }}
                        onClick={async (e: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-apply',
                                event: 'click',
                                ts: Date.now(),
                                isTouchEvent: isTouch(e),
                            });
                            const configObj = await this.props.socket.getObject(
                                `system.adapter.kisshome-defender.${this.props.instance}`,
                            );
                            this.setState(
                                {
                                    initialConfig: {
                                        saveThresholdSeconds: this.state.newConfig?.saveThresholdSeconds || 3600,
                                    },
                                },
                                () => {
                                    configObj.native.saveThresholdSeconds =
                                        this.state.newConfig?.saveThresholdSeconds || 3600;
                                    void this.props.socket.setObject(
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
            </>
        );
    }

    renderMobileScreen(settingsChanged: boolean): React.JSX.Element {
        return (
            <>
                {this.state.adminLink ? (
                    <div
                        style={{
                            width: '100%',
                            display: 'flex',
                            gap: 8,
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                        }}
                    >
                        <div style={{ fontWeight: 'bold' }}>{I18n.t('kisshome-defender_Manage monitored devices')}</div>
                        <Link
                            href={this.state.adminLink}
                            target="settings"
                            onClick={e => {
                                this.props.reportUxEvent({
                                    id: 'kisshome-defender-settings-admin-link',
                                    event: 'click',
                                    data: this.state.adminLink,
                                    ts: Date.now(),
                                    isTouchEvent: isTouch(e),
                                });
                            }}
                        >
                            {I18n.t('kisshome-defender_Open in Admin')}
                        </Link>
                    </div>
                ) : null}
                <div
                    style={{
                        display: 'flex',
                        gap: 8,
                        width: '100%',
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                    }}
                >
                    <div style={{ fontWeight: 'bold' }}>{I18n.t('kisshome-defender_Protection enabled')}</div>
                    <Switch
                        checked={this.state.enabled}
                        onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-protection-enabled',
                                event: 'down',
                                ts: Date.now(),
                                isTouchEvent: isTouch(e),
                            });
                        }}
                        onMouseUp={(e: React.MouseEvent<HTMLButtonElement>) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-protection-enabled',
                                event: 'up',
                                ts: Date.now(),
                                isTouchEvent: isTouch(e),
                            });
                        }}
                        onChange={async (e, checked) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-protection-enabled',
                                event: 'change',
                                ts: Date.now(),
                                isTouchEvent: isTouch(e),
                            });

                            await this.props.socket.setState(
                                `kisshome-defender.${this.props.instance}.info.recording.enabled`,
                                checked,
                            );
                        }}
                    />
                </div>
                <div
                    style={{
                        width: '100%',
                        display: 'flex',
                        gap: 8,
                        justifyContent: 'flex-start',
                        flexDirection: 'column',
                    }}
                >
                    <div style={{ fontWeight: 'bold' }}>{I18n.t('kisshome-defender_Save threshold in seconds')}</div>
                    <Slider
                        style={{
                            width: 'calc(100% - 40px)',
                            marginLeft: 20,
                        }}
                        min={10}
                        max={60}
                        valueLabelDisplay="auto"
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
                        value={Math.round(this.state.newConfig?.saveThresholdSeconds || 3600) / 60}
                        onChange={(e, value) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-save-threshold',
                                event: 'change',
                                ts: Date.now(),
                                data: (value as number).toString(),
                                isTouchEvent: isTouch(e),
                            });
                            this.setState({
                                newConfig: {
                                    saveThresholdSeconds: (value as number) * 60,
                                },
                            });
                        }}
                    />
                </div>
                <div style={{ width: '100%', opacity: settingsChanged ? 1 : 0 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={!settingsChanged}
                        onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-apply',
                                event: 'down',
                                ts: Date.now(),
                                isTouchEvent: isTouch(e),
                            });
                        }}
                        onMouseUp={(e: React.MouseEvent<HTMLButtonElement>) => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-apply',
                                event: 'up',
                                ts: Date.now(),
                                isTouchEvent: isTouch(e),
                            });
                        }}
                        onClick={async (e: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-settings-apply',
                                event: 'click',
                                ts: Date.now(),
                                isTouchEvent: isTouch(e),
                            });
                            const configObj = await this.props.socket.getObject(
                                `system.adapter.kisshome-defender.${this.props.instance}`,
                            );
                            this.setState(
                                {
                                    initialConfig: {
                                        saveThresholdSeconds: this.state.newConfig?.saveThresholdSeconds || 3600,
                                    },
                                },
                                () => {
                                    configObj.native.saveThresholdSeconds =
                                        this.state.newConfig?.saveThresholdSeconds || 3600;
                                    void this.props.socket.setObject(
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
            </>
        );
    }

    render(): React.JSX.Element {
        if (!this.state.initialConfig || !this.state.newConfig) {
            return <LinearProgress />;
        }
        const settingsChanged =
            this.state.newConfig.saveThresholdSeconds !== this.state.initialConfig.saveThresholdSeconds;

        return (
            <Paper
                style={{
                    width: `calc(100% - ${this.props.isMobile ? 5 * 2 + 20 : 16 * 2 + 20}px)`,
                    height: `calc(100% - ${this.props.isMobile ? 32 : 56}px)`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'start',
                    gap: this.props.isMobile ? 40 : 24,
                    padding: this.props.isMobile ? 5 : 16,
                    margin: 10,
                    borderRadius: 0,
                    border: `2px solid ${this.props.themeType === 'dark' ? 'white' : 'black'}`,
                    backgroundColor: this.props.themeType === 'dark' ? undefined : '#E6E6E6',
                    boxShadow: 'none',
                }}
            >
                {this.props.isMobile
                    ? this.renderMobileScreen(settingsChanged)
                    : this.renderDesktopScreen(settingsChanged)}{' '}
            </Paper>
        );
    }
}
