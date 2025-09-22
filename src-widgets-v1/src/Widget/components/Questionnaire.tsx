import React, { Component } from 'react';
import type { LegacyConnection, ThemeType } from '@iobroker/adapter-react-v5';
import MarkdownIt from 'markdown-it';
import {
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    TextField,
} from '@mui/material';
import { Check, Close } from '@mui/icons-material';

import type { DefenderAdapterConfig, ReportUxHandler } from '../types';
import { isTouch } from './utils';

export type QuestionnaireItemType = 'text' | 'select' | 'checkbox' | 'radio' | 'input' | 'yesNo';

export interface QuestionnaireItem {
    id: string;
    type: QuestionnaireItemType;
    options?: { value: string; label: string; style?: React.CSSProperties }[];
    label?: string;
    required?: boolean;
    text?: string; // For text items, this can be used to render Markdown or other content
    style?: React.CSSProperties; // Optional style for the item
    variant?: 'bottom' | 'end'; // Position of the radio button variant
    delimiter?: boolean | 'solid'; // if false, no delimiter will be rendered
}

export interface QuestionnaireJson {
    id: string;
    done?: boolean;
    title?: string;
    button?: string;
    required?: boolean;
    items?: QuestionnaireItem[];
    labelStyle?: React.CSSProperties;
    itemStyle?: React.CSSProperties;
    divStyle?: React.CSSProperties;
    titleStyle?: React.CSSProperties;
}

interface QuestionnaireProps {
    socket: LegacyConnection;
    instance: string;
    json: QuestionnaireJson | null;
    onClose: () => void;
    reportUxEvent: ReportUxHandler;
    themeType: ThemeType;
}

interface QuestionnaireState {
    answers: Record<string, { ts: string; value: string | boolean | number }>;
    startTs: string;
    endTs: string;
    links: { url: string; ts: string }[];
    json: QuestionnaireJson;
    email: string;
}

interface QuestionnaireAnswer {
    id: string;
    startTs: string;
    endTs: string;
    links: { url: string; ts: string }[];
    answers: { id: string; ts: string; value: string | boolean | number }[];
}

