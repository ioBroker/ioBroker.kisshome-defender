/**
 * KISSHome defender as a web component: `<iob-kisshome-defender>` - the web component of the vis-2 widget
 * "KISSHome" (`src-widgets/src/KisshomeDefender.tsx`).
 *
 * One module for every host - vis-2, devices, Aura, admin (`@iobroker/web-components`). Its manifest is a file of
 * its own (`kisshome-defender.json`, written by the build from `manifest.ts`), so a host loads this module only when
 * it shows the element. The host sets `socket` and `settings`, and if it has them `theme`, `editMode` and `dialogs`.
 *
 * Like the vis-2 widget it has four views - status, statistics, detections, settings - and reads the states of
 * `kisshome-defender.<n>.info.` and the answers of the adapter to `getData` and `getTotals` (`sendTo`). It writes
 * what the widget writes: `info.recording.enabled` (protection on and off), `info.recording.triggerWrite` (control
 * now), and - acknowledged - `info.analysis.lastSeen` when the results are closed and `info.analysis.lastShownAlert`
 * when a new anomaly is shown. The results and the message about a new anomaly are dialogs the host frames
 * (`openDialog()`).
 *
 * Left out, because the adapter has stopped all cloud communication (`NO_COMMUNICATION` in `src/lib/CloudSync.ts`):
 * the questionnaire and the report of UX events. Left out, because a web component may not write objects: changing
 * the save threshold - the settings view shows it and links to the settings of the instance in admin.
 *
 * React is not in the module: it comes from `lib/esm/react-19.js` beside `adapter/`, see `vite.config.ts`.
 */
import { createRoot, type Root } from 'react-dom/client';

import { defineWebComponent, getThemeCssVariables, IobWebComponent } from '@iobroker/web-components/element';

import {
    ADAPTER,
    getAliveId,
    getInfoId,
    getInstance,
    getInstanceObjectId,
    INFO_STATES,
    TAG,
    VIEWS,
    type DefenderSettings,
    type InfoState,
    type View,
} from './constants';
import { AlertMessage, ResultsList, type AlertAnswer } from './dialogs';
import { getAdminLink, getNewestAlert, type StoredAnalysisResult, type StoredStatisticsResult } from './format';
import { getTranslate, type Translate } from './i18n';
import { DIALOG_STYLES, STYLES } from './styles';
import { App, Hint, readStored, writeStored, type DefenderValues, type StatisticsType, type Totals } from './views';

/** Where the vis-2 widget keeps its last tab - the element shares it */
const VIEW_KEY = 'kisshome-defender-tab';

/** Until when new anomalies are not shown (ISO date), shared with the vis-2 widget */
const IGNORE_KEY = 'ignoreNewAlerts';

/** The logo next to the module: `/adapter/kisshome-defender/kisshome-defender.svg`. A variable, so Vite leaves it */
const LOGO_PATH = `../${ADAPTER}.svg`;

/**
 * A dialog content: a `div` with a shadow root of its own, the styles of the dialogs and the theme of the element -
 * the host moves it out of the element into its dialog
 */
function createDialogContent(theme: Record<string, string>): { element: HTMLDivElement; root: Root } {
    const element = document.createElement('div');
    for (const [name, value] of Object.entries(theme)) {
        element.style.setProperty(name, value);
    }
    const shadow = element.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = DIALOG_STYLES;
    const mount = document.createElement('div');
    shadow.append(style, mount);
    return { element, root: createRoot(mount) };
}

class KisshomeDefender extends IobWebComponent<DefenderSettings> {
    readonly #mount: HTMLDivElement;

    /** Created when drawn, unmounted when the element leaves the document - that stops the timers of the views */
    #root: Root | null = null;

    #view: View;

    /** The instance the data below belongs to */
    #instance: string | null = null;

    /** The answer of `getData` (`allStatistics`): the analyses of the last seven days */
    #results: StoredStatisticsResult | null = null;

    /** `<instance>/<lastCreated>` the results were read for: they are read again after each new analysis */
    #resultsFor = '';

    /** The newest anomaly this element showed or marked as shown */
    #lastShownAlert = '';

    #adminLink = '';

    /** The instance the admin link was looked up for */
    #adminLinkFor = '';

    /** Draws the open results dialog again with the current results; null while none is open */
    #drawResults: (() => void) | null = null;

    #alertOpen = false;

    readonly #logo: string;

    constructor() {
        super();
        const shadow = this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = STYLES;
        this.#mount = document.createElement('div');
        this.#mount.className = 'mount';
        shadow.append(style, this.#mount);
        const stored = readStored(VIEW_KEY);
        this.#view = VIEWS.find(view => view === stored) || 'status';
        this.#logo = new URL(LOGO_PATH, import.meta.url).href;
    }

    override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.#root?.unmount();
        this.#root = null;
    }

