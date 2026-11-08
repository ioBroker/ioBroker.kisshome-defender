/**
 * What the element draws: a header with the four views of the vis-2 widget - status, statistics, detections,
 * settings - and the view below it. Plain React and the CSS of `styles.ts`, no MUI.
 */
import { useEffect, useState, type JSX } from 'react';

import { LineChart, PALETTE, StackedBars, type BarCategory, type BarRow, type LineSeries } from './charts';
import { VIEWS, type View } from './constants';
import {
    bytes2string,
    countUnseenAlerts,
    getLastControl,
    type DataVolumePerCountryResult,
    type DataVolumePerDaytimeResult,
    type DataVolumePerDeviceResult,
    type MACAddress,
    type StoredStatisticsResult,
} from './format';
import type { Translate, WordKey } from './i18n';
import { Icon, StatusIcon, type IconName } from './icons';

/** What the element reads from the states of the instance */
export interface DefenderValues {
    alive: boolean;
    recordingEnabled: boolean;
    recordingRunning: boolean;
    /** Bytes recorded for the next analysis */
    captured: number;
    /** When the next analysis starts at the latest, in ms; 0 if unknown */
    nextWrite: number;
    analysisRunning: boolean;
    /** `info.ids.status`: Running, Started, Configuring, Analyzing, Error, No connection, Exited */
    idsStatus: string;
    /** When an analysis was last asked for (`lc` of `info.recording.triggerWrite`), in ms */
    lastTriggerWrite: number;
    /** The UUID of the last alert the user saw */
    lastSeenID: string;
    /** The changing value of `info.analysis.lastCreated`: a new analysis */
    lastCreated: string;
    group: 'A' | 'B';
    /** Week 3 and later of the study */
    secondPeriod: boolean;
}

/** The answers of the adapter to `getData` */
export type StatisticsType =
    'dataVolumePerDevice' | 'dataVolumePerDay' | 'dataVolumePerCountry' | 'dataVolumePerDaytime';

export interface Totals {
    deviceMostCountries?: string;
    dataVolumePerDevice?: string;
}

/** After a click on "Execute control now" the button waits that long, like in the vis-2 widget */
export const TRIGGER_PAUSE_MS = 120_000;

const VIEW_ICONS: Record<View, IconName> = {
    status: 'shield',
    statistics: 'chart',
    detections: 'bell',
    settings: 'settings',
};

const VIEW_WORDS: Record<View, WordKey> = {
    status: 'Status',
    statistics: 'Statistics',
    detections: 'Detections',
    settings: 'Settings',
};

const STATISTICS: { type: StatisticsType; word: WordKey }[] = [
    { type: 'dataVolumePerDevice', word: 'By day' },
    { type: 'dataVolumePerDay', word: 'By day (aggregated)' },
    { type: 'dataVolumePerCountry', word: 'By country' },
    { type: 'dataVolumePerDaytime', word: 'By day-time' },
];

const DAYTIMES = ['0-6', '6-12', '12-18', '18-24'];

/**
 * Read a value the vis-2 widget keeps in the browser, like the last tab
 *
 * @param key the key of `localStorage`
 */
export function readStored(key: string): string | null {
    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

/**
 * Keep a value in the browser; nothing happens where storage is not allowed
 *
 * @param key the key of `localStorage`
 * @param value the value, `null` removes it
 */
export function writeStored(key: string, value: string | null): void {
    try {
        if (value === null) {
            window.localStorage.removeItem(key);
        } else {
            window.localStorage.setItem(key, value);
        }
    } catch {
        // private mode, blocked storage: only the remembering is lost
    }
}

/**
 * The current time, again every `ms` while `active`
 *
 * @param active whether the time is needed
 * @param ms how often
 */
function useNow(active: boolean, ms: number): number {
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        if (!active) {
            return undefined;
        }
        const timer = setInterval(() => setNow(Date.now()), ms);
        return () => clearInterval(timer);
    }, [active, ms]);
    return now;
}

/** A message in the middle of the element: a missing setting, an unknown instance */
export function Hint({ text, editMode }: { text: string; editMode: boolean }): JSX.Element {
    return (
        <div className={`app hint${editMode ? ' edit' : ''}`}>
            <Icon name="shield" />
            <div>{text}</div>
        </div>
    );
}

/** Text with `<strong>` of the dictionary, without `innerHTML` */
export function Rich({ parts }: { parts: { text: string; strong: boolean }[] }): JSX.Element {
    return (
        <>
            {parts.map((part, i) =>
                part.strong ? <strong key={i}>{part.text}</strong> : <span key={i}>{part.text}</span>,
            )}
        </>
    );
}

