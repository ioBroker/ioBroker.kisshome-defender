import React, { Component } from 'react';

import { I18n, type LegacyConnection, type ThemeType } from '@iobroker/adapter-react-v5';
import { Checkbox, LinearProgress, ListItemText, MenuItem, Paper, Select, Tab, Tabs } from '@mui/material';

import type {
    DataVolumePerCountryResult,
    DataVolumePerDaytimeResult,
    DataVolumePerDeviceResult,
    MACAddress,
    ReportUxHandler,
} from '../types';
import ReactEchartsCore from 'echarts-for-react/lib/core';
import type { EChartsOption, YAXisComponentOption } from 'echarts/types/dist/echarts';
import * as echarts from 'echarts/core';

import { LineChart, BarChart, type LineSeriesOption, type BarSeriesOption } from 'echarts/charts';
import {
    GridComponent,
    LegendComponent,
    TimelineComponent,
    TitleComponent,
    TooltipComponent,
} from 'echarts/components';
import { SVGRenderer } from 'echarts/renderers';
import { bytes2string } from './utils';

echarts.use([
    TimelineComponent,
    TitleComponent,
    TooltipComponent,
    GridComponent,
    LegendComponent,
    LineChart,
    BarChart,
    SVGRenderer,
]);
export interface GradientColorStop {
    offset: number;
    color: string;
}
export interface GradientObject {
    id?: number;
    type: string;
    colorStops: GradientColorStop[];
    global?: boolean;
}
export interface LinearGradientObject extends GradientObject {
    type: 'linear';
    x: number;
    y: number;
    x2: number;
    y2: number;
}
export declare type ColorString = string;
export interface RadialGradientObject extends GradientObject {
    type: 'radial';
    x: number;
    y: number;
    r: number;
}
export type SVGVNodeAttrs = Record<string, string | number | undefined | boolean>;
export interface SVGVNode {
    tag: string;
    attrs: SVGVNodeAttrs;
    children?: SVGVNode[];
    text?: string;

    // For patching
    elm?: Node;
    key: string;
}
export interface SVGPatternObject extends PatternObjectBase {
    /**
     * svg vnode can only be used in svg renderer currently.
     * svgWidth, svgHeight defines width and height used for pattern.
     */
    svgElement?: SVGVNode;
    svgWidth?: number;
    svgHeight?: number;
}
export type PatternObject = ImagePatternObject | SVGPatternObject;
export type ImageLike = HTMLImageElement | HTMLCanvasElement | HTMLVideoElement;
export interface PatternObjectBase {
    id?: number;
    // type is now unused, so make it optional
    type?: 'pattern';
    x?: number;
    y?: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
}
type ImagePatternRepeat = 'repeat' | 'repeat-x' | 'repeat-y' | 'no-repeat';
export interface ImagePatternObject extends PatternObjectBase {
    image: ImageLike | string;
    repeat?: ImagePatternRepeat;
    imageWidth?: number;
    imageHeight?: number;
}
export declare type ZRColor = ColorString | LinearGradientObject | RadialGradientObject | PatternObject;

const SHOW_SELECT_LEGEND = 5; // Show legend if more than 4 series

interface StatisticsTabProps {
    instance: string;
    reportUxEvent: ReportUxHandler;
    alive: boolean;
    themeType: ThemeType;
    socket: LegacyConnection;
    lang: ioBroker.Languages;
}

interface StatisticsTabState {
    tab: 'dataVolumePerDevice' | 'dataVolumePerCountry' | 'dataVolumePerDaytime' | 'dataVolumePerDay';
    dataVolumePerDay: {
        data: DataVolumePerDeviceResult | null;
        ts: number;
    };
    dataVolumePerDevice: {
        data: DataVolumePerDeviceResult | null;
        ts: number;
    };
    dataVolumePerCountry: {
        data: DataVolumePerCountryResult | null;
        ts: number;
    };
    dataVolumePerDaytime: {
        data: DataVolumePerDaytimeResult | null;
        ts: number;
    };
    requestRunning: boolean;
    height: number;
    legendMacs: { [mac: MACAddress]: boolean };
    legendOpened: boolean;
    deviceMostCountries?: string;
    deviceMostDataVolume?: string;
}

interface BarSeriesTooltipParams {
    componentType: string;
    componentSubType: string;
    componentIndex: number;
    seriesType: string;
    seriesIndex: number;
    seriesId: string;
    seriesName: string;
    name: string;
    dataIndex: number;
    data: number;
    value: number;
    color: string;
    dimensionNames: (string | null)[];
    encode: {
        [key: string]: number[];
    };
    $vars: string[];
    axisDim: string;
    axisIndex: number;
    axisType: string;
    axisId: string;
    axisValue: string;
    axisValueLabel: string;
    marker: string;
}

export default class StatisticsTab extends Component<StatisticsTabProps, StatisticsTabState> {
    private updateTimeout: ReturnType<typeof setTimeout> | null = null;
    private readonly refDataVolumePerDay = React.createRef<HTMLDivElement>();
    private readonly refDataVolumePerDevice = React.createRef<HTMLDivElement>();
    private readonly refDataVolumePerCountry = React.createRef<HTMLDivElement>();
    private readonly refDataVolumePerDaytime = React.createRef<HTMLDivElement>();
    private echartsReact: ReactEchartsCore | null = null;
    private countrySelected: { [country: string]: boolean } = {};
    private dayTimeSelected: { [dayTime: string]: boolean } = {};
    private readonly refInfo = React.createRef<HTMLDivElement>();
    private detectHeightInterval: ReturnType<typeof setInterval> | null = null;

    constructor(props: StatisticsTabProps) {
        super(props);
        this.state = {
            tab:
                (window.localStorage.getItem('kisshome-defender-tab.statisticsTab') as
                    | 'dataVolumePerDevice'
                    | 'dataVolumePerCountry'
                    | 'dataVolumePerDaytime'
                    | 'dataVolumePerDay') || 'dataVolumePerDay',
            dataVolumePerDevice: {
                data: null,
                ts: 0,
            },
            dataVolumePerDay: {
                data: null,
                ts: 0,
            },
            dataVolumePerCountry: {
                data: null,
                ts: 0,
            },
            dataVolumePerDaytime: {
                data: null,
                ts: 0,
            },
            requestRunning: false,
            height: 0,
            legendMacs: {},
            legendOpened: false,
        };
    }

