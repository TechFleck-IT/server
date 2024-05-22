const db = require('../../config/db_wrapper');
const utils = require('../../config/utils');

class Dashboard {

  constructor(db) {
    this.db = db;
  }

  async getDashboardCounts() {
    const dashboardCounts = await this.db.query("SELECT (SELECT COUNT(*) FROM users) as total_users, (SELECT COUNT(*) FROM videos) as total_videos, (SELECT COUNT(*) FROM posts) as total_posts, (SELECT COUNT(*) FROM messages) as total_messages;");
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

  async getLiveStreams() {
    const liveStreams = await this.db.query("SELECT * FROM users JOIN live_streams ON users.id = live_streams.user_id;");
    for (let i = 0; i < liveStreams.length; i++) {
      const element = liveStreams[i];
      const startTime = utils.formatDateTime(element.started);
      const endTIme = utils.formatDateTime(element.ended);
      element.started = startTime;
      element.ended = endTIme;
    }
    return liveStreams;
}
async getGiftExchanges() {
    const giftExchanges = await this.db.query("SELECT h.*, sender.name as sender_name, receiver.name as receiver_name FROM gift_history h JOIN users sender ON h.sender_id = sender.id JOIN users receiver ON h.receiver_id = receiver.id LIMIT 10;");
    for (let i = 0; i < giftExchanges.length; i++) {
        const element = giftExchanges[i];
        const sentTime = utils.formatDateTime(element.sentTime);
        element.sentTime = sentTime;
    }
    return giftExchanges;
    }

    async getTotalSales() {
      const totalSales = await this.db.query("SELECT SUM(costing) as total_costing, SUM(coinsRewarded) as total_coins_rewarded, (SUM(costing) / (SELECT SUM(costing) FROM purchases WHERE MONTH(purchaseTime) = MONTH(CURRENT_DATE() - INTERVAL 1 MONTH) AND YEAR(purchaseTime) = YEAR(CURRENT_DATE()))) * 100 AS costing_pct_change, (SUM(coinsRewarded) / (SELECT SUM(coinsRewarded) FROM purchases WHERE MONTH(purchaseTime) = MONTH(CURRENT_DATE() - INTERVAL 1 MONTH) AND YEAR(purchaseTime) = YEAR(CURRENT_DATE()))) * 100 AS coins_pct_change FROM purchases WHERE MONTH(purchaseTime) = MONTH(CURRENT_DATE()) AND YEAR(purchaseTime) = YEAR(CURRENT_DATE());");

      return totalSales;
      }

      async getTotalSalesByMonth() {
        const totalSalesByMonth = await this.db.query("SELECT m.month, COALESCE(SUM(p.costing), 0) AS totalCost, COALESCE(SUM(p.coinsRewarded), 0) AS totalCoins FROM ( SELECT 'January' AS month UNION SELECT 'February' UNION SELECT 'March' UNION SELECT 'April' UNION SELECT 'May' UNION SELECT 'June' UNION SELECT 'July' UNION SELECT 'August' UNION SELECT 'September' UNION SELECT 'October' UNION SELECT 'November' UNION SELECT 'December' ) m LEFT JOIN purchases p ON MONTHNAME(p.purchaseTime) = m.month AND YEAR(p.purchaseTime) = YEAR(CURDATE()) GROUP BY m.month");
        return totalSalesByMonth;
      }
}

module.exports = Dashboard;