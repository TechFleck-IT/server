const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const configPath = './config/config.js';
const { v4: uuidv4 } = require('uuid');

// Check if the config file exists
if (!fs.existsSync(configPath)) {
  console.log(chalk.yellow('The config file does not exist. Please make sure you have configured the files before running this script.'));
  console.log(chalk.green('Closing service...'));
  process.exit();
}

const express = require('express')
// const app = express()
const router = express.Router();
var bodyParser = require('body-parser');
// require('express');
const session = require('express-session');
const multer = require('multer');
var urlencodedParser = bodyParser.urlencoded({ extended: false })
const db = require('./config/db_wrapper');
const serverNotification = require('./server');
 
const { getDashboardData } = require('./controller/index/index_controller');
const { getUsersData, getFetchUserData, getEditUserData, postAddUser, postDeleteUser, postUpdateUser } = require('./controller/users/users_controller');
const { getAdminData, postAddAdmin, postDeleteAdmin, postRemoveAdmin } = require('./controller/administrators/administrator_controller');
const { getVideoData, getVideoDetails, postUpdateVideoDetails, postDeleteVideo} = require('./controller/videos/video_controller');
const { getCommentData, postDeleteComment, getEditCommentVideo } = require('./controller/comments/comments_controller');
const { getReportData, postDeleteReport, getReportDataDetails, postUpdateReportDetails, postDeleteReportVideo} = require('./controller/reports/reports_controller');
const { getReportReasonData, addReportReason, postDeleteReason} = require('./controller/reportCategories/report_categories_controller');
const { getReportDataUser, postDeleteReportUser} = require('./controller/reports_users/reports_user_controller');
const { getSoundsData, getFetchSound, postAddSound, postDeleteSound } = require('./controller/sounds/sounds_controller');
const { getSoundCategoryData, postAddSoundCategory, postDeleteSoundCategory } = require('./controller/soundCategories/sound_categories_controller');
const { getTagsData, postAddTag, postUpPriority, postDownPriority, postDeleteTag } = require('./controller/tags/tags_controller');
const { getNotificationsData, postSaveNotifications } = require('./controller/notifications/notification_controller');
const { getSettingsData, postSavePassword, postSaveApp, postSaveAppSettings, postGenerateToken } = require('./controller/settings/settings_controller');
const { getBannersData, deleteBanner, addBanner } = require('./controller/ads/banners_controller');
const { getAdmobData, postSaveAdmob } = require('./controller/ads/admob_controller');

// router.set('view engine', 'ejs');
router.use(urlencodedParser);
router.use(express.static("public"));
router.use(express.static("config"));
router.use('/uploads', express.static('uploads'))


const oneDay = 1000 * 60 * 60 * 24;
router.use(session({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized:true,
    cookie: { maxAge: oneDay },
    resave: false 
}));

router.get('/login', function (req, res) {
    if (req.session.user) {
        res.redirect('/admin');
        return;
    }
    res.render('pages/login');
});

router.post('/login', async function (req, res) {

    const username = req.body.username;
    const password = req.body.password;

    const userResult = await db.query("SELECT a.*, u.name, u.profilePicture FROM admins a LEFT JOIN users u ON a.user_id = u.id WHERE a.username = ?;", [username]);
    if (userResult && userResult.length > 0) {
        const element = userResult[0];
        if (element.password == password) {
            req.session.user = element;
            res.send({"result": true});
            return;
        }
    }
    res.status(401).send({"error": "invalid_credentials"});
});

router.get('/logout',(req,res) => {
  req.session.destroy();
  res.redirect('login');
});

router.use(async (req, res, next) => {
    res.locals.user = req.session.user;
    // Retrieve appName from the config table
    const configs = await db.query("SELECT value FROM config WHERE name IN ('app_logo', 'app_name')");
    res.locals.appName = configs[1] ? configs[1].value : "vativeApps";
    res.locals.appLogo = configs[0] ? configs[0].value : "";
    if (req.session.user) {
      next();
    } else {
      // Not logged in
      res.render('pages/login');
    }
  });

const giftsFolder = './uploads/gifts';
const soundsFolder = './uploads/sounds';
const appIconFolder = './uploads/appIcon';
const levelsFolder = './uploads/levels';
const imageFolder = './uploads/images';
const soundAlbumFolder = './uploads/sound_album';
const giftCategoryFolder = './uploads/gift_category';
const storiesFolder = './uploads/stories';
const userFolder = "./uploads/users"
const videoFolder = "./uploads/videos"
const gifsFolder = "./uploads/gifs"

