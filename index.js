const _ = require('lodash/fp');
const migreat = require('./lib');
const path = require('path');
const process = require('process');
const fs = require('fs');

const SETTINGS_FILENAME = '.migreat.conf.js';


function loadSettings() {
    const settingsPath = path.join(process.cwd(), SETTINGS_FILENAME)

    if (_.isNil(fs.lstatSync(settingsPath))) {
        console.log(`Error: No ${SETTINGS_FILENAME} detected in ${cwd}. Are you running this from the project root?`)
        process.exit(1);
    }

    const settings = require(settingsPath);
    return settings;
}

function printHelp() {
    console.log(`
Usage: migrate <command> [...args]

Commands:
    make-migration <label>
`)
}

(async () => {
    try {
        const dbCommand = process.argv[2];
        const settings = loadSettings();

        if (dbCommand === 'make-migration') {
            await migreat.createMigration(settings);
        } else if (dbCommand === 'migrate') {
            let targetVersion = _.toInteger(process.argv[3]);
            await migreat.migrate(settings, targetVersion);
        } else if (dbCommand === 'rollback') {
            let targetVersion = _.toInteger(process.argv[3]);
            await migreat.rollback(settings, targetVersion);
        } else if (dbCommand == 'list-settings') {
            console.log(settings);
        } else {
            printHelp();
        }
        process.exit();
    } catch(error) {
        console.log(error);
    }
})();
