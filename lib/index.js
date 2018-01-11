const _ = require('lodash/fp');
const query = require('./query');
const template = require('./template');
const filesystem = require('./filesystem');


class Migreat {

    constructor() {
        this.TEST = false;
    }

    async gen(settings, label) {
        const filename = filesystem.writeMigrationFile(
            settings.migrationDir, label);
        this.consoleLog(`Created migration ${filename}.`);
    }

    async status(settings) {
        const currentVersion = await this.getCurrentVersion(settings);
        const _migrations = filesystem.readMigrationFiles(
            settings.migrationDir);
        const migrations = _.map(m => ({
            ...m,
            run: m.version <= currentVersion
        }), _migrations);
        return {
            migrations,
            currentVersion
        };
    }

    async up(settings, to) {
        const migrations = filesystem.readMigrationFiles(
            settings.migrationDir);
        const _to = to || _.last(migrations).version;

        const currentVersion = await this.getCurrentVersion(settings);
        const path = this.upPath(migrations, currentVersion, _to);
        await this.runMigrations(settings.db, path, currentVersion, _to);
    }

    async down(settings, to) {
        const _to = to || 0;

        const migrations = filesystem.readMigrationFiles(
            settings.migrationDir);
        const currentVersion = await this.getCurrentVersion(settings);
        const path = this.downPath(
            migrations, currentVersion, _to);
        await this.runMigrations(
            settings.db, path, currentVersion, _to);
    }

    upPath(migrations, currentVersion, targetVersion) {
        return _.flow(
            _.filter(o => (o.version > currentVersion &&
                           o.version <= targetVersion)),
            _.map(o => ({...o, fn: o.up})),
            _.sortBy(o => (o.version))
        )(migrations);
    }

    downPath(migrations, currentVersion, targetVersion) {
        return _.flow(
            _.filter(o => (o.version > targetVersion &&
                           o.version <= currentVersion)),
            _.map(o => ({...o, fn: o.down})),
            _.sortBy(o => (o.version)),
            _.reverse
        )(migrations);
    }

    async runMigrations(db, path, currentVersion, targetVersion) {
        if (path.length > 0) {
            this.consoleLog(` `)
        } else {
            this.consoleLog("Nothing to do.")
        }

        try {
            await query.beginTransaction(db);

            for (let migration of path) {
                this.consolePrint(`Running [${migration.version}] ${migration.label}...`);
                await migration.fn(db);
                this.consolePrint(` success.\n`)
            }

            await query.setVersion(db, targetVersion);
            await query.commit(db);
        } catch (error) {
            this.consoleLog(error)
            await query.rollback(db);
        }
    }

    async getCurrentVersion({ db }) {
        const tableExists = await query.versionTableExists(db);
        if (tableExists) {
            const version = await query.version(db);
            return version;
        } else {
            await query.createVersionTable(db);
            return null;
        }
    }

    consoleLog(s) {
        if (!this.TEST) {
            console.log(s);
        }
    }

    consolePrint(s) {
        if (!this.TEST) {
            process.stdout.write(s);
        }
    }
}

module.exports = new Migreat();
