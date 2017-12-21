const chai = require('chai');
const expect = chai.expect;
const tmp = require('tmp');
const fs = require('fs');

const filesystem = require('../lib/filesystem');
const template = require('../lib/template');


describe('filesystem', () => {
    let tempDir;

    beforeEach(() => {
        tempDir = tmp.dirSync({unsafeCleanup: true});
    });

    afterEach(() => {
        tempDir.removeCallback();
    });

    it('can write migration files', () => {
        filesystem.writeMigrationFile(tempDir.name, 'abc');
    });

    it('can read migration files with labels', () => {
        filesystem.writeMigrationFile(tempDir.name, 'abc');
        const migrationFiles = filesystem.readMigrationFiles(tempDir.name);

        expect(migrationFiles[0].label).to.equal('abc');
    });

    it('can read migration files without labels', () => {
        filesystem.writeMigrationFile(tempDir.name);
        const migrationFiles = filesystem.readMigrationFiles(tempDir.name);

        expect(migrationFiles[0].label).to.be.null;
    });

    it ('can read multiple migration files', () => {
        filesystem.writeMigrationFile(tempDir.name, 'a');
        filesystem.writeMigrationFile(tempDir.name, 'b');
        filesystem.writeMigrationFile(tempDir.name, 'c');
        const migrationFiles = filesystem.readMigrationFiles(tempDir.name);

        expect(migrationFiles.map(f => (f.label))).to.have.members(['a', 'b', 'c']);
    })

})
