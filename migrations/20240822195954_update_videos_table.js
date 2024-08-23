/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.up = function(knex) {

    return knex.schema.createTable("video_type", function (table){
        table.increments("id").primary()
        table.string("nameAr").notNullable()
        table.string("nameEn").notNullable()
        table.timestamps(true,true)
    })

        .table("videos", (table) => {
        table.string("description").notNullable();
        table.integer("video_type_id").unsigned()
            .references("id").inTable("video_type")
        table.integer("city_id").unsigned()
            .references("id").inTable("cities");
    })

};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
