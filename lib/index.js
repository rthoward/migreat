const path = require('path');
const fs = require('fs');
const _ = require('lodash/fp');
const query = require('./query');
const template = require('./template');
const filesystem = require('./filesystem');

function trace(o) {
    console.log(o);
    return o;
}

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

module.exports = {

    gen: function(settings, label) {
        const version = new Date().getTime();
        const migrationFileName = filesystem.buildMigrationFileName(
            version, label);
        filesystem.writeMigrationFile(
            settings, migrationFileName, migrationFile);
        console.log(`Created migration ${migrationFileName}.`);
    },

    upPath: function(migrations, currentVersion, targetVersion) {
        const _targetVersion = targetVersion || new Date().getTime();
        return _.flow(
            _.filter(o => (o.version > currentVersion &&
                           o.version <= _targetVersion)),
            _.map(o => ({...o, fn: o.up})),
            _.sortBy(o => (o.version))
        )(migrations);
    },

    downPath: function(migrations, currentVersion, targetVersion) {
        const _targetVersion = targetVersion || 0;
        return _.flow(
            _.filter(o => (o.version > _targetVersion &&
                           o.version <= currentVersion)),
            _.map(o => ({...o, fn: o.down})),
            _.sortBy(o => (o.version)),
            _.reverse
        )(migrations);
    },
}
