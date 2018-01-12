# Migreat

## Getting started

1. Create a .migreat.js file that exports a database connection and migration file dir:

```js
const dbConnection = require('./lib/db');
const path = require('path');

module.exports = {
  db,
  migrationDir: path.join(__dirname, './migrations')
};
```

2. Create a migration:

`migreat gen my_first_migration`

3. Edit it:

`vim migrations/1513098322271__my_first_migration.js`

```js
module.exports = {
  up: (db) => {
    return db.query(`
      CREATE TABLE new_table (
        id SERIAL PRIMARY KEY,
        data TEXT,
      );
    `)},

    down: (db) => {
      return db.query(`
        DROP TABLE new_table;
      `);
    }
};
```
4. Migrate:

`migreat up`

## Details

### Database connection

The database connection that you export in `.migreat.js` can be any object with the following property: `query(string) -> Promise`. Migreat will pass this connection into the `up()` and `down()` methods in your migration files.

Migreat relies on SQL transactions to make each migration atomic, so your database backend must support them.
