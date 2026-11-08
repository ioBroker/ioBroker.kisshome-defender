/**
 * The charts of the statistics, drawn without a chart library: the vis-2 widget uses ECharts, which would make the
 * module ten times bigger.
 *
 * Neither chart measures itself. The lines are drawn into an SVG that is stretched over the plot area
 * (`preserveAspectRatio="none"`, strokes that do not scale), the labels are HTML placed in percent - so a chart fills
 * whatever box it gets.
 */
import { useState, type JSX, type PointerEvent } from 'react';

import { bytes2string, getNiceMax } from './format';

/** The colors of the series, those of ECharts - readable on a light and on a dark background */
export const PALETTE = [
    '#5470c6',
    '#91cc75',
    '#fac858',
    '#ee6666',
    '#73c0de',
    '#3ba272',
    '#fc8452',
    '#9a60b4',
    '#ea7ccc',
];

/** The width and height of the coordinate system of the stretched SVG */
const BOX = 1000;

const DAY = 24 * 3600 * 1000;

export interface LineSeries {
    key: string;
    name: string;
    color: string;
    /** `[time in ms, bytes]` */
    points: [number, number][];
}

interface LineChartProps {
    series: LineSeries[];
    /** Midnight, seven days before `end` */
    start: number;
    /** The next midnight */
    end: number;
    lang: string;
    /** The name of the value axis */
    yName: string;
}

interface Hover {
    /** 0..1 over the plot */
    x: number;
    time: number;
    values: { key: string; name: string; color: string; value: number }[];
}

/** The data volume of each device over the last seven days, one line per device */
export function LineChart({ series, start, end, lang, yName }: LineChartProps): JSX.Element {
    const [hover, setHover] = useState<Hover | null>(null);

    let maxY = 0;
    for (const item of series) {
        for (const point of item.points) {
            maxY = Math.max(maxY, point[1]);
        }
    }
    const niceMax = getNiceMax(maxY);
    const span = end - start || 1;
    const x = (time: number): number => ((time - start) / span) * BOX;
    const y = (value: number): number => BOX - (value / niceMax) * BOX;

    const yTicks = [0, 1, 2, 3, 4, 5].map(i => (niceMax * i) / 5);
    // whole bytes: below a kilobyte the value is shown as it is
    const yLabels = yTicks.map(value => bytes2string(Math.round(value), niceMax, true));
    const days: number[] = [];
    for (let day = start; day <= end; day += DAY) {
        days.push(day);
    }

    const onMove = (e: PointerEvent<HTMLDivElement>): void => {
        const rect = e.currentTarget.getBoundingClientRect();
        if (!rect.width) {
            return;
        }
        const time = start + ((e.clientX - rect.left) / rect.width) * span;
        // the time of the nearest point: the points of one analysis have the same time for all devices
        let nearest: number | null = null;
        for (const item of series) {
            for (const point of item.points) {
                if (nearest === null || Math.abs(point[0] - time) < Math.abs(nearest - time)) {
                    nearest = point[0];
                }
            }
        }
        if (nearest === null) {
            setHover(null);
            return;
        }
        const values: Hover['values'] = [];
        for (const item of series) {
            const point = item.points.find(p => p[0] === nearest);
            if (point) {
                values.push({ key: item.key, name: item.name, color: item.color, value: point[1] });
            }
        }
        setHover({ x: Math.min(1, Math.max(0, (nearest - start) / span)), time: nearest, values });
    };

    return (
        <div className="chart">
            <div className="chart-name">{yName}</div>
            <div className="y-axis">
                {/* the longest label in the flow gives the axis its width; the visible ones are placed */}
                <span className="sizer">{yLabels.reduce((a, b) => (b.length > a.length ? b : a), '')}</span>
                {yLabels.map((label, i) => (
                    <span
                        key={i}
                        className="tick"
                        style={{ bottom: `${i * 20}%` }}
                    >
                        {label}
                    </span>
                ))}
            </div>
            <div
                className="plot"
                onPointerMove={onMove}
                onPointerLeave={() => setHover(null)}
            >
                <svg
                    viewBox={`0 0 ${BOX} ${BOX}`}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                >
                    {yTicks.slice(1).map((value, i) => (
                        <line
                            key={`y${i}`}
                            className="grid-line"
                            x1={0}
                            x2={BOX}
                            y1={y(value)}
                            y2={y(value)}
                        />
                    ))}
                    {days.slice(1, -1).map(day => (
                        <line
                            key={`x${day}`}
                            className="grid-line"
                            x1={x(day)}
                            x2={x(day)}
                            y1={0}
                            y2={BOX}
                        />
                    ))}
                    {series.map(item => (
                        <polyline
                            key={item.key}
                            className="series"
                            stroke={item.color}
                            points={[...item.points]
                                .sort((a, b) => a[0] - b[0])
                                .map(point => `${x(point[0]).toFixed(1)},${y(point[1]).toFixed(1)}`)
                                .join(' ')}
                        />
                    ))}
                </svg>
                {hover ? (
                    <>
                        <div
                            className="cursor"
                            style={{ left: `${hover.x * 100}%` }}
                        />
                        <div
                            className="tooltip"
                            style={
                                hover.x > 0.5
                                    ? { right: `${(1 - hover.x) * 100 + 1}%` }
                                    : { left: `${hover.x * 100 + 1}%` }
                            }
                        >
                            <div className="tooltip-time">{new Date(hover.time).toLocaleString(lang)}</div>
                            {hover.values.map(item => (
                                <div
                                    key={item.key}
                                    className="tooltip-row"
                                >
                                    <span
                                        className="dot"
                                        style={{ background: item.color }}
                                    />
                                    <span className="tooltip-name">{item.name}</span>
                                    <b>{bytes2string(item.value, maxY)}</b>
                                </div>
                            ))}
                        </div>
                    </>
                ) : null}
            </div>
            <div />
            <div className="x-axis">
                {days.map(day => (
                    <span
                        key={day}
                        style={{ left: `${(x(day) / BOX) * 100}%` }}
                    >
                        {new Date(day).toLocaleDateString(lang, { weekday: 'short' })}
                    </span>
                ))}
            </div>
        </div>
    );
}