/** The summary of the alerts at the bottom of the status and the detections view */
function ProblemSummary(props: {
    t: Translate;
    unseen: number;
    onClick?: () => void;
    button?: JSX.Element | null;
}): JSX.Element {
    const text = props.unseen ? `${props.t('New problem detected')}: ${props.unseen}` : props.t('Everything OK');
    const content = (
        <>
            {props.button || <span />}
            <span className="summary-text">{text}</span>
            <StatusIcon
                ok={!props.unseen}
                warning
                size="2.2em"
            />
        </>
    );
    return props.onClick ? (
        <button
            type="button"
            className="panel summary clickable"
            onClick={props.onClick}
        >
            {content}
        </button>
    ) : (
        <div className="panel summary">{content}</div>
    );
}

interface ViewProps {
    t: Translate;
    values: DefenderValues;
    results: StoredStatisticsResult | null;
}

function StatusView(
    props: ViewProps & {
        adminLink: string;
        onToggleProtection: () => void;
        onDetections: () => void;
    },
): JSX.Element {
    const { t, values } = props;
    const results = props.results?.results || [];
    const unseen = countUnseenAlerts(results, values.lastSeenID);
    let problem = '';
    if (!values.alive) {
        problem = t('Instance is not running');
    } else if (values.idsStatus === 'Error') {
        problem = t('engineExited');
    } else if (!values.recordingRunning) {
        problem = t('Recording is not running. Please check the log for more details');
    }
    const engineColor =
        values.idsStatus === 'Error' || values.idsStatus === 'Exited'
            ? 'bad'
            : values.idsStatus === 'No connection' || !values.idsStatus || values.idsStatus === 'Unknown'
              ? 'warn'
              : 'good';

    return (
        <>
            <div className="panel status-main">
                <div className="status-rows">
                    {values.alive ? (
                        <>
                            <div className="status-row">
                                <StatusIcon
                                    ok={values.recordingRunning}
                                    title={problem}
                                />
                                <span>
                                    {t(values.recordingRunning ? 'Software activated' : 'Software not activated')}
                                </span>
                            </div>
                            <div className="status-row">
                                <StatusIcon ok={engineColor === 'good'} />
                                <span>
                                    {t('Detection engine status')}:{' '}
                                    <span className={`engine ${engineColor}`}>
                                        {t((values.idsStatus || 'Unknown') as WordKey)}
                                    </span>
                                </span>
                            </div>
                            {values.recordingRunning ? (
                                <div className="status-row">
                                    <span
                                        className="spinner"
                                        aria-hidden="true"
                                    />
                                    <span>
                                        {t('Recording is running')}:{' '}
                                        <span className="secondary">
                                            {t('%s collected', bytes2string(values.captured))}
                                        </span>
                                    </span>
                                </div>
                            ) : null}
                        </>
                    ) : (
                        <>
                            <div className="status-row">
                                <StatusIcon ok={false} />
                                <span>{t('Instance is not running')}</span>
                            </div>
                            {props.adminLink ? (
                                <a
                                    className="link"
                                    href={props.adminLink}
                                    target="settings"
                                    rel="noreferrer"
                                >
                                    {t('Enable the instance in the admin')}
                                    <Icon name="openInNew" />
                                </a>
                            ) : null}
                        </>
                    )}
                </div>
                {values.alive ? (
                    <button
                        type="button"
                        className="btn"
                        onClick={props.onToggleProtection}
                    >
                        {t(values.recordingEnabled ? 'Deactivate protection' : 'Activate protection')}
                    </button>
                ) : null}
            </div>
            {values.alive ? (
                <ProblemSummary
                    t={t}
                    unseen={unseen}
                    onClick={results.length ? props.onDetections : undefined}
                />
            ) : null}
        </>
    );
}

