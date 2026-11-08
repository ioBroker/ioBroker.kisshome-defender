/**
 * The contents of the two dialogs of the element, which the host frames (`openDialog()` with an element): the
 * results of the analyses, and the message about a new anomaly. Each is rendered into a shadow root of its own with
 * `DIALOG_STYLES`, because the host moves it out of the element into its dialog.
 */
import { useEffect, useRef, useState, type JSX } from 'react';

import { DIALOG_CLOSE_EVENT } from '@iobroker/web-components';

import {
    getDeviceRows,
    getTodayDurations,
    secondsToHms,
    secondsToMs,
    splitStrong,
    type StoredAnalysisResult,
    type StoredStatisticsResult,
} from './format';
import type { Translate } from './i18n';
import { Icon, StatusIcon } from './icons';
import { Rich, readStored, writeStored } from './views';

/** Where the vis-2 widget keeps "Show only alarms and warnings" */
const ONLY_ALERTS_KEY = 'kisshome-defender-alarms';

/** What a dialog answers when one of its own buttons closes it */
export type AlertAnswer = 'ok' | 'details';

/**
 * Close the dialog of the host from its content
 *
 * @param from an element inside the content
 * @param detail the answer
 */
function closeDialog(from: HTMLElement | null, detail: unknown): void {
    from?.dispatchEvent(new CustomEvent(DIALOG_CLOSE_EVENT, { detail, bubbles: true, composed: true }));
}

interface ResultsProps {
    t: Translate;
    results: StoredStatisticsResult | null;
    group: 'A' | 'B';
    secondPeriod: boolean;
    /** The UUID of the result to open and to scroll to */
    openUuid: string;
    /** The time of the drawing, in ms: "today" of the scan details */
    now: number;
}

/** A daily status report */
function StatusReport({
    t,
    item,
    group,
    secondPeriod,
}: { t: Translate; item: StoredAnalysisResult } & Pick<ResultsProps, 'group' | 'secondPeriod'>): JSX.Element {
    const report = item.todayReport;
    if (!report) {
        return <div className="details">{t('No status report available.')}</div>;
    }
    const date = new Date(item.time).toLocaleDateString();
    return (
        <div className="details">
            <div className="details-title">
                <Icon name="info" />
                {t('Status Report')}
            </div>
            {secondPeriod ? (
                <div className="details-text">
                    <div>{t('Below you will find information about checks on %s.', date)}</div>
                    <ul>
                        <li>
                            <strong>{t('Average check time')}:</strong>{' '}
                            {`${secondsToMs(Math.round(report.averageDuration / 1000))} ${t('minutes')}`}
                        </li>
                        <li>
                            <strong>{t('Minimum check time')}:</strong>{' '}
                            {`${secondsToMs(Math.round(report.minimalDuration / 1000))} ${t('minutes')}`}
                        </li>
                        <li>
                            <strong>{t('Maximum check time')}:</strong>{' '}
                            {`${secondsToMs(Math.round(report.maximalDuration / 1000))} ${t('minutes')}`}
                        </li>
                        <li>
                            <strong>{t('Duration of checks')}:</strong>{' '}
                            {`${secondsToMs(Math.round(report.totalDuration / 1000))} ${t('minutes')}`}
                        </li>
                    </ul>
                    <div>{t('No anomalies were detected during the checks. Therefore, everything is in order.')}</div>
                </div>
            ) : (
                <div className="details-text">
                    <Rich
                        parts={splitStrong(
                            group === 'A'
                                ? t(
                                      '<strong>No anomalies</strong> were detected during the checks on %s. Therefore, everything is in order.',
                                      date,
                                  )
                                : t(
                                      'During the checks on %s, a <strong>maximum anomaly score of %s</strong> was detected. Therefore, everything is in order.',
                                      date,
                                      report.maxScore,
                                  ),
                        )}
                    />
                </div>
            )}
        </div>
    );
}

