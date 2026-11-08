/**
 * The styles of the shadow roots. The element fills the box of the host, has a transparent background and inherits
 * `color` and `font`; the colors come from the theme of the host (`--iob-*`). It never measures itself: sizes follow
 * the box through container units (`cqmin`) and container queries.
 */

/** What the element and the contents of its dialogs share: buttons, links, the status signs */
const COMMON = `
* {
    box-sizing: border-box;
}
.btn {
    font: inherit;
    font-size: 0.9em;
    font-weight: 500;
    letter-spacing: 0.02em;
    margin: 0;
    border: none;
    border-radius: var(--iob-border-radius, 4px);
    padding: 0.5em 1.1em;
    background: var(--iob-primary, #3399cc);
    color: var(--iob-primary-contrast, #fff);
    cursor: pointer;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.1em;
    max-width: 100%;
    flex: none;
}
.btn:hover:not(:disabled) {
    filter: brightness(1.1);
}
.btn:focus-visible,
.link:focus-visible,
.chip:focus-visible,
.tab:focus-visible,
.result-head:focus-visible {
    outline: 2px solid var(--iob-primary, #3399cc);
    outline-offset: 2px;
}
.btn:disabled {
    cursor: default;
    opacity: 0.45;
}
.btn-note {
    font-size: 0.75em;
    font-style: italic;
    opacity: 0.8;
}
.link {
    font: inherit;
    color: var(--iob-primary, #3399cc);
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    text-decoration: underline;
    text-align: left;
    display: inline-flex;
    align-items: center;
    gap: 0.3em;
}
.link svg {
    width: 1em;
    height: 1em;
    fill: currentColor;
    flex: none;
}
.status-icon {
    flex: none;
    width: 1.6em;
    height: 1.6em;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #fff;
}
.status-icon.ok {
    background: var(--iob-success, #4caf50);
}
.status-icon.bad {
    background: var(--iob-error, #f44336);
}
.status-icon.warning {
    border-radius: 0;
    color: var(--iob-error, #f44336);
}
.status-icon svg {
    width: 80%;
    height: 80%;
    fill: currentColor;
}
.status-icon.warning svg {
    width: 100%;
    height: 100%;
}
.secondary {
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
}
.check {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    cursor: pointer;
}
.check input {
    width: 1.1em;
    height: 1.1em;
    margin: 0;
    accent-color: var(--iob-primary, #3399cc);
    cursor: pointer;
}
.actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
}
.footnote {
    font-size: 0.8em;
    font-style: italic;
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
}
.footnote a {
    color: inherit;
}
`;

