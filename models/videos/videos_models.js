const utils = require('../../config/utils');
const db = require('../../config/db_wrapper');

const Video = {};

Video.getAll = async () => {
  const videos = await db.query("SELECT * FROM videos WHERE ad_id = 0 ORDER BY id DESC");
  return videos.map(video => {
    const videoTime = utils.formatDateTime(video.videoTime);
    return { ...video, videoTime: videoTime };
  });
}

Video.getOne = async (id) => {
  const videos = await db.query(`SELECT * FROM videos WHERE id = ?`, [id]);
  return videos[0];
}

Video.update = async (id, videoData) => {
  const result = await db.execute(`UPDATE videos SET title = ?, tags = ? WHERE id = ?`, [videoData.title, videoData.tags, id]);
  return result;
}

Video.delete = async (id) => {
  const result = await db.execute(`DELETE FROM videos WHERE id = ?`, [id]);
  return result;
}

module.exports = Video;
