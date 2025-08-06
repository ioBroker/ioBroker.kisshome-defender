/*!
 * ioBroker gulpfile
 * Date: 2024-07-16
 */
const { deleteFoldersRecursive, npmInstall, buildReact, copyFiles, patchHtmlFile } = require('@iobroker/build-tools');
const { existsSync, writeFileSync, readFileSync, unlinkSync } = require('node:fs');
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
    deleteFoldersRecursive(`${__dirname}/widgets`);

    // Update version in src-widgets/package.json
    const widgetsPackageJson = require(`${srcWidgets}package.json`);
    widgetsPackageJson.version = require('./package.json').version;
    writeFileSync(`${srcWidgets}package.json`, JSON.stringify(widgetsPackageJson, null, 2));
}

async function buildAdminTab() {
    // clean
    deleteFoldersRecursive(`${__dirname}/admin/assets`);
    if (existsSync(`${__dirname}/admin/tab_m.html`)) {
        unlinkSync(`${__dirname}/admin/tab_m.html`);
    }
    deleteFoldersRecursive(`${__dirname}/src-admin-tab/build`);
    await npmInstall(`${__dirname}/src-admin-tab/build`);
    await buildReact(`${__dirname}/src-admin-tab`, { rootDir: __dirname, vite: true });
    copyFiles([`${__dirname}/src-admin-tab/build/assets/*.*`], `${__dirname}/admin/assets`);
    writeFileSync(`${__dirname}/admin/tab_m.html`, readFileSync(`${__dirname}/src-admin-tab/build/index.html`));
    await patchHtmlFile(`${__dirname}/admin/tab_m.html`);
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
        .catch(e => {
            console.error(`[${new Date().toISOString()}] Cannot build all: ${e}`);
            process.exit(1);
        });
}