export const STYLES = `
:host {
    display: block;
    width: 100%;
    height: 100%;
}
.mount {
    width: 100%;
    height: 100%;
    /* the size of the box does not depend on what is in it - no loop between measuring and laying out */
    container-type: size;
}
${COMMON}
.app {
    --gap: clamp(4px, 2.2cqmin, 12px);
    --line: var(--iob-divider, rgba(0, 0, 0, 0.12));
    --radius: calc(var(--iob-border-radius, 4px) * 2);
    --hover: color-mix(in srgb, currentColor 8%, transparent);
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-size: clamp(11px, 3.6cqmin, 16px);
    line-height: 1.35;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}
.app.edit {
    pointer-events: none;
}
.hint {
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    text-align: center;
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
}
.hint svg {
    width: clamp(20px, 12cqmin, 40px);
    height: clamp(20px, 12cqmin, 40px);
    fill: currentColor;
}
.header {
    flex: none;
    display: flex;
    align-items: center;
    gap: var(--gap);
    padding: 0 var(--gap);
    border-bottom: 1px solid var(--line);
    min-height: 2.8em;
}
.logo {
    width: 1.9em;
    height: 1.9em;
    flex: none;
    object-fit: contain;
}
.brand {
    font-weight: 600;
    letter-spacing: 0.05em;
    white-space: nowrap;
}
.tabs {
    flex: 1;
    min-width: 0;
    display: flex;
    justify-content: flex-end;
    align-self: stretch;
    overflow-x: auto;
    scrollbar-width: none;
}
.tab {
    font: inherit;
    font-size: 0.9em;
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    margin: 0;
    padding: 0 0.7em;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.35em;
    white-space: nowrap;
    flex: none;
}
.tab:hover {
    background: var(--hover);
}
.tab.active {
    color: var(--iob-primary, #3399cc);
    border-bottom-color: var(--iob-primary, #3399cc);
}
.tab.last {
    font-style: italic;
    margin-left: 0.6em;
}
.tab svg {
    width: 1.25em;
    height: 1.25em;
    fill: currentColor;
    flex: none;
}
.body {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: var(--gap);
    display: flex;
    flex-direction: column;
    gap: var(--gap);
}
.panel {
    font: inherit;
    color: inherit;
    text-align: left;
    background: transparent;
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: var(--gap) calc(var(--gap) * 1.5);
    margin: 0;
    min-width: 0;
}
.panel p {
    margin: 0;
}
.panel.clickable {
    cursor: pointer;
}
.panel.clickable:hover {
    background: var(--hover);
}
.status-main {
    flex: 1;
    min-height: min-content;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: calc(var(--gap) * 1.5);
}
.status-rows {
    display: flex;
    flex-direction: column;
    gap: calc(var(--gap) * 0.9);
    font-size: 1.1em;
    max-width: 100%;
}
.status-row {
    display: flex;
    align-items: center;
    gap: 0.6em;
}
.engine.good {
    color: var(--iob-success, #4caf50);
}
.engine.warn {
    color: var(--iob-warning, #ff9800);
}
.engine.bad {
    color: var(--iob-error, #f44336);
}
.spinner {
    flex: none;
    width: 1.6em;
    height: 1.6em;
    border-radius: 50%;
    border: 0.22em solid color-mix(in srgb, currentColor 18%, transparent);
    border-top-color: var(--iob-primary, #3399cc);
    animation: spin 1s linear infinite;
}
@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
.progress {
    flex: none;
    position: relative;
    height: 4px;
    width: 100%;
    overflow: hidden;
    border-radius: 2px;
    background: color-mix(in srgb, var(--iob-primary, #3399cc) 25%, transparent);
}
.progress::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    width: 40%;
    background: var(--iob-primary, #3399cc);
    animation: slide 1.4s ease-in-out infinite;
}
@keyframes slide {
    from {
        left: -40%;
    }
    to {
        left: 100%;
    }
}
.summary {
    flex: none;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--gap);
    font-size: 1.1em;
}
.summary-text {
    flex: 1;
    text-align: center;
}
.detections-main,
.settings {
    flex: 1;
    min-height: min-content;
    display: flex;
    flex-direction: column;
    gap: calc(var(--gap) * 1.2);
}
.field {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3em 0.8em;
}
.field-name {
    font-weight: 600;
    min-width: min(16em, 100%);
}
.note {
    flex-basis: 100%;
    font-size: 0.85em;
}
.trigger {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--gap) calc(var(--gap) * 2);
}
.trigger .progress {
    flex: 1;
    min-width: 6em;
    width: auto;
}
.switch {
    appearance: none;
    -webkit-appearance: none;
    position: relative;
    width: 2.6em;
    height: 1.4em;
    margin: 0;
    border-radius: 0.7em;
    background: color-mix(in srgb, currentColor 30%, transparent);
    cursor: pointer;
    transition: background 0.15s;
    flex: none;
}
.switch::after {
    content: '';
    position: absolute;
    top: 0.15em;
    left: 0.15em;
    width: 1.1em;
    height: 1.1em;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
    transition: left 0.15s;
}
.switch:checked {
    background: var(--iob-primary, #3399cc);
}
.switch:checked::after {
    left: 1.35em;
}
.switch:disabled {
    opacity: 0.45;
    cursor: default;
}
.subtabs,
.legend {
    flex: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.35em;
}
.legend {
    max-height: 4.6em;
    overflow-y: auto;
}
.chip {
    font: inherit;
    font-size: 0.85em;
    color: inherit;
    background: transparent;
    border: 1px solid var(--line);
    border-radius: 1em;
    padding: 0.2em 0.75em;
    margin: 0;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.35em;
    white-space: nowrap;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
}
.chip:hover {
    background: var(--hover);
}
.chip.active {
    background: var(--iob-primary, #3399cc);
    border-color: var(--iob-primary, #3399cc);
    color: var(--iob-primary-contrast, #fff);
}
.chip.off {
    opacity: 0.45;
    text-decoration: line-through;
}
.dot {
    flex: none;
    width: 0.7em;
    height: 0.7em;
    border-radius: 50%;
}
.statistics {
    flex: 1;
    min-height: 12em;
    display: flex;
    flex-direction: column;
    gap: var(--gap);
}
.panel-title,
.totals-title {
    font-weight: 600;
}
.short {
    display: none;
}
.chart-area {
    flex: 1;
    min-height: 0;
    position: relative;
}
.empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
}
.chart {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: auto 1fr;
    grid-template-rows: auto 1fr auto;
    column-gap: 0.4em;
    padding-right: 1em;
    font-size: 0.8em;
}
.chart-name {
    grid-column: 1 / span 2;
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
    padding-bottom: 0.3em;
}
.y-axis {
    position: relative;
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
}
.y-axis .sizer {
    display: block;
    visibility: hidden;
    height: 0;
    white-space: nowrap;
}
.y-axis .tick {
    position: absolute;
    right: 0;
    transform: translateY(50%);
    white-space: nowrap;
}
.plot {
    position: relative;
    min-height: 0;
    border-left: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
    touch-action: pan-y;
}
.plot svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
}
.grid-line {
    stroke: var(--line);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;
}
.series {
    fill: none;
    stroke-width: 2;
    stroke-linejoin: round;
    vector-effect: non-scaling-stroke;
}
.cursor {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 1px;
    background: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
    pointer-events: none;
}
.tooltip {
    position: absolute;
    top: 0.3em;
    z-index: 1;
    max-width: 70%;
    max-height: calc(100% - 0.6em);
    overflow: hidden;
    padding: 0.3em 0.6em;
    background: var(--iob-paper, #fff);
    border: 1px solid var(--line);
    border-radius: var(--iob-border-radius, 4px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    pointer-events: none;
}
.tooltip-time {
    font-weight: 600;
}
.tooltip-row {
    display: flex;
    align-items: center;
    gap: 0.4em;
    white-space: nowrap;
}
.tooltip-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}
.x-axis {
    position: relative;
    height: 1.6em;
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
}
.x-axis span {
    position: absolute;
    top: 0.3em;
    transform: translateX(-50%);
    white-space: nowrap;
}
.bars {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    gap: var(--gap);
}
.bar-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.35em;
    font-size: 0.85em;
}
.bar-row {
    display: grid;
    grid-template-columns: minmax(3em, 32%) 1fr auto;
    align-items: center;
    gap: 0.5em;
}
.bar-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.bar-track {
    display: flex;
    height: 1em;
    min-width: 0;
}
.segment {
    height: 100%;
    min-width: 1px;
}
.segment:first-child {
    border-radius: 2px 0 0 2px;
}
.segment:last-child {
    border-radius: 0 2px 2px 0;
}
.bar-total {
    white-space: nowrap;
    color: var(--iob-text-secondary, rgba(0, 0, 0, 0.6));
}
.totals {
    flex: none;
    font-size: 0.9em;
}
@container (max-width: 560px) {
    .tab .label {
        display: none;
    }
    .long {
        display: none;
    }
    .short {
        display: inline;
    }
}
@container (max-width: 340px) {
    .brand {
        display: none;
    }
}
`;