function DetectionsView(props: ViewProps & { onTrigger: () => void; onShowResults: () => void }): JSX.Element {
    const { t, values } = props;
    const results = props.results?.results || [];
    const pausedUntil = values.lastTriggerWrite + TRIGGER_PAUSE_MS;
    // ticks every second while the button waits, else slowly for "in x minutes"
    const [fast, setFast] = useState(false);
    const now = useNow(values.alive, fast ? 1000 : 15_000);
    const paused = pausedUntil > now;
    if (paused !== fast) {
        // adjusting state while rendering, the way React recommends instead of an effect
        setFast(paused);
    }

    if (!values.alive) {
        return (
            <div className="panel">
                <p>{t('Instance is not running')}</p>
            </div>
        );
    }

    const last = getLastControl(results);
    const unseen = countUnseenAlerts(results, values.lastSeenID);
    let next = '';
    if (values.recordingRunning) {
        const seconds = Math.floor((values.nextWrite - now) / 1000);
        const minutes =
            seconds > 120 ? Math.round(seconds / 60) : (Math.round(seconds / 6) / 10).toString().replace('.', ',');
        next = `${t('In %s minutes or when the maximal file size is reached', minutes)} (${t(
            '%s of %s reached',
            bytes2string(values.captured),
            '50MB',
        )})`;
    }

    return (
        <>
            <div className="panel detections-main">
                {last ? (
                    <div className="field">
                        <span className="field-name">{t('Last control')}:</span>
                        <span>{new Date(last.time).toLocaleString()}</span>
                    </div>
                ) : (
                    <div className="field">
                        <span className="field-name">{t('Last result')}:</span>
                        <span>{t('No results yet exist')}</span>
                    </div>
                )}
                {values.recordingRunning ? (
                    <div className="field">
                        <span className="field-name">{t('Next control')}:</span>
                        <span>{next}</span>
                    </div>
                ) : null}
                {values.recordingRunning ? (
                    <div className="trigger">
                        <button
                            type="button"
                            className="btn"
                            disabled={values.analysisRunning || paused}
                            onClick={props.onTrigger}
                        >
                            <span>{t('Execute control now')}</span>
                            {paused ? (
                                <span className="btn-note">
                                    {t('Try again in %s sec.', Math.round((pausedUntil - now) / 1000))}
                                </span>
                            ) : null}
                        </button>
                        {values.analysisRunning ? <div className="progress" /> : null}
                    </div>
                ) : null}
            </div>
            <ProblemSummary
                t={t}
                unseen={unseen}
                button={
                    <button
                        type="button"
                        className="btn"
                        disabled={!results.length}
                        onClick={props.onShowResults}
                    >
                        {t('Show results')}
                    </button>
                }
            />
        </>
    );
}

function SettingsView(
    props: ViewProps & {
        adminLink: string;
        saveThresholdSeconds: number | null;
        onToggleProtection: () => void;
    },
): JSX.Element {
    const { t, values } = props;
    const minutes = Math.round((props.saveThresholdSeconds || 3600) / 60);
    return (
        <div className="panel settings">
            {props.adminLink ? (
                <div className="field">
                    <span className="field-name">{t('Manage monitored devices')}</span>
                    <a
                        className="link"
                        href={props.adminLink}
                        target="settings"
                        rel="noreferrer"
                    >
                        {t('Open in Admin')}
                        <Icon name="openInNew" />
                    </a>
                </div>
            ) : null}
            <label className="field">
                <span className="field-name">{t('Protection enabled')}</span>
                <input
                    type="checkbox"
                    className="switch"
                    checked={values.recordingEnabled}
                    disabled={!values.alive}
                    onChange={props.onToggleProtection}
                />
            </label>
            <div className="field">
                <span className="field-name">{t('Save threshold in seconds')}</span>
                <span>{minutes === 60 ? t('one hour') : t('%s minutes', minutes)}</span>
                <span className="secondary note">{t('thresholdHint')}</span>
            </div>
        </div>
    );
}

/** The devices of an answer of `getData` with their names, in the order of the adapter */
function getDevices(
    data: Record<MACAddress, { info?: { ip: string; desc: string } }>,
): { mac: MACAddress; name: string; color: string }[] {
    return Object.keys(data).map((mac, i) => ({
        mac,
        name: data[mac].info?.desc || data[mac].info?.ip || mac,
        color: PALETTE[i % PALETTE.length],
    }));
}

