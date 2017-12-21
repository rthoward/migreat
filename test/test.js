const chai = require('chai');
const expect = chai.expect;
const migreat = require('../lib');
const _ = require('lodash/fp');

function createMigration(version, label) {
    return {
        version,
        label,
        up: () => {},
        down: () => {}
    };
}

describe('migreat', () => {

    describe ('upPath', () => {

        const versions = _.range(1, 6);
        const migrations = _.shuffle(
            _.map(i => (createMigration(i)), versions));

        it('knows when nothing needs to be done', () => {
            const path = migreat.upPath(migrations, 5, 5);
            expect(path.map(m => (m.version))).to.eql([]);
        });

        it('can calculate a forward migration path', () => {
            const path = migreat.upPath(migrations, 0, 0);
            expect(path.map(m => (m.version))).to.eql(versions);
        });

        it('can calculate a forward migration path from an already migrated state', () => {
            const path = migreat.upPath(migrations, 2, 0);
            expect(path.map(m => (m.version))).to.eql([3, 4, 5]);
        });

        it('can calculate a partial forward migration path from an unmigrated state', () => {
            const path = migreat.upPath(migrations, 0, 4);
            expect(path.map(m => (m.version))).to.eql([1, 2, 3, 4]);
        });

        it('can calculate a partial forward migration path from an already migrated state', () => {
            const path = migreat.upPath(migrations, 2, 4);
            expect(path.map(m => (m.version))).to.eql([3, 4]);
        });

    });

    describe('downPath', () => {
        const versions = _.reverse(_.range(1, 6));
        const migrations = _.shuffle(
            _.map(i => (createMigration(i)), versions));

        it('knows when nothing needs to be done', () => {
            const path = migreat.downPath(migrations, 0, 0);
            expect(path.map(m => (m.version))).to.eql([]);
        });

        it('can calculate a downward migration path', () => {
            const path = migreat.downPath(migrations, 5, 0);
            expect(path.map(m => (m.version))).to.eql(versions);
        });

        it('can calculate a downward migration path from an already migrated state', () => {
            const path = migreat.downPath(migrations, 5, 3);
            expect(path.map(m => (m.version))).to.eql([5, 4]);
        });

        it('can calculate a downward migration path from a partially migrated state', () => {
            const path = migreat.downPath(migrations, 4, 0);
            expect(path.map(m => (m.version))).to.eql([4, 3, 2, 1]);
        });

    })

});
