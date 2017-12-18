#!/usr/bin/env node

const _ = require('lodash/fp');
const path = require('path');
const process = require('process');
const fs = require('fs');
const Liftoff = require('liftoff');
const migreat = require('./lib');

function loadSettings(settingsFilePath) {
    if (_.isNil(fs.lstatSync(settingsFilePath))) {
        console.log("Error: Could not read settings file. There should be a .migreat.js in thir (or a parent) dir.");
        process.exit(1);
    }
    const settings = require(settingsFilePath);
    return settings;
}

function printHelp() {
    console.log(`
Usage: migrate <command> [...args]

Commands:
    gen         <label>             Create a new migration
    up          <to_revision>       Migrate to to_revision, or latest
    down        <to_revision>       Rollback to to_revision, or initial state
    settings                        List settings
`)
}

async function invoke(env) {
    try {
        const dbCommand = process.argv[2];
        const settings = loadSettings(env.configPath);

        if (dbCommand === 'gen') {
            await migreat.gen(settings);
        } else if (dbCommand === 'up') {
            let targetVersion = _.toInteger(process.argv[3]);
            await migreat.up(settings, targetVersion);
        } else if (dbCommand === 'down') {
            let targetVersion = _.toInteger(process.argv[3]);
            await migreat.down(settings, targetVersion);
        } else if (dbCommand == 'settings') {
            console.log(settings);
        } else {
            printHelp();
        }
        process.exit();
    } catch(error) {
        console.log(error);
    }
};

new Liftoff({
    name: 'migreat',
    configName: '.migreat',
    extensions: {
        '.js': null
    }
}).launch({}, invoke);
