const Notification = require('../../models/notifications/notifications_model');

var adminFirebase = require("firebase-admin");
var serverKey = require("../../config/push_notification.json"); 

exports.getNotificationsData = async (req, res) => {
    const notifications = await Notification.getAll();
    const data = {  
        notifications: notifications,
    };
    res.render('pages/notifications', data);
}

exports.postSaveNotifications = async (req, res) => {
    if (req.session.user.power == 0) {
        res.send({ status: 'success', message: 'You are on a demo account. Changes were not applied.' });
        return;
    }
    const userData = req.body;
    const result = await Notification.create(userData);
    const androidUsers = await Notification.getAndroidUsers();
    const iosUsers = await Notification.getiosUsers();
    const allUsers = await Notification.getAllUsers();
    console.log(result.audience);
    let tokens;
    if(result.audience === 'android'){
        tokens = androidUsers
    }
    if(result.audience === 'ios'){
        tokens = iosUsers
    }
    else{
        tokens = allUsers
    }
  
    if(result){
      try {
        const message = {
          notification: {
            title: result.title,
            body: result.description,
          },
          tokens: tokens,
        };
      
        adminFirebase.messaging().sendEachForMulticast(message)
          .then((response) => {
            console.log('Successfully sent message:', response.successCount);
          })
          .catch((error) => {
            console.log('Error sending message:', error);
          });
      } catch (error) {
        // Handle error if notification addition fails
      }
      res.send({ status: 'success', message: 'Notification has been added successfully!'});
    }
    else{
      res.send({ status: 'success', message: 'Notification has not been added successfully!'});

    }
}
