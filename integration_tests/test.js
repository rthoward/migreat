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
    const tmpDir = tmp.dirSync({unsafeCleanup: true});

    before(async function() {
        this.timeout(30000);
        await exec('docker-compose -f integration_tests/docker-compose.yml start');
        db = await dbConnect();
        settings = {
            db,
            migrationDir: tmpDir.name
        };
    });

    after(async function() {
        await db.end();
    });

    it('meow', async function(done) {
        await migreat.gen(settings, 'a');
        const list = await migreat.list(settings)
        console.log(list);
    });
});
