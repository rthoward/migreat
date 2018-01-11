const _ = require('lodash/fp');

module.exports = {
    versionTableExists: async function(db) {
        const o = await db.query(`
            SELECT * FROM pg_catalog.pg_tables
            WHERE tablename = 'migrations'`);
        return o.rows.length > 0;
    },

    version: async function(db) {
        const o = await db.query(`SELECT timestamp FROM migrations`);
        return o.rows.length > 0 ?
            _.toInteger(o.rows[0].timestamp) : 0;
    },

    createVersionTable: async function(db) {
        await db.query(`
            CREATE TABLE migrations (
                timestamp TEXT NOT NULL,

                -- Hacky constraint to ensure the table contains only one row.
                onerow bool DEFAULT TRUE,
                CONSTRAINT only_one_row CHECK(onerow)
            );
            INSERT INTO migrations VALUES (0);`);
        return null;
    },

    setVersion: async function(db, version) {
        await db.query(`UPDATE migrations SET timestamp = $1`, [version]);
    },

    beginTransaction: async function(db) {
        await db.query(`BEGIN`)
    },

    commit: async function(db) {
        await db.query(`COMMIT`)
    },

    rollback: async function(db) {
        await db.query(`ROLLBACK`)
    },
};