if (!fs.existsSync(appIconFolder)) {
  fs.mkdirSync(appIconFolder);
}
if (!fs.existsSync(storiesFolder)) {
  fs.mkdirSync(storiesFolder);
}
if (!fs.existsSync(giftCategoryFolder)) {
  fs.mkdirSync(giftCategoryFolder);
}
if (!fs.existsSync(imageFolder)) {
  fs.mkdirSync(imageFolder);
}
if (!fs.existsSync(soundAlbumFolder)) {
  fs.mkdirSync(soundAlbumFolder);
}
if (!fs.existsSync(soundsFolder)) {
  fs.mkdirSync(soundsFolder);
}
if (!fs.existsSync(giftsFolder)) {
  fs.mkdirSync(giftsFolder);
}
if (!fs.existsSync(levelsFolder)) {
  fs.mkdirSync(levelsFolder);
}
if (!fs.existsSync(userFolder)) {
    fs.mkdirSync(userFolder);
}
if (!fs.existsSync(videoFolder)) {
    fs.mkdirSync(videoFolder);
}
if (!fs.existsSync(gifsFolder)) {
    fs.mkdirSync(gifsFolder);
}

router.get('/', getDashboardData);

router.get('/users', getUsersData);

router.get('/fetch/users', getFetchUserData);

router.get('/edit_users', getEditUserData);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/users')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
      cb(null, uniqueSuffix)
    }
})

const uploadUserPicture = multer({ storage: storage} );
router.post('/addUser', uploadUserPicture.single('picture'), postAddUser);

const storageUser = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/users')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
      cb(null, uniqueSuffix)
    }
})
const updateUserPicture = multer({ storage: storageUser} );
router.post('/updateUser', updateUserPicture.single('picture'), postUpdateUser);

router.post('/deleteUser', postDeleteUser);

router.get('/administrators', getAdminData);

router.post('/addAdmin', postAddAdmin);

router.post('/deleteAdmin', postDeleteAdmin);

router.post('/removeAdmin', postRemoveAdmin);

router.get('/videos',  getVideoData);

router.get('/edit_videos', getVideoDetails);

router.post('/updateVideo', postUpdateVideoDetails);

router.post('/deleteVideo', postDeleteVideo);

router.get('/comments', getCommentData);

router.post('/deleteComment', postDeleteComment);

router.get('/comment_video_details', getEditCommentVideo);

router.get('/reports', getReportData);

router.get('/reports_users', getReportDataUser);

router.get('/report_reason', getReportReasonData);

router.post('/deleteReport', postDeleteReport); 

router.post('/deletePostReport', postDeleteReport);

router.post('/deleteReason', postDeleteReason);

router.post('/deleteUserReport', postDeleteReportUser);

router.post('/addReport', addReportReason);

router.get('/sound_categories', getSoundCategoryData);

router.get('/sounds', getSoundsData);

router.get('/fetch/sounds', getFetchSound);

const soundStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/sounds')
  },
  filename: function (req, file, cb) {
    const uuid = uuidv4();
    const uniqueSuffix = uuid + path.extname(file.originalname);
    cb(null, uniqueSuffix)
  }
})
const uploadSoundCategory = multer({ storage: soundStorage} );
router.post('/addSound', uploadSoundCategory.fields([{ name: 'sound', maxCount: 1 }, { name: 'photo', maxCount: 1 }]), postAddSound);

router.post('/deleteSound', postDeleteSound);

router.post('/deleteSoundCategory', postDeleteSoundCategory);

const bannerStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/banners')
  },
  filename: function (req, file, cb) {
    const uuid = uuidv4();
    const uniqueSuffix = uuid + path.extname(file.originalname);
    cb(null, uniqueSuffix)
  }
});
const bannerMulter = multer({ storage: bannerStorage} );
router.get('/banners', getBannersData);
router.post('/deleteBanner', deleteBanner);
router.post('/addBanner', bannerMulter.single('banner'), addBanner);

router.post('/deleteReportVideo', postDeleteReportVideo);

router.get('/report_video_details', getReportDataDetails);

router.get('/tags', getTagsData);

router.post('/addTags', postAddTag);

router.post('/upPriority', postUpPriority);

router.post('/downPriority', postDownPriority);

router.post('/deleteTag', postDeleteTag);

router.get('/notifications', getNotificationsData);

router.post('/saveNotification', postSaveNotifications);

router.get('/admob', getAdmobData);

router.get('/settings', getSettingsData);

router.post('/saveAdmob', postSaveAdmob);

router.post('/savePassword', postSavePassword);

const saveStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/appIcon')
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
      cb(null, uniqueSuffix)
    }
})
const appIcon = multer({ storage: saveStorage} );
router.post('/saveApp', appIcon.single('appIcon'), postSaveApp);

const saveStorage1 = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/appIcon')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueSuffix)
  }
})
const coinIcon = multer({ storage: saveStorage1} );
router.post('/saveAppSettings', coinIcon.single('iconStripe'), postSaveAppSettings);

router.post('/generateToken', postGenerateToken);

module.exports = router