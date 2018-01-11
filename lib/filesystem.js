const path = require('path');
const fs = require('fs');
const _ = require('lodash/fp');
const template = require('./template');

function parseMigrationFileName(filePath) {
    const fields = _.split('__', path.basename(filePath));
    return {
        version: _.nth(0, fields),
        label: _.nth(1, fields) ? _.nth(1, fields).split('.')[0] : null
    };
};

function buildMigrationFileName(version, label) {
    const labelSuffix = label ? `__${label}` : '';
    return `${version}${labelSuffix}.js`
};

module.exports = {

    writeMigrationFile: function (migrationDir, label) {
        const existingMigrations = this.readMigrationFiles(migrationDir);
        const latestExistingVersion = _.flow(
            _.sortBy(m => (m.version)),
            _.last,
            _.get('version')
        )(existingMigrations);

        let version = new Date().getTime();
        if (version == latestExistingVersion) {
            version = latestExistingVersion + 1;
        }

        const filename = buildMigrationFileName(version, label);
        const contents = template(filename);
        const migrationFilePath = path.join(migrationDir, filename);
        fs.writeFileSync(migrationFilePath, contents);
        return filename;
    },

    readMigrationFile: function(_path) {
        const content = require(_path);
        const { version, label } = parseMigrationFileName(_path);
        return {
            version: _.toInteger(version),
            label,
            up: content.up,
            down: content.down
        };
    },

    readMigrationFiles: function(migrationDir) {
        return _.flow(
            fs.readdirSync,
            _.map(fname => (path.join(migrationDir, fname))),
            _.map(this.readMigrationFile)
        )(migrationDir)
    }
}
