/**
 * @param { import("knex").Knex } knex
 * @returns {Knex.SchemaBuilder}
 */
exports.up = function(knex) {
   return knex.schema.createTable("countries", function (table){
           table.increments("id").primary()
           table.string("nameAr").notNullable()
           table.string("nameEn").notNullable()
           table.timestamps(true,true)
       })

       .createTable("business_types", function (table){
           table.increments("id").primary()
           table.string("nameAr").notNullable()
           table.string("nameEn").notNullable()
           table.timestamps(true,true)
       })

       .createTable("business_types_category", function (table){
           table.increments("id").primary()
           table.string("nameAr").notNullable()
           table.string("nameEn").notNullable()
           table.integer("business_types_id").unsigned().notNullable()
               .references("id").inTable("business_types")
           table.timestamps(true,true)
       })

       .createTable("cities", function (table){
           table.increments("id").primary()
           table.string("nameAr").notNullable()
           table.string("nameEn").notNullable()
           table.integer("country_id").unsigned().notNullable()
               .references("id").inTable("countries")
           table.timestamps(true,true)
       })

       .table('users', function (table) {
           table.string('accountType').notNullable().defaultTo("PERSONAL");
           table.string("address")
           table.string("websiteLink")
           table.integer("business_types_category_id").unsigned()
               .references("id").inTable("business_types_category")
           table.integer("city_id").unsigned()
               .references("id").inTable("cities")
           table.timestamps(true,true)
       })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  
};
