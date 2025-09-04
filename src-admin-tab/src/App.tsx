import React, { Component } from 'react';
import { ThemeProvider, StyledEngineProvider } from '@mui/material/styles';

import {
    Connection,
    PROGRESS,
    Loader,
    I18n,
    Utils,
    Theme,
    type IobTheme,
    type ThemeName,
    type ThemeType,
    type LegacyConnection,
} from '@iobroker/adapter-react-v5';

import '@iobroker/adapter-react-v5/build/index.css';

import enGlobLang from '@iobroker/adapter-react-v5/i18n/en.json';
import deGlobLang from '@iobroker/adapter-react-v5/i18n/de.json';
import ruGlobLang from '@iobroker/adapter-react-v5/i18n/ru.json';
import ptGlobLang from '@iobroker/adapter-react-v5/i18n/pt.json';
import nlGlobLang from '@iobroker/adapter-react-v5/i18n/nl.json';
import frGlobLang from '@iobroker/adapter-react-v5/i18n/fr.json';
import itGlobLang from '@iobroker/adapter-react-v5/i18n/it.json';
import esGlobLang from '@iobroker/adapter-react-v5/i18n/es.json';
import plGlobLang from '@iobroker/adapter-react-v5/i18n/pl.json';
import ukGlobLang from '@iobroker/adapter-react-v5/i18n/uk.json';
import zhGlobLang from '@iobroker/adapter-react-v5/i18n/zh-cn.json';

import enLang from './Widget/i18n/en.json';
import deLang from './Widget/i18n/de.json';
import ruLang from './Widget/i18n/ru.json';
import ptLang from './Widget/i18n/pt.json';
import nlLang from './Widget/i18n/nl.json';
import frLang from './Widget/i18n/fr.json';
import itLang from './Widget/i18n/it.json';
import esLang from './Widget/i18n/es.json';
import plLang from './Widget/i18n/pl.json';
import ukLang from './Widget/i18n/uk.json';
import zhLang from './Widget/i18n/zh-cn.json';

import KisshomeDefender from './Widget';

type AppProps = object;

interface AppState {
    connected: boolean;
    theme: IobTheme;
    themeType: ThemeType;
}

export default class App extends Component<AppProps, AppState> {
    private readonly socket: Connection;
    private readonly instance: string;

    constructor(props: AppProps) {
        super(props);

        const themeInstance = App.createTheme();

        // #tab-kisshome-defender-0
        if (window.location.hash.startsWith('#tab-kisshome-defender-')) {
            this.instance = window.location.hash.replace('#', '').split('-').pop() || '0';
        } else {
            this.instance = '0';
        }

        this.state = {
            connected: false,
            theme: themeInstance,
            themeType: App.getThemeType(themeInstance),
        };

        // init translations
        const translations: Record<ioBroker.Languages, Record<string, string>> = {
            en: enGlobLang,
            de: deGlobLang,
            ru: ruGlobLang,
            pt: ptGlobLang,
            nl: nlGlobLang,
            fr: frGlobLang,
            it: itGlobLang,
            es: esGlobLang,
            pl: plGlobLang,
            uk: ukGlobLang,
            'zh-cn': zhGlobLang,
        };

        const ownTranslations: Record<ioBroker.Languages, Record<string, string>> = {
            en: enLang,
            de: deLang,
            ru: ruLang,
            pt: ptLang,
            nl: nlLang,
            fr: frLang,
            it: itLang,
            es: esLang,
            pl: plLang,
            uk: ukLang,
            'zh-cn': zhLang,
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

        // window.socketUrl = 'http://192.168.1.67:8081/';

        if (window.socketUrl?.startsWith(':')) {
            window.socketUrl = `${window.location.protocol}//${window.location.hostname}${window.socketUrl}`;
        }

        this.socket = new Connection({
            name: window.adapterName,
            onProgress: progress => {
                if (progress === PROGRESS.CONNECTING) {
                    this.setState({ connected: false });
                } else if (progress === PROGRESS.READY) {
                    this.setState({ connected: true });
                } else {
                    this.setState({ connected: true });
                }
            },
            onReady: () => {
                I18n.setLanguage(this.socket.systemLang);
            },
            onError: err => {
                console.error(err);
            },
        });
    }

    componentDidMount(): void {
        window.addEventListener('message', this.onReceiveMessage, false);
    }

    componentWillUnmount(): void {
        window.removeEventListener('message', this.onReceiveMessage, false);
    }

    // Detect theme updates
    private onReceiveMessage = (message: { data: string } | null): void => {
        if (message?.data) {
            if (message.data === 'updateTheme') {
                const newThemeName = Utils.getThemeName();
                Utils.setThemeName(Utils.getThemeName());

                const newTheme = App.createTheme(newThemeName);

                this.setState({
                    theme: newTheme,
                    themeType: App.getThemeType(newTheme),
                });
            }
        }
    };

    static createTheme(name?: ThemeName): IobTheme {
        return Theme(Utils.getThemeName(name));
    }

    static getThemeType(_theme: IobTheme): ThemeType {
        return _theme.palette.mode;
    }

    render(): React.JSX.Element | null {
        if (!this.state.connected) {
            return (
                <StyledEngineProvider injectFirst>
                    <ThemeProvider theme={this.state.theme}>
                        <Loader themeType={this.state.themeType} />
                    </ThemeProvider>
                </StyledEngineProvider>
            );
        }

        return (
            <StyledEngineProvider injectFirst>
                <ThemeProvider theme={this.state.theme}>
                    <KisshomeDefender
                        socket={this.socket as unknown as LegacyConnection}
                        instance={this.instance}
                        themeType={this.state.themeType}
                        editMode={false}
                        lang={this.socket.systemLang}
                        view="admin"
                        id="w00000"
                    />
                </ThemeProvider>
            </StyledEngineProvider>
        );
    }
}
