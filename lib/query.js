const _ = require('lodash/fp');

module.exports = {
    versionTableExists: async function(db) {
        const o = await db.client.query(`
            SELECT * FROM pg_catalog.pg_tables
            WHERE tablename = 'migrations'`);
        return o.rows.length > 0;
    },

    version: async function(db) {
        const o = await db.client.query(`SELECT timestamp FROM migrations`);
        return o.rows.length > 0 ?
            _.toInteger(o.rows[0].timestamp) : 0;
    },

    createVersionTable: async function(db) {
        await db.client.query(`
            CREATE TABLE migrations (timestamp TEXT NOT NULL);
            INSERT INTO migrations VALUES (0);`);
        return null;
    },

    setVersion: async function(db, version) {
        await db.client.query(`UPDATE migrations SET timestamp = $1`, [version]);
    },

    beginTransaction: async function(db) {
        await db.client.query(`BEGIN`)
    },

    commit: async function(db) {
        await db.client.query(`COMMIT`)
    },


    rollback: async function(db) {
        await db.client.query(`ROLLBACK`)
    },
};
