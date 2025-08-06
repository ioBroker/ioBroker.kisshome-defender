import React from 'react';
import ReactDOM from 'react-dom/client';
import { type IWidgetWebComponentProps, WidgetWebComponent } from './Widget';

export const normalizeAttribute = (attribute: string): string => {
    return attribute.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
};

export default class SubscriptionWebComponent extends HTMLElement {
    private componentRoot: ReactDOM.Root | null = null;
    // is called when the element is created
    constructor() {
        super();
        // which allows you to interact with elements within your Shadow DOM using the shadowRoot method of the parent element from your JavaScript code.
        this.attachShadow({ mode: 'open' });
        const styleEl = document.createElement('style');
        styleEl.textContent = `
:root {
    --Paper-shadow: 0px 2px 1px -1px rgba(0, 0, 0, 0.2), 0px 1px 1px 0px rgba(0, 0, 0, 0.14), 0px 1px 3px 0px rgba(0, 0, 0, 0.12);
    font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
}
@-webkit-keyframes mui-auto-fill {
    from {
        display: block;
    }
}
@keyframes mui-auto-fill {
    from {
        display: block;
    }
}
@-webkit-keyframes mui-auto-fill-cancel {
    from {
        display: block;
    }
}
@keyframes mui-auto-fill-cancel {
    from {
        display: block;
    }
}
.MuiCard-root {
    overflow: hidden;
}
.MuiPaper-root.MuiCard-root {
    background-color: #fff;
    color: rgba(0, 0, 0, 0.87);
    -webkit-transition: box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    transition: box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    border-radius: 4px;
    box-shadow: var(--Paper-shadow);
    background-image: var(--Paper-overlay);
    overflow: hidden;
}
.MuiToolbar-root {
    position: relative;
    display: -webkit-box;
    display: -webkit-flex;
    display: -ms-flexbox;
    display: flex;
    -webkit-align-items: center;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    padding-left: 16px;
    padding-right: 16px;
    min-height: 48px;
}
@media (min-width: 600px) {
    .MuiToolbar-root {
        padding-left: 24px;
        padding-right: 24px;
    }
}
.MuiTabs-root {
    overflow: hidden;
    min-height: 48px;
    -webkit-overflow-scrolling: touch;
    display: -webkit-box;
    display: -webkit-flex;
    display: -ms-flexbox;
    display: flex;
}
.MuiTabs-root .MuiTabs-scrollButtons {
}
@media (max-width: 599.95px) {
    .MuiTabs-root .MuiTabs-scrollButtons {
        display: none;
    }
}
.MuiTabs-scroller {
    position: relative;
    display: inline-block;
    -webkit-flex: 1 1 auto;
    -ms-flex: 1 1 auto;
    flex: 1 1 auto;
    white-space: nowrap;
    overflow-x: hidden;
    width: 100%;
}
.MuiTabs-list {
    display: -webkit-box;
    display: -webkit-flex;
    display: -ms-flexbox;
    display: flex;
}
.MuiTab-root {
    font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
    font-weight: 500;
    font-size: 0.875rem;
    line-height: 1.25;
    letter-spacing: 0.02857em;
    text-transform: uppercase;
    max-width: 360px;
    min-width: 90px;
    position: relative;
    min-height: 48px;
    -webkit-flex-shrink: 0;
    -ms-flex-negative: 0;
    flex-shrink: 0;
    padding: 12px 16px;
    overflow: hidden;
    white-space: normal;
    text-align: center;
    -webkit-flex-direction: column;
    -ms-flex-direction: column;
    flex-direction: column;
    color: rgba(0, 0, 0, 0.6);
}
.MuiTab-root.Mui-selected {
    color: #3399cc;
}
.MuiTab-root.Mui-disabled {
    color: rgba(0, 0, 0, 0.38);
}
.MuiButtonBase-root.MuiTab-root {
    display: -webkit-inline-box;
    display: -webkit-inline-flex;
    display: -ms-inline-flexbox;
    display: inline-flex;
    -webkit-align-items: center;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    -webkit-box-pack: center;
    -ms-flex-pack: center;
    -webkit-justify-content: center;
    justify-content: center;
    position: relative;
    box-sizing: border-box;
    -webkit-tap-highlight-color: transparent;
    background-color: transparent;
    outline: 0;
    border: 0;
    margin: 0;
    border-radius: 0;
    padding: 0;
    cursor: pointer;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    vertical-align: middle;
    -moz-appearance: none;
    -webkit-appearance: none;
    -webkit-text-decoration: none;
    text-decoration: none;
    color: inherit;
    font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
    font-weight: 500;
    font-size: 0.875rem;
    line-height: 1.25;
    letter-spacing: 0.02857em;
    text-transform: uppercase;
    max-width: 360px;
    min-width: 90px;
    position: relative;
    min-height: 48px;
    -webkit-flex-shrink: 0;
    -ms-flex-negative: 0;
    flex-shrink: 0;
    padding: 12px 16px;
    overflow: hidden;
    white-space: normal;
    text-align: center;
    -webkit-flex-direction: column;
    -ms-flex-direction: column;
    flex-direction: column;
    color: rgba(0, 0, 0, 0.6);
}
.MuiButtonBase-root.MuiTab-root::-moz-focus-inner {
    border-style: none;
}
.MuiButtonBase-root.MuiTab-root.Mui-disabled {
    pointer-events: none;
    cursor: default;
}
@media print {
    .MuiButtonBase-root.MuiTab-root {
        -webkit-print-color-adjust: exact;
        color-adjust: exact;
    }
}
.MuiButtonBase-root.MuiTab-root.Mui-selected {
    color: #3399cc;
}
.MuiButtonBase-root.MuiTab-root.Mui-disabled {
    color: rgba(0, 0, 0, 0.38);
}
.MuiTabs-indicator {
    position: absolute;
    height: 2px;
    bottom: 0;
    width: 100%;
    -webkit-transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    background-color: #3399cc;
}
.MuiTabs-root {
    overflow: hidden;
    min-height: 48px;
    -webkit-overflow-scrolling: touch;
    display: -webkit-box;
    display: -webkit-flex;
    display: -ms-flexbox;
    display: flex;
    -webkit-flex-direction: column;
    -ms-flex-direction: column;
    flex-direction: column;
}
.MuiTabs-root .MuiTabs-scrollButtons {
}
@media (max-width: 599.95px) {
    .MuiTabs-root .MuiTabs-scrollButtons {
        display: none;
    }
}
.MuiTabs-list {
    display: -webkit-box;
    display: -webkit-flex;
    display: -ms-flexbox;
    display: flex;
    -webkit-flex-direction: column;
    -ms-flex-direction: column;
    flex-direction: column;
}
.MuiTabs-indicator {
    position: absolute;
    height: 2px;
    bottom: 0;
    width: 100%;
    -webkit-transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    background-color: #3399cc;
    height: 100%;
    width: 2px;
    right: 0;
}
.MuiPaper-root {
    font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
    background-color: #fff;
    color: rgba(0, 0, 0, 0.87);
    -webkit-transition: box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    transition: box-shadow 300ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    border-radius: 4px;
    box-shadow: var(--Paper-shadow);
    background-image: var(--Paper-overlay);
}
.MuiSelect-root {
}
.MuiInputBase-root.MuiInput-root.MuiSelect-root {
    font-family: 'Roboto', 'Helvetica', 'Arial', sans-serif;
    font-weight: 400;
    font-size: 1rem;
    line-height: 1.4375em;
    letter-spacing: 0.00938em;
    color: rgba(0, 0, 0, 0.87);
    box-sizing: border-box;
    position: relative;
    cursor: text;
    display: -webkit-inline-box;
    display: -webkit-inline-flex;
    display: -ms-inline-flexbox;
    display: inline-flex;
    -webkit-align-items: center;
    -webkit-box-align: center;
    -ms-flex-align: center;
    align-items: center;
    padding: 4px 0 5px;
    position: relative;
}
.MuiInputBase-root.MuiInput-root.MuiSelect-root.Mui-disabled {
    color: rgba(0, 0, 0, 0.38);
    cursor: default;
}
.MuiInputBase-root.MuiInput-root.MuiSelect-root::after {
    left: 0;
    bottom: 0;
    content: '';
    position: absolute;
    right: 0;
    -webkit-transform: scaleX(0);
    -moz-transform: scaleX(0);
    -ms-transform: scaleX(0);
    transform: scaleX(0);
    -webkit-transition: -webkit-transform 200ms cubic-bezier(0, 0, 0.2, 1) 0ms;
    transition: transform 200ms cubic-bezier(0, 0, 0.2, 1) 0ms;
    pointer-events: none;
}
.MuiInputBase-root.MuiInput-root.MuiSelect-root.Mui-focused:after {
    -webkit-transform: scaleX(1) translateX(0);
    -moz-transform: scaleX(1) translateX(0);
    -ms-transform: scaleX(1) translateX(0);
    transform: scaleX(1) translateX(0);
}
.MuiInputBase-root.MuiInput-root.MuiSelect-root.Mui-error {
}
.MuiInputBase-root.MuiInput-root.MuiSelect-root.Mui-error::before,
.MuiInputBase-root.MuiInput-root.MuiSelect-root.Mui-error::after {
    border-bottom-color: #d32f2f;
}
.MuiInputBase-root.MuiInput-root.MuiSelect-root::before {
    border-bottom: 1px solid rgba(0, 0, 0, 0.42);
    left: 0;
    bottom: 0;
    content: '\\00a0';
    position: absolute;
    right: 0;
    -webkit-transition: border-bottom-color 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    transition: border-bottom-color 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    pointer-events: none;
}
.MuiInputBase-root.MuiInput-root.MuiSelect-root:hover:not(.Mui-disabled, .Mui-error):before {
    border-bottom: 2px solid rgba(0, 0, 0, 0.87);
}
@media (hover: none) {
    .MuiInputBase-root.MuiInput-root.MuiSelect-root:hover:not(
            .Mui-disabled,
            .Mui-error
        ):before {
        border-bottom: 1px solid rgba(0, 0, 0, 0.42);
    }
}
.MuiInputBase-root.MuiInput-root.MuiSelect-root.Mui-disabled:before {
    border-bottom-style: dotted;
}
.MuiInputBase-root.MuiInput-root.MuiSelect-root::after {
    border-bottom: 2px solid #3399cc;
}
.MuiInputBase-input.MuiInput-input {
    font: inherit;
    letter-spacing: inherit;
    color: currentColor;
    padding: 4px 0 5px;
    border: 0;
    box-sizing: content-box;
    background: none;
    height: 1.4375em;
    margin: 0;
    -webkit-tap-highlight-color: transparent;
    display: block;
    min-width: 0;
    width: 100%;
    -webkit-animation-name: mui-auto-fill-cancel;
    animation-name: mui-auto-fill-cancel;
    -webkit-animation-duration: 10ms;
    animation-duration: 10ms;
    height: auto;
    resize: none;
    padding: 0;
    padding-top: 0;
}
.MuiInputBase-input.MuiInput-input::-webkit-input-placeholder {
    color: currentColor;
    opacity: 0.42;
    -webkit-transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
}
.MuiInputBase-input.MuiInput-input::-moz-placeholder {
    color: currentColor;
    opacity: 0.42;
    -webkit-transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
}
.MuiInputBase-input.MuiInput-input::-ms-input-placeholder {
    color: currentColor;
    opacity: 0.42;
    -webkit-transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
}
.MuiInputBase-input.MuiInput-input:focus {
    outline: 0;
}
.MuiInputBase-input.MuiInput-input:invalid {
    box-shadow: none;
}
.MuiInputBase-input.MuiInput-input::-webkit-search-decoration {
    -webkit-appearance: none;
}
label[data-shrink='false'] + .MuiInputBase-formControl .MuiInputBase-input.MuiInput-input {
}
label[data-shrink='false'] + .MuiInputBase-formControl .MuiInputBase-input.MuiInput-input::-webkit-input-placeholder {
    opacity: 0 !important;
}
label[data-shrink='false'] + .MuiInputBase-formControl .MuiInputBase-input.MuiInput-input::-moz-placeholder {
    opacity: 0 !important;
}
label[data-shrink='false'] + .MuiInputBase-formControl .MuiInputBase-input.MuiInput-input::-ms-input-placeholder {
    opacity: 0 !important;
}
label[data-shrink='false'] + .MuiInputBase-formControl .MuiInputBase-input.MuiInput-input:focus::-webkit-input-placeholder {
    opacity: 0.42;
}
label[data-shrink='false'] + .MuiInputBase-formControl .MuiInputBase-input.MuiInput-input:focus::-moz-placeholder {
    opacity: 0.42;
}
label[data-shrink='false'] + .MuiInputBase-formControl .MuiInputBase-input.MuiInput-input:focus::-ms-input-placeholder {
    opacity: 0.42;
}
.MuiInputBase-input.MuiInput-input.Mui-disabled {
    opacity: 1;
    -webkit-text-fill-color: rgba(0, 0, 0, 0.38);
}
.MuiInputBase-input.MuiInput-input:-webkit-autofill {
    -webkit-animation-duration: 5000s;
    animation-duration: 5000s;
    -webkit-animation-name: mui-auto-fill;
    animation-name: mui-auto-fill;
}
.MuiSelect-select.MuiInputBase-input.MuiInput-input {
    -moz-appearance: none;
    -webkit-appearance: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    border-radius: 0;
    cursor: pointer;
    font: inherit;
    letter-spacing: inherit;
    color: currentColor;
    padding: 4px 0 5px;
    border: 0;
    box-sizing: content-box;
    background: none;
    height: 1.4375em;
    margin: 0;
    -webkit-tap-highlight-color: transparent;
    display: block;
    min-width: 0;
    width: 100%;
    -webkit-animation-name: mui-auto-fill-cancel;
    animation-name: mui-auto-fill-cancel;
    -webkit-animation-duration: 10ms;
    animation-duration: 10ms;
    height: auto;
    resize: none;
    padding: 0;
    padding-top: 0;
}
.MuiSelect-select.MuiInputBase-input.MuiInput-input:focus {
    border-radius: 0;
}
.MuiSelect-select.MuiInputBase-input.MuiInput-input.Mui-disabled {
    cursor: default;
}
.MuiSelect-select.MuiInputBase-input.MuiInput-input[multiple] {
    height: auto;
}
.MuiSelect-select.MuiInputBase-input.MuiInput-input:not([multiple]) option, .MuiSelect-select.MuiInputBase-input.MuiInput-input:not([multiple])
    optgroup {
    background-color: #fff;
}
.MuiSelect-select.MuiInputBase-input.MuiInput-input.MuiSelect-select.MuiInputBase-input.MuiInput-input.MuiSelect-select.MuiInputBase-input.MuiInput-input {
    padding-right: 24px;
    min-width: 16px;
}
.MuiSelect-select.MuiInputBase-input.MuiInput-input.MuiSelect-select {
    height: auto;
    min-height: 1.4375em;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
}
.MuiSelect-select.MuiInputBase-input.MuiInput-input::-webkit-input-placeholder {
    color: currentColor;
    opacity: 0.42;
    -webkit-transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
}
.MuiSelect-select.MuiInputBase-input.MuiInput-input::-moz-placeholder {
    color: currentColor;
    opacity: 0.42;
    -webkit-transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
}
.MuiSelect-select.MuiInputBase-input.MuiInput-input::-ms-input-placeholder {
    color: currentColor;
    opacity: 0.42;
    -webkit-transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    transition: opacity 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
}
.MuiSelect-select.MuiInputBase-input.MuiInput-input:focus {
    outline: 0;
}
.MuiSelect-select.MuiInputBase-input.MuiInput-input:invalid {
    box-shadow: none;
}
.MuiSelect-select.MuiInputBase-input.MuiInput-input::-webkit-search-decoration {
    -webkit-appearance: none;
}
label[data-shrink='false'] + .MuiInputBase-formControl .MuiSelect-select.MuiInputBase-input.MuiInput-input {
}
label[data-shrink='false'] + .MuiInputBase-formControl .MuiSelect-select.MuiInputBase-input.MuiInput-input::-webkit-input-placeholder {
    opacity: 0 !important;
}
label[data-shrink='false'] + .MuiInputBase-formControl .MuiSelect-select.MuiInputBase-input.MuiInput-input::-moz-placeholder {
    opacity: 0 !important;
}
label[data-shrink='false'] + .MuiInputBase-formControl .MuiSelect-select.MuiInputBase-input.MuiInput-input::-ms-input-placeholder {
    opacity: 0 !important;
}
label[data-shrink='false'] + .MuiInputBase-formControl .MuiSelect-select.MuiInputBase-input.MuiInput-input:focus::-webkit-input-placeholder {
    opacity: 0.42;
}
label[data-shrink='false'] + .MuiInputBase-formControl .MuiSelect-select.MuiInputBase-input.MuiInput-input:focus::-moz-placeholder {
    opacity: 0.42;
}
label[data-shrink='false'] + .MuiInputBase-formControl .MuiSelect-select.MuiInputBase-input.MuiInput-input:focus::-ms-input-placeholder {
    opacity: 0.42;
}
.MuiSelect-select.MuiInputBase-input.MuiInput-input.Mui-disabled {
    opacity: 1;
    -webkit-text-fill-color: rgba(0, 0, 0, 0.38);
}
.MuiSelect-select.MuiInputBase-input.MuiInput-input:-webkit-autofill {
    -webkit-animation-duration: 5000s;
    animation-duration: 5000s;
    -webkit-animation-name: mui-auto-fill;
    animation-name: mui-auto-fill;
}
.MuiSelect-nativeInput {
    bottom: 0;
    left: 0;
    position: absolute;
    opacity: 0;
    pointer-events: none;
    width: 100%;
    box-sizing: border-box;
}
.MuiSelect-icon {
    position: absolute;
    right: 0;
    top: calc(50% - 0.5em);
    pointer-events: none;
    color: rgba(0, 0, 0, 0.54);
}
.MuiSelect-icon.Mui-disabled {
    color: rgba(0, 0, 0, 0.26);
}
.MuiSvgIcon-root.MuiSelect-icon {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    width: 1em;
    height: 1em;
    display: inline-block;
    -webkit-flex-shrink: 0;
    -ms-flex-negative: 0;
    flex-shrink: 0;
    -webkit-transition: fill 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    transition: fill 200ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
    fill: currentColor;
    font-size: 1.5rem;
    position: absolute;
    right: 0;
    top: calc(50% - 0.5em);
    pointer-events: none;
    color: rgba(0, 0, 0, 0.54);
}
.MuiSvgIcon-root.MuiSelect-icon.Mui-disabled {
    color: rgba(0, 0, 0, 0.26);
}
.MuiMenu-root {
}
.MuiPopover-root.MuiMenu-root {
}
.Mui-horizontal-tabs .MuiTabs-list {
    flex-direction: row;
}
.Mui-horizontal-tabs .MuiTabs-indicator {
    height: 2px !important;
}
.MuiButtonBase-root.MuiButton-root{
    display:-webkit-inline-box;display:-webkit-inline-flex;display:-ms-inline-flexbox;display:inline-flex;-webkit-align-items:center;-webkit-box-align:center;-ms-flex-align:center;align-items:center;-webkit-box-pack:center;-ms-flex-pack:center;-webkit-justify-content:center;justify-content:center;position:relative;box-sizing:border-box;-webkit-tap-highlight-color:transparent;background-color:transparent;outline:0;border:0;margin:0;border-radius:0;padding:0;cursor:pointer;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none;vertical-align:middle;-moz-appearance:none;-webkit-appearance:none;-webkit-text-decoration:none;text-decoration:none;color:inherit;font-family:"Roboto","Helvetica","Arial",sans-serif;font-weight:500;font-size:0.875rem;line-height:1.75;letter-spacing:0.02857em;text-transform:uppercase;min-width:64px;padding:6px 16px;border:0;border-radius:4px;-webkit-transition:background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,border-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;transition:background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,border-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;color:var(--variant-containedColor);background-color:var(--variant-containedBg);box-shadow:0px 3px 1px -2px rgba(0,0,0,0.2),0px 2px 2px 0px rgba(0,0,0,0.14),0px 1px 5px 0px rgba(0,0,0,0.12);--variant-textColor:#3399CC;--variant-outlinedColor:#3399CC;--variant-outlinedBorder:rgba(51, 153, 204, 0.5);--variant-containedColor:#fff;--variant-containedBg:#3399CC;-webkit-transition:background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,border-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;transition:background-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms,border-color 250ms cubic-bezier(0.4, 0, 0.2, 1) 0ms;
}
`;
        this.shadowRoot?.appendChild(styleEl);
    }

    static get observedAttributes(): string[] {
        return ['open', 'selected', 'all'];
    }

    // eslint-disable-next-line class-methods-use-this
    attributeChangedCallback(name: string, oldValue: string, newValue: string): void {
        console.log(`attributeChangedCallback: ${name}, ${oldValue}, ${newValue}`);
        if ((window as any)._iobOnPropertyChanged) {
            (window as any)._iobOnPropertyChanged(name, newValue);
        }
    }

    // is called after the element is attached to the DOM
    connectedCallback(): void {
        const props = this.getPropsFromAttributes<IWidgetWebComponentProps>();
        this.componentRoot = ReactDOM.createRoot(this.shadowRoot as ShadowRoot);
        this.componentRoot.render(<WidgetWebComponent {...props} />);
    }

    // eslint-disable-next-line class-methods-use-this
    disconnectedCallback(): void {
        console.log(`disconnectedCallback`);
    }

    // converts "should-display-mentions" to "shouldDisplayMentions"
    private getPropsFromAttributes<T>(): T {
        const props: Record<string, string> = {};

        for (let index = 0; index < this.attributes.length; index++) {
            const attribute = this.attributes[index];
            props[normalizeAttribute(attribute.name)] = attribute.value;
        }

        return props as T;
    }
}
