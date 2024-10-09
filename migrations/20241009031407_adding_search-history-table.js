/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.up = function(knex) {

    return knex.schema.createTable("search_history", function (table){
        table.increments("id").primary()
        table.string("searchKey").notNullable()
        table.integer("userId").notNullable()
            .references("id").inTable("users")
        table.timestamps(true,true)
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