/** One analysis: what was found, and how each device fared */
function ResultDetails({
    t,
    item,
    results,
    names,
    group,
    secondPeriod,
    now,
}: {
    t: Translate;
    item: StoredAnalysisResult;
    results: StoredAnalysisResult[];
    names: StoredStatisticsResult['names'];
} & Pick<ResultsProps, 'group' | 'secondPeriod' | 'now'>): JSX.Element {
    const date = new Date(item.time);
    const onlyAnomaly = group === 'A' || secondPeriod;
    let text = item.isAlert
        ? t(
              'Your smart devices were checked on %s at %s. Unusual activity was detected on at least one device.',
              date.toLocaleDateString(),
              date.toLocaleTimeString(),
          )
        : t(
              'Your smart devices were checked on %s at %s. No unusual activities were detected.',
              date.toLocaleDateString(),
              date.toLocaleTimeString(),
          );
    const today = secondPeriod ? getTodayDurations(results, now) : null;
    if (secondPeriod) {
        text += ` ${t('The control time was %s minutes.', secondsToHms(Math.round((item.statistics?.analysisDurationMs || 0) / 1000)))}`;
    }
    const rows = getDeviceRows(item, names, onlyAnomaly);

    return (
        <div className="details">
            <div className="details-title">
                <StatusIcon
                    ok={!item.isAlert}
                    warning
                    size="1.6em"
                />
                {t(item.isAlert ? 'Unusual activity detected!' : 'Everything is OK!')}
            </div>
            <div className="details-text italic">{text}</div>
            {today ? (
                <div className="details-text">
                    <strong>{t('Scan details (today)')}:</strong>
                    <ul>
                        <li>
                            <strong>{t('Average control time')}:</strong> {secondsToHms(today.average)} {t('minutes')}
                        </li>
                        <li>
                            <strong>{t('Minimal control time')}:</strong> {secondsToHms(today.min)} {t('minutes')}
                        </li>
                        <li>
                            <strong>{t('Maximal control time')}:</strong> {secondsToHms(today.max)} {t('minutes')}
                        </li>
                        <li>
                            <strong>{t('Duration of controls')}:</strong> {secondsToHms(today.total)} {t('minutes')}
                        </li>
                    </ul>
                </div>
            ) : null}
            {rows.length ? (
                <div className="devices">
                    <div className="device head">
                        <span>{t('Device')}</span>
                        <span>{t('Number of packets')}</span>
                        <span>{t('Anomaly Score')}*</span>
                        <span>{t('Status')}</span>
                    </div>
                    {rows.map(row => (
                        <div
                            key={row.mac}
                            className={`device${row.alert ? ' alert' : ''}`}
                        >
                            <span className="device-name">
                                <strong>{row.name || row.mac}</strong>
                                {row.name ? <small>{row.mac}</small> : null}
                            </span>
                            <span
                                className="device-packets"
                                data-label={t('Number of packets')}
                            >
                                {row.packets ?? '--'}
                            </span>
                            <span
                                className={`device-score ${row.alert ? 'bad' : 'good'}`}
                                data-label={t('Score')}
                            >
                                {onlyAnomaly ? t(row.alert ? 'Anomaly' : 'No anomaly') : `${row.score}/100`}
                            </span>
                            <span className="device-status">
                                <StatusIcon
                                    ok={!row.alert}
                                    warning
                                />
                                {row.description.length ? row.description.join(', ') : t('Ok')}
                            </span>
                        </div>
                    ))}
                </div>
            ) : null}
            <div className="footnote">
                <strong>*{t('Anomaly Score')}</strong>: {t('tooltip_score_1')} {t('tooltip_score_2')}{' '}
                {t(onlyAnomaly ? 'tooltip_score_4' : 'tooltip_score_3')}
            </div>
        </div>
    );
}

