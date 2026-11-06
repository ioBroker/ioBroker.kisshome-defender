/** Tag of the custom element; a host checks that the module defines exactly this one */
export const TAG = 'iob-kisshome-defender';

/** The built module, next to its manifest */
export const MODULE_FILE = 'kisshome-defender.js';

/** The manifest the build writes next to the module; `common.webComponents` names this one */
export const MANIFEST_FILE = 'kisshome-defender.json';

/** Where `tasks.js` puts the module in the admin folder; the React import is relative to it */
export const MODULE_PATH = `webcomponents/${MODULE_FILE}`;

/** The adapter whose instance the element shows */
export const ADAPTER = 'kisshome-defender';

/** The views of the element - the tabs of the vis-2 widget */
export const VIEWS = ['status', 'statistics', 'detections', 'settings'] as const;

export type View = (typeof VIEWS)[number];

/** The values of the settings of the manifest; a setting without a value is missing */
export type DefenderSettings = {
    /** `kisshome-defender.0`; `0` and `system.adapter.kisshome-defender.0` are taken as well */
    instance?: string;
    /** Show a new anomaly in a dialog, like the vis-2 widget does */
    alertDialog?: boolean;
};

/** The states of `kisshome-defender.<n>.info.` the element shows */
export const INFO_STATES = [
    'analysis.lastSeen',
    'analysis.lastShownAlert',
    'analysis.lastCreated',
    'analysis.running',
    'ids.status',
    'ids.group',
    'ids.period',
    'recording.enabled',
    'recording.running',
    'recording.capturedFull',
    'recording.nextWrite',
    'recording.triggerWrite',
] as const;

export type InfoState = (typeof INFO_STATES)[number];

/**
 * The instance of the setting
 *
 * @param instance `kisshome-defender.0`, `0` or `system.adapter.kisshome-defender.0`
 * @returns `kisshome-defender.0`, or null if the setting names no instance of this adapter
 */
export function getInstance(instance: string | undefined): string | null {
    const text = (instance || '').trim().replace(/^system\.adapter\./, '');
    if (/^\d+$/.test(text)) {
        return `${ADAPTER}.${text}`;
    }
    return new RegExp(`^${ADAPTER.replace(/-/g, '\\-')}\\.\\d+$`).test(text) ? text : null;
}

/**
 * The ID of a state of the instance
 *
 * @param instance `kisshome-defender.0`
 * @param name e.g. `recording.running`
 */
export function getInfoId(instance: string, name: InfoState): string {
    return `${instance}.info.${name}`;
}

/**
 * The ID of the `alive` state of the instance
 *
 * @param instance `kisshome-defender.0`
 */
export function getAliveId(instance: string): string {
    return `system.adapter.${instance}.alive`;
}

/**
 * The ID of the object of the instance
 *
 * @param instance `kisshome-defender.0`
 */
export function getInstanceObjectId(instance: string): string {
    return `system.adapter.${instance}`;
}