    componentDidMount(): void {
        void this.requestData();
        this.detectHeightInterval = setInterval(() => {
            this.updateHeight();
        }, 3000);
    }

    componentWillUnmount(): void {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }
        if (this.detectHeightInterval) {
            clearInterval(this.detectHeightInterval);
            this.detectHeightInterval = null;
        }

        this.echartsReact?.getEchartsInstance().dispose();
    }

    async getCommonStats(newState: Partial<StatisticsTabState>): Promise<void> {
        if (this.props.alive) {
            const result = await this.props.socket.sendTo(`kisshome-defender.${this.props.instance}`, 'getTotals', {});
            if (result) {
                newState.deviceMostCountries = (
                    result as {
                        deviceMostCountries?: string;
                        dataVolumePerDevice?: string;
                    }
                ).deviceMostCountries;
                newState.deviceMostDataVolume = (
                    result as {
                        deviceMostCountries?: string;
                        dataVolumePerDevice?: string;
                    }
                ).dataVolumePerDevice;
            } else {
                newState.deviceMostCountries = '';
                newState.deviceMostDataVolume = '';
            }
        }
    }

    async requestData(): Promise<void> {
        if (!this.props.alive) {
            if (this.updateTimeout) {
                clearTimeout(this.updateTimeout);
                this.updateTimeout = null;
            }
            return;
        }

        const newState: Partial<StatisticsTabState> = {
            requestRunning: false,
        };
        let changed = false;
        if (this.state.tab === 'dataVolumePerDay') {
            if (!this.state.dataVolumePerDay.ts && Date.now() - this.state.dataVolumePerDay.ts > 30_000) {
                this.setState({ requestRunning: true });
                const result = await this.props.socket.sendTo(`kisshome-defender.${this.props.instance}`, 'getData', {
                    type: 'dataVolumePerDay',
                });

                if (result) {
                    newState.dataVolumePerDay = {
                        data: result as DataVolumePerDeviceResult,
                        ts: Date.now(),
                    };
                    changed = true;
                }
            }
            // else the data is already loaded and still valid
        } else if (this.state.tab === 'dataVolumePerDevice') {
            if (!this.state.dataVolumePerDevice.ts && Date.now() - this.state.dataVolumePerDevice.ts > 30_000) {
                this.setState({ requestRunning: true });
                const result = await this.props.socket.sendTo(`kisshome-defender.${this.props.instance}`, 'getData', {
                    type: 'dataVolumePerDevice',
                });
                if (result) {
                    changed = true;
                    newState.dataVolumePerDevice = {
                        data: result as DataVolumePerDeviceResult,
                        ts: Date.now(),
                    };
                }
            }
            // else the data is already loaded and still valid
        } else if (this.state.tab === 'dataVolumePerCountry') {
            if (!this.state.dataVolumePerCountry.ts && Date.now() - this.state.dataVolumePerCountry.ts > 30_000) {
                this.setState({ requestRunning: true });
                const result = await this.props.socket.sendTo(`kisshome-defender.${this.props.instance}`, 'getData', {
                    type: 'dataVolumePerCountry',
                });
                if (result) {
                    changed = true;
                    newState.dataVolumePerCountry = {
                        data: result as DataVolumePerCountryResult,
                        ts: Date.now(),
                    };
                }
            }
            // else the data is already loaded and still valid
        } else if (this.state.tab === 'dataVolumePerDaytime') {
            if (!this.state.dataVolumePerDaytime.ts && Date.now() - this.state.dataVolumePerDaytime.ts > 30_000) {
                this.setState({ requestRunning: true });
                const result = await this.props.socket.sendTo(`kisshome-defender.${this.props.instance}`, 'getData', {
                    type: 'dataVolumePerDaytime',
                });
                if (result) {
                    changed = true;
                    newState.dataVolumePerDaytime = {
                        data: result as DataVolumePerDaytimeResult,
                        ts: Date.now(),
                    };
                }
            }
            // else the data is already loaded and still valid
        }
        if (changed) {
            await this.getCommonStats(newState);
            setTimeout(
                state => {
                    this.setState(state as StatisticsTabState);
                },
                1000,
                newState,
            );
        }

        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }
        if (this.props.alive) {
            this.updateTimeout = setTimeout(() => {
                this.updateTimeout = null;
                void this.requestData();
            }, 60_000);
        }
    }

    getDataVolumePerDaytimeChartOptions(): EChartsOption | null {
        if (!this.state.dataVolumePerDaytime.data) {
            return null;
        }

        const selectedMacs: { [mac: MACAddress]: boolean } = { ...this.state.legendMacs };
        const allMacs: MACAddress[] = Object.keys(this.state.dataVolumePerDaytime.data);
        allMacs.forEach((mac: MACAddress): void => {
            selectedMacs[mac] ??= true; // Select all by default
        });
        if (!allMacs.length) {
            return null;
        }

        // delete non-existing MACs
        Object.keys(selectedMacs).forEach(mac => {
            if (!allMacs.includes(mac)) {
                delete selectedMacs[mac];
            }
        });

        if (JSON.stringify(selectedMacs) !== JSON.stringify(this.state.legendMacs)) {
            // If all selected MACs are the same as in state, do not update state
            setTimeout(() => {
                this.setState({ legendMacs: selectedMacs });
            }, 100);
        }

        const series: BarSeriesOption[] = [];
        let maxY = 0;
        const xData: string[] = [];
        const totalData: number[] = [];
        const macAddresses: string[] = [];

        // create 4 daytime's
        for (let i = 0; i < 4; i++) {
            const dayTimeItem: BarSeriesOption = {
                name: i === 0 ? '0-6' : i === 1 ? '6-12' : i === 2 ? '12-18' : '18-24',
                type: 'bar',
                stack: 'total',
                data: [],
                emphasis: {
                    focus: 'series',
                },
            };
            series.push(dayTimeItem);
            this.dayTimeSelected[i] ??= true; // Select country by default
        }

        allMacs.forEach(mac => {
            // Collect all possible countries
            if (this.state.dataVolumePerDaytime.data) {
                if (!selectedMacs[mac]) {
                    return; // Skip this MAC if not selected
                }

                const item = this.state.dataVolumePerDaytime.data[mac];

                let sum = 0;
                if (item.dayTime) {
                    xData.push(item.info?.desc || item.info?.ip || mac);
                    for (let i: 0 | 1 | 2 | 3 = 0; i < 4; i++) {
                        const value = item.dayTime[i.toString() as '0' | '1' | '2' | '3'] || 0;
                        sum += value;
                        const seriesData = series[i].data;
                        if (seriesData) {
                            seriesData[xData.length - 1] = value;
                        }
                    }
                }
                totalData[xData.length - 1] = 0;
                macAddresses[xData.length - 1] = mac;
                if (sum > maxY) {
                    maxY = sum;
                }
            }
        });

        if (!series.length) {
            return null;
        }

        const maxYNice = StatisticsTab.getNiceMax(maxY);

        series.push({
            name: '',
            type: 'bar',
            stack: 'total',
            tooltip: { show: false },
            label: {
                show: true,
                position: 'top',
                formatter: p => {
                    if (!this.state.dataVolumePerDaytime.data) {
                        return '';
                    }
                    let sum = 0;
                    for (let i = 0; i < 4; i++) {
                        if (this.dayTimeSelected[i]) {
                            sum +=
                                this.state.dataVolumePerDaytime.data[macAddresses[p.dataIndex]].dayTime[
                                    i.toString() as '0' | '1' | '2' | '3'
                                ] || 0;
                        }
                    }
                    return bytes2string(sum, maxY);
                },
            },
            data: totalData,
        });

        return {
            backgroundColor: 'transparent',
            grid: {
                top: 28,
                bottom: 100,
                left: 80,
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    // Use axis to trigger tooltip
                    type: 'shadow', // 'shadow' as default; can also be 'line' or 'shadow'
                },
                formatter: (_params: any): string => {
                    const params = _params as BarSeriesTooltipParams[];
                    let content = `${params[0].axisValueLabel}<br/>`;
                    params.forEach(item => {
                        content += `${item.marker + item.seriesName}: ${bytes2string(item.data, maxY)}<br/>`;
                    });
                    return content;
                },
            },
            legend: {
                show: true,
            },
            xAxis: {
                type: 'category',
                axisLabel: {
                    rotate: 45,
                },
                data: xData,
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    formatter: (value: number) => bytes2string(value, maxYNice, true),
                },
                axisLine: {
                    show: true, // Show Y-Axis-Line
                },
                min: 0,
                max: maxYNice,
                interval: maxYNice / 5,
                name: I18n.t('kisshome-defender_Data volume'), // Y-Achsen-Beschreibung
                nameLocation: 'end', // Position: 'start', 'middle', 'end'
                nameGap: 5,
            },
            // @ts-expect-error fix later
            series,
        };
    }

    renderDayTimeChart(): React.JSX.Element {
        const options = this.getDataVolumePerDaytimeChartOptions();

        const legend = this.renderVolumeLegend(this.state.dataVolumePerDaytime.data, true);

        return (
            <div style={{ position: 'relative', width: '100%', height: 'calc(100% - 24px)' }}>
                {this.renderLoading(!!this.state.dataVolumePerDaytime.data)}
                {legend}
                <div
                    ref={this.refDataVolumePerDaytime}
                    style={{ width: '100%', height: legend ? 'calc(100% - 48px)' : '100%' }}
                >
                    {this.state.height && options ? (
                        <ReactEchartsCore
                            ref={e => {
                                this.echartsReact = e;
                            }}
                            echarts={echarts}
                            option={options}
                            notMerge
                            lazyUpdate
                            theme={this.props.themeType === 'dark' ? 'dark' : ''}
                            style={{ height: `${this.state.height}px`, width: '100%' }}
                            opts={{ renderer: 'svg' }}
                            onEvents={{ legendselectchanged: this.onLegendDayTimeSelectChanged }}
                        />
                    ) : null}
                    {!options ? (
                        <div style={{ padding: 16, paddingLeft: 32 }}>
                            {I18n.t('kisshome-defender_No data available')}
                        </div>
                    ) : null}
                </div>
            </div>
        );
    }

    getDataVolumePerCountryChartOptions(): EChartsOption | null {
        if (!this.state.dataVolumePerCountry.data) {
            return null;
        }

        const selectedMacs: { [mac: MACAddress]: boolean } = { ...this.state.legendMacs };
        const allMacs: MACAddress[] = Object.keys(this.state.dataVolumePerCountry.data);
        allMacs.forEach((mac: MACAddress): void => {
            selectedMacs[mac] ??= true; // Select all by default
        });
        // delete non-existing MACs
        Object.keys(selectedMacs).forEach(mac => {
            if (!allMacs.includes(mac)) {
                delete selectedMacs[mac];
            }
        });

        if (!allMacs.length) {
            return null;
        }

        if (JSON.stringify(selectedMacs) !== JSON.stringify(this.state.legendMacs)) {
            // If all selected MACs are the same as in state, do not update state
            setTimeout(() => {
                this.setState({ legendMacs: selectedMacs });
            }, 100);
        }

        const series: BarSeriesOption[] = [];
        let maxY = 0;
        const xData: string[] = [];
        const totalData: number[] = [];
        const macAddresses: string[] = [];

        allMacs.forEach(mac => {
            if (this.state.dataVolumePerCountry.data) {
                if (!selectedMacs[mac]) {
                    return; // Skip this MAC if not selected
                }
                const item = this.state.dataVolumePerCountry.data[mac];
                const data = item.countries;
                let sum = 0;
                if (data && Object.keys(data).length) {
                    xData.push(item.info?.desc || item.info?.ip || mac);
                    Object.keys(data).forEach((country: string) => {
                        let countryItem = series.find(s => s.name === country);
                        // Initialize series for each country
                        if (!countryItem) {
                            countryItem = {
                                name: country,
                                type: 'bar',
                                stack: 'total',
                                data: [],
                                emphasis: {
                                    focus: 'series',
                                },
                            };
                            series.push(countryItem);
                            this.countrySelected[country] ??= true; // Select country by default
                        }
                        if (countryItem.data) {
                            countryItem.data[xData.length - 1] = data[country] || 0;
                        }
                        sum += data[country] || 0;
                    });
                }
                totalData[xData.length - 1] = 0;
                macAddresses[xData.length - 1] = mac;
                if (sum > maxY) {
                    maxY = sum;
                }
            }
        });

        if (!series.length) {
            return null;
        }

        series.push({
            name: '',
            type: 'bar',
            stack: 'total',
            tooltip: { show: false },
            label: {
                show: true,
                position: 'top',
                formatter: p => {
                    if (!this.state.dataVolumePerCountry.data) {
                        return '';
                    }
                    let sum = 0;
                    Object.keys(this.state.dataVolumePerCountry.data[macAddresses[p.dataIndex]].countries).forEach(
                        s => {
                            if (this.countrySelected[s] && this.state.dataVolumePerCountry.data) {
                                sum +=
                                    this.state.dataVolumePerCountry.data[macAddresses[p.dataIndex]].countries[s] || 0;
                            }
                        },
                    );
                    return bytes2string(sum, maxY);
                },
            },
            data: totalData,
        });

        const maxYNice = StatisticsTab.getNiceMax(maxY);

        return {
            backgroundColor: 'transparent',
            grid: {
                top: 28,
                bottom: 100,
                left: 80,
            },
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    // Use axis to trigger tooltip
                    type: 'shadow', // 'shadow' as default; can also be 'line' or 'shadow'
                },
                formatter: (_params: any): string => {
                    const params = _params as BarSeriesTooltipParams[];
                    let content = `${params[0].axisValueLabel}<br/>`;
                    params.forEach(item => {
                        content += `${item.marker + item.seriesName}: ${bytes2string(item.data, maxY)}<br/>`;
                    });
                    return content;
                },
            },
            legend: {
                show: true,
            },
            xAxis: {
                type: 'category',
                axisLabel: {
                    rotate: 45,
                },
                data: xData,
            },
            yAxis: {
                type: 'value',
                axisLabel: {
                    formatter: (value: number) => bytes2string(value, maxYNice, true),
                },
                axisLine: {
                    show: true, // Show Y-Axis-Line
                },
                min: 0,
                max: maxYNice,
                interval: maxYNice / 5,
                name: I18n.t('kisshome-defender_Data volume'), // Y-Achsen-Beschreibung
                nameLocation: 'end', // Position: 'start', 'middle', 'end'
                nameGap: 5,
            },
            // @ts-expect-error fix later
            series,
        };
    }

    onLegendSelectChanged = (e: { selected: Record<string, boolean> }, _echarts: echarts.ECharts): void => {
        // If all series are deselected, select the first one
        this.countrySelected = e.selected;
        this.echartsReact?.getEchartsInstance()?.setOption({});
    };

    onLegendDayTimeSelectChanged = (e: { selected: Record<string, boolean> }, _echarts: echarts.ECharts): void => {
        // If all series are deselected, select the first one
        Object.keys(e.selected).forEach(k => {
            if (k === '0-6') {
                this.dayTimeSelected[0] = e.selected[k];
            } else if (k === '6-12') {
                this.dayTimeSelected[1] = e.selected[k];
            } else if (k === '12-18') {
                this.dayTimeSelected[2] = e.selected[k];
            } else if (k === '18-24') {
                this.dayTimeSelected[3] = e.selected[k];
            }
        });
        this.echartsReact?.getEchartsInstance()?.setOption({});
    };

    renderDataVolumePerCountryChart(): React.JSX.Element {
        const options = this.getDataVolumePerCountryChartOptions();
        const legend = this.renderVolumeLegend(this.state.dataVolumePerCountry.data, true);

        return (
            <div style={{ position: 'relative', width: '100%', height: 'calc(100% - 24px)' }}>
                {this.renderLoading(!!this.state.dataVolumePerCountry.data)}
                {legend}
                <div
                    ref={this.refDataVolumePerCountry}
                    style={{ width: '100%', height: legend ? 'calc(100% - 48px)' : '100%' }}
                >
                    {this.state.height && options ? (
                        <ReactEchartsCore
                            ref={e => {
                                this.echartsReact = e;
                            }}
                            echarts={echarts}
                            option={options}
                            notMerge
                            lazyUpdate
                            theme={this.props.themeType === 'dark' ? 'dark' : ''}
                            style={{ height: `${this.state.height}px`, width: '100%' }}
                            opts={{ renderer: 'svg' }}
                            onEvents={{ legendselectchanged: this.onLegendSelectChanged }}
                        />
                    ) : null}
                    {!options ? (
                        <div style={{ padding: 16, paddingLeft: 32 }}>
                            {I18n.t('kisshome-defender_No data available')}
                        </div>
                    ) : null}
                </div>
            </div>
        );
    }

    renderLoading(anyData: boolean): React.JSX.Element | null {
        if (this.props.alive && this.state.requestRunning) {
            return <LinearProgress style={{ position: 'absolute', top: 0, left: 0, right: 0 }} />;
        }
        if (!anyData && !this.props.alive) {
            return (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                    <p>{I18n.t('kisshome-defender_Adapter is not running')}</p>
                </div>
            );
        }
        return null;
    }

    updateHeight(): void {
        if (this.state.tab === 'dataVolumePerDay' && this.refDataVolumePerDay.current) {
            const height = this.refDataVolumePerDay.current.clientHeight;
            if (height !== this.state.height) {
                setTimeout(h => this.setState({ height: h }), 50, height);
            }
        } else if (this.state.tab === 'dataVolumePerDevice' && this.refDataVolumePerDevice.current) {
            const height = this.refDataVolumePerDevice.current.clientHeight;
            if (height !== this.state.height) {
                setTimeout(h => this.setState({ height: h }), 50, height);
            }
        } else if (this.state.tab === 'dataVolumePerCountry' && this.refDataVolumePerCountry.current) {
            const height = this.refDataVolumePerCountry.current.clientHeight;
            if (height !== this.state.height) {
                setTimeout(h => this.setState({ height: h }), 50, height);
            }
        } else if (this.state.tab === 'dataVolumePerDaytime' && this.refDataVolumePerDaytime.current) {
            const height = this.refDataVolumePerDaytime.current.clientHeight;
            if (height !== this.state.height) {
                setTimeout(h => this.setState({ height: h }), 50, height);
            }
        }
    }

    componentDidUpdate(prevProps: StatisticsTabProps): void {
        if (this.props.alive !== prevProps.alive && this.props.alive) {
            // If the adapter is now alive, request data
            setTimeout(() => {
                void this.requestData();
            }, 50);
        }

        this.updateHeight();
    }

    static getNiceMax(value: number): number {
        if (value > 1024 * 1024) {
            // Convert to MB and then round
            const mb = Math.ceil(value / (1024 * 1024));
            const exponent = Math.floor(Math.log10(mb));
            const base = Math.pow(10, exponent);
            return Math.ceil(mb / base) * base * (1024 * 1024);
        }
        if (value < 1024) {
            return 1024 * 5;
        }
        // Convert to Kb
        const mb = Math.ceil(value / 1024);
        const exponent = Math.floor(Math.log10(mb));
        const base = Math.pow(10, exponent);
        return Math.ceil(mb / base) * base * 1024;
    }

    getDataVolumePerDeviceOptions(): EChartsOption | null {
        if (!this.state.dataVolumePerDevice.data) {
            return null;
        }
        const selectedMacs: { [mac: MACAddress]: boolean } = { ...this.state.legendMacs };
        const allMacs: MACAddress[] = Object.keys(this.state.dataVolumePerDevice.data);
        allMacs.forEach((mac: MACAddress): void => {
            selectedMacs[mac] ??= true; // Select all by default
        });
        // delete non-existing MACs
        Object.keys(selectedMacs).forEach(mac => {
            if (!allMacs.includes(mac)) {
                delete selectedMacs[mac];
            }
        });

        const colors = this.echartsReact?.getEchartsInstance().getOption()?.color as ZRColor[] | undefined;
        const series: LineSeriesOption[] = [];
        let maxY = 0;
        let colorIndex = 0;
        allMacs.forEach(mac => {
            if (this.state.dataVolumePerDevice.data) {
                const item = this.state.dataVolumePerDevice.data[mac];
                const data = item.series;

                if (data?.length) {
                    // if length > SHOW_SELECT_LEGEND, filter selected MACs
                    if (allMacs.length >= SHOW_SELECT_LEGEND) {
                        if (!selectedMacs[mac]) {
                            colorIndex++;
                            return; // Skip this MAC if not selected
                        }
                    }
                    series.push({
                        xAxisIndex: 0,
                        name: item.info?.desc || item.info?.ip || mac,
                        type: 'line',
                        showSymbol: false,
                        animation: false,
                        lineStyle: {
                            color: colors?.[colorIndex] || undefined,
                        },
                        itemStyle: {
                            color: colors?.[colorIndex] || undefined,
                        },
                        data,
                    });

                    // Find max Y value
                    const maxValue = Math.max(...data.map(d => d[1]));
                    if (maxValue > maxY) {
                        maxY = maxValue;
                    }
                    colorIndex++;
                }
            }
        });

        if (JSON.stringify(selectedMacs) !== JSON.stringify(this.state.legendMacs)) {
            // If all selected MACs are the same as in state, do not update state
            setTimeout(() => {
                this.setState({ legendMacs: selectedMacs });
            }, 100);
        }

        if (!series.length) {
            return null;
        }

        const maxYNice = StatisticsTab.getNiceMax(maxY);

        const yAxis: YAXisComponentOption = {
            type: 'value',
            axisLabel: {
                formatter: (value: number) => bytes2string(value, maxYNice, true),
                // showMaxLabel: true,
                // showMinLabel: true,
            },
            min: 0,
            max: maxYNice,
            interval: maxYNice / 5,
            axisLine: {
                show: true, // Show Y-Axis-Line
            },
            axisTick: {
                // @ts-expect-error fix later
                alignWithLabel: true,
            },
            name: I18n.t('kisshome-defender_Data volume'), // Y-Achsen-Beschreibung
            nameLocation: 'end', // Position: 'start', 'middle', 'end'
            nameGap: 5,
        };

        const max = new Date();
        max.setHours(0);
        max.setMinutes(0);
        max.setSeconds(0);
        max.setMilliseconds(0);
        max.setDate(max.getDate() + 1);
        const min = new Date(max);
        min.setDate(min.getDate() - 7);

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    animation: true,
                },
                formatter: (_params: any): string => {
                    const params = _params as any[];
                    let content = `${params[0].axisValueLabel}<table><tbody>`;
                    params.forEach(item => {
                        content += `<tr>
    <td>${item.marker + item.seriesName}</td>
    <td style="font-weight: bold; margin-left: 4px">${bytes2string(item.data[1], maxY)}</td>
</tr>`;
                    });
                    content += '</tbody></table>';
                    return content;
                },
            },
            grid: {
                top: 28,
                right: 70,
                left: 80,
                bottom: 20,
            },
            legend: {
                show: allMacs.length < SHOW_SELECT_LEGEND,
            },
            xAxis: {
                type: 'time',
                splitLine: {
                    show: false,
                },
                min: min.getTime(),
                max: max.getTime(),
                axisTick: {
                    // @ts-expect-error fix later
                    alignWithLabel: true,
                },
                axisLabel: {
                    formatter: (value: number) => {
                        const date = new Date(value);
                        // Get day of the week and day of the month
                        return date.toLocaleDateString(this.props.lang, { weekday: 'short' });
                    },
                },
                name: I18n.t('kisshome-defender_Weekday'), // Y-Achsen-Beschreibung
                nameLocation: 'end', // Position: 'start', 'middle', 'end'
                nameGap: 5,
            },
            yAxis,
            // @ts-expect-error fix later
            series,
        };
    }

    renderVolumeLegend(
        data: DataVolumePerDeviceResult | DataVolumePerCountryResult | DataVolumePerDaytimeResult | null,
        noColors?: boolean,
    ): React.JSX.Element | null {
        if (!data) {
            return null; // No data to show legend
        }
        // Get MACs
        const allMacs: MACAddress[] = Object.keys(data);
        if (!noColors && allMacs.length < SHOW_SELECT_LEGEND) {
            return null; // Do not show legend if there are less than 5 series
        }
        if (!allMacs.length) {
            return null;
        }
        const colors = noColors
            ? undefined
            : (this.echartsReact?.getEchartsInstance().getOption()?.color as ZRColor[] | undefined);

        let countSelected = 0;
        Object.keys(this.state.legendMacs).forEach(mac => {
            if (this.state.legendMacs[mac]) {
                countSelected++;
            }
        });

        return (
            <div style={{ paddingLeft: 32 }}>
                <Select
                    style={{ minWidth: 250 }}
                    variant="standard"
                    value={Object.keys(this.state.legendMacs).filter(mac => this.state.legendMacs[mac])}
                    multiline
                    open={this.state.legendOpened}
                    onOpen={e => {
                        this.setState({ legendOpened: true });
                        this.props.reportUxEvent({
                            id: 'kisshome-defender-statistics-legend',
                            event: 'show',
                            ts: Date.now(),
                            isTouchEvent: e instanceof TouchEvent,
                        });
                    }}
                    onClose={e => {
                        if (e && e.target instanceof HTMLDivElement) {
                            this.setState({ legendOpened: false });
                        }
                        this.props.reportUxEvent({
                            id: 'kisshome-defender-statistics-legend',
                            event: 'hide',
                            ts: Date.now(),
                            isTouchEvent: e instanceof TouchEvent,
                        });
                    }}
                    displayEmpty
                    renderValue={selected => {
                        // Ignore the __selector__ value
                        selected = selected.filter(mac => mac !== '__selector__');
                        if (!selected?.length) {
                            return I18n.t('kisshome-defender_Nothing selected');
                        }
                        if (selected.length === allMacs.length) {
                            return I18n.t('kisshome-defender_All selected');
                        }
                        if (selected.length > 1) {
                            return I18n.t('kisshome-defender_Selected: %s', selected.length);
                        }
                        return selected[0];
                    }}
                >
                    <MenuItem
                        value="__selector__"
                        onClick={e => {
                            const legendMacs: { [mac: MACAddress]: boolean } = { ...this.state.legendMacs };

                            if (Object.keys(this.state.legendMacs).length === countSelected) {
                                // Deselect all
                                Object.keys(legendMacs).forEach(mac => {
                                    legendMacs[mac] = false; // Deselect all
                                });
                                this.props.reportUxEvent({
                                    id: 'kisshome-defender-statistics-legend-item-all',
                                    event: 'change',
                                    ts: Date.now(),
                                    isTouchEvent: e instanceof TouchEvent,
                                    data: 'unselect-all',
                                });
                            } else {
                                // Select all
                                Object.keys(legendMacs).forEach(mac => {
                                    legendMacs[mac] = true; // Select all
                                });
                                this.props.reportUxEvent({
                                    id: 'kisshome-defender-statistics-legend-item-all',
                                    event: 'change',
                                    ts: Date.now(),
                                    isTouchEvent: e instanceof TouchEvent,
                                    data: 'select-all',
                                });
                            }
                            this.setState({ legendMacs });
                        }}
                    >
                        <Checkbox
                            checked={Object.keys(this.state.legendMacs).length === countSelected}
                            indeterminate={
                                countSelected > 0 && countSelected < Object.keys(this.state.legendMacs).length
                            }
                        />
                        <ListItemText primary={I18n.t('kisshome-defender_All')} />
                    </MenuItem>
                    {allMacs.map((mac, i) => (
                        <MenuItem
                            style={colors ? { color: (colors as string[])?.[i] || undefined } : {}}
                            key={mac}
                            value={mac}
                            onClick={e => {
                                const legendMacs: { [mac: MACAddress]: boolean } = { ...this.state.legendMacs };
                                legendMacs[mac] = !legendMacs[mac]; // Toggle selection
                                this.props.reportUxEvent({
                                    id: 'kisshome-defender-statistics-legend-item',
                                    event: 'change',
                                    ts: Date.now(),
                                    isTouchEvent: e instanceof TouchEvent,
                                    data: legendMacs[mac] ? `select` : `unselect`,
                                });
                                this.setState({ legendMacs });
                            }}
                        >
                            <Checkbox checked={this.state.legendMacs[mac]} />
                            <ListItemText
                                primary={
                                    this.state.dataVolumePerDevice.data?.[mac]?.info?.desc ||
                                    this.state.dataVolumePerDevice.data?.[mac]?.info?.ip ||
                                    mac
                                }
                            />
                        </MenuItem>
                    ))}
                </Select>
            </div>
        );
    }

    renderDataVolumePerDeviceChart(): React.JSX.Element {
        const options = this.getDataVolumePerDeviceOptions();

        const legend = this.renderVolumeLegend(this.state.dataVolumePerDevice.data);

        return (
            <div style={{ position: 'relative', width: '100%', height: 'calc(100% - 24px)' }}>
                {this.renderLoading(!!this.state.dataVolumePerDevice.data)}
                {legend}
                <div
                    ref={this.refDataVolumePerDevice}
                    style={{ width: '100%', height: legend ? 'calc(100% - 48px)' : '100%' }}
                >
                    {this.state.height && options ? (
                        <ReactEchartsCore
                            ref={e => {
                                this.echartsReact = e;
                            }}
                            echarts={echarts}
                            option={options}
                            notMerge
                            lazyUpdate
                            theme={this.props.themeType === 'dark' ? 'dark' : ''}
                            style={{ height: `${this.state.height}px`, width: '100%' }}
                            opts={{ renderer: 'svg' }}
                        />
                    ) : null}
                    {!options ? (
                        <div style={{ padding: 16, paddingLeft: 32 }}>
                            {I18n.t('kisshome-defender_No data available')}
                        </div>
                    ) : null}
                </div>
            </div>
        );
    }

    getDataVolumePerDayOptions(): EChartsOption | null {
        if (!this.state.dataVolumePerDay.data) {
            return null;
        }
        const selectedMacs: { [mac: MACAddress]: boolean } = { ...this.state.legendMacs };
        const allMacs: MACAddress[] = Object.keys(this.state.dataVolumePerDay.data);
        allMacs.forEach((mac: MACAddress): void => {
            selectedMacs[mac] ??= true; // Select all by default
        });
        // delete non-existing MACs
        Object.keys(selectedMacs).forEach(mac => {
            if (!allMacs.includes(mac)) {
                delete selectedMacs[mac];
            }
        });

        const colors = this.echartsReact?.getEchartsInstance().getOption()?.color as ZRColor[] | undefined;
        const series: LineSeriesOption[] = [];
        let maxY = 0;
        let colorIndex = 0;
        allMacs.forEach(mac => {
            if (this.state.dataVolumePerDay.data) {
                const item = this.state.dataVolumePerDay.data[mac];
                const data = item.series;

                if (data?.length) {
                    // if length > SHOW_SELECT_LEGEND, filter selected MACs
                    if (allMacs.length >= SHOW_SELECT_LEGEND) {
                        if (!selectedMacs[mac]) {
                            colorIndex++;
                            return; // Skip this MAC if not selected
                        }
                    }
                    series.push({
                        xAxisIndex: 0,
                        name: item.info?.desc || item.info?.ip || mac,
                        type: 'line',
                        showSymbol: false,
                        animation: false,
                        lineStyle: {
                            color: colors?.[colorIndex] || undefined,
                        },
                        itemStyle: {
                            color: colors?.[colorIndex] || undefined,
                        },
                        data,
                    });

                    // Find max Y value
                    const maxValue = Math.max(...data.map(d => d[1]));
                    if (maxValue > maxY) {
                        maxY = maxValue;
                    }
                    colorIndex++;
                }
            }
        });

        if (JSON.stringify(selectedMacs) !== JSON.stringify(this.state.legendMacs)) {
            // If all selected MACs are the same as in state, do not update state
            setTimeout(() => {
                this.setState({ legendMacs: selectedMacs });
            }, 100);
        }

        if (!series.length) {
            return null;
        }

        const maxYNice = StatisticsTab.getNiceMax(maxY);

        // Aggregate data per day
        const yAxis: YAXisComponentOption = {
            type: 'value',
            axisLabel: {
                formatter: (value: number) => bytes2string(value, maxYNice, true),
                // showMaxLabel: true,
                // showMinLabel: true,
            },
            min: 0,
            max: maxYNice,
            interval: maxYNice / 5,
            axisLine: {
                show: true, // Show Y-Axis-Line
            },
            axisTick: {
                // @ts-expect-error fix later
                alignWithLabel: true,
            },
            name: I18n.t('kisshome-defender_Data volume'), // Y-Achsen-Beschreibung
            nameLocation: 'end', // Position: 'start', 'middle', 'end'
            nameGap: 5,
        };

        const max = new Date();
        max.setHours(0);
        max.setMinutes(0);
        max.setSeconds(0);
        max.setMilliseconds(0);
        max.setDate(max.getDate() + 1);
        const min = new Date(max);
        min.setDate(min.getDate() - 7);

        return {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'axis',
                axisPointer: {
                    animation: true,
                },
                formatter: (_params: any): string => {
                    const params = _params as any[];
                    let content = `${params[0].axisValueLabel}<table><tbody>`;
                    params.forEach(item => {
                        content += `<tr>
    <td>${item.marker + item.seriesName}</td>
    <td style="font-weight: bold; margin-left: 4px">${bytes2string(item.data[1], maxY)}</td>
</tr>`;
                    });
                    content += '</tbody></table>';
                    return content;
                },
            },
            grid: {
                top: 28,
                right: 70,
                left: 80,
                bottom: 20,
            },
            legend: {
                show: allMacs.length < SHOW_SELECT_LEGEND,
            },
            xAxis: {
                type: 'time',
                splitLine: {
                    show: false,
                },
                min: min.getTime(),
                max: max.getTime(),
                axisTick: {
                    // @ts-expect-error fix later
                    alignWithLabel: true,
                },
                axisLabel: {
                    formatter: (value: number) => {
                        const date = new Date(value);
                        // Get day of the week and day of the month
                        return date.toLocaleDateString(this.props.lang, { weekday: 'short' });
                    },
                },
                name: I18n.t('kisshome-defender_Weekday'), // Y-Achsen-Beschreibung
                nameLocation: 'end', // Position: 'start', 'middle', 'end'
                nameGap: 5,
            },
            yAxis,
            // @ts-expect-error fix later
            series,
        };
    }

    renderDataVolumePerDayChart(): React.JSX.Element {
        const options = this.getDataVolumePerDayOptions();

        const legend = this.renderVolumeLegend(this.state.dataVolumePerDay.data);

        return (
            <div style={{ position: 'relative', width: '100%', height: 'calc(100% - 24px)' }}>
                {this.renderLoading(!!this.state.dataVolumePerDay.data)}
                {legend}
                <div
                    ref={this.refDataVolumePerDay}
                    style={{ width: '100%', height: legend ? 'calc(100% - 48px)' : '100%' }}
                >
                    {this.state.height && options ? (
                        <ReactEchartsCore
                            ref={e => {
                                this.echartsReact = e;
                            }}
                            echarts={echarts}
                            option={options}
                            notMerge
                            lazyUpdate
                            theme={this.props.themeType === 'dark' ? 'dark' : ''}
                            style={{ height: `${this.state.height}px`, width: '100%' }}
                            opts={{ renderer: 'svg' }}
                        />
                    ) : null}
                    {!options ? (
                        <div style={{ padding: 16, paddingLeft: 32 }}>
                            {I18n.t('kisshome-defender_No data available')}
                        </div>
                    ) : null}
                </div>
            </div>
        );
    }

    renderChart(): React.JSX.Element {
        if (this.state.tab === 'dataVolumePerDevice') {
            return this.renderDataVolumePerDeviceChart();
        }
        if (this.state.tab === 'dataVolumePerDay') {
            return this.renderDataVolumePerDayChart();
        }
        if (this.state.tab === 'dataVolumePerCountry') {
            return this.renderDataVolumePerCountryChart();
        }
        if (this.state.tab === 'dataVolumePerDaytime') {
            return this.renderDayTimeChart();
        }
        return <div>...</div>;
    }

    renderStatInfo(): React.JSX.Element {
        let fontSize = '1.3rem';
        if (this.refInfo.current) {
            const height = this.refInfo.current.clientHeight;
            if (height < 120) {
                fontSize = '1rem';
            }
            if (height < 80) {
                fontSize = '0.8rem';
            }
        }
        return (
            <div style={{ fontSize }}>
                {this.state.deviceMostDataVolume || this.state.deviceMostCountries ? (
                    <div style={{ fontWeight: 'bold' }}>
                        {I18n.t(
                            'kisshome-defender_Statistics on aggregated transmitted data volume over the past 7 days',
                        )}
                        :
                    </div>
                ) : null}
                {this.state.deviceMostDataVolume ? (
                    <div>
                        - {I18n.t('kisshome-defender_Device with the highest transmitted data volume')}:
                        <span style={{ fontWeight: 'bold', marginLeft: 8 }}>{this.state.deviceMostDataVolume}</span>
                    </div>
                ) : null}
                {this.state.deviceMostCountries ? (
                    <div>
                        - {I18n.t('kisshome-defender_Device that contacted the most countries')}:
                        <span style={{ fontWeight: 'bold', marginLeft: 8 }}>{this.state.deviceMostCountries}</span>
                    </div>
                ) : null}
            </div>
        );
    }

    render(): React.JSX.Element {
        if (!this.props.alive) {
            return (
                <div style={{ width: 'calc(100% - 32px)', height: 'calc(100% - 32px)', display: 'flex', padding: 16 }}>
                    <p>{I18n.t('kisshome-defender_Instance is not running')}</p>
                </div>
            );
        }

        return (
            <div style={{ width: '100%', height: '100%', display: 'flex' }}>
                <div style={{ width: 150, backgroundColor: this.props.themeType === 'dark' ? '#333' : '#CCC' }}>
                    <Tabs
                        className="Mui-vertical-tabs"
                        value={this.state.tab}
                        style={{ backgroundColor: this.props.themeType === 'dark' ? '#333' : '#CCC' }}
                        orientation="vertical"
                        onChange={(_e, value) => {
                            this.echartsReact?.getEchartsInstance().dispose();

                            this.setState(
                                {
                                    tab: value as
                                        | 'dataVolumePerDevice'
                                        | 'dataVolumePerCountry'
                                        | 'dataVolumePerDay'
                                        | 'dataVolumePerDaytime',
                                },
                                () => this.requestData(),
                            );

                            window.localStorage.setItem('kisshome-defender-tab.statisticsTab', value);

                            this.props.reportUxEvent({
                                id: 'kisshome-defender-statistics-tabs',
                                event: 'change',
                                data: value,
                                ts: Date.now(),
                            });
                        }}
                    >
                        <Tab
                            value="dataVolumePerDevice"
                            style={{ alignItems: 'start', textTransform: 'none' }}
                            label={I18n.t('kisshome-defender_By day')}
                        />
                        <Tab
                            value="dataVolumePerDay"
                            style={{ alignItems: 'start', textTransform: 'none', textAlign: 'left' }}
                            label={I18n.t('kisshome-defender_By day (aggregated)')}
                        />
                        <Tab
                            value="dataVolumePerCountry"
                            style={{ alignItems: 'start', textTransform: 'none' }}
                            label={I18n.t('kisshome-defender_By country')}
                        />
                        <Tab
                            value="dataVolumePerDaytime"
                            style={{ alignItems: 'start', textTransform: 'none' }}
                            label={I18n.t('kisshome-defender_By day-time')}
                        />
                    </Tabs>
                </div>
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 20, padding: 10 }}>
                    <Paper
                        style={{
                            flexGrow: 1,
                            padding: 10,
                            border: `2px solid ${this.props.themeType === 'dark' ? 'white' : 'black'}`,
                            borderRadius: 0,
                            backgroundColor: this.props.themeType === 'dark' ? undefined : '#E6E6E6',
                            boxShadow: 'none',
                        }}
                    >
                        <div style={{ fontSize: 'greater', fontWeight: 'bold', height: 24 }}>
                            {I18n.t('kisshome-defender_Statistics about Data-volume in the last week')}
                        </div>
                        {this.renderChart()}
                    </Paper>
                    <Paper
                        ref={this.refInfo}
                        style={{
                            height: 80,
                            padding: 10,
                            border: `2px solid ${this.props.themeType === 'dark' ? 'white' : 'black'}`,
                            borderRadius: 0,
                            backgroundColor: this.props.themeType === 'dark' ? undefined : '#E6E6E6',
                            boxShadow: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.3rem',
                        }}
                    >
                        {this.renderStatInfo()}
                    </Paper>
                </div>
            </div>
        );
    }
}
