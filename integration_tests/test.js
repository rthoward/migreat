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

        afterEach(async function() {
            await migreat.down(settings);
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

        afterEach(async function() {
            await migreat.down(settings);
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

});