/** The contents of the dialogs, in a shadow root of their own: the host moves them into its dialog */
export const DIALOG_STYLES = `
:host {
    display: block;
}
${COMMON}
.results,
.alert {
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    gap: 16px;
    line-height: 1.4;
}
.results-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}
.results-list p {
    margin: 0;
}
.result {
    border: 1px solid var(--iob-divider, rgba(0, 0, 0, 0.12));
    border-radius: var(--iob-border-radius, 4px);
    overflow: hidden;
}
.result-head {
    font: inherit;
    color: inherit;
    width: 100%;
    margin: 0;
    border: none;
    padding: 8px 12px;
    background: color-mix(in srgb, currentColor 6%, transparent);
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
}
.result-head:hover {
    background: color-mix(in srgb, currentColor 11%, transparent);
}
.result-icon {
    width: 1.6em;
    height: 1.6em;
    fill: currentColor;
    flex: none;
}
.result-title {
    flex: 1;
}
.chevron {
    width: 1.5em;
    height: 1.5em;
    fill: currentColor;
    flex: none;
    transition: transform 0.15s;
}
.result.open .chevron {
    transform: rotate(180deg);
}
.details {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}
.details-title {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 1.3em;
    font-weight: 600;
}
.details-title > svg {
    width: 1.6em;
    height: 1.6em;
    fill: currentColor;
    flex: none;
}
.details-text ul {
    margin: 4px 0;
    padding-left: 1.4em;
}
.italic {
    font-style: italic;
}
.devices {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--iob-divider, rgba(0, 0, 0, 0.12));
    border-radius: var(--iob-border-radius, 4px);
    overflow: hidden;
}
.device {
    display: grid;
    grid-template-columns: minmax(10em, 2fr) 7em 8em 3fr;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-top: 1px solid var(--iob-divider, rgba(0, 0, 0, 0.12));
}
.device.head {
    border-top: none;
    font-weight: 600;
    background: color-mix(in srgb, currentColor 8%, transparent);
}
.device-name {
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow-wrap: anywhere;
}
.device-name small {
    font-style: italic;
    opacity: 0.8;
}
.device-packets {
    text-align: center;
}
.device-score {
    align-self: stretch;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2px 6px;
    border-radius: var(--iob-border-radius, 4px);
    color: #fff;
}
.device-score.good {
    background: var(--iob-success, #4caf50);
}
.device-score.bad {
    background: var(--iob-error, #f44336);
}
.device-status {
    display: flex;
    align-items: center;
    gap: 8px;
}
.device.alert .device-status {
    color: var(--iob-error, #f44336);
}
@container (max-width: 600px) {
    .device {
        grid-template-columns: 1fr auto;
    }
    .device.head {
        display: none;
    }
    .device-name,
    .device-status {
        grid-column: 1 / span 2;
    }
    .device-packets,
    .device-score {
        text-align: left;
        justify-content: flex-start;
    }
    .device-packets::before,
    .device-score::before {
        content: attr(data-label) ': ';
        font-weight: 600;
        margin-right: 4px;
    }
    .device-score::before {
        color: #fff;
    }
}
.alert-main {
    display: flex;
    align-items: center;
    gap: 24px;
}
.alert-text {
    flex: 1;
    font-size: 1.2em;
    font-weight: 600;
}
`;