const styles: Record<string, React.CSSProperties> = {
    divItem: {
        width: '100%',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    divLabel: {
        minWidth: '30%',
        // fontWeight: 'bold',
        maxWidth: '50%',
    },
    divControl: {},
    delimiter: {
        paddingBottom: 10,
        borderBottom: '1px dotted #888',
    },
    delimiterSolid: {
        paddingBottom: 10,
        borderBottom: '2px solid #888',
    },
};

export default class Questionnaire extends Component<QuestionnaireProps, QuestionnaireState> {
    private markDown: MarkdownIt;

    constructor(props: QuestionnaireProps) {
        super(props);
        this.markDown = new MarkdownIt({ html: true });
        this.state = {
            answers: {},
            startTs: new Date().toISOString(),
            endTs: '',
            links: [],
            json: JSON.parse(JSON.stringify(props.json)),
            email: '',
        };

        // @ts-expect-error
        window._visQuestionnaireLinkClick = (url: string) => {
            this.props.reportUxEvent({
                id: 'kisshome-defender-questionnaire-link',
                event: 'click',
                isTouchEvent: false,
                ts: Date.now(),
                data: url,
            });
            console.log(`Link clicked: ${url}`);
            this.setState(prevState => ({
                links: [...prevState.links, { url, ts: new Date().toISOString() }],
            }));
        };

        this.markDown.renderer.rules.link_open = (tokens: any[], idx: number): string => {
            let href = tokens[idx].attrGet('href');
            if (href) {
                href = href
                    .replace(/\{\{email}}/g, encodeURIComponent(this.state.email))
                    .replace(/%7B%7Bemail%7D%7D/g, encodeURIComponent(this.state.email)); // Escape quotes for HTML
            }
            // Hier kannst du z. B. ein data-Attribut setzen oder eine eigene Klasse
            return `<a
href="${href}"
target="_blank"
rel="noopener noreferrer"
style="color: ${props.themeType === 'dark' ? '#eee' : '#111'};"
onclick="window._visQuestionnaireLinkClick('${href}');"
>`;
        };
    }

    componentDidMount(): void {
        void this.props.socket.getObject(`system.adapter.kisshome-defender.${this.props.instance}`).then(obj => {
            if (obj.native) {
                this.setState({ email: (obj.native as DefenderAdapterConfig).email });
            }
        });

        this.props.reportUxEvent({
            id: this.state.json.id,
            event: 'show',
            ts: Date.now(),
        });
    }

    componentWillUnmount(): void {
        this.props.reportUxEvent({
            id: this.state.json.id,
            event: 'hide',
            ts: Date.now(),
        });
    }

    renderText(item: QuestionnaireItem, index: number): React.JSX.Element {
        const content = this.markDown.render(item.text || '');

        if (!item.label) {
            return (
                <div
                    key={item.id}
                    style={{
                        ...styles.divItem,
                        ...this.state.json.divStyle,
                        ...(item.delimiter === false
                            ? undefined
                            : item.delimiter === 'solid'
                              ? styles.delimiterSolid
                              : styles.delimiter),
                    }}
                >
                    <span
                        style={{ width: '100%', ...this.state.json.itemStyle, ...item.style }}
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                </div>
            );
        }

        return (
            <div
                key={`${index}_${item.id}`}
                style={{
                    ...styles.divItem,
                    ...this.state.json.divStyle,
                    ...(item.delimiter === false
                        ? undefined
                        : item.delimiter === 'solid'
                          ? styles.delimiterSolid
                          : styles.delimiter),
                }}
            >
                <label
                    htmlFor={item.id}
                    style={{
                        ...styles.divLabel,
                        ...this.state.json.labelStyle,
                    }}
                >
                    {item.label}
                </label>
                <span
                    style={{ ...styles.divControl, ...this.state.json.itemStyle, ...item.style }}
                    dangerouslySetInnerHTML={{ __html: content }}
                />
            </div>
        );
    }

    renderSelect(item: QuestionnaireItem, index: number): React.JSX.Element {
        return (
            <div
                key={`${index}_${item.id}`}
                style={{
                    ...styles.divItem,
                    ...this.state.json.divStyle,
                    ...(item.delimiter === false
                        ? undefined
                        : item.delimiter === 'solid'
                          ? styles.delimiterSolid
                          : styles.delimiter),
                }}
            >
                <label
                    htmlFor={item.id}
                    style={{ ...styles.divLabel, ...this.state.json.labelStyle }}
                >
                    {item.label}
                    {item.required ? ' *' : ''}
                </label>
                <Select
                    variant="standard"
                    id={item.id}
                    style={{ minWidth: 150, ...styles.divControl, ...this.state.json.itemStyle, ...item.style }}
                    value={this.state.answers[item.id]?.value || ''}
                    onChange={e => {
                        const value = e.target.value;
                        this.props.reportUxEvent({
                            id: item.id,
                            event: 'change',
                            isTouchEvent: isTouch(e),
                            ts: Date.now(),
                            data: value.toString(),
                        });
                        this.setState(prevState => ({
                            answers: {
                                ...prevState.answers,
                                [item.id]: { ts: new Date().toISOString(), value },
                            },
                        }));
                    }}
                >
                    {item.options?.map(option => (
                        <MenuItem
                            key={option.value}
                            value={option.value}
                            style={option.style}
                        >
                            {option.label}
                        </MenuItem>
                    ))}
                </Select>
            </div>
        );
    }

    renderInput(item: QuestionnaireItem, index: number): React.JSX.Element {
        return (
            <div
                key={`${index}_${item.id}`}
                style={{
                    ...styles.divItem,
                    ...this.state.json.divStyle,
                    ...(item.delimiter === false
                        ? undefined
                        : item.delimiter === 'solid'
                          ? styles.delimiterSolid
                          : styles.delimiter),
                }}
            >
                <label
                    htmlFor={item.id}
                    style={{ ...styles.divLabel, ...this.state.json.labelStyle }}
                >
                    {item.label}
                    {item.required ? ' *' : ''}
                </label>
                <TextField
                    style={{ ...styles.divControl, ...this.state.json.itemStyle, ...item.style }}
                    variant="standard"
                    fullWidth
                    value={(this.state.answers[item.id]?.value as string) || ''}
                    onChange={e => {
                        const value = e.target.value;
                        this.setState(prevState => ({
                            answers: {
                                ...prevState.answers,
                                [item.id]: { ts: new Date().toISOString(), value },
                            },
                        }));
                    }}
                />
            </div>
        );
    }

    renderRadio(item: QuestionnaireItem, index: number): React.JSX.Element | null {
        const value = this.state.answers[item.id]?.value || '';
        if (!item.options) {
            return null;
        }
        return (
            <div
                key={`${index}_${item.id}`}
                style={{
                    ...styles.divItem,
                    justifyContent: item.options.length > 5 ? 'space-between' : undefined,
                    ...this.state.json.divStyle,
                    ...(item.delimiter === false
                        ? undefined
                        : item.delimiter === 'solid'
                          ? styles.delimiterSolid
                          : styles.delimiter),
                }}
            >
                <label
                    htmlFor={item.id}
                    style={{ ...styles.divLabel, ...this.state.json.labelStyle }}
                >
                    {item.label}
                    {item.required ? ' *' : ''}
                </label>
                <RadioGroup
                    row
                    style={{ ...styles.divControl, ...this.state.json.itemStyle, ...item.style }}
                >
                    {item.options?.map(option => {
                        if (!item.options) {
                            return null;
                        }
                        return (
                            <FormControlLabel
                                key={option.value.toString()}
                                control={
                                    <Radio
                                        checked={value === option.value}
                                        onClick={e => {
                                            this.props.reportUxEvent({
                                                id: item.id,
                                                event: 'change',
                                                isTouchEvent: isTouch(e),
                                                ts: Date.now(),
                                                data: value.toString(),
                                            });
                                            this.setState(prevState => ({
                                                answers: {
                                                    ...prevState.answers,
                                                    [item.id]: { ts: new Date().toISOString(), value: option.value },
                                                },
                                            }));
                                        }}
                                    />
                                }
                                label={option.label}
                                labelPlacement={item.variant || 'bottom'}
                                sx={{
                                    '& .MuiFormControlLabel-label':
                                        !item.variant || item.variant === 'bottom'
                                            ? {
                                                  maxWidth: 80,
                                                  textAlign: 'center',
                                                  fontSize: item.options.length > 5 ? '0.8rem' : undefined,
                                              }
                                            : null,
                                    '&.MuiFormControlLabel-root': {
                                        marginLeft: item.options.length > 5 ? '2px' : undefined,
                                        marginRight: item.options.length > 5 ? '2px' : undefined,
                                    },
                                }}
                            />
                        );
                    })}
                </RadioGroup>
            </div>
        );
    }

    renderYesNo(item: QuestionnaireItem, index: number): React.JSX.Element {
        const value: boolean = this.state.answers[item.id]?.value as boolean;
        return (
            <div
                key={`${index}_${item.id}`}
                style={{
                    ...styles.divItem,
                    ...this.state.json.divStyle,
                    ...(item.delimiter === false
                        ? undefined
                        : item.delimiter === 'solid'
                          ? styles.delimiterSolid
                          : styles.delimiter),
                }}
            >
                <label
                    htmlFor={item.id}
                    style={{ ...styles.divLabel, ...this.state.json.labelStyle }}
                >
                    {item.label}
                    {item.required ? ' *' : ''}
                </label>
                <RadioGroup
                    row
                    style={{ ...styles.divControl, ...this.state.json.itemStyle, ...item.style }}
                >
                    <FormControlLabel
                        value="yes"
                        control={
                            <Radio
                                checked={value === false}
                                onClick={e => {
                                    this.props.reportUxEvent({
                                        id: item.id,
                                        event: 'change',
                                        isTouchEvent: isTouch(e),
                                        ts: Date.now(),
                                        data: 'no',
                                    });
                                    this.setState(prevState => ({
                                        answers: {
                                            ...prevState.answers,
                                            [item.id]: { ts: new Date().toISOString(), value: false },
                                        },
                                    }));
                                }}
                            />
                        }
                        label="Nein"
                    />
                    <FormControlLabel
                        value="no"
                        control={
                            <Radio
                                checked={value === true}
                                onClick={e => {
                                    this.props.reportUxEvent({
                                        id: item.id,
                                        event: 'change',
                                        isTouchEvent: isTouch(e),
                                        ts: Date.now(),
                                        data: 'yes',
                                    });
                                    this.setState(prevState => ({
                                        answers: {
                                            ...prevState.answers,
                                            [item.id]: { ts: new Date().toISOString(), value: true },
                                        },
                                    }));
                                }}
                            />
                        }
                        label="Ja"
                    />
                </RadioGroup>
            </div>
        );
    }

    renderCheckbox(item: QuestionnaireItem, index: number): React.JSX.Element {
        const value = this.state.answers[item.id]?.value || false;
        return (
            <div
                key={`${index}_${item.id}`}
                style={{
                    ...styles.divItem,
                    ...this.state.json.divStyle,
                    ...(item.delimiter === false
                        ? undefined
                        : item.delimiter === 'solid'
                          ? styles.delimiterSolid
                          : styles.delimiter),
                }}
            >
                <label
                    htmlFor={item.id}
                    style={{ ...styles.divLabel, ...this.state.json.labelStyle }}
                >
                    {item.label}
                    {item.required ? ' *' : ''}
                </label>
                <Checkbox
                    checked={!!value}
                    onChange={e => {
                        this.props.reportUxEvent({
                            id: item.id,
                            event: 'change',
                            isTouchEvent: isTouch(e),
                            ts: Date.now(),
                            data: e.target.checked ? 'true' : 'false',
                        });
                        this.setState(prevState => ({
                            answers: {
                                ...prevState.answers,
                                [item.id]: { ts: new Date().toISOString(), value: e.target.checked },
                            },
                        }));
                    }}
                />
            </div>
        );
    }

    renderItem(item: QuestionnaireItem, index: number): React.JSX.Element | null {
        switch (item.type) {
            case 'text':
                return this.renderText(item, index);
            case 'select':
                return this.renderSelect(item, index);
            case 'input':
                return this.renderInput(item, index);
            case 'radio':
                return this.renderRadio(item, index);
            case 'yesNo':
                return this.renderYesNo(item, index);
            case 'checkbox':
                return this.renderCheckbox(item, index);
            default:
                return <div key={`${index}_${item.id}`}>Unknown item type: {item.type}</div>;
        }
    }

    async sendAnswers(): Promise<void> {
        const answer: QuestionnaireAnswer = {
            id: this.state.json.id,
            startTs: this.state.startTs,
            endTs: new Date().toISOString(),
            links: this.state.links,
            answers: Object.entries(this.state.answers).map(([id, { ts, value }]) => ({
                id,
                ts,
                value,
            })),
        };

        await this.props.socket.sendTo(`kisshome-defender.${this.props.instance}`, 'questionnaireAnswer', answer);
    }

    render(): React.JSX.Element {
        let allRequiredAnswered = true;
        this.state.json.items?.forEach((item: QuestionnaireItem) => {
            if (item.required && !this.state.answers[item.id] && item.type !== 'text') {
                allRequiredAnswered = false;
            }
        });

        return (
            <Dialog
                fullWidth
                maxWidth="lg"
                open={!0}
                onClose={async (e, reason?: 'backdropClick' | 'escapeKeyDown') => {
                    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
                        this.props.reportUxEvent({
                            id: 'kisshome-defender-questionnaire-dialog',
                            event: 'click',
                            isTouchEvent: isTouch(e),
                            ts: Date.now(),
                            data: reason,
                        });
                    }

                    if (
                        this.state.json.required === false ||
                        (reason !== 'backdropClick' && reason !== 'escapeKeyDown')
                    ) {
                        await this.props.socket.sendTo(
                            `kisshome-defender.${this.props.instance}`,
                            'questionnaireCancel',
                            { id: this.state.json.id },
                        );
                        this.props.onClose();
                    }
                }}
            >
                <DialogTitle
                    style={{
                        backgroundColor: this.props.themeType === 'dark' ? '#333' : '#f5f5f5',
                        ...this.state.json.titleStyle,
                    }}
                >
                    {this.state.json.title || 'Abfrage'}
                </DialogTitle>
                <DialogContent
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                    }}
                >
                    {this.state.email ? this.state.json.items?.map((item, i) => this.renderItem(item, i)) : '...'}
                </DialogContent>
                <DialogActions>
                    {this.state.json.required === false ? (
                        <Button
                            variant="contained"
                            color="grey"
                            onClick={async e => {
                                this.props.reportUxEvent({
                                    id: 'kisshome-defender-questionnaire-cancel',
                                    event: 'click',
                                    isTouchEvent: isTouch(e),
                                    ts: Date.now(),
                                });
                                // Clear questionnaire without sending answers
                                await this.props.socket.sendTo(
                                    `kisshome-defender.${this.props.instance}`,
                                    'questionnaireCancel',
                                    { id: this.state.json.id },
                                );
                                this.props.onClose();
                            }}
                            startIcon={<Close />}
                        >
                            Abbrechen
                        </Button>
                    ) : null}
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={!allRequiredAnswered}
                        startIcon={<Check />}
                        onClick={async e => {
                            this.props.reportUxEvent({
                                id: 'kisshome-defender-questionnaire-send',
                                event: 'click',
                                isTouchEvent: isTouch(e),
                                ts: Date.now(),
                            });
                            await this.sendAnswers();
                            this.props.onClose();
                        }}
                    >
                        {this.state.json.button || 'Absenden'}
                    </Button>
                </DialogActions>
            </Dialog>
        );
    }
}
