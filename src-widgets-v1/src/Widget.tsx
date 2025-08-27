import React, { Component } from 'react';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import {
    type LegacyConnection,
    Connection,
    PROGRESS,
    type ConnectionProps,
    Theme,
    type IobTheme,
    I18n,
} from '@iobroker/adapter-react-v5';

import KisshomeDefenderMain from './Widget/index';

import langEn from '@iobroker/adapter-react-v5/i18n/en.json';
import langDe from '@iobroker/adapter-react-v5/i18n/de.json';
import langRu from '@iobroker/adapter-react-v5/i18n/ru.json';
import langPt from '@iobroker/adapter-react-v5/i18n/pt.json';
import langNl from '@iobroker/adapter-react-v5/i18n/nl.json';
import langFr from '@iobroker/adapter-react-v5/i18n/fr.json';
import langIt from '@iobroker/adapter-react-v5/i18n/it.json';
import langEs from '@iobroker/adapter-react-v5/i18n/es.json';
import langPl from '@iobroker/adapter-react-v5/i18n/pl.json';
import langUk from '@iobroker/adapter-react-v5/i18n/uk.json';
import langZhCn from '@iobroker/adapter-react-v5/i18n/zh-cn.json';

import langLocalEn from './Widget/i18n/en.json';
import langLocalDe from './Widget/i18n/de.json';
import langLocalRu from './Widget/i18n/ru.json';
import langLocalPt from './Widget/i18n/pt.json';
import langLocalNl from './Widget/i18n/nl.json';
import langLocalFr from './Widget/i18n/fr.json';
import langLocalIt from './Widget/i18n/it.json';
import langLocalEs from './Widget/i18n/es.json';
import langLocalPl from './Widget/i18n/pl.json';
import langLocalUk from './Widget/i18n/uk.json';
import langLocalZhCn from './Widget/i18n/zh-cn.json';

if (window.socketUrl) {
    if (window.socketUrl.startsWith(':')) {
        window.socketUrl = `${window.location.protocol}//${window.location.hostname}${window.socketUrl}`;
    } else if (!window.socketUrl.startsWith('http://') && !window.socketUrl.startsWith('https://')) {
        window.socketUrl = `${window.location.protocol}//${window.socketUrl}`;
    }
}

let connection: Connection;
function singletonConnection(props: ConnectionProps, onConnectionChanged: (connected: boolean) => void): Connection {
    if (connection) {
        return connection;
    }

    // init translations
    const translations: Record<ioBroker.Languages, Record<string, string>> = {
        en: langEn,
        de: langDe,
        ru: langRu,
        pt: langPt,
        nl: langNl,
        fr: langFr,
        it: langIt,
        es: langEs,
        pl: langPl,
        uk: langUk,
        'zh-cn': langZhCn,
    };
    const ownTranslations: Record<ioBroker.Languages, Record<string, string>> = {
        en: langLocalEn,
        de: langLocalDe,
        ru: langLocalRu,
        pt: langLocalPt,
        nl: langLocalNl,
        fr: langLocalFr,
        it: langLocalIt,
        es: langLocalEs,
        pl: langLocalPl,
        uk: langLocalUk,
        'zh-cn': langLocalZhCn,
    };
    const ownTranslationsWithPrefix: { [lang in ioBroker.Languages]: Record<string, string> } = {
        en: {},
        de: {},
        ru: {},
        pt: {},
        nl: {},
        fr: {},
        it: {},
        es: {},
        pl: {},
        uk: {},
        'zh-cn': {},
    };

    // Add prefix to own translations
    Object.keys(ownTranslations).forEach(lang => {
        Object.keys(ownTranslations[lang as ioBroker.Languages]).forEach(key => {
            ownTranslationsWithPrefix[lang as ioBroker.Languages][`kisshome-defender_${key}`] =
                ownTranslations[lang as ioBroker.Languages][key];
        });
    });
    // merge together
    Object.keys(translations).forEach(
        lang =>
            (translations[lang as ioBroker.Languages] = Object.assign(
                translations[lang as ioBroker.Languages],
                ownTranslationsWithPrefix[lang as ioBroker.Languages],
            )),
    );

    I18n.setTranslations(translations);

    if (!props.protocol || !props.host || !props.port) {
        if (window.socketUrl) {
            if (window.socketUrl.startsWith('https')) {
                props.protocol = 'https:';
            } else {
                props.protocol = 'http:';
            }
            const [host, port] = window.socketUrl.split('/')[2].split(':');
            props.port = port || 80;
            props.host = host;
        }
    }

    connection = new Connection({
        ...props,
        protocol: props.protocol || window.location.protocol,
        host: props.host || window.location.hostname,
        port: props.port || 8082,
        name: 'kisshome-defender',
        // @ts-expect-error
        token: props.token,
        onProgress: (progress: PROGRESS) => {
            if (progress === PROGRESS.CONNECTING) {
                onConnectionChanged(false);
            } else if (progress === PROGRESS.READY) {
                onConnectionChanged(true);
            } else {
                onConnectionChanged(true);
            }
        },
        onReady: (/* objects, scripts */) => {},
    });

    return connection;
}

export interface IWidgetWebComponentProps {
    port?: number | string;
    protocol?: 'http:' | 'https:';
    host?: string;
    language?: ioBroker.Languages;
    instance?: string;
    theme?: 'light' | 'dark';
    editMode?: boolean | 'true' | 'false';
}

interface WidgetWebComponentState {
    connected: boolean;
    socket: Connection | null;
    theme: IobTheme;
    editMode: boolean;
}

export class WidgetWebComponent extends Component<IWidgetWebComponentProps, WidgetWebComponentState> {
    constructor(props: IWidgetWebComponentProps) {
        super(props);

        const theme = Theme(props.theme || 'light');

        this.state = {
            theme,
            socket: null,
            connected: false,
            editMode: this.props.editMode === true || this.props.editMode === 'true',
        };
        I18n.setLanguage(props.language || 'en');
    }

    iobOnPropertyChanged = (attr: string, value: string | boolean): void => {
        console.log(`New value ${attr}, ${value}`);
        if (attr === 'editMode') {
            const editMode = value === true || value === 'true';
            if (editMode !== this.state.editMode) {
                this.setState({ editMode });
            }
        }
    };

    componentDidMount(): void {
        (window as any)._iobOnPropertyChanged = this.iobOnPropertyChanged;

        this.setState({
            socket: singletonConnection(
                {
                    port: this.props.port,
                    host: this.props.host,
                    protocol: this.props.protocol,
                },
                (connected: boolean): void => this.setState({ connected }),
            ),
        });
    }

    componentWillUnmount(): void {
        if ((window as any)._iobOnPropertyChanged === this.iobOnPropertyChanged) {
            (window as any)._iobOnPropertyChanged = null;
        }
    }

    render(): React.JSX.Element {
        console.log(
            `Render socket: ${!!this.state.socket}, theme: ${!!this.state.theme}, connected: ${this.state.connected}, editMode: ${this.state.editMode}`,
        );

        if (!this.state.socket || !this.state.theme) {
            return <div>...</div>;
        }
        if (!this.state.connected) {
            return <div>...</div>;
        }

        return (
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={this.state.theme}>
                    <KisshomeDefenderMain
                        themeType={this.state.theme.palette.mode}
                        socket={this.state.socket as unknown as LegacyConnection}
                        instance={this.props.instance || '0'}
                        lang={this.props.language || 'de'}
                        editMode
                    />
                </ThemeProvider>
            </StyledEngineProvider>
        );
    }
}
