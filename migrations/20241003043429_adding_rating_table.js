/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.up = function(knex) {

    return knex.schema.createTable("rating", function (table){
        table.increments("id").primary()
        table.integer("videoId").notNullable()
            .references("id").inTable("videos")
        table.integer("userId").notNullable()
            .references("id").inTable("users")
        table.double("rating").notNullable()
        table.timestamps(true,true)
    })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