export interface BarCategory {
    key: string;
    name: string;
    color: string;
}

export interface BarRow {
    key: string;
    name: string;
    /** Bytes by the key of a category */
    values: Record<string, number>;
}

interface StackedBarsProps {
    rows: BarRow[];
    categories: BarCategory[];
    /** Categories the user switched off */
    hidden: Record<string, boolean>;
    onToggle: (key: string) => void;
}

/**
 * The data volume of each device split into categories - countries or times of the day - as stacked bars, one row
 * per device. A click on a category in the legend hides it, like a click on the legend of ECharts.
 */
export function StackedBars({ rows, categories, hidden, onToggle }: StackedBarsProps): JSX.Element {
    const shown = categories.filter(category => !hidden[category.key]);
    const sum = (row: BarRow): number => shown.reduce((total, category) => total + (row.values[category.key] || 0), 0);
    const sorted = [...rows].sort((a, b) => sum(b) - sum(a));
    const max = Math.max(0, ...sorted.map(sum));

    return (
        <div className="bars">
            <div className="legend">
                {categories.map(category => (
                    <button
                        type="button"
                        key={category.key}
                        className={`chip${hidden[category.key] ? ' off' : ''}`}
                        onClick={() => onToggle(category.key)}
                    >
                        <span
                            className="dot"
                            style={{ background: category.color }}
                        />
                        {category.name}
                    </button>
                ))}
            </div>
            <div className="bar-list">
                {sorted.map(row => {
                    const total = sum(row);
                    return (
                        <div
                            key={row.key}
                            className="bar-row"
                        >
                            <span
                                className="bar-name"
                                title={row.name}
                            >
                                {row.name}
                            </span>
                            <span className="bar-track">
                                {shown.map(category =>
                                    row.values[category.key] ? (
                                        <span
                                            key={category.key}
                                            className="segment"
                                            title={`${category.name}: ${bytes2string(row.values[category.key], max)}`}
                                            style={{
                                                width: `${max ? (row.values[category.key] / max) * 100 : 0}%`,
                                                background: category.color,
                                            }}
                                        />
                                    ) : null,
                                )}
                            </span>
                            <span className="bar-total">{bytes2string(total, max)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
