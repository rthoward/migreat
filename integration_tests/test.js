const chai = require('chai');
const expect = chai.expect;
const migreat = require('../lib');
const tmp = require('tmp');
const _ = require('lodash/fp');

const { Client } = require('pg');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

const dbConnect = async () => {
    const client = new Client({
        user: 'user',
        password: 'password',
        host: 'localhost',
        database: 'migreat',
        port: '5433'
    });
    await client.connect();
    return client;
};

describe('migreat integration', () => {
    let db;
    let settings;
    let tmpDir;

    before(async function() {
        migreat.TEST = true;
        this.timeout(30000);
        await exec('docker-compose -f integration_tests/docker-compose.yml start');
        db = await dbConnect();
        settings = { db };
    });

    after(async function() {
        await db.end();
    });

    describe('gen()', function() {
        beforeEach(function() {
            tmpDir = tmp.dirSync({unsafeCleanup: true});
            settings.migrationDir = tmpDir.name;
        });

        afterEach(function() {
            tmpDir.removeCallback();
        });

        it('creates a migration with a label', async function() {
            await migreat.gen(settings, 'a');
            const { migrations } = await migreat.status(settings);
            expect(migrations).to.have.lengthOf(1);
            expect(migrations[0]).to.include({label: 'a'});
        });

        it('creates migrations without a label', async function() {
            await migreat.gen(settings);
            const { migrations } = await migreat.status(settings);
            expect(migrations[0].label).to.be.null;
        });

        it('keeps versions from colliding', async function() {
            // Nondeterministic
            await [migreat.gen(settings, 'a'), migreat.gen(settings, 'b')];
            const { migrations } = await migreat.status(settings);
            expect(migrations[0].version).not.to.equal(migrations[1].version);
        });

    });

    describe('status()', function() {
        beforeEach(function() {
            tmpDir = tmp.dirSync({unsafeCleanup: true});
            settings.migrationDir = tmpDir.name;
        });

        afterEach(function() {
            tmpDir.removeCallback();
        });

        it('lists zero migrations', async function() {
            const { migrations } = await migreat.status(settings)
            expect(migrations).to.have.lengthOf(0);
        });

        it('lists one pending migration', async function() {
            await migreat.gen(settings, 'a');
            const { migrations } = await migreat.status(settings)
            expect(migrations).to.have.lengthOf(1);
            expect(migrations[0]).to.include({label: 'a', run: false});
        });

        it('lists one completed and one pending migration', async function() {
            const a = await migreat.gen(settings, 'a');
            await migreat.gen(settings, 'b');
            const status = await migreat.status(settings)
            await migreat.up(settings, status.migrations[0].version);

            const { migrations } = await migreat.status(settings)
            expect(migrations[0]).to.include({label: 'a', run: true})
            expect(migrations[1]).to.include({label: 'b', run: false})
        });

        it('lists two completed migrations', async function() {
            await migreat.gen(settings, 'a');
            await migreat.gen(settings, 'b');
            await migreat.up(settings)

            const { migrations } = await migreat.status(settings)
            expect(migrations[0]).to.include({label: 'a', run: true})
            expect(migrations[1]).to.include({label: 'b', run: true})
        });

    })

    describe('up()', function() {
        beforeEach(async function() {
            tmpDir = tmp.dirSync({unsafeCleanup: true});
            settings.migrationDir = tmpDir.name;
            await db.query('BEGIN');
        });

        afterEach(async function() {
            await db.query('ROLLBACK')
            tmpDir.removeCallback();
        });

        it('can run multiple migrations from an unmigrated state', async function() {
            await migreat.gen(settings, 'a');
            await migreat.gen(settings, 'b');
            await migreat.gen(settings, 'c');

            await migreat.up(settings);
            const { migrations, currentVersion } = await migreat.status(settings);

            expect(currentVersion).to.equal(_.last(migrations).version);
            expect(migrations[0]).to.include({label: 'a', run: true})
            expect(migrations[1]).to.include({label: 'b', run: true})
            expect(migrations[2]).to.include({label: 'c', run: true})
        });

        it('can run one migration to a partially migrated state', async function() {
            await migreat.gen(settings, 'a');
            await migreat.gen(settings, 'b');
            await migreat.gen(settings, 'c');

            const _status = await migreat.status(settings);
            const targetVersion = _status.migrations[0].version;
            await migreat.up(settings, targetVersion);
            const { migrations, currentVersion } = await migreat.status(settings);

            expect(currentVersion).to.equal(_.first(migrations).version);
            expect(migrations[0]).to.include({label: 'a', run: true})
            expect(migrations[1]).to.include({label: 'b', run: false})
            expect(migrations[2]).to.include({label: 'c', run: false})
        });

        it('can run multiple migrations from a partially migrated state', async function() {
            await migreat.gen(settings, 'a');
            await migreat.gen(settings, 'b');
            await migreat.gen(settings, 'c');

            // migrate up to a
            const _status = await migreat.status(settings);
            const targetVersion = _status.migrations[0].version;
            await migreat.up(settings, targetVersion);

            // migrate up to c
            await migreat.up(settings);
            const { migrations, currentVersion } = await migreat.status(settings);

            expect(currentVersion).to.equal(_.last(migrations).version);
            expect(migrations[0]).to.include({label: 'a', run: true})
            expect(migrations[1]).to.include({label: 'b', run: true})
            expect(migrations[2]).to.include({label: 'c', run: true})
        });
    });

    describe('down()', function() {
        beforeEach(function() {
            tmpDir = tmp.dirSync({unsafeCleanup: true});
            settings.migrationDir = tmpDir.name;
        });

        afterEach(async function() {
            await migreat.down(settings);
            tmpDir.removeCallback();
        });

        it('can rollback all migrations from a fully migrated state', async function() {
            await migreat.gen(settings, 'a');
            await migreat.gen(settings, 'b');
            await migreat.gen(settings, 'c');

            await migreat.up(settings);
            await migreat.down(settings);
            const { currentVersion } = await migreat.status(settings);

            expect(currentVersion).to.equal(0);
        });

        it('can partially rollback from a fully migrated state', async function() {
            await migreat.gen(settings, 'a');
            await migreat.gen(settings, 'b');
            await migreat.gen(settings, 'c');

            // migrate up to c
            await migreat.up(settings);
            const _status = await migreat.status(settings);
            const migrationA = _status.migrations[0];
            // migrate down to a
            await migreat.down(settings, migrationA.version)
            const { migrations, currentVersion } = await migreat.status(settings);

            expect(currentVersion).to.equal(migrationA.version);
        });
    });
});