    protected override getStateIds(settings: DefenderSettings): string[] {
        const instance = getInstance(settings.instance);
        return instance ? [getAliveId(instance), ...INFO_STATES.map(name => getInfoId(instance, name))] : [];
    }

    protected override getObjectIds(settings: DefenderSettings): string[] {
        const instance = getInstance(settings.instance);
        // the host for the link to admin, and the save threshold
        return instance ? [getInstanceObjectId(instance)] : [];
    }

    #t = (): Translate => getTranslate(this.systemLang);

    #state(instance: string, name: InfoState): ioBroker.State | null | undefined {
        return this.states[getInfoId(instance, name)];
    }

    #values(instance: string): DefenderValues {
        const val = (name: InfoState): ioBroker.StateValue | undefined => this.#state(instance, name)?.val;
        const nextWrite = val('recording.nextWrite');
        return {
            alive: !!this.states[getAliveId(instance)]?.val,
            recordingEnabled: !!val('recording.enabled'),
            recordingRunning: !!val('recording.running'),
            captured: Number(val('recording.capturedFull')) || 0,
            nextWrite: nextWrite ? new Date(nextWrite as string | number).getTime() || 0 : 0,
            analysisRunning: !!val('analysis.running'),
            idsStatus: String(val('ids.status') || ''),
            lastTriggerWrite: this.#state(instance, 'recording.triggerWrite')?.lc || 0,
            lastSeenID: String(val('analysis.lastSeen') || ''),
            lastCreated: String(val('analysis.lastCreated') ?? ''),
            group: val('ids.group') === 'B' ? 'B' : 'A',
            secondPeriod: !!val('ids.period'),
        };
    }

    /** Draw again, e.g. when an answer of the adapter arrived */
    #draw(): void {
        if (this.isConnected) {
            this.render();
        }
    }

    #setView = (view: View): void => {
        this.#view = view;
        writeStored(VIEW_KEY, view);
        this.#draw();
    };

    /** Asks the adapter for one of its statistics - the element is drawn anew for another instance */
    #load = async (type: StatisticsType): Promise<unknown> => {
        const instance = this.#instance;
        return this.socket && instance ? this.socket.sendTo(instance, 'getData', { type }) : null;
    };

    #loadTotals = async (): Promise<Totals | null> => {
        const instance = this.#instance;
        return this.socket && instance ? this.socket.sendTo<Totals | null>(instance, 'getTotals', {}) : null;
    };

    #toggleProtection = (): void => {
        const instance = this.#instance;
        if (instance) {
            void this.setState(
                getInfoId(instance, 'recording.enabled'),
                !this.#state(instance, 'recording.enabled')?.val,
            );
        }
    };

    #trigger = (): void => {
        if (this.#instance) {
            void this.setState(getInfoId(this.#instance, 'recording.triggerWrite'), true);
        }
    };

    #showResults = (): void => {
        void this.#openResults('');
    };

    /**
     * Reads the results once the states are there that decide about a new anomaly, and again after each new
     * analysis (`info.analysis.lastCreated`) and each start of the instance
     */
    #checkResults(instance: string): void {
        const socket = this.socket;
        const ids = [
            getAliveId(instance),
            getInfoId(instance, 'analysis.lastCreated'),
            getInfoId(instance, 'analysis.lastSeen'),
            getInfoId(instance, 'analysis.lastShownAlert'),
        ];
        if (!socket || ids.some(id => this.states[id] === undefined)) {
            return;
        }
        if (!this.states[getAliveId(instance)]?.val) {
            // read again when it runs again
            this.#resultsFor = '';
            return;
        }
        const key = `${instance}/${String(this.#state(instance, 'analysis.lastCreated')?.val ?? '')}`;
        if (key === this.#resultsFor) {
            return;
        }
        this.#resultsFor = key;
        socket
            .sendTo<StoredStatisticsResult | null>(instance, 'getData', { type: 'allStatistics' })
            .then(result => {
                if (this.#resultsFor !== key || !result || !Array.isArray(result.results)) {
                    return;
                }
                this.#results = result;
                this.#checkNewAlert(instance, result);
                this.#draw();
            })
            .catch((e: unknown) => console.warn(`<${TAG}>: cannot read the results of ${instance}: ${String(e)}`));
    }

    /** Like the vis-2 widget: a new anomaly is marked as shown and - unless switched off - shown in a dialog */
    #checkNewAlert(instance: string, result: StoredStatisticsResult): void {
        const alert = getNewestAlert(result.results);
        if (!alert || this.editMode || !this.socket) {
            return;
        }
        const known = [
            this.#lastShownAlert,
            this.#state(instance, 'analysis.lastShownAlert')?.val,
            this.#state(instance, 'analysis.lastSeen')?.val,
        ];
        if (known.includes(alert.uuid)) {
            return;
        }
        this.#lastShownAlert = alert.uuid;
        void this.socket.setState(getInfoId(instance, 'analysis.lastShownAlert'), alert.uuid, true);

        const ignoreUntil = new Date(readStored(IGNORE_KEY) || 0).getTime() || 0;
        if (
            this.settings.alertDialog !== false &&
            ignoreUntil <= Date.now() &&
            !this.#drawResults &&
            !this.#alertOpen
        ) {
            void this.#openAlert(alert);
        }
    }

    async #openAlert(alert: StoredAnalysisResult): Promise<void> {
        const t = this.#t();
        const { element, root } = createDialogContent(getThemeCssVariables(this.theme));
        let ignore = false;
        root.render(
            <AlertMessage
                t={t}
                alert={alert}
                onIgnore={value => (ignore = value)}
            />,
        );
        this.#alertOpen = true;
        let answer: unknown = null;
        try {
            answer = await this.openDialog({ title: t('Unusual activity detected!'), element, width: 640 });
        } finally {
            this.#alertOpen = false;
            root.unmount();
        }
        writeStored(IGNORE_KEY, ignore ? new Date(Date.now() + 10 * 60 * 1000).toISOString() : null);
        if (answer === ('details' satisfies AlertAnswer)) {
            this.#setView('detections');
            await this.#openResults(alert.uuid);
        }
    }

    /**
     * The results of the last seven days in a dialog of the host. Closing it marks the newest anomaly as seen, like
     * the vis-2 widget does.
     *
     * @param openUuid the result to open
     */
    async #openResults(openUuid: string): Promise<void> {
        const instance = this.#instance;
        if (this.editMode || this.#drawResults || !instance) {
            return;
        }
        const t = this.#t();
        const { element, root } = createDialogContent(getThemeCssVariables(this.theme));
        this.#drawResults = () => {
            const values = this.#values(instance);
            root.render(
                <ResultsList
                    t={t}
                    results={this.#results}
                    group={values.group}
                    secondPeriod={values.secondPeriod}
                    openUuid={openUuid}
                    now={Date.now()}
                />,
            );
        };
        this.#drawResults();
        try {
            await this.openDialog({ title: t('Results'), element, width: 1000, height: 720 });
        } finally {
            this.#drawResults = null;
            root.unmount();
        }
        const newest = getNewestAlert(this.#results?.results);
        if (newest && this.socket && !this.editMode && this.#instance === instance) {
            void this.socket.setState(getInfoId(instance, 'analysis.lastSeen'), newest.uuid, true);
        }
    }

    /** Looks up once per instance where admin shows the settings of the instance */
    #checkAdminLink(instance: string, instanceObj: ioBroker.Object | null | undefined): void {
        const socket = this.socket;
        if (!socket || !instanceObj || this.#adminLinkFor === instance) {
            return;
        }
        this.#adminLinkFor = instance;
        socket
            .getObjectViewSystem('instance', 'system.adapter.admin.', 'system.adapter.admin.香')
            .then(admins => {
                if (this.#adminLinkFor === instance) {
                    this.#adminLink = getAdminLink(
                        instanceObj,
                        Object.values(admins),
                        instance,
                        window.location.hostname,
                    );
                    this.#draw();
                }
            })
            .catch(() => {
                // no link then
            });
    }

    protected override render(): void {
        this.#root ||= createRoot(this.#mount);
        const t = this.#t();
        const instance = getInstance(this.settings.instance);
        if (instance !== this.#instance) {
            this.#instance = instance;
            this.#results = null;
            this.#resultsFor = '';
            this.#lastShownAlert = '';
            this.#adminLink = '';
            this.#adminLinkFor = '';
        }

        if (!instance) {
            this.#root.render(
                <Hint
                    text={t('chooseInstance')}
                    editMode={this.editMode}
                />,
            );
            return;
        }
        const instanceObj = this.objects[getInstanceObjectId(instance)];
        if (instanceObj === null) {
            this.#root.render(
                <Hint
                    text={`${t('noInstance')}: ${instance}`}
                    editMode={this.editMode}
                />,
            );
            return;
        }

        this.#checkResults(instance);
        this.#checkAdminLink(instance, instanceObj);
        const threshold = Number(instanceObj?.native?.saveThresholdSeconds);

        this.#root.render(
            <App
                key={instance}
                t={t}
                lang={this.systemLang}
                editMode={this.editMode}
                view={this.#view}
                logo={this.#logo}
                values={this.#values(instance)}
                results={this.#results}
                adminLink={this.#adminLink}
                saveThresholdSeconds={threshold > 0 ? threshold : null}
                onView={this.#setView}
                onToggleProtection={this.#toggleProtection}
                onTrigger={this.#trigger}
                onShowResults={this.#showResults}
                load={this.#load}
                loadTotals={this.#loadTotals}
            />,
        );
        this.#drawResults?.();
    }
}

defineWebComponent(TAG, KisshomeDefender);
