const db = require('../../config/db_wrapper');
const utils = require('../../config/utils');
const config = require('../../config/config');

class User {
  constructor() {}

  async getUsersData(query) {
    var users;
    if (query) {
      // Search users
      users = await db.query("SELECT * FROM users WHERE name LIKE ?", [`${query}%`]);
    } else {
      users = await db.query("SELECT * FROM users ORDER BY id DESC LIMIT 20");
    }
    for (let i = 0; i < users.length; i++) {
      const element = users[i];
      element.email = "Hidden";
      if(element.createTime != null){
          const createTime = utils.formatDateTime(element.createTime);
          element.createTime = createTime;
      }
      else{
          element.createTime = "Not Provided";
      }
      if (element.country == null) {
          element.country = "Not available";
      }
    }
    return users;
  }

  async fetchUserData(query, from) {
    var users;
    if (query) {
      // Search users
      users = await db.query("SELECT * FROM users WHERE name LIKE ?", [`${query}%`]);
    } else {
      users = await db.query("SELECT * FROM users LIMIT ?, 50", [parseInt(from)]);
    }
    for (let i = 0; i < users.length; i++) {
      const element = users[i];
      element.email = "Hidden";
      if(element.createTime != null){
          const createTime = utils.formatDateTime(element.createTime);
          element.createTime = createTime;
      }
      else{
          element.createTime = "Not Provided";
      }
      if(element.country ==null){
          element.country = "Not available";
      }
    }
    return { users: users };
  }

  async getEditUserData(id) {
    const results = await db.query(`SELECT *, EXISTS(SELECT id FROM admins WHERE user_id = users.id) as isAdmin, EXISTS(SELECT id FROM featured_users WHERE userId = users.id) as isFeatured FROM users WHERE id = ?`, [id]);
    const videos = await db.query(`SELECT v.*, u.name FROM videos v JOIN users u ON v.user_id = u.id WHERE u.id  = ?`, [id]);
    const communities = await db.query(`SELECT * FROM posts JOIN users ON posts.user_id = users.id WHERE user_id  = ?`, [id]);
    const comments = await db.query(`SELECT * FROM comments JOIN users ON comments.user_id = users.id WHERE user_id  = ?`, [id]);
    for (let i = 0; i < comments.length; i++) {
      const element = comments[i];
      const commentTime = utils.formatDateTime(element.commentTime);
      element.commentTime = commentTime;
    }
    for (let i = 0; i < results.length; i++) {
      const element = results[i];
      element.email = "Hidden";
      if (element.createTime != null) {
        const createTime = utils.formatDateTime(element.createTime);
        element.createTime = createTime;
      } else {
        element.createTime = "Not Provided";
      }
      if (element.country == null) {
        element.country = "Not available";
      }
    }
    return {
      users: {
        ...results[0],
        videos: videos,
        communities: communities,
        comments: comments,
      },
    };
  }

  async addUser(userData, req) {
    let pictureUrl = "";
    if (req.file) {
      pictureUrl = global.hostAddress + "uploads/users/" + req.file.filename;
    } 
    let addUser;
    if (pictureUrl == "") {
      addUser = await db.execute(`INSERT INTO users (username, name, email, about, auth, isVerified, gems, coins) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [userData.name, userData.username, userData.email, userData.about, userData.auth, userData.isVerified, userData.gems, userData.coins]);
    } else {
      addUser = await db.execute(`INSERT INTO users (username, name, email, profilePicture, about, auth, isVerified, gems, coins) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [userData.name, userData.username, userData.email, pictureUrl, userData.about, userData.auth, userData.isVerified, userData.gems, userData.coins]);
    }
    return { status: 'success', message: 'Your data has been inserted successfully!' };
  }

  async updateUser(userData, req) {
    if (req.session.user.power == 0) {
      return { status: 'success', message: 'You are on a demo account. Changes were not applied.' };
    }
    let pictureUrl = "";
    if (req.file) {
      pictureUrl = global.hostAddress + "uploads/users/" + req.file.filename;
    } 
    let updateUser;
    try {
      if (pictureUrl == "") {
        updateUser = await db.execute(`UPDATE users SET name = ?, email = ?, about = ?, instagram = ?, facebook = ?, twitter = ? WHERE id = ?`, [userData.name, userData.email, userData.about, userData.instaUrl, userData.fbUrl, userData.twtUrl, userData.id]);
      } else {
        updateUser = await db.execute(`UPDATE users SET name = ?, email = ?, profilePicture = ?, about = ?, instagram = ?, facebook = ?, twitter = ? WHERE id = ?`, [userData.name, userData.email, pictureUrl, userData.about, userData.instaUrl, userData.fbUrl, userData.twtUrl, userData.id]);
      }
      return { status: 'success', message: 'Your user has been updated successfully!' };
    } catch (error) {
      console.error(error);
      return { status: 'error', message: 'An error occurred while updating the user' };
    }
  }

  async deleteUser(id) {
    try {
      const deleteUser = await db.execute(`DELETE FROM users WHERE id = ?`, [id]);
      return { status: 'success', message: 'Your user has been deleted successfully!' };
    } catch (error) {
      console.error(error);
      return { status: 'error', message: 'An error occurred while deleting the user' };
    }
  }

}

module.exports = User;
