const _ = require('lodash/fp');
const query = require('./query');
const template = require('./template');
const filesystem = require('./filesystem');

function trace(o) {
    console.log(o);
    return o;
}

class Migreat {
    async gen(settings, label) {
        const filename = filesystem.writeMigrationFile(
            settings.migrationDir, label);
        console.log(`Created migration ${filename}.`);
    }

    async list(settings) {
        const currentVersion = await this.getCurrentVersion(settings);
        const migrations = filesystem.readMigrationFiles(
            settings.migrationDir);
        return _.map(m => ({
            ...m,
            run: m.version <= currentVersion
        }), migrations);
    }

    async up(settings, to) {
        const migrations = filesystem.readMigrationFiles(
            settings.migrationDir);
        const currentVersion = await this.getCurrentVersion(settings);
        const path = this.upPath(migrations, currentVersion, to);
        await this.runMigrations(settings.db, path, currentVersion);
    }

    async down(settings, to) {
        const _to = to || 0;
        const migrations = filesystem.readMigrationFiles(
            settings.migrationDir);
        const path = this.downPath(
            migrations, this.getCurrentVersion(settings), _to);
        await this.runMigrations(
            settings.db, path, this.getCurrentVersion(settings));
    }

    upPath(migrations, currentVersion, targetVersion) {
        const _targetVersion = targetVersion || new Date().getTime();
        return _.flow(
            _.filter(o => (o.version > currentVersion &&
                           o.version <= _targetVersion)),
            _.map(o => ({...o, fn: o.up})),
            _.sortBy(o => (o.version))
        )(migrations);
    }

    downPath(migrations, currentVersion, targetVersion) {
        const _targetVersion = targetVersion || 0;
        const _migrations = _.concat(migrations, [{
            version: 0,
            down: _.noop
        }]);
        return _.flow(
            _.filter(o => (o.version > _targetVersion &&
                           o.version <= currentVersion)),
            _.map(o => ({...o, fn: o.down})),
            _.sortBy(o => (o.version)),
            _.reverse
        )(migrations);
    }

    async runMigrations(db, path, currentVersion) {
        if (path.length > 0) {
            console.log(` `)
        } else {
            console.log("Nothing to do.")
        }

        try {
            await query.beginTransaction(db);
            let newVersion = currentVersion;

            for (let migration of path) {
                process.stdout.write(`Running [${migration.timestamp}] ${migration.label}...`);
                await migration.fn(db);
                newVersion = migration.version;
                process.stdout.write(` success.\n`)
            }

            await query.setVersion(db, newVersion);
            await query.commit(db);
        } catch (error) {
            console.log(error)
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
}

module.exports = new Migreat();
