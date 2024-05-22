const db = require('../../config/db_wrapper');

const Tag = {};

Tag.getAll = async () => {
  const tags = await db.query("SELECT * FROM tags ORDER BY priority DESC");
  return tags;
}

Tag.create = async (tagData) => {
  const result = await db.execute(`INSERT INTO tags (tag, priority) VALUES (?, ?);`, [tagData.name, tagData.priority]);
  return result;
}

Tag.updatePriority = async (id, direction) => {
  let query;
  if (direction === 'up') {
    query = `UPDATE tags SET priority = priority + 1 WHERE id = ?`;
  } else if (direction === 'down') {
    query = `UPDATE tags SET priority = priority - 1 WHERE id = ?`;
  }
  const result = await db.execute(query, [id]);
  return result;
}

Tag.delete = async (id) => {
  const result = await db.execute(`DELETE FROM tags WHERE id = ?`, [id]);
  return result;
}

module.exports = Tag;
