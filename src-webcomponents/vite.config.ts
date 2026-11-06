import react from '@vitejs/plugin-react';
import { checkManifest, getReactImportPath, REACT_SPECIFIERS, type WebComponentText } from '@iobroker/web-components';
import { readFileSync } from 'node:fs';
import type { Plugin } from 'vite';

// with the extension: Vite may load its config natively, without a bundler that would add it
import { NATIVE_WORDS } from './src/i18n.ts';
import { buildManifest, MANIFEST_FILE, MODULE_FILE, MODULE_PATH } from './src/manifest.ts';

/**
 * The web component `<iob-kisshome-defender>`: one ES module, `admin/webcomponents/kisshome-defender.js`, and its
 * manifest `kisshome-defender.json` next to it (`common.webComponents`). Every host - vis-2, devices, Aura, admin -
 * reads them from `/adapter/kisshome-defender/webcomponents/`. No module federation: the host shares nothing but the
 * socket.
 *
 * React is not bundled: the four React imports point at `lib/esm/react-19.js`, which web and admin serve
 * beside `adapter/`. The path is relative to the module, so a path prefix of a reverse proxy stays.
 */

const LANGUAGES: ioBroker.Languages[] = ['en', 'de', 'ru', 'pt', 'nl', 'fr', 'it', 'es', 'pl', 'uk', 'zh-cn'];

/** The dictionary of the vis-2 widget, `<lang>.json` without the prefix `kisshome-defender_` */
const DICTIONARY = '../src-widgets/src/Widget/i18n';

const words: Record<string, Record<string, string>> = Object.fromEntries(
    LANGUAGES.map(lang => [
        lang,
        JSON.parse(readFileSync(new URL(`${DICTIONARY}/${lang}.json`, import.meta.url), 'utf8')) as Record<
            string,
            string
        >,
    ]),
);

/**
 * A word of the vis-2 widget in every language
 *
 * @param key the key in its dictionary
 */
function word(key: string): WebComponentText {
    const text: Partial<Record<ioBroker.Languages, string>> = {};
    for (const lang of LANGUAGES) {
        if (!words[lang][key]) {
            throw new Error(`${DICTIONARY}/${lang}.json has no "${key}"`);
        }
        text[lang] = words[lang][key];
    }
    return text as WebComponentText;
}

/** The words the element shows, out of the whole dictionary; a missing translation falls back to English */
function pickWords(): Record<string, Record<string, string>> {
    const missing = NATIVE_WORDS.filter(key => !words.en[key]);
    if (missing.length) {
        throw new Error(`${DICTIONARY}/en.json has no ${missing.map(key => `"${key}"`).join(', ')}`);
    }
    return Object.fromEntries(
        LANGUAGES.map(lang => [
            lang,
            Object.fromEntries(NATIVE_WORDS.filter(key => words[lang][key]).map(key => [key, words[lang][key]])),
        ]),
    );
}

/** Writes `kisshome-defender.json` next to the module, checked like a host checks it */
function manifestFile(): Plugin {
    return {
        name: 'kisshome-defender-web-component-manifest',
        generateBundle() {
            let manifest;
            try {
                manifest = buildManifest({ name: word('KISSHome'), instance: word('instance') });
            } catch (e) {
                this.error(`${MANIFEST_FILE}: ${(e as Error).message}`);
            }
            const problem = checkManifest(manifest);
            if (problem) {
                this.error(`${MANIFEST_FILE}: ${problem}`);
            }
            this.emitFile({
                type: 'asset',
                fileName: MANIFEST_FILE,
                source: `${JSON.stringify(manifest, null, 4)}\n`,
            });
        },
    };
}

const reactImport = getReactImportPath(MODULE_PATH);

export default {
    plugins: [react(), manifestFile()],
    define: {
        __KISSHOME_WORDS__: JSON.stringify(pickWords()),
        'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
        target: 'es2022',
        outDir: './build',
        emptyOutDir: true,
        lib: {
            entry: './src/index.tsx',
            formats: ['es'],
            fileName: (): string => MODULE_FILE,
        },
        rollupOptions: {
            external: [...REACT_SPECIFIERS],
            output: {
                paths: Object.fromEntries(REACT_SPECIFIERS.map(specifier => [specifier, reactImport])),
                // one file: a host imports exactly one URL
                codeSplitting: false,
                // library mode keeps whitespace for the bundler of a consumer; this module is loaded as it is
                minify: true,
            },
        },
    },
};
