/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  await knex('countries').insert([
    {id: 1, nameAr: 'المملكة العربية السعودية', nameEn: 'Saudi Arabia'},
  ]);

  await knex('business_types').insert([
    {id: 1, nameAr: 'arabic name', nameEn: 'Restaurant'},
    {id: 2, nameAr: 'arabic name', nameEn: 'Coffee shop'},
    {id: 3, nameAr: 'arabic name', nameEn: 'Juice seller'},
    {id: 4, nameAr: 'arabic name', nameEn: 'Desserts seller'},
    {id: 5, nameAr: 'arabic name', nameEn: 'Bakery'}
  ]);

  await knex('cities').insert([
    {id: 1, nameAr: 'arabic name', nameEn: 'Riyadh', country_id: 1},
    {id: 2, nameAr: 'arabic name', nameEn: 'Jeddah', country_id: 1},
    {id: 3, nameAr: 'arabic name', nameEn: 'Mecca', country_id: 1},
    {id: 4, nameAr: 'arabic name', nameEn: 'Medina', country_id: 1},
    {id: 5, nameAr: 'arabic name', nameEn: 'Al-Ahsa', country_id: 1}
  ]);

  await knex('business_types_category').insert([
    {id: 1, nameAr: 'arabic name', nameEn: 'Banquets and events', Business_types_id: 1},
    {id: 2, nameAr: 'arabic name', nameEn: 'Grills', Business_types_id: 1},
    {id: 3, nameAr: 'arabic name', nameEn: 'Fast food', Business_types_id: 1},
    {id: 4, nameAr: 'arabic name', nameEn: 'Italian food', Business_types_id: 1},
    {id: 5, nameAr: 'arabic name', nameEn: 'Indian food', Business_types_id: 1},
    {id: 6, nameAr: 'arabic name', nameEn: 'Other', Business_types_id: 1},
    {id: 7, nameAr: 'arabic name', nameEn: 'Other coffee', Business_types_id: 2},
    {id: 8, nameAr: 'arabic name', nameEn: 'Other coffee', Business_types_id: 2},
    {id: 9, nameAr: 'arabic name', nameEn: 'Other juice', Business_types_id: 3},
    {id: 10, nameAr: 'arabic name', nameEn: 'Other juice', Business_types_id: 3},
    {id: 11, nameAr: 'arabic name', nameEn: 'Other desserts', Business_types_id: 4},
    {id: 12, nameAr: 'arabic name', nameEn: 'Other desserts', Business_types_id: 4},
    {id: 13, nameAr: 'arabic name', nameEn: 'Other bakery', Business_types_id: 5},
    {id: 14, nameAr: 'arabic name', nameEn: 'Other bakery', Business_types_id: 5}
  ]);
};
