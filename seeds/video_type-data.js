/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('video_type').del()
  await knex('video_type').insert([
    {id: 1, nameAr: 'وجبة', nameEn: 'Meal'},
    {id: 2, nameAr: 'مشروبات', nameEn: 'Drinks'},
    {id: 3, nameAr: 'حلويات', nameEn: 'Dessert'},
    {id: 4, nameAr: 'اخري', nameEn: 'Other'},
  ]);
};
