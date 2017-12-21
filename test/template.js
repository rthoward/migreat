const chai = require('chai');
const expect = chai.expect;
const migreat = require('../lib');
const template = require('../lib/template');

describe('template', () => {

    it('generates migration file contents', () => {
        const baseName = 'version__label';
        const migrationFileContent = template(baseName);
        expect(migrationFileContent.indexOf(baseName)).not.to.equal(-1);
    });

})
