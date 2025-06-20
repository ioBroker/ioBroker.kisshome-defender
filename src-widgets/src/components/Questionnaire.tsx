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
    FormControlLabel, MenuItem,
    Radio,
    RadioGroup,
    Select,
    TextField,
} from '@mui/material';
import { Check, Close } from '@mui/icons-material';

import type { ReportUxHandler } from '../types';

export type QuestionnaireItemType = 'text' | 'select' | 'checkbox' | 'radio' | 'input' | 'yesNo';

export interface QuestionnaireItem {
    id: string;
    type: QuestionnaireItemType;
    options?: { value: string; label: string; style?: React.CSSProperties }[];
    label?: string;
    required?: boolean;
    text?: string; // For text items, this can be used to render Markdown or other content
    style?: React.CSSProperties; // Optional style for the item
}

export interface QuestionnaireJson {
    id: string;
    title?: string;
    button?: string;
    required?: boolean;
    items?: QuestionnaireItem[];
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
    },
    divLabel: {
        minWidth: '30%',
        fontWeight: 'bold',
    },
    divControl: {},
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
        }

        this.markDown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
            const href = tokens[idx].attrGet('href');
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

    componentDidMount() {
        this.props.reportUxEvent({
            id: this.state.json.id,
            event: 'show',
            ts: Date.now(),
        });
    }

    componentWillUnmount() {
        this.props.reportUxEvent({
            id: this.state.json.id,
            event: 'hide',
            ts: Date.now(),
        });
    }

    renderText(item: QuestionnaireItem): React.JSX.Element {
        const content = this.markDown.render(item.text || '');

        if (!item.label) {
            return (
                <div
                    key={item.id}
                    style={styles.divItem}
                >
                    <span
                        style={{ width: '100%', ...item.style }}
                        dangerouslySetInnerHTML={{ __html: content }}
                    />
                </div>
            );
        }

        return (
            <div
                key={item.id}
                style={styles.divItem}
            >
                <label
                    htmlFor={item.id}
                    style={styles.divLabel}
                >
                    {item.label}
                </label>
                <span
                    style={{ ...styles.divControl, ...item.style }}
                    dangerouslySetInnerHTML={{ __html: content }}
                />
            </div>
        );
    }

    renderSelect(item: QuestionnaireItem): React.JSX.Element {
        return (
            <div
                key={item.id}
                style={styles.divItem}
            >
                <label
                    htmlFor={item.id}
                    style={styles.divLabel}
                >
                    {item.label}
                </label>
                <Select
                    variant="standard"
                    id={item.id}
                    style={{ minWidth: 150, ...styles.divControl, ...item.style }}
                    value={this.state.answers[item.id]?.value || ''}
                    onChange={e => {
                        const value = e.target.value;
                        this.props.reportUxEvent({
                            id: item.id,
                            event: 'change',
                            isTouchEvent: e instanceof TouchEvent,
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

    renderInput(item: QuestionnaireItem): React.JSX.Element {
        return (
            <div
                key={item.id}
                style={styles.divItem}
            >
                <label
                    htmlFor={item.id}
                    style={styles.divLabel}
                >
                    {item.label}
                </label>
                <TextField
                    style={{ ...styles.divControl, ...item.style }}
                    variant="standard"
                    value={(this.state.answers[item.id]?.value as string) || ''}
                    onChange={e => {
                        const value = e.target.value;
                        this.props.reportUxEvent({
                            id: item.id,
                            event: 'change',
                            isTouchEvent: e instanceof TouchEvent,
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
                />
            </div>
        );
    }

    renderRadio(item: QuestionnaireItem): React.JSX.Element {
        const value = this.state.answers[item.id]?.value || '';
        return (
            <div
                key={item.id}
                style={styles.divItem}
            >
                <label
                    htmlFor={item.id}
                    style={styles.divLabel}
                >
                    {item.label}
                </label>
                <RadioGroup
                    row
                    style={{ ...styles.divControl, ...item.style }}
                >
                    {item.options?.map(option => (
                        <FormControlLabel
                            control={
                                <Radio
                                    checked={value === option.value}
                                    onClick={e => {
                                        this.props.reportUxEvent({
                                            id: item.id,
                                            event: 'change',
                                            isTouchEvent: e instanceof TouchEvent,
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
                        />
                    ))}
                </RadioGroup>
            </div>
        );
    }

    renderYesNo(item: QuestionnaireItem): React.JSX.Element {
        const value: boolean = this.state.answers[item.id]?.value as boolean;
        return (
            <div
                key={item.id}
                style={styles.divItem}
            >
                <label
                    htmlFor={item.id}
                    style={styles.divLabel}
                >
                    {item.label}
                </label>
                <RadioGroup
                    row
                    style={{ ...styles.divControl, ...item.style }}
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
                                        isTouchEvent: e instanceof TouchEvent,
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
                                        isTouchEvent: e instanceof TouchEvent,
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

    renderCheckbox(item: QuestionnaireItem): React.JSX.Element {
        const value = this.state.answers[item.id]?.value || false;
        return (
            <div
                key={item.id}
                style={styles.divItem}
            >
                <label
                    htmlFor={item.id}
                    style={styles.divLabel}
                >
                    {item.label}
                </label>
                <Checkbox
                    checked={!!value}
                    onChange={e => {
                        this.props.reportUxEvent({
                            id: item.id,
                            event: 'change',
                            isTouchEvent: e instanceof TouchEvent,
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

    renderItem(item: QuestionnaireItem): React.JSX.Element {
        switch (item.type) {
            case 'text':
                return this.renderText(item);
            case 'select':
                return this.renderSelect(item);
            case 'input':
                return this.renderInput(item);
            case 'radio':
                return this.renderRadio(item);
            case 'yesNo':
                return this.renderYesNo(item);
            case 'checkbox':
                return this.renderCheckbox(item);
            default:
                return <div key={item.id}>Unknown item type: {item.type}</div>;
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

        const result = await this.props.socket.sendTo(
            `kisshome-defender.${this.props.instance}`,
            'questionnaireAnswer',
            answer,
        );
    }

    render(): React.JSX.Element {
        let allRequiredAnswered = true;
        this.state.json.items?.forEach((item: QuestionnaireItem) => {
            if (item.required && !this.state.answers[item.id]) {
                allRequiredAnswered = false;
            }
        });

        return (
            <Dialog
                fullWidth
                maxWidth="lg"
                open={!0}
                onClose={(_e, reason?: 'backdropClick' | 'escapeKeyDown') => {
                    if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
                        this.props.reportUxEvent({
                            id: 'kisshome-defender-questionnaire-dialog',
                            event: 'click',
                            isTouchEvent: _e instanceof TouchEvent,
                            ts: Date.now(),
                            data: reason,
                        });
                    }

                    if (this.state.json.required === false) {
                        this.props.onClose();
                    } else if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
                        this.props.onClose();
                    }
                }}
            >
                <DialogTitle>{this.state.json.title || 'Abfrage'}</DialogTitle>
                <DialogContent
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10,
                    }}
                >
                    {this.state.json.items?.map(item => this.renderItem(item))}
                </DialogContent>
                <DialogActions>
                    {this.state.json.required === false ? (
                        <Button
                            variant="contained"
                            color="grey"
                            onClick={e => {
                                this.props.reportUxEvent({
                                    id: 'kisshome-defender-questionnaire-cancel',
                                    event: 'click',
                                    isTouchEvent: e instanceof TouchEvent,
                                    ts: Date.now(),
                                });
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
                                isTouchEvent: e instanceof TouchEvent,
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
