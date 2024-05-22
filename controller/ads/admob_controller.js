const config = require('../../config/config');
const Settings = require('../../models/settings/settings_models');

exports.getAdmobData = async (req, res) => {
    const settingsModel = new Settings();
    const settings = await settingsModel.getSettingsData();
    const data = {
        config: {
            "admobEnabled" : settings.admobEnabled ?? "",
            "admobAppId" : settings.admobAppId ?? "",
            "admobNativeId" : settings.admobNativeId ?? "",
            "admobInterId" : settings.admobInterId ?? "",
            "admobBannerId" : settings.admobBannerId ?? "",
        }
    };
    res.render('pages/admob', data);
}

exports.postSaveAdmob = async (req, res) => {
    const settingsModel = new Settings();
    const userData = req.body;
    await settingsModel.saveAdmobSettings(userData.admobEnabled, userData.admobAppId, userData.admobBannerId, userData.admobInterId, userData.admobNativeId);
    res.send({ status: 'success', message: 'Your AdMob Settings updated successfully!'});
  }