/** The results of the analyses of the last seven days, newest first - the results dialog of the vis-2 widget */
export function ResultsList(props: ResultsProps): JSX.Element {
    const { t } = props;
    const [onlyAlerts, setOnlyAlerts] = useState(() => readStored(ONLY_ALERTS_KEY) === 'true');
    const [opened, setOpened] = useState(props.openUuid);
    const ref = useRef<HTMLDivElement>(null);

    const all = props.results?.results || [];
    const alerts = all.filter(item => item.isAlert);
    const shown = [...(onlyAlerts && alerts.length ? alerts : all)].sort(
        (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime(),
    );

    useEffect(() => {
        // the anomaly of the message: scroll it into view once it is drawn
        if (props.openUuid) {
            const timer = setTimeout(
                () =>
                    ref.current
                        ?.querySelector(`[data-uuid="${CSS.escape(props.openUuid)}"]`)
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
                300,
            );
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [props.openUuid]);

    return (
        <div
            className="results"
            ref={ref}
        >
            <div className="results-list">
                {shown.length ? (
                    shown.map(item => {
                        const open = opened === item.uuid;
                        return (
                            <div
                                key={item.uuid}
                                data-uuid={item.uuid}
                                className={`result${open ? ' open' : ''}`}
                            >
                                <button
                                    type="button"
                                    className="result-head"
                                    aria-expanded={open}
                                    onClick={() => setOpened(open ? '' : item.uuid)}
                                >
                                    {item.todayReport ? (
                                        <Icon
                                            name="info"
                                            className="result-icon"
                                        />
                                    ) : (
                                        <StatusIcon
                                            ok={!item.isAlert}
                                            warning
                                        />
                                    )}
                                    <span className="result-title">
                                        {t(
                                            item.todayReport ? 'Status report at %s' : 'Test result at %s',
                                            new Date(item.time).toLocaleString(),
                                        )}
                                    </span>
                                    <Icon
                                        name="expand"
                                        className="chevron"
                                    />
                                </button>
                                {open ? (
                                    item.todayReport ? (
                                        <StatusReport
                                            t={t}
                                            item={item}
                                            group={props.group}
                                            secondPeriod={props.secondPeriod}
                                        />
                                    ) : (
                                        <ResultDetails
                                            t={t}
                                            item={item}
                                            results={all}
                                            names={props.results?.names}
                                            now={props.now}
                                            group={props.group}
                                            secondPeriod={props.secondPeriod}
                                        />
                                    )
                                ) : null}
                            </div>
                        );
                    })
                ) : (
                    <p>{t('No results available')}</p>
                )}
            </div>
            <div className="actions">
                {alerts.length ? (
                    <label className="check">
                        <input
                            type="checkbox"
                            checked={onlyAlerts}
                            onChange={() => {
                                writeStored(ONLY_ALERTS_KEY, onlyAlerts ? 'false' : 'true');
                                setOnlyAlerts(!onlyAlerts);
                            }}
                        />
                        {t('Show only alarms and warnings')}
                    </label>
                ) : (
                    <span />
                )}
                <button
                    type="button"
                    className="btn"
                    onClick={e => closeDialog(e.currentTarget, 'close')}
                >
                    {t('Close')}
                </button>
            </div>
        </div>
    );
}

interface AlertProps {
    t: Translate;
    alert: StoredAnalysisResult;
    /** Called with the state of "Do not show this alert again for 10 minutes" whenever it changes */
    onIgnore: (ignore: boolean) => void;
}

/** The message about a new anomaly */
export function AlertMessage({ t, alert, onIgnore }: AlertProps): JSX.Element {
    const [ignore, setIgnore] = useState(false);
    const date = new Date(alert.time);
    const anomalies = (alert.detections || []).filter(detection => detection.isAlert).length;
    const text =
        anomalies === 1
            ? t(
                  'During the inspection on %s at %s, an anomaly was detected that could indicate a potential security risk.',
                  date.toLocaleDateString(),
                  date.toLocaleTimeString(),
              )
            : t(
                  'During the inspection on %s at %s, %s anomalies were detected that could indicate a potential security risk.',
                  date.toLocaleDateString(),
                  date.toLocaleTimeString(),
                  anomalies,
              );
    return (
        <div className="alert">
            <div className="alert-main">
                <div className="alert-text">{text}</div>
                <StatusIcon
                    ok={false}
                    warning
                    size="4em"
                />
            </div>
            <button
                type="button"
                className="link"
                onClick={e => closeDialog(e.currentTarget, 'details' satisfies AlertAnswer)}
            >
                {t('Click here to get more information')}
            </button>
            <label className="check">
                <input
                    type="checkbox"
                    checked={ignore}
                    onChange={() => {
                        onIgnore(!ignore);
                        setIgnore(!ignore);
                    }}
                />
                {t('Do not show this alert again for 10 minutes')}
            </label>
            <div className="actions">
                <span />
                <button
                    type="button"
                    className="btn"
                    onClick={e => closeDialog(e.currentTarget, 'ok' satisfies AlertAnswer)}
                >
                    {t('Ok')}
                </button>
            </div>
        </div>
    );
}
