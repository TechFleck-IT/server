const e = require('express');
require('express-async-errors');
const globalErrorHandler = require('./middelwares/errorHandler');
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const crypto = require('crypto');
const chalk = require('chalk');
const { exec } = require('child_process');
const publicIp = require('public-ip');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
const http = require('http');
const https = require('https');
const configPath = './config/config.js';
const uploadsPath = './uploads';
const swaggerUI = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

console.log(chalk.blue('\nCopyright \u00A9 vativeApps 2023.') + ' Visit us at ' + chalk.underline.blue('https://www.vativeapps.com/') + ' for more information.');

// Check if the config file exists
if (!fs.existsSync(configPath)) {
  console.log(chalk.yellow('The config file does not exist. Please enter the following configuration values:'));
  // Prompt the user for the config values and store them in an object
  const config = {};
  config.dbConfig = {};
  rl.question(chalk.blue('App auth key (default: auto): '), (answer) => {
    // Generate a secure, random appAuthKey if the default value is chosen
    config.appAuthKey = (answer || 'auto') === 'auto' ? crypto.randomBytes(32).toString('hex') : answer;
    rl.question(chalk.blue('Database host (default: localhost): '), (answer) => {
      config.dbConfig.dbHost = answer || 'localhost';
      rl.question(chalk.blue('Database username: '), (answer) => {
        config.dbConfig.dbUsername = answer;
        rl.question(chalk.blue('Database password: '), (answer) => {
          config.dbConfig.dbPassword = answer;
          rl.question(chalk.blue('Database port (default: 3306): '), (answer) => {
            config.dbConfig.dbPort = answer || 3306;
            rl.question(chalk.blue('Database name: '), (answer) => {
              config.dbConfig.dbName = answer;
              // Write the config object to the config file
              fs.writeFileSync(configPath, `module.exports = ${JSON.stringify(config, null, 2)}`);
              console.log(chalk.green('\nConfiguration preview:'));
              console.log('=========================');
              console.log(`${chalk.green('Web server port:')} ${config.webServerPort}`);
              console.log(`${chalk.green('App auth key:')} ${config.appAuthKey}`);
              console.log(`${chalk.green('Database host:')} ${config.dbConfig.dbHost}`);
              console.log(`${chalk.green('Database username:')} ${config.dbConfig.dbUsername}`);
              console.log(`${chalk.green('Database password:')} ${config.dbConfig.dbPassword}`);
              console.log(`${chalk.green('Database port:')} ${config.dbConfig.dbPort}`);
              console.log(`${chalk.green('Database name:')} ${config.dbConfig.dbName}`);
              console.log('=========================');

              console.log(chalk.green('\nPress any key to continue...'));

              // Check if the uploads folder exists and create it if it does not
              if (!fs.existsSync(uploadsPath)) {
                console.log(chalk.yellow('Creating uploads folder...'));
                fs.mkdirSync(uploadsPath, { recursive: true });
                fs.mkdirSync(path.join(uploadsPath, 'gifs'), { recursive: true });
                fs.mkdirSync(path.join(uploadsPath, 'gifts'), { recursive: true });
                fs.mkdirSync(path.join(uploadsPath, 'images'), { recursive: true });
                fs.mkdirSync(path.join(uploadsPath, 'thumbnails'), { recursive: true });
                fs.mkdirSync(path.join(uploadsPath, 'videos'), { recursive: true });
                fs.mkdirSync(path.join(uploadsPath, 'stories'), { recursive: true });
                fs.mkdirSync(path.join(uploadsPath, 'verification_requests'), { recursive: true });
                fs.mkdirSync(path.join(uploadsPath, 'gift_categories'), { recursive: true });
                fs.mkdirSync(path.join(uploadsPath, 'sound_category'), { recursive: true });
                fs.mkdirSync(path.join(uploadsPath, 'sound_album'), { recursive: true });
                fs.mkdirSync(path.join(uploadsPath, 'appIcon'), { recursive: true });
                fs.mkdirSync(path.join(uploadsPath, 'sounds'), { recursive: true });
                fs.mkdirSync(path.join(uploadsPath, 'levels'), { recursive: true });
                fs.mkdirSync(path.join(uploadsPath, 'banners'), { recursive: true });
                console.log(chalk.green('Upload folders have been created.'));
              }

              rl.question('Would like to import database? (y/n)', (answer) => {
                if (answer || "y" == "y") {
                  console.log("Establishing database connection..");
                  const ImportWrapper = require('./config/import_wrapper');
                  // Testing MySQL connection
                  ImportWrapper.testConnection().then(isValid => {
                    if (isValid) {
                      console.log("MySQL Connection has been established");
                      // MySQL credentials are valid, importing SQL file
                      ImportWrapper.importSQLFile().then((imported) => {
                        if (imported) {
                          console.log("SQL Import has been completed.");
                          console.log(chalk.green('Restarting service...'));
                          rl.close();
                          // Restart the service
                          process.exit();
                        } else {
                          console.error("Importing failed. Please make sure you have latest version of the script.");
                          process.exit();
                        }
                      });
                    } else {
                      console.error("MySQL Connection cannot be established. Please make sure your MySQL credentials are valid.");
                      console.log(chalk.green('Exiting service...'));
                      rl.close();
                      // Restart the service
                      process.exit();
                    }
                  });
                } else {
                  console.log("\nDatabase import has been skipped");
                  console.log(chalk.green('Restarting service...'));
                  rl.close();
                  // Restart the service
                  process.exit();
                }
              });
            });
          });
        });
      });
    });
  });
} else {
  // Config file already exists, do nothing
  console.log(chalk.green('Config file already exists, skipping configuration setup.'));

  // Listen for console input
  rl.on('line', input => {
    if (input == "set admin") {
      let adminUsername = null;
      let adminPassword = null;
      let adminAuth = null;
      rl.question('Enter admin username: ', username => {
        adminUsername = username;
        rl.question('Enter admin password: ', password => {
          adminPassword = password;
          adminAuth = crypto.randomBytes(32).toString('base64');
          dbWrapper.execute("INSERT INTO admins (username, password, power, user_id, admin_auth) VALUES (?, ?, 2, 0, ?)", [adminUsername, adminPassword, adminAuth]).then((result) => {
            if (result.affectedRows > 0) {
              console.log("Admin configuration saved!");
            }
          });
        });
      });
    } else if (input == "show admins") {
      dbWrapper.query("SELECT username, password, power FROM admins").then((result) => {
        console.log(result);
      });
    } else if (input == "doctor") {
      console.log("Checking dependencies...");

      exec('where ffmpeg', (err, stdout, stderr) => {
        if (err) {
          console.error(`Error checking for FFmpeg: ${err.message}`);
          return;
        }

        if (stdout) {
          console.log(`FFmpeg is installed: ${stdout}`);
        } else {
          console.log('FFmpeg is not installed.');
        }
      });

      console.log("Checking configurations...");
    } else if (input == "show config") {
      dbWrapper.query("SELECT * FROM config").then((result) => {
        console.log(result);
      });
    }
  });

  exec('where ffmpeg', (err, stdout, stderr) => {
    if (err) {
      console.error(chalk.red(`Error checking for FFmpeg: ${err.message}`));
      return;
    }
    if (stdout) {
      console.log(chalk.green(`FFmpeg is installed: ${stdout}`));
    } else {
      console.error(chalk.red('FFmpeg is not installed.'));
    }
  });


  const certPath = './certificates/';
  const certKeyFile = certPath + 'key.pem';
  const certCertFile = certPath + 'cert.pem';


  const express = require('express');
  const app = express();

  // Serve Swagger documentation
  app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec, { explorer: true }));

  app.use((req, res, next) => {
    console.log(req.method, req.url);
    next();
  })

  let server;
  const db = require('./config/db_handler');
  const dbWrapper = require('./config/db_wrapper');
  var isSSLEnabled = false;

  if (fs.existsSync(certKeyFile) && fs.existsSync(certCertFile)) {
    const privateKey = fs.readFileSync(certKeyFile, 'utf8');
    const certificate = fs.readFileSync(certCertFile, 'utf8');
    const credentials = { key: privateKey, cert: certificate };
    server = https.createServer(credentials, app);
    console.log("SSL is configured for this script.");
    isSSLEnabled = true;
  } else {
    server = http.createServer(app);
    console.log("SSL is not configured for this script. You can configure SSL by putting key.pem and cert.pem file inside /certificates/ folder.");
  }
  const io = require('socket.io')(server, {
    cors: {
      origin: "*"
    }
  });
  const geoip = require('geoip-lite');
  const axios = require('axios');
  const profileRoutes = require('./routes/profile_route');
  const discoverRoutes = require('./routes/discover_route');
  const soundRoutes = require('./routes/sound_route');
  const videoRoutes = require('./routes/video_route');
  const constants = require('./config/constants');

  const adminRoute = require('./admin');


  var adminFirebase = require("firebase-admin");
  var serverKey = require("./config/push_notification.json");

  adminFirebase.initializeApp({
    credential: adminFirebase.credential.cert(serverKey),
  });

  // Configs 

  function getTime() {
    return Math.floor(new Date().getTime() / 1000)
  }
  let userObject;
  io.use(async (socket, next) => {
    let handshake = socket.handshake;
    if (handshake.headers.authid == global.appAuthKey) {
      userObject = await db.getUserByAuth(handshake.headers.authuid);
      if (userObject) {
        socket.userObject = userObject;
        next();
      } else {
        console.log("Unauthorized access [AuthId]");
        socket.disconnect();
      }
    } else {
      console.log("Unauthorized access [AppID]");
      socket.disconnect();
    }
  });

  async function addNotification(sender, receiverId, notificationMessage, videoId = undefined, commentId = undefined, streamId = undefined, postId = undefined, admin = false) {
    if (sender.id == receiverId) return;
    const receiverObj = await db.getUserById(receiverId);

    let notificationType = constants.notificationTypes.get(notificationMessage.type) ?? -1;
    if (receiverObj) {
      let notificationObj = {
        id: 0,
        notificationMessage: {
          ...notificationMessage,
          commentId,
          streamId,
          postId,
          videoId,
        },
        notificationTime: getTime(),
      };
      console.log("thisobjecy", notificationObj)
      if (sender) {
        notificationObj.user = {
          "id": sender.id,
          "name": sender.name,
          "picture": sender.profilePicture,
        };
      }
      if (admin) {
        // Admin Notification
        sendEmit(receiverId, "onNotificationReceived", notificationObj);
      } else {
        console.log(videoId, postId, commentId, streamId)
        const insertResponse = await db.insertNotification(receiverId, sender.id, JSON.stringify(notificationMessage), notificationType, videoId, postId, commentId, streamId);
        if (insertResponse) {
          notificationObj.id = insertResponse;
          sendEmit(receiverId, "onNotificationReceived", notificationObj);
        }
      }
    }
  }

  async function sendFirebaseNotification(sender, event, data) {
    const receiverObj = await db.getUserById(sender);
    if (!receiverObj.token || receiverObj.token == "") return;
    let message;
    if (event.type == "follow") {
      message = "started following you"
    }
    else if (event.type == "withdrawalApproved") {
      message = "Your withdrawal request has been approved"
    }
    else if (event.type == "withdrawalRejected") {
      message = "Your withdrawal request has been rejected"
    }
    adminFirebase.messaging().send({
      // notification: {
      //   title: event,
      //   body: JSON.stringify(data),
      // },
      data: {
        title: event,
        body: JSON.stringify(data),
      },
      token: receiverObj.token
    })
      .then((response) => {
        console.log('Successfully sent message:', response);
      })
      .catch((error) => {
        console.log('Error sending message:', error);
      });
  }

  global.sendFirebaseNotification = sendFirebaseNotification;
  global.addNotification = addNotification;

  // for parsing application/json
  app.set('view engine', 'ejs');
  app.set('trust proxy', true);
  app.use(express.json());
  app.use(express.static(__dirname, { dotfiles: 'allow' }));
  app.use(express.static(__dirname + '/public'));
  app.use('/uploads', express.static('uploads'));
  app.use('/admin', adminRoute);

  app.use(require('express-status-monitor')());
  /* Middleware: Check authorization Pass on */
  app.use((req, res, next) => {
    if (req.path === '/marketplace/cancel' || req.path === '/marketplace/success' || req.path === '/favicon.ico' || req.path === 'success' || req.path === 'cancel' || req.path === 'success_coins' || req.path === '/success_coins') {
      next();
      return;
    }
    if ('authid' in req.headers) {
      if (req.headers['authid'] == global.appAuthKey) {
        next();
        return;
      }
    }
    res.status(400).send({
      error: "unauthorized",
    });
  });

  function userAuthorization(optional) {
    return (async (req, res, next) => {
      if ('authuid' in req.headers) {
        const authId = req.headers['authuid'];
        const user = await db.getUserByAuth(authId);
        if (user) {
          req.user = user;
          next();
          return;
        }
      }
      if (!optional) {
        res.status(401).send({
          error: "unauthorized"
        });
      } else {
        next();
        return;
      }
    });
  }

  app.use('/profile', userAuthorization(true), profileRoutes);
  app.use('/discover', userAuthorization(true), discoverRoutes);
  app.use('/sound', userAuthorization(true), soundRoutes);
  app.use('/video', userAuthorization(true), videoRoutes);

  app.post('/join', async (req, res) => {
    const email = req.body['email'] ?? null;
    const uid = req.body['uid'] ?? null;
    const name = req.body['name'] ?? null;
    const appVersion = req.body["appVersion"] ?? null;
    const phoneModel = req.body["phoneModel"] ?? null;
    var login_type = req.body['login_type'] ?? null;
    if (email && uid && appVersion && phoneModel && login_type) {
      if (login_type == "google") {
        login_type = 1;
      } else if (login_type == "apple") {
        login_type = 2;
      } else if (login_type == "phone") {
        login_type = 3;
      } else {
        login_type = 0;
        if (req.file != null) {
          fs.unlinkSync(req.file.path);
        }
        res.status(400).send({
          error: "invalid_params",
        });
        return;
      }
      const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
      let ipAddress = '';

      if (ip.includes('::ffff:')) {
        const parts = ip.split(':');
        ipAddress = parts[3];
      } else {
        ipAddress = ip;
      }
      console.log(ipAddress)
      var locate = geoip.lookup(ipAddress);

      const location = locate ? locate.country : "Unknown";
      console.log("Location: " + location);
      const response = await db.registerUser(uid, name, email, uid, appVersion, phoneModel, login_type, location);
      if (response) {
        // Profile created
        res.send({
          user: response.user,
        });
      } else {
        if (req.file != null) {
          fs.unlinkSync(req.file.path);
        }
        res.status(400).send({
          error: "user_not_created",
        });
      }
    } else {
      if (req.file != null) {
        fs.unlinkSync(req.file.path);
      }
      res.status(400).send({
        error: "invalid_params",
      });
    }
  });

  app.get('/web_login', async (req, res) => {
    console.log(req.headers.authuid)
    if (req.headers) {
      const response = await db.getUserByAuth(req.headers.authuid);
      if (response) {
        res.send({
          user: response,
        });
      }
      else {
        res.status(400).send({
          error: "user_not_found",
        });
      }
    }
    else {
      res.status(400).send({
        error: "user_not_found",
      });
    }
  });


  app.get('/getReferralInfo', async (req, res) => {
    const coinsInfo = await db.getConfigs();
    res.send({
      "coins": parseInt(coinsInfo.refferal_reward),
    });
  });

  app.post('/getIp', async (req, res) => {
    try {
      const response = await axios.get('https://api.ipify.org?format=json');
      const ip = response.data.ip;
      console.log(ip);

      const location = geoip.lookup(ip);
      if (location === null) {
        res.status(404).send('No location found for IP address');
      } else {
        res.status(200).send(location.country);
      }
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal server error');
    }
  });

  app.use(globalErrorHandler);

  var clients = {};
  async function sendEmit(userId, event, data) {
    if (userId in clients) {
      clients[userId].emit(event, data);
    } else {
      if (data.user) {
        console.log(userId, event, data);
        global.sendFirebaseNotification(userId, event, data);
      }
    }
  }

  io.on('connection', function (client) {
    /*
      onMessageReceived(
        {
          serverMessageId,
          message,
          sentTime,
          user: {
            id,
            name,
            picture,
          },
        }),
      onMessageAdded({messageId, serverMessageId}),
      onMessageDeleted({serverMessageId}),
      onMessageDelivered({serverMessageId, deliveredTime}),
      onTyping({UserId}),
    */
    console.log('client connect...', client.id, client.userObject.id);
    clients[client.userObject.id] = client;
    db.getPendingMessages(client.userObject.id).then((messages) => {
      for (let i = 0; i < messages.length; i++) {
        const messageResponse = messages[i];
        sendEmit(client.userObject.id, 'onMessageReceived', {
          "serverMessageId": messageResponse.serverMessageId,
          "message": messageResponse.message,
          "sentTime": messageResponse.sentTime,
          "user": messageResponse.user,
        });
      }
    });
    client.on('sendMessage', async function name(data) {
      const userObj = client.userObject;
      const conversationId = data['conversationId'];
      const dataValue = data['dataValue'];
      const messageId = data['messageId'];
      console.log(messageId, "messageId");
      const messageResponse = await db.addMessage(userObj, conversationId, data['message'], userObj.isAdmin);
      if (messageResponse) {
        console.log("Message sent", userObj.id);
        sendEmit(conversationId, 'onMessageReceived', {
          "serverMessageId": messageResponse.serverMessageId,
          "message": messageResponse.message,
          "sentTime": messageResponse.timestamp,
          "user": messageResponse.user,
        });
        console.log("Message sent", conversationId);
        client.emit('onMessageAdded', {
          "messageId": messageId,
          "serverMessageId": messageResponse.serverMessageId,
        });
      }
      else {
        client.emit('onMessageAdded', {
          "messageId": messageId,
          "serverMessageId": 0,
        });
      }
    });
    client.on('onTyping', async function name(data) {
      const conversationId = data["conversationId"];
      sendEmit(conversationId, 'onTyping', {
        "conversationId": client.userObject.id,
      });
    });
    client.on('acknowledgeMessage', async function name(data) {
      const serverMessageId = data['serverMessageId'];
      const conversationId = data['conversationId'];
      const response = await db.messageDelivered(conversationId, serverMessageId);
      if (response) {
        sendEmit(conversationId, 'onMessageDelivered', {
          "serverMessageId": serverMessageId,
          "deliveredTime": response.timestamp,
        });
      }
    });
    client.on('onMessageSeen', async function name(data, ack) {
      const serverMessageId = data['serverMessageId'];
      const conversationId = data['conversationId'];
      const response = await db.messageSeen(conversationId, serverMessageId);
      if (response) {
        sendEmit(conversationId, 'onMessageSeen', {
          "serverMessageId": serverMessageId,
          "seenTime": response.timestamp,
        });
        ack();
      }
    });
    client.on('onCallBegin', async function name(data) {
      const callerId = data['userId'];
      const isVideo = data['video'] ?? false;
      const id = crypto.randomBytes(16).toString("hex");
      const channelId = callerId + id;
      const callerUserObj = await db.getUserById(callerId);
      if (callerUserObj && callerId in clients) {
        const tokenY = createAgoraToken(callerId, channelId);
        clients[callerId].lastChannelId = channelId;
        sendEmit(callerId, 'onIncomingCall', {
          "video": isVideo,
          "channelId": channelId,
          "token": tokenY,
          "user": {
            "id": client.userObject.id,
            "name": client.userObject.name,
            "picture": client.userObject.picture,
          }
        });
        clients[client.userObject.id].lastChannelId = channelId;
        const tokenX = createAgoraToken(client.userObject.id, channelId);
        sendEmit(client.userObject.id, 'onCallSessionInitiated', {
          "channelId": channelId,
          "token": tokenX,
        });
      } else {
        console.log("Caller", callerUserObj.name, "is not online.");
        sendEmit(client.userObject.id, 'onCallEnded', {
          "channelId": channelId,
          "callerId": callerId,
          "reason": 0,
        });
      }
    });
    client.on('onCallEnd', async function name(data) {
      const callerId = data['userId'];
      const channelId = data['channelId'];
      if (callerId in clients) {
        if (clients[callerId].lastChannelId = channelId) {
          sendEmit(callerId, 'onCallEnded', {
            "callerId": client.userObject.id,
            "channelId": channelId,
            "reason": 1,
          });
        } else {
          console.error("Invalid caller end session: ", channelId, callerId);
        }
      }
    });
    client.on('disconnect', async function () {
      delete clients[client.userObject.id];
      console.log('client disconnect...', client.id)
    });
    client.on('error', function (err) {
      console.log('received error from client:', client.id)
      console.log(err)
    });
  });
  function createAgoraToken(userId, channelId) {
    const configs = global.config;

    // Rtc Examples
    if (!configs.agora_id || configs.agora_id.trim() === '' || !configs.agora_certificate || configs.agora_certificate.trim() === '') {
      console.log('Agora ID and/or certificate not configured from panel');
    }

    const appID = configs.agora_id;
    const appCertificate = configs.agora_certificate;
    const channelName = channelId;
    const uid = userId;
    const role = RtcRole.PUBLISHER;
    const expirationTimeInSeconds = 3600
    const currentTimestamp = Math.floor(Date.now() / 1000)
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds

    // IMPORTANT! Build token with either the uid or with the user account. Comment out the option you do not want to use below.

    // Build token with uid
    const tokenA = RtcTokenBuilder.buildTokenWithUid(appID, appCertificate, channelName, uid, role, privilegeExpiredTs);
    console.log("Token With Integer Number Uid: " + tokenA);
    return tokenA;
  }

  // process.on('uncaughtException', function (err) {
  //   console.log('Caught exception: ' + err);
  // });

  process.on('SIGINT', function () {
    console.log('Got SIGINT.  Press Control-D to exit.');
    process.exit();
  });

  console.log(chalk.green("Initializing server..."));
  db.getConfigs().then((config) => {
    global.config = config;
    var server_port = config.accessible_address_port ?? 3000;
    global.appAuthKey = config.app_id;
    global.hostAddress = `${config.service_url}:${config.accessible_address_port}/`;
    server.listen(server_port, () => {
      const NetworkInfo = require('./utils/network_info');
      const networkInfo = new NetworkInfo();
      networkInfo.getAddresses()
        .then(() => {
          console.log('Private IP Address: ', networkInfo.getPrivateAddress());
          console.log('Public IP Address: ', networkInfo.getPublicAddress());
          if (isSSLEnabled) {
            console.log(`Accessible address: https://${networkInfo.getPublicAddress()}:${server_port}`);
            console.log(`Admin interface address: https://${networkInfo.getPublicAddress()}:${server_port}/admin`);

            // db_wrapper.execute("INSERT INTO config (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?", [
            //   "accessible_address",
            //   `https://${networkInfo.getPublicAddress()}`,
            //   `https://${networkInfo.getPublicAddress()}`,
            // ]);

            // db_wrapper.execute("INSERT INTO config (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?", [
            //   "accessible_address_port",
            //   `:${server_port}`,
            //   `:${server_port}`,
            // ]);

            // db_wrapper.execute("INSERT INTO config (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?", [
            //   "stream_address",
            //   `https://${networkInfo.getPublicAddress()}`,
            //   `https://${networkInfo.getPublicAddress()}`,
            // ]);

            // db_wrapper.execute("INSERT INTO config (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?", [
            //   "stream_address_port",
            //   `:${server_port}`,
            //   `:${server_port}`,
            // ]);

          } else {
            console.log(`Accessible address: http://${networkInfo.getPublicAddress()}:${server_port}`);
            console.log(`Admin interface address: http://${networkInfo.getPublicAddress()}:${server_port}/admin`);

  

            // db_wrapper.execute("INSERT INTO config (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?", [
            //   "stream_address",
            //   `http://${networkInfo.getPublicAddress()}`,
            //   `http://${networkInfo.getPublicAddress()}`,
            // ]);
            // db_wrapper.execute("INSERT INTO config (name, value) VALUES (?, ?) ON DUPLICATE KEY UPDATE value = ?", [
            //   "stream_address_port",
            //   `${server_port}`,
            //   `${server_port}`,
            // ]);
          }

        })
        .catch((err) => {
          console.error('Error fetching IP addresses: ', err.message);
        });

      console.log('listening on *:', server_port);
    });
  }).catch(error => {
    console.error(chalk.red("Server cannot be initiated due to misconfiguration or MySQL connectivity issue", error));
  });
}