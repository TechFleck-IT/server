// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
module.exports = {

  development: {
    client: 'mysql2',
    connection: {
      host: 'database-1.chm8i8qy4j0z.eu-north-1.rds.amazonaws.com',
      user: 'admin',
      password: 'muqfu1-Wettin-xafzyc',
      database: 'tikshot_enterprise'
    }
  }

};
