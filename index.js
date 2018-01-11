#!/usr/bin/env node

const _ = require('lodash/fp');
const path = require('path');
const process = require('process');
const fs = require('fs');
const Liftoff = require('liftoff');
const migreat = require('./lib');

function loadSettings(settingsFilePath) {
    if (_.isNil(fs.lstatSync(settingsFilePath))) {
        console.log("Error: Could not read settings file. There should be a .migreat.js in this (or a parent) dir.");
        process.exit(1);
    }
    const settings = require(settingsFilePath);
    return settings;
}

function printHelp() {
    console.log(`
Usage: migreat <command> [...args]

Commands:
    gen         <label>             Create a new migration
    up          <to_revision>       Migrate to to_revision, default latest
    down        <to_revision>       Rollback to to_revision, default initial (unmigrated) state
    settings                        List settings
`)
}

async function invoke(env) {
    try {
        const dbCommand = process.argv[2];
        const settings = loadSettings(env.configPath);

        let targetVersion = null;

        switch (dbCommand) {
            case 'gen':
                const label = process.argv[3];
                await migreat.gen(settings, label);
                break;
            case 'up':
                targetVersion = _.toInteger(process.argv[3]);
                await migreat.up(settings, targetVersion);
                break;
            case 'down':
                targetVersion = _.toInteger(process.argv[3]);
                await migreat.down(settings, targetVersion);
                break;
            case 'list':
                break;
            case 'settings':
                console.log(settings);
                break;
            default:
                printHelp();
                break;
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
