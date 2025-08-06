/*!
 * ioBroker gulpfile
 * Date: 2024-07-16
 */
const { deleteFoldersRecursive, npmInstall, buildReact, copyFiles, patchHtmlFile } = require('@iobroker/build-tools');
const { existsSync, writeFileSync, readFileSync, unlinkSync, readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');
const { execSync } = require('node:child_process');
const adapterName = require('./package.json').name.replace('iobroker.', '');

const srcAdmin = `${__dirname}/src-admin/`;

const srcWidgets = `${__dirname}/src-widgets/`;

function adminClean() {
    deleteFoldersRecursive(`${__dirname}/admin`, [
        'kisshome-defender.png',
        'kisshome-defender.svg',
        'jsonConfig.json',
        'i18n',
        'tab.html',
    ]);
    deleteFoldersRecursive(`${srcAdmin}build`);
}

function adminCopyFiles() {
    if (!existsSync(`${srcAdmin}build/customComponents.js`)) {
        console.error(`[${new Date().toISOString()}] Invalid build: customComponents.js not found!`);
        process.exit(2);
    }
    copyFiles(['src-admin/build/assets/**/*'], 'admin/custom/assets');
    copyFiles(['src-admin/build/customComponents.js'], 'admin/custom');
    copyFiles(['src-admin/src/i18n/*.json'], 'admin/custom/i18n');
}

function widgetsClean() {
    deleteFoldersRecursive(`${srcWidgets}build`);
    deleteFoldersRecursive(`${__dirname}/widgets`, ['kisshomeDefender.umd.js', 'Prev_widget.png']);

    // Update version in src-widgets/package.json
    const widgetsPackageJson = require(`${srcWidgets}package.json`);
    widgetsPackageJson.version = require('./package.json').version;
    writeFileSync(`${srcWidgets}package.json`, JSON.stringify(widgetsPackageJson, null, 2));
}

function compareDirectories(dir1, dir2) {
    const files1 = readdirSync(dir1);
    const files2 = readdirSync(dir2);

    if (files1.length !== files2.length) {
        console.error(`Directories ${dir1} and ${dir2} have different number of files.`);
        return false;
    }

    for (const file of files1) {
        const filePath1 = join(dir1, file);
        const filePath2 = join(dir2, file);

        if (!existsSync(filePath2)) {
            console.error(`File ${filePath2} does not exist in directory ${dir2}.`);
            return false;
        }

        const stats1 = statSync(filePath1);
        const stats2 = statSync(filePath2);

        if (stats1.isDirectory() && stats2.isDirectory()) {
            if (!compareDirectories(filePath1, filePath2)) {
                return false;
            }
        } else if (stats1.isFile() && stats2.isFile()) {
            const content1 = readFileSync(filePath1, 'utf8');
            const content2 = readFileSync(filePath2, 'utf8');
            if (content1 !== content2) {
                console.error(`Files ${filePath1} and ${filePath2} differ.`);
                return false;
            }
        } else {
            console.error(`File type mismatch between ${filePath1} and ${filePath2}.`);
            return false; // One is a file and the other is a directory
        }
    }

    return true;
}

async function buildAdminTab() {
    if (!compareDirectories(`${__dirname}/src-admin-tab/src/Widget`, `${__dirname}/src-widgets/src/Widget`)) {
        console.error(
            `[${new Date().toISOString()}] src-admin-tab/src/Widget and src-widgets/src/Widget directories differ!`,
        );
        process.exit(1);
    }
    if (!compareDirectories(`${__dirname}/src-widgets-v1/src/Widget`, `${__dirname}/src-widgets/src/Widget`)) {
        console.error(
            `[${new Date().toISOString()}] src-widgets-v1/src/Widget and src-widgets/src/Widget directories differ!`,
        );
        process.exit(1);
    }

    // clean
    deleteFoldersRecursive(`${__dirname}/admin/assets`);
    if (existsSync(`${__dirname}/admin/tab_m.html`)) {
        unlinkSync(`${__dirname}/admin/tab_m.html`);
    }
    deleteFoldersRecursive(`${__dirname}/src-admin-tab/build`);
    await npmInstall(`${__dirname}/src-admin-tab`);
    await buildReact(`${__dirname}/src-admin-tab`, { rootDir: __dirname, vite: true });
    copyFiles([`${__dirname}/src-admin-tab/build/assets/*.*`], `${__dirname}/admin/assets`);
    writeFileSync(`${__dirname}/admin/tab_m.html`, readFileSync(`${__dirname}/src-admin-tab/build/index.html`));
    await patchHtmlFile(`${__dirname}/admin/tab_m.html`);
}

async function buildWidgetV1() {
    if (!compareDirectories(`${__dirname}/src-admin-tab/src/Widget`, `${__dirname}/src-widgets/src/Widget`)) {
        console.error(
            `[${new Date().toISOString()}] src-admin-tab/src/Widget and src-widgets/src/Widget directories differ!`,
        );
        process.exit(1);
    }
    if (!compareDirectories(`${__dirname}/src-widgets-v1/src/Widget`, `${__dirname}/src-widgets/src/Widget`)) {
        console.error(
            `[${new Date().toISOString()}] src-widgets-v1/src/Widget and src-widgets/src/Widget directories differ!`,
        );
        process.exit(1);
    }
    // clean
    if (existsSync(`${__dirname}/widgets/kisshome-defender/kisshomeDefender.umd.js`)) {
        unlinkSync(`${__dirname}/widgets/kisshome-defender/kisshomeDefender.umd.js`);
    }
    deleteFoldersRecursive(`${__dirname}/src-widgets-v1/dist`);
    await npmInstall(`${__dirname}/src-widgets-v1`);
    await buildReact(`${__dirname}/src-widgets-v1`, { rootDir: __dirname, vite: true });
    copyFiles([`${__dirname}/src-widgets-v1/dist/kisshomeDefender.umd.js`], `widgets/kisshome-defender`);
}

function widgetsCopyFiles() {
    copyFiles([`${srcWidgets}build/customWidgets.js`], `widgets/${adapterName}`);
    copyFiles([`${srcWidgets}build/assets/*.*`], `widgets/${adapterName}/assets`);
    copyFiles([`${srcWidgets}build/img/*`], `widgets/${adapterName}/img`);
}

if (process.argv.includes('--build-backend')) {
    execSync(`tsc --project ${__dirname}/src/tsconfig.build.json`, { stdio: 'inherit', cwd: `${__dirname}/src` });
    copyFiles([`src/i18n/**/*`], `build/i18n/`);
    copyFiles([`src/emails/**/*`], `build/emails/`);
    process.exit();
} else if (process.argv.includes('--admin-0-clean')) {
    adminClean();
    process.exit();
} else if (process.argv.includes('--admin-1-npm')) {
    if (!existsSync(`${__dirname}/src-admin/node_modules`)) {
        npmInstall(srcAdmin).catch(e => {
            console.error(`[${new Date().toISOString()}] Cannot install admin dependencies: ${e}`);
            process.exit(1);
        });
    }
} else if (process.argv.includes('--admin-2-compile')) {
    buildReact(srcAdmin, { rootDir: __dirname, vite: true }).catch(e => {
        console.error(`[${new Date().toISOString()}] Cannot build: ${e}`);
        process.exit(1);
    });
} else if (process.argv.includes('--admin-3-copy')) {
    adminCopyFiles();
} else if (process.argv.includes('--widget-0-clean')) {
    widgetsClean();
    process.exit();
} else if (process.argv.includes('--widget-1-npm')) {
    if (!existsSync(`${srcWidgets}node_modules`)) {
        npmInstall(srcWidgets).catch(e => {
            console.error(`[${new Date().toISOString()}] Cannot install admin dependencies: ${e}`);
            process.exit(1);
        });
    }
} else if (process.argv.includes('--widget-2-compile')) {
    buildReact(srcWidgets, { rootDir: __dirname, vite: true }).catch(e => {
        console.error(`[${new Date().toISOString()}] Cannot build: ${e}`);
        process.exit(1);
    });
} else if (process.argv.includes('--widget-3-copy')) {
    widgetsCopyFiles();
} else if (process.argv.includes('--widget-build')) {
    widgetsClean();
    const promise = existsSync(`${srcWidgets}node_modules`) ? Promise.resolve() : npmInstall(srcWidgets);
    promise.then(() => buildReact(srcWidgets, { rootDir: __dirname, vite: true })).then(() => widgetsCopyFiles());
} else if (process.argv.includes('--tab-build')) {
    buildAdminTab().catch(e => {
        console.error(`[${new Date().toISOString()}] Cannot build all: ${e}`);
        process.exit(1);
    });
} else if (process.argv.includes('--widget-v1-build')) {
    buildWidgetV1().catch(e => {
        console.error(`[${new Date().toISOString()}] Cannot build all: ${e}`);
        process.exit(1);
    });
} else {
    adminClean();
    widgetsClean();
    npmInstall(srcAdmin)
        .then(() => buildReact(srcAdmin, { rootDir: __dirname, vite: true }))
        .then(() => adminCopyFiles())
        .then(() => npmInstall(srcWidgets))
        .then(() => buildReact(srcWidgets, { rootDir: __dirname, vite: true }))
        .then(() => widgetsCopyFiles())
        .then(() => buildAdminTab())
        .then(() => buildWidgetV1())
        .catch(e => {
            console.error(`[${new Date().toISOString()}] Cannot build all: ${e}`);
            process.exit(1);
        });
}
