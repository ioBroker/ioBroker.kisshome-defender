/**
 * The words the element shows, in the languages of ioBroker.
 *
 * Most of them are the words of the vis-2 widget (`src-widgets/src/Widget/i18n/<lang>.json`, without the prefix
 * `kisshome-defender_`): `vite.config.ts` picks the keys of `NATIVE_WORDS` out of those files at build time and puts
 * them into the module as `__KISSHOME_WORDS__` - the whole dictionaries would be most of the module. The few words
 * the vis-2 widget does not have live in `OWN_WORDS` below.
 */

/** The words of the vis-2 widget, picked by `vite.config.ts`: language -> key -> text */
declare const __KISSHOME_WORDS__: Record<string, Record<string, string>>;

/** The keys of the dictionary of the vis-2 widget the element uses */
export const NATIVE_WORDS = [
    '%s collected',
    '%s minutes',
    '%s of %s reached',
    '<strong>No anomalies</strong> were detected during the checks on %s. Therefore, everything is in order.',
    'Activate protection',
    'All',
    'Analyzing',
    'Anomaly',
    'Anomaly Score',
    'Average check time',
    'Average control time',
    'Below you will find information about checks on %s.',
    'By country',
    'By day',
    'By day (aggregated)',
    'By day-time',
    'Click here to get more information',
    'Close',
    'Configuring',
    'Data volume',
    'Deactivate protection',
    'Detection engine status',
    'Detections',
    'Device',
    'Device that contacted the most countries',
    'Device with the highest transmitted data volume',
    'Do not show this alert again for 10 minutes',
    'Duration of checks',
    'Duration of controls',
    'During the checks on %s, a <strong>maximum anomaly score of %s</strong> was detected. Therefore, everything is in order.',
    'During the inspection on %s at %s, %s anomalies were detected that could indicate a potential security risk.',
    'During the inspection on %s at %s, an anomaly was detected that could indicate a potential security risk.',
    'Enable the instance in the admin',
    'Error',
    'Everything OK',
    'Everything is OK!',
    'Execute control now',
    'Exited',
    'IP geolocation',
    'In %s minutes or when the maximal file size is reached',
    'Instance is not running',
    'Last control',
    'Last result',
    'Last week statistics',
    'Manage monitored devices',
    'Maximal control time',
    'Maximum check time',
    'Minimal control time',
    'Minimum check time',
    'New problem detected',
    'Next control',
    'No anomalies were detected during the checks. Therefore, everything is in order.',
    'No anomaly',
    'No connection',
    'No data available',
    'No results available',
    'No results yet exist',
    'No status report available.',
    'Number of packets',
    'Ok',
    'Open in Admin',
    'Protection enabled',
    'Recording is not running. Please check the log for more details',
    'Recording is running',
    'Results',
    'Running',
    'Save threshold in seconds',
    'Scan details (today)',
    'Score',
    'Settings',
    'Show only alarms and warnings',
    'Show results',
    'Software activated',
    'Software not activated',
    'Started',
    'Statistics',
    'Statistics about Data-volume in the last week',
    'Statistics on aggregated transmitted data volume over the past 7 days',
    'Statistics over the past 7 days',
    'Status',
    'Status Report',
    'Status report at %s',
    'Test result at %s',
    'The control time was %s minutes.',
    'Try again in %s sec.',
    'Unknown',
    'Unusual activity detected!',
    'Weekday',
    'Your smart devices were checked on %s at %s. No unusual activities were detected.',
    'Your smart devices were checked on %s at %s. Unusual activity was detected on at least one device.',
    'ioBroker.kisshome-defender uses the IP2Location LITE database for',
    'minutes',
    'one hour',
    'tooltip_score_1',
    'tooltip_score_2',
    'tooltip_score_3',
    'tooltip_score_4',
] as const;

export type NativeWord = (typeof NATIVE_WORDS)[number];

const OWN_EN = {
    chooseInstance: 'Choose an instance in the settings',
    noInstance: 'Instance not found',
    engineExited: 'Detection engine exited',
    thresholdHint: 'To change it, open the settings of the instance',
};

export type OwnWord = keyof typeof OWN_EN;

