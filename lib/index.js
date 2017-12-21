const path = require('path');
const fs = require('fs');
const _ = require('lodash/fp');
const query = require('./query');
const template = require('./template');
const filesystem = require('./filesystem');

async function runMigrations(db, migrations, currentVersion, targetVersion) {
    if (migrations.length > 0) {
        console.log(` `)
    } else {
        console.log("Nothing to do.")
    }

    try {
        await query.beginTransaction(db);

        for (let migration of migrations) {
            process.stdout.write(`Running [${migration.timestamp}] ${migration.label}...`);
            await migration.fn(db);
            process.stdout.write(` success.\n`)
        }

        await query.setVersion(db, targetVersion);
        await query.commit(db);
    } catch (error) {
        console.log(error)
        await query.rollback(db);
    }
}

async function currentVersion({ db }) {
    const tableExists = await query.versionTableExists(db);
    if (tableExists) {
        const version = await query.version(db);
    } else {
        await query.createVersionTable();
        return null;
    }
};

function readMigrationFile(filePath) {
    const fields = _.split('__', path.basename(filePath));
    const content = require(filePath);
    let parsed = {};

    if (fields.length > 1) {
        parsed = {
            label: fields[1].split('.')[0],
            timestamp: _.toInteger(_.split('.', fields[0])[0]),
            up: content.up,
            down: content.down
        };
    } else {
        parsed = {
            timestamp: _.toInteger(_.split('.', fields[0])[0]),
            up: content.up,
            down: content.down
        };
    };
    return parsed;
};

module.exports = {

    gen: function(settings, label) {
        const version = new Date().getTime();
        const migrationFileName = filesystem.buildMigrationFileName(
            version, label);
        filesystem.writeMigrationFile(
            settings, migrationFileName, migrationFile);
        console.log(`Created migration ${migrationFileName}.`);
    },

    up: async function(settings, targetVersion) {
        const _currentVersion = await currentVersion(settings);
        targetVersion = targetVersion || new Date().getTime();

        const pendingMigrations = _.flow(
            fs.readdirSync,
            _.map((fname) => (path.join(settings.migrationDir, fname))),
            _.map(readMigrationFile),
            _.filter(o => (o.timestamp > _currentVersion &&
                           o.timestamp <= targetVersion)),
            _.map(o => ({...o, fn: o.up})),
            _.sortBy(o => (o.timestamp)))(settings.migrationDir);

        const _targetVersion = pendingMigrations.length > 0 ?
            _.last(pendingMigrations).timestamp : targetVersion;

        await runMigrations(
            settings.db, pendingMigrations, _currentVersion, _targetVersion);
    },

    down: async function(settings, targetVersion) {
        const _currentVersion = await currentVersion(settings);
        targetVersion = targetVersion || 0;

        const pendingMigrations = _.flow(
            fs.readdirSync,
            _.map((fname) => (path.join(settings.migrationDir, fname))),
            _.map(readMigrationFile),
            _.filter(o => (o.timestamp > targetVersion &&
                           o.timestamp <= _currentVersion)),
            _.map(o => ({...o, fn: o.down})),
            _.sortBy(o => (o.timestamp)),
            _.reverse)(settings.migrationDir);

        await runMigrations(
            settings.db, pendingMigrations, _currentVersion, targetVersion);
    },

}
