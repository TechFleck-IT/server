const db = require('../../config/db_wrapper');
const utils = require('../../config/utils');

class Dashboard {

  constructor(db) {
    this.db = db;
  }

  async getDashboardCounts() {
    const dashboardCounts = await this.db.query("SELECT (SELECT COUNT(*) FROM users) as total_users, (SELECT COUNT(*) FROM videos) as total_videos, (SELECT COUNT(*) FROM messages) as total_messages;");
    return dashboardCounts;
  }

  async getDeviceCount() {
    const deviceCount = await this.db.query("SELECT SUM(CASE WHEN phoneModel = 'ios' THEN 1 ELSE 0 END) as Apple, SUM(CASE WHEN phoneModel = 'android' THEN 1 ELSE 0 END) as Android, SUM(CASE WHEN phoneModel = 'ios' OR phoneModel = 'android' THEN 0 ELSE 1 END) as Others FROM users;");
    return deviceCount;
  }

  async getUsers() {
    const users = await this.db.query("SELECT * FROM users LIMIT 10");
    return users;
  }

  async getNotifications() {
    const notifications = await this.db.query("SELECT * FROM notifications LIMIT 10;");
    for (let i = 0; i < notifications.length; i++) {
      const element = notifications[i];
      const formatDateTime = utils.formatDateTime(element.notificationTime);
      element.notificationTime = formatDateTime;
      const notificationMessages = element.notificationMessage;
      element.notificationMessage = JSON.parse(notificationMessages);
    }
    return notifications;
  }
}

module.exports = Dashboard;