/** The words the vis-2 widget does not have */
const OWN_WORDS: Record<string, Record<OwnWord, string>> = {
    en: OWN_EN,
    de: {
        chooseInstance: 'Instanz in den Einstellungen wählen',
        noInstance: 'Instanz nicht gefunden',
        engineExited: 'Erkennungs-Engine beendet',
        thresholdHint: 'Zum Ändern die Einstellungen der Instanz öffnen',
    },
    ru: {
        chooseInstance: 'Выберите экземпляр в настройках',
        noInstance: 'Экземпляр не найден',
        engineExited: 'Механизм обнаружения остановлен',
        thresholdHint: 'Чтобы изменить, откройте настройки экземпляра',
    },
    pt: {
        chooseInstance: 'Escolha uma instância nas configurações',
        noInstance: 'Instância não encontrada',
        engineExited: 'O mecanismo de deteção terminou',
        thresholdHint: 'Para alterar, abra as configurações da instância',
    },
    nl: {
        chooseInstance: 'Kies een instantie in de instellingen',
        noInstance: 'Instantie niet gevonden',
        engineExited: 'Detectie-engine beëindigd',
        thresholdHint: 'Open de instellingen van de instantie om dit te wijzigen',
    },
    fr: {
        chooseInstance: 'Choisissez une instance dans les paramètres',
        noInstance: 'Instance introuvable',
        engineExited: "Le moteur de détection s'est arrêté",
        thresholdHint: "Pour le modifier, ouvrez les paramètres de l'instance",
    },
    it: {
        chooseInstance: "Scegli un'istanza nelle impostazioni",
        noInstance: 'Istanza non trovata',
        engineExited: 'Il motore di rilevamento è terminato',
        thresholdHint: "Per modificarlo, apri le impostazioni dell'istanza",
    },
    es: {
        chooseInstance: 'Elija una instancia en la configuración',
        noInstance: 'Instancia no encontrada',
        engineExited: 'El motor de detección se detuvo',
        thresholdHint: 'Para cambiarlo, abra la configuración de la instancia',
    },
    pl: {
        chooseInstance: 'Wybierz instancję w ustawieniach',
        noInstance: 'Nie znaleziono instancji',
        engineExited: 'Silnik wykrywania zakończył działanie',
        thresholdHint: 'Aby to zmienić, otwórz ustawienia instancji',
    },
    uk: {
        chooseInstance: 'Виберіть екземпляр у налаштуваннях',
        noInstance: 'Екземпляр не знайдено',
        engineExited: 'Механізм виявлення зупинено',
        thresholdHint: 'Щоб змінити, відкрийте налаштування екземпляра',
    },
    'zh-cn': {
        chooseInstance: '请在设置中选择实例',
        noInstance: '未找到实例',
        engineExited: '检测引擎已退出',
        thresholdHint: '如需更改，请打开实例设置',
    },
};

export type WordKey = NativeWord | OwnWord;

let nativeWords: Record<string, Record<string, string>> | null = null;

/**
 * The words of the vis-2 widget. Named once only: the build puts the whole object in place of the name, and the
 * build itself (`vite.config.ts`) imports this file without it
 */
function getNativeWords(): Record<string, Record<string, string>> {
    nativeWords ||= __KISSHOME_WORDS__;
    return nativeWords;
}

/** Translates a key and puts the arguments in place of the `%s` in their order, like `I18n.t()` */
export type Translate = (key: WordKey, ...args: (string | number)[]) => string;

/**
 * A word in the language of the system, English if there is none in it
 *
 * @param lang the language of the ioBroker system
 * @param key the word
 * @param args what replaces the `%s` of the word, in their order
 */
export function getWord(lang: string, key: WordKey, ...args: (string | number)[]): string {
    const native = getNativeWords();
    let text: string =
        OWN_WORDS[lang]?.[key as OwnWord] || OWN_EN[key as OwnWord] || native[lang]?.[key] || native.en?.[key] || key;
    for (const arg of args) {
        // a function: a `$` in the argument is no pattern of the replacement
        text = text.replace('%s', () => String(arg));
    }
    return text;
}

/**
 * The translation function for one language
 *
 * @param lang the language of the ioBroker system
 */
export function getTranslate(lang: string): Translate {
    return (key, ...args) => getWord(lang, key, ...args);
}
