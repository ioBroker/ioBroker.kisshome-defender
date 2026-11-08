/**
 * The manifest of `<iob-kisshome-defender>`. Read by the build only (`vite.config.ts`), which writes it as
 * `kisshome-defender.json` next to the module - a host reads that file for its palette and its settings without
 * loading the module.
 *
 * The name and the label of the instance come from the dictionary of the vis-2 widget
 * (`src-widgets/src/Widget/i18n/`); the build reads them. The name is the label the vis-2 palette shows for the widget
 * (`visWidgetLabel: 'KISSHome'`): with the same name, per language, vis-2 offers its own widget instead of this
 * component, and devices and Aura offer the component.
 */
import type { WebComponentManifest, WebComponentText } from '@iobroker/web-components';

// with the extension: `vite.config.ts` imports this file, and Vite may load its config natively
import { ADAPTER, MODULE_FILE, TAG } from './constants.ts';

export { MANIFEST_FILE, MODULE_FILE, MODULE_PATH, TAG } from './constants.ts';

/** The words of the vis-2 widget, read by the build */
export interface ManifestTexts {
    /** `KISSHome`: the label of the vis-2 widget in its palette */
    name: WebComponentText;
    /** `instance`: the label of its setting of the instance */
    instance: WebComponentText;
}

const DESCRIPTION: WebComponentText = {
    en: 'Protection status, data volume statistics and detections of KISSHome defender',
    de: 'Schutzstatus, Statistiken zum Datenvolumen und Erkennungen von KISSHome-Defender',
    ru: 'Состояние защиты, статистика объёма данных и обнаружения KISSHome-Defender',
    pt: 'Estado da proteção, estatísticas do volume de dados e deteções do KISSHome-Defender',
    nl: 'Beschermingsstatus, statistieken van het datavolume en detecties van KISSHome-Defender',
    fr: 'État de la protection, statistiques du volume de données et détections de KISSHome-Defender',
    it: 'Stato della protezione, statistiche sul volume di dati e rilevamenti di KISSHome-Defender',
    es: 'Estado de la protección, estadísticas del volumen de datos y detecciones de KISSHome-Defender',
    pl: 'Stan ochrony, statystyki wolumenu danych i wykrycia KISSHome-Defender',
    uk: 'Стан захисту, статистика обсягу даних і виявлення KISSHome-Defender',
    'zh-cn': 'KISSHome-Defender 的保护状态、数据量统计和检测结果',
};

const ALERT_DIALOG: WebComponentText = {
    en: 'Show new anomalies in a dialog',
    de: 'Neue Anomalien in einem Dialog anzeigen',
    ru: 'Показывать новые аномалии в диалоге',
    pt: 'Mostrar novas anomalias numa caixa de diálogo',
    nl: 'Nieuwe afwijkingen in een dialoogvenster tonen',
    fr: 'Afficher les nouvelles anomalies dans une boîte de dialogue',
    it: 'Mostra le nuove anomalie in una finestra di dialogo',
    es: 'Mostrar las nuevas anomalías en un cuadro de diálogo',
    pl: 'Pokazuj nowe anomalie w oknie dialogowym',
    uk: 'Показувати нові аномалії в діалозі',
    'zh-cn': '在对话框中显示新的异常',
};

const ALERT_DIALOG_HELP: WebComponentText = {
    en: 'Once for each new anomaly, like the vis-2 widget',
    de: 'Einmal für jede neue Anomalie, wie das vis-2-Widget',
    ru: 'Один раз для каждой новой аномалии, как виджет vis-2',
    pt: 'Uma vez para cada nova anomalia, como o widget do vis-2',
    nl: 'Eén keer voor elke nieuwe afwijking, zoals de vis-2-widget',
    fr: 'Une fois pour chaque nouvelle anomalie, comme le widget vis-2',
    it: 'Una volta per ogni nuova anomalia, come il widget di vis-2',
    es: 'Una vez por cada nueva anomalía, como el widget de vis-2',
    pl: 'Raz dla każdej nowej anomalii, jak widżet vis-2',
    uk: 'Один раз для кожної нової аномалії, як віджет vis-2',
    'zh-cn': '每个新异常显示一次，与 vis-2 小部件相同',
};

/**
 * The manifest with the words of the vis-2 widget
 *
 * @param texts the words the build read
 */
export function buildManifest(texts: ManifestTexts): WebComponentManifest {
    return {
        $schema: 'https://raw.githubusercontent.com/ioBroker/web-components/main/schemas/manifest.json',
        manifestVersion: 1,
        tag: TAG,
        name: texts.name,
        description: DESCRIPTION,
        // relative to this file: /adapter/kisshome-defender/kisshome-defender.png
        icon: `../${ADAPTER}.png`,
        module: MODULE_FILE,
        size: { width: 520, height: 400 },
        settings: {
            type: 'panel',
            items: {
                instance: {
                    type: 'instance',
                    adapter: ADAPTER,
                    default: `${ADAPTER}.0`,
                    label: texts.instance,
                },
                alertDialog: {
                    type: 'checkbox',
                    default: true,
                    label: ALERT_DIALOG,
                    help: ALERT_DIALOG_HELP,
                },
            },
        },
    };
}
