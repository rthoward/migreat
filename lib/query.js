const _ = require('lodash/fp');

module.exports = {
    versionTableExists: async function(client) {
        const o = await client.query(`
            SELECT * FROM pg_catalog.pg_tables
            WHERE tablename = 'migrations'`);
        return o.rows.length > 0;
    },

    version: async function(client) {
        const o = await client.query(`SELECT timestamp FROM migrations`);
        return o.rows.length > 0 ?
            _.toInteger(o.rows[0].timestamp) : 0;
    },

    createVersionTable: async function(client) {
        await client.query(`
            CREATE TABLE migrations (timestamp TEXT NOT NULL);
            INSERT INTO migrations VALUES (0);`);
        return null;
    },

    setVersion: async function(client, version) {
        await client.query(`UPDATE migrations SET timestamp = $1`, [version]);
    },

    beginTransaction: async function(client) {
        await client.query(`BEGIN`)
    },

    commit: async function(client) {
        await client.query(`COMMIT`)
    },


    rollback: async function(client) {
        await client.query(`ROLLBACK`)
    },
};