function StatisticsView(
    props: ViewProps & {
        lang: string;
        load: (type: StatisticsType) => Promise<unknown>;
        loadTotals: () => Promise<Totals | null>;
    },
): JSX.Element {
    const { t, values, load, loadTotals } = props;
    const [type, setType] = useState<StatisticsType>(() => {
        const stored = readStored('kisshome-defender-tab.statisticsTab');
        return STATISTICS.find(item => item.type === stored)?.type || 'dataVolumePerDay';
    });
    // the last answer, kept while the next one is read; `data` is null if the adapter could not answer
    const [data, setData] = useState<{ type: StatisticsType; key: string; data: unknown } | null>(null);
    const [totals, setTotals] = useState<Totals | null>(null);
    // devices and categories the user switched off
    const [hiddenDevices, setHiddenDevices] = useState<Record<string, boolean>>({});
    const [hiddenCategories, setHiddenCategories] = useState<Record<string, boolean>>({});

    // again after every new analysis
    const key = `${type}/${values.lastCreated}`;
    useEffect(() => {
        if (!values.alive) {
            return undefined;
        }
        let cancelled = false;
        Promise.all([load(type), loadTotals()])
            .then(([answer, newTotals]) => {
                if (!cancelled) {
                    setData({ type, key, data: answer && typeof answer === 'object' ? answer : {} });
                    setTotals(newTotals);
                }
            })
            .catch((e: unknown) => {
                console.warn(`<iob-kisshome-defender>: cannot read the statistics: ${String(e)}`);
                if (!cancelled) {
                    setData({ type, key, data: null });
                }
            });
        return () => {
            cancelled = true;
        };
    }, [key, type, values.alive, load, loadTotals]);

    if (!values.alive) {
        return (
            <div className="panel">
                <p>{t('Instance is not running')}</p>
            </div>
        );
    }

    const loading = data?.key !== key;
    const current = data?.type === type ? data.data : null;
    let chart: JSX.Element | null = null;
    if (current && (type === 'dataVolumePerDevice' || type === 'dataVolumePerDay')) {
        const result = current as DataVolumePerDeviceResult;
        const devices = getDevices(result);
        const series: LineSeries[] = devices
            .filter(device => !hiddenDevices[device.mac] && result[device.mac].series?.length)
            .map(device => ({
                key: device.mac,
                name: device.name,
                color: device.color,
                points: result[device.mac].series,
            }));
        const end = new Date();
        end.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() + 1);
        const start = new Date(end);
        start.setDate(start.getDate() - 7);
        const allShown = devices.every(device => !hiddenDevices[device.mac]);
        chart = devices.length ? (
            <>
                <div className="chart-area">
                    <LineChart
                        series={series}
                        start={start.getTime()}
                        end={end.getTime()}
                        lang={props.lang}
                        yName={t('Data volume')}
                    />
                </div>
                <div className="legend">
                    {devices.length > 1 ? (
                        <button
                            type="button"
                            className={`chip${allShown ? '' : ' off'}`}
                            onClick={() =>
                                setHiddenDevices(
                                    allShown ? Object.fromEntries(devices.map(device => [device.mac, true])) : {},
                                )
                            }
                        >
                            {t('All')}
                        </button>
                    ) : null}
                    {devices.map(device => (
                        <button
                            type="button"
                            key={device.mac}
                            title={device.mac}
                            className={`chip${hiddenDevices[device.mac] ? ' off' : ''}`}
                            onClick={() =>
                                setHiddenDevices({ ...hiddenDevices, [device.mac]: !hiddenDevices[device.mac] })
                            }
                        >
                            <span
                                className="dot"
                                style={{ background: device.color }}
                            />
                            {device.name}
                        </button>
                    ))}
                </div>
            </>
        ) : null;
    } else if (current && (type === 'dataVolumePerCountry' || type === 'dataVolumePerDaytime')) {
        const rows: BarRow[] = [];
        const categories: BarCategory[] = [];
        if (type === 'dataVolumePerCountry') {
            const result = current as DataVolumePerCountryResult;
            for (const device of getDevices(result)) {
                const countries = result[device.mac].countries || {};
                if (!Object.keys(countries).length) {
                    continue;
                }
                rows.push({ key: device.mac, name: device.name, values: countries });
                for (const country of Object.keys(countries)) {
                    if (!categories.find(category => category.key === country)) {
                        categories.push({
                            key: country,
                            name: country,
                            color: PALETTE[categories.length % PALETTE.length],
                        });
                    }
                }
            }
        } else {
            const result = current as DataVolumePerDaytimeResult;
            DAYTIMES.forEach((name, i) => categories.push({ key: String(i), name, color: PALETTE[i] }));
            for (const device of getDevices(result)) {
                if (result[device.mac].dayTime) {
                    rows.push({ key: device.mac, name: device.name, values: result[device.mac].dayTime });
                }
            }
        }
        chart = rows.length ? (
            <div className="chart-area">
                <StackedBars
                    rows={rows}
                    categories={categories}
                    hidden={hiddenCategories}
                    onToggle={category =>
                        setHiddenCategories({ ...hiddenCategories, [category]: !hiddenCategories[category] })
                    }
                />
            </div>
        ) : null;
    }

    return (
        <>
            <div className="subtabs">
                {STATISTICS.map(item => (
                    <button
                        type="button"
                        key={item.type}
                        className={`chip${item.type === type ? ' active' : ''}`}
                        onClick={() => {
                            setType(item.type);
                            writeStored('kisshome-defender-tab.statisticsTab', item.type);
                        }}
                    >
                        {t(item.word)}
                    </button>
                ))}
            </div>
            <div className="panel statistics">
                <div className="panel-title">
                    <span className="long">{t('Statistics about Data-volume in the last week')}</span>
                    <span className="short">{t('Last week statistics')}</span>
                </div>
                {loading ? <div className="progress" /> : null}
                {chart || (current ? <div className="empty">{t('No data available')}</div> : null)}
                {type === 'dataVolumePerCountry' && chart ? (
                    <div className="footnote">
                        {t('ioBroker.kisshome-defender uses the IP2Location LITE database for')}{' '}
                        <a
                            href="https://lite.ip2location.com"
                            target="_blank"
                            rel="noreferrer"
                        >
                            {t('IP geolocation')}
                        </a>
                    </div>
                ) : null}
            </div>
            {totals?.dataVolumePerDevice || totals?.deviceMostCountries ? (
                <div className="panel totals">
                    <div className="totals-title">
                        <span className="long">
                            {t('Statistics on aggregated transmitted data volume over the past 7 days')}:
                        </span>
                        <span className="short">{t('Statistics over the past 7 days')}:</span>
                    </div>
                    {totals.dataVolumePerDevice ? (
                        <div>
                            - {t('Device with the highest transmitted data volume')}:{' '}
                            <strong>{totals.dataVolumePerDevice}</strong>
                        </div>
                    ) : null}
                    {totals.deviceMostCountries ? (
                        <div>
                            - {t('Device that contacted the most countries')}:{' '}
                            <strong>{totals.deviceMostCountries}</strong>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </>
    );
}

export interface AppProps {
    t: Translate;
    lang: string;
    editMode: boolean;
    view: View;
    /** URL of the logo of the adapter */
    logo: string;
    values: DefenderValues;
    results: StoredStatisticsResult | null;
    adminLink: string;
    saveThresholdSeconds: number | null;
    onView: (view: View) => void;
    onToggleProtection: () => void;
    onTrigger: () => void;
    onShowResults: () => void;
    load: (type: StatisticsType) => Promise<unknown>;
    loadTotals: () => Promise<Totals | null>;
}

/** The whole element: the header with the views, and the chosen view */
export function App(props: AppProps): JSX.Element {
    const { t, view } = props;
    let body: JSX.Element;
    if (view === 'statistics') {
        body = (
            <StatisticsView
                t={t}
                lang={props.lang}
                values={props.values}
                results={props.results}
                load={props.load}
                loadTotals={props.loadTotals}
            />
        );
    } else if (view === 'detections') {
        body = (
            <DetectionsView
                t={t}
                values={props.values}
                results={props.results}
                onTrigger={props.onTrigger}
                onShowResults={props.onShowResults}
            />
        );
    } else if (view === 'settings') {
        body = (
            <SettingsView
                t={t}
                values={props.values}
                results={props.results}
                adminLink={props.adminLink}
                saveThresholdSeconds={props.saveThresholdSeconds}
                onToggleProtection={props.onToggleProtection}
            />
        );
    } else {
        body = (
            <StatusView
                t={t}
                values={props.values}
                results={props.results}
                adminLink={props.adminLink}
                onToggleProtection={props.onToggleProtection}
                onDetections={() => props.onView('detections')}
            />
        );
    }

    return (
        <div
            className={`app view-${view}${props.editMode ? ' edit' : ''}`}
            // no clicks in edit mode, and no keyboard either
            inert={props.editMode}
        >
            <div className="header">
                <img
                    className="logo"
                    src={props.logo}
                    alt=""
                />
                <span className="brand">KISSHome</span>
                <div
                    className="tabs"
                    role="tablist"
                >
                    {VIEWS.map(item => (
                        <button
                            type="button"
                            role="tab"
                            key={item}
                            aria-selected={item === view}
                            title={t(VIEW_WORDS[item])}
                            className={`tab${item === view ? ' active' : ''}${item === 'settings' ? ' last' : ''}`}
                            onClick={() => props.onView(item)}
                        >
                            <Icon name={VIEW_ICONS[item]} />
                            <span className="label">{t(VIEW_WORDS[item])}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="body">{body}</div>
        </div>
    );
}
