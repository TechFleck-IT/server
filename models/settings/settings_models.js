const db = require('../../config/db_wrapper');
const utils = require('../../config/utils');
const config = require('../../config/config');
const upload_manager = require('../../config/upload_manager');
const mime = require('mime-types');

class Settings {
    constructor() {}

    async getSettingsData() {
        const results = await db.query(`SELECT * FROM config`);
        return utils.mapConfig(results);
      }

      async saveAdmobSettings(admobEnabled, admobAppId, admobBannerId, admobInterId, admobNativeId) {
        return await db.execute(`INSERT INTO config (name, value) VALUES ('admobEnabled', ?), ('admobAppId', ?), ('admobBannerId', ?), ('admobInterId', ?), ('admobNativeId', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [admobEnabled, admobAppId, admobBannerId, admobInterId, admobNativeId]);
      }

      async saveAgoraSettings(agoraId, agoraSecret) {
        return await db.execute(`INSERT INTO config (name, value) VALUES ('agora_id', ?), ('agora_certificate', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [agoraId, agoraSecret]);
      }

      async saveStripeSettings(pubKey, licenseKey) {
        return await db.execute(`INSERT INTO config (name, value) VALUES ('stripe_publish_key', ?), ('stripe_license_key', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [pubKey, licenseKey]);
      }

      async saveAlgorithm(conversionRate, minWithdraw, videoPerDay, adAlgo, reffReward, boostPerView, commision, conversionRateCoins) {
        return await db.execute(`INSERT INTO config (name, value) VALUES ('boost_video', ?),  ('boost_per_day', ?), ('conversion_rate', ?), ('conversion_rate_per_coin', ?), ('minimum_withdrawal', ?), ('refferal_reward', ?), ('boost_per_view', ?), ('commision', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [adAlgo, videoPerDay, conversionRate, conversionRateCoins, minWithdraw, reffReward, boostPerView, commision]);
      }

      async saveCdnSettings(cdnBucket, cdnEndpoint, cdnKey, cdnRegion, cdnSecret, cdnType) {
        const cdnSettings = await db.execute(`INSERT INTO config (name, value) VALUES ('cdn_bucket_name', ?), ('cdn_endpoint', ?), ('cdn_key', ?), ('cdn_region', ?), ('cdn_secret', ?), ('cdn_type', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [cdnBucket, cdnEndpoint, cdnKey, cdnRegion, cdnSecret, cdnType]);
    }

    async savePassword(password, id) {
        const savePassword = await db.execute(`UPDATE admins set  password = ? WHERE id = ?`, [password, id]);
    }

    async saveAppSettings(appSecret, file, streamAddress, accAddress, domain, streamAddressPort, accAddressPort, loginAddress, loginPort) {
        let iconUrl = "";
        
        if (file) {
          const iconUpload = await upload_manager.upload({ key: 'appIcon', fileReference: file.path, contentType: mime.lookup(file.path), fileName: file.filename });
          iconUrl = iconUpload.Location;
        }
        if (iconUrl == "") {
          await db.execute(`INSERT INTO config (name, value) VALUES ('accessible_address', ?), ('app_id', ?),  ('service_url', ?), ('stream_address', ?), ('accessible_address_port', ?), ('stream_address_port', ?), ('login_address', ?), ('login_address_port', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [accAddress, appSecret, domain, streamAddress, accAddressPort, streamAddressPort, loginAddress, loginPort]);
        } else {
          await db.execute(`INSERT INTO config (name, value) VALUES ('accessible_address', ?), ('app_id', ?), ('app_logo', ?), ('service_url', ?), ('stream_address', ?), ('accessible_address_port', ?), ('stream_address_port', ?), ('login_address', ?), ('login_address_port', ?)  ON DUPLICATE KEY UPDATE value = VALUES(value);`, [accAddress, appSecret, iconUrl, domain, streamAddress, accAddressPort, streamAddressPort, loginAddress, loginPort]);
        }
      }

      async saveAppSetting(appName, faqLink, pvcLink, termsLink, file, androidPkg, iosPkg) {
        let coinPicture = "";
        if (file) {
          const iconUpload = await upload_manager.upload({ key: 'appIcon', fileReference: file.path, contentType: mime.lookup(file.path), fileName: file.filename });
          coinPicture = iconUpload.Location;
        }
        if (coinPicture == "") {
          await db.execute(`INSERT INTO config (name, value) VALUES ('app_name', ?), ('faq_link', ?), ('privacy_policy_link', ?), ('terms_link', ?), ('package_name_android', ?), ('package_name_ios', ?)  ON DUPLICATE KEY UPDATE value = VALUES(value);`, [appName, faqLink, pvcLink, termsLink, androidPkg, iosPkg]);
        } else {
          await db.execute(`INSERT INTO config (name, value) VALUES ('app_name', ?), ('coin_picture', ?), ('faq_link', ?), ('privacy_policy_link', ?), ('terms_link', ?), ('package_name_android', ?), ('package_name_ios', ?) ON DUPLICATE KEY UPDATE value = VALUES(value);`, [appName, coinPicture, faqLink, pvcLink, termsLink, androidPkg, iosPkg]);
        }
      }
      
  }

  module.exports = Settings;