const path = require('path');
const fs = require('fs');
const _ = require('lodash');

module.exports = {
    buildMigrationFileName: function(version, label) {
        const migrationFileName = filesystem.buildMigrationFileName(
            version, label);
        const migrationTimeStamp = new Date().getTime();
        const labelSuffix = label ? `__${label}` : '';
        return `${migrationTimeStamp}${labelSuffix}.js`
    },

    parseMigrationFileName: function(filename) {
        const fields = _.split('__', path.basename(filePath));
        return {
            version: _.nth(fields, 0),
            label: _.nth(fields, 1)
        };
    },

    writeMigrationFile: function(settings, filename, contents) {
        const migrationFilePath = path.join(settings.migrationDir, filename);
        fs.writeFileSync(migrationFilePath, contents);
    }
}
