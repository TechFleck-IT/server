const express = require('express');
const router = express.Router();
const multer = require('multer')
const config = require('../config/config');
const ffmpeg = require('fluent-ffmpeg');
const ffprobe = require('ffprobe');
const fs = require('fs');
const path = require('path');
const db = require('../config/db_handler');
const AWS = require('aws-sdk');
const mime = require('mime-types');
const { v4: uuidv4 } = require('uuid');
var getIP = require('ipware')().get_ip;
/**
 * @swagger
 * tags:
 *   name: Profile Routes
 *   description: Endpoints related to user profiles
 */

/**
   * @swagger
   * /:
   *   get:
   *     tags: [Profile Routes]
   *     summary: Get user profile
   *     parameters:
   *       - in: query
   *         name: userId
   *         schema:
   *           type: integer
   *           default: 0
   *         description: User ID
   *     responses:
   *       200:
   *         description: User profile
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 user:
   *                   type: object
   */
router.get('', async (req, res) => {
    const userId = req.query['userId'] ?? 0;
    const authUserId = req.user ? req.user.id : 0;
    console.log(authUserId, userId)
    const user = await db.getProfile(authUserId, userId);
    console.log(user)
    res.send({
        "user": user,
    });
});


const videoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/videos/')
    },
    filename: function (req, file, cb) {
        const uuid = uuidv4();
        const uniqueSuffix = uuid + path.extname(file.originalname);
        cb(null, uniqueSuffix)
    }
});

const sharp = require('sharp');
const upload = multer({ storage: videoStorage })
/**
   * @swagger
   * /upload:
   *   post:
   *     tags: [Profile Routes]
   *     summary: Upload a video
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               video:
   *                 type: string
   *                 format: binary
   *               title:
   *                 type: string
   *               sound_id:
   *                 type: integer
   *               allowComments:
   *                 type: boolean
   *               allowSharing:
   *                 type: boolean
   *               private:
   *                 type: boolean
   *               allowDuet:
   *                 type: boolean
   *               allowGifts:
   *                 type: boolean
   *               duration:
   *                 type: integer
   *               exclusiveAmount:
   *                 type: integer
   *               isAd:
   *                 type: boolean
   *               clickable_url:
   *                 type: string
   *               budget:
   *                 type: integer
   *               days:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Video uploaded successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 result:
   *                   type: boolean
   *       401:
   *         description: Unauthorized
   *       500:
   *         description: Server error
   */
router.post('/upload', upload.single('video'), async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const uploadAddress = global.hostAddress + "uploads/";
    const title = req.body['title'] ?? "";
    const description = req.body['description'] ?? "";
    const type = req.body['type'] ?? 1;
    const location = req.body['location'] ?? 1;
    let soundId = req.body.sound_id ?? 0;
    const allowComments = req.body['allowComments'] ?? false;
    const allowSharing = req.body['allowSharing'] ?? false;
    const private = req.body['private'] ?? false;
    const allowDuet = req.body['allowDuet'] ?? false;
    const allowGifts = req.body['allowGifts'] ?? false;
    const duration = req.body['duration'] ?? 0;
    const exclusiveAmount = req.body['exclusiveAmount'] ?? 0;
    const isAd = req.body['isAd'] ?? 0;
    const clickable_url = req.body['clickable_url'] ?? '';
    const budget = req.body['budget'] ?? 0;
    const days = req.body['days'] ?? 0;
    const videoReference = req.file.path;

    const videoName = req.file.filename;
    const videoNameWithoutExt = path.parse(videoName).name;

    var thumbnailName = `${videoNameWithoutExt}.jpeg`;
    const gifName = `${videoNameWithoutExt}.gif`;
    const soundName = `${videoNameWithoutExt}.mp3`;

    var thumbnailPath = await generateThumbnail(videoReference, thumbnailName);
    var videoDimension = await getVideoDimensions(videoReference);
    console.log(videoDimension);
    const width = videoDimension.width ?? 1224;
    const height = videoDimension.height ?? 421;
    var gifPath;
    var gifUrl;
    if (exclusiveAmount > 0) {
        // const screenshotPath = path.join('./uploads/thumbnails', thumbnailName);
        // thumbnailPath = await generateBlurredThumbnail(screenshotPath);
        // gifRequired = false;
        // gifUrl = uploadAddress + thumbnailPath;
        const screenshotPath = path.join("uploads/thumbnails", thumbnailName);
        console.log(screenshotPath);
            // if (!fs.existsSync('./uploads/')) {
            //     fs.mkdirSync('./uploads/');
            // }
            thumbnailPath = await generateBlurredThumbnail(screenshotPath);
            thumbnailName = path.basename(thumbnailPath);
            console.log("Blurred: " + thumbnailPath);
            gifRequired = false;
            gifUrl = uploadAddress + thumbnailPath;

    } else {
        gifPath = await generateGif(videoReference, gifName);
        gifUrl = uploadAddress + gifPath;
    }

    const thumbnailsDir = path.join(process.cwd(), "uploads", "thumbnails");
    const soundsDir = path.join(process.cwd(), "uploads", "sounds");
    const gifDir = path.join(process.cwd(), "uploads", "gifs");
    const thumbnailCompletePath = path.join(thumbnailsDir, thumbnailName);
    const soundCompletePath = path.join(soundsDir, soundName);
    const gifCompletePath = path.join(gifDir, gifName);
    console.log("soundId", soundId)

    var soundPath;
    if (parseInt(soundId) === 0) {
        // Extract music from video
        // Check admin panel permission for extraction
        // if (global.extractAudio ?? true) {
            soundPath = await extractAudio(videoReference, soundName);
            console.log(soundPath)
            soundPath = path.join(soundsDir, soundName);
        // }
    }

    try {
        const videoResponse = await upload_manager.upload({ key: `videos`, fileReference: videoReference, contentType: mime.lookup(videoReference), fileName: videoName });
        
        const thumbnailResponse = await upload_manager.upload({ key: `thumbnails`, fileReference: thumbnailCompletePath, contentType: mime.lookup(thumbnailCompletePath), fileName: thumbnailName });

        if (soundPath) {
            const duration = await getDuration(soundPath);
            const soundResponse = await upload_manager.upload({ key: `sounds`, fileReference: soundCompletePath, contentType: mime.lookup(soundCompletePath), fileName: soundName });
            if (soundResponse.Location) {
                // insert sound details
                const dbMusic = await db.addSound(req.user.id, soundResponse.Location, "", "", duration, req.user.name);
                if (dbMusic) {
                    soundId = dbMusic.soundId;
                }
            }
        }

        const hashtags = title.match(/#[\w\u0590-\u05ff]+/g) || [];
        const tags = hashtags.join(',');

        let dbResponse;
        if (gifPath) {
            const gifResponse = await upload_manager.upload({ key: `gifs`, fileReference: gifCompletePath, contentType: mime.lookup(gifCompletePath), fileName: gifName });
            dbResponse = await db.uploadVideo(req.user.id, videoResponse.Location, thumbnailResponse.Location, gifResponse.Location, videoReference, title, soundId, allowComments, allowSharing, private, allowDuet, allowGifts, exclusiveAmount, duration, height, width, description, type, location);
            res.send(dbResponse);
            return;

        } else {
            dbResponse = await db.uploadVideo(req.user.id, videoResponse.Location, thumbnailResponse.Location, thumbnailResponse.Location, videoReference, title, soundId, allowComments, allowSharing, private, allowDuet, allowGifts, exclusiveAmount, duration, height, width, description, type, location);
            res.send(dbResponse);
            return;
        }
    } catch (err) {
        console.error("[ERROR] " + err);
        res.status(500).send({ error: err });
    }
});

async function getDuration(filePath) {
    return new Promise((resolve, reject) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err) return reject(err);
            const duration = Math.floor(metadata.format.duration);
            resolve(duration);
        });
    });
}

/**
   * @swagger
   * /videos:
   *   get:
   *     tags: [Profile Routes]
   *     summary: Get user profile videos
   *     parameters:
   *       - in: query
   *         name: userId
   *         schema:
   *           type: integer
   *           default: 0
   *         description: User ID
   *       - in: query
   *         name: from
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Pagination offset
   *       - in: query
   *         name: filter
   *         schema:
   *           type: string
   *           default: "normal"
   *         description: Filter type
   *     responses:
   *       200:
   *         description: List of profile videos
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 videos:
   *                   type: array
   *                   items:
   *                     type: object
   */
router.get('/videos', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const from = req.query['from'] ?? 0;
    const userId = req.query['userId'] ?? 0;
    const filter = req.query['filter'] ?? "normal"; // Normal, Premium, Bookmarks, Liked
    console.log("filter", filter, userId, from)   
    const videos = await db.getProfileVideos(authUserId, userId, filter, from);
    res.send({
        "videos": videos,
    });
});

/**
   * @swagger
   * /update_token:
   *   post:
   *     tags: [Profile Routes]
   *     summary: Update user token
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               token:
   *                 type: string
   *     responses:
   *       200:
   *         description: Token updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token:
   *                   type: string
   *       401:
   *         description: Unauthorized
   */
router.post("/update_token", async (req, res) => {
    const token = req.body["token"];
    const userId = req.user ? req.user.id : 0;
    try {
      const response = await db.updateToken(userId, token);
      res.send({
        "token": response,
      });
    } catch (error) {
      return res.status(401).json({"status": "error", "message": error});
    }
  });

  /**
   * @swagger
   * /follow:
   *   post:
   *     tags: [Profile Routes]
   *     summary: Follow a user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               userId:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Follow status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 result:
   *                   type: boolean
   *       401:
   *         description: Unauthorized
   */
router.post('/follow', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const profileId = req.body['userId'] ?? 0;
    const response = await db.followUser(req.user.id, profileId);
    if (response) {
        global.addNotification(req.user, profileId, {
            type: "follow",
        });
        res.send({
            "result": true,
        });
    } else {
        res.send({
            "result": false,
        });
    }
});

/**
   * @swagger
   * /unfollow:
   *   post:
   *     tags: [Profile Routes]
   *     summary: Unfollow a user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               userId:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Unfollow status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 result:
   *                   type: boolean
   *       401:
   *         description: Unauthorized
   */
router.post('/unfollow', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const profileId = req.body['userId'] ?? 0;
    const response = await db.unfollowUser(req.user.id, profileId);
    console.log(response);
    if (response) {
        res.send({
            "result": true,
        });
    } else {
        res.send({
            "result": false,
        });
    }
});

/**
   * @swagger
   * /followings:
   *   get:
   *     tags: [Profile Routes]
   *     summary: Get user followings
   *     parameters:
   *       - in: query
   *         name: userId
   *         schema:
   *           type: integer
   *           default: 0
   *         description: User ID
   *     responses:
   *       200:
   *         description: List of followings
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 users:
   *                   type: array
   *                   items:
   *                     type: object
   */
router.get('/followings', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const profileId = req.query['userId'] ?? 0;
    const users = await db.getFollowings(authUserId, profileId);
    res.send({
        "users": users,
    });
});

/**
   * @swagger
   * /notifications:
   *   get:
   *     tags: [Profile Routes]
   *     summary: Get user notifications
   *     parameters:
   *       - in: query
   *         name: from
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Pagination offset
   *     responses:
   *       200:
   *         description: List of notifications
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 notifications:
   *                   type: array
   *                   items:
   *                     type: object
   *       401:
   *         description: Unauthorized
   */
router.get('/notifications', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const authUserId = req.user ? req.user.id : 0;
    const from = req.query['from'] ?? 0;
    const notifications = await db.getNotifications(authUserId, from);
    res.send({
        "notifications": notifications,
    });
});

/**
   * @swagger
   * /followers:
   *   get:
   *     tags: [Profile Routes]
   *     summary: Get user followers
   *     parameters:
   *       - in: query
   *         name: userId
   *         schema:
   *           type: integer
   *           default: 0
   *         description: User ID
   *     responses:
   *       200:
   *         description: List of followers
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 users:
   *                   type: array
   *                   items:
   *                     type: object
   */
router.get('/followers', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const profileId = req.query['userId'] ?? 0;
    console.log(authUserId, profileId)
    const users = await db.getFollowers(authUserId, profileId);
    res.send({
        "users": users,
    });
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/images/')
    },
    filename: function (req, file, cb) {
        const uuid = uuidv4();
        const uniqueSuffix = uuid + path.extname(file.originalname);
        cb(null, uniqueSuffix)
    }
})
const imageUpload = multer({ storage: storage });

/**
   * @swagger
   * /update:
   *   post:
   *     tags: [Profile Routes]
   *     summary: Update user profile
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               picture:
   *                 type: string
   *                 format: binary
   *               coverPicture:
   *                 type: string
   *                 format: binary
   *               username:
   *                 type: string
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *       400:
   *         description: Invalid username
   *       401:
   *         description: Unauthorized
   */
router.post('/update', imageUpload.single('profilePic'), async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const userDetails = await db.getUserById(req.user.id);
    let profilePictureUrl;

    if (req.files) {
        if (req.files['picture']) {
            const profilePictureUpload = await upload_manager.upload({
                key: 'images',
                fileReference: req.files['picture'][0].path,
                contentType: mime.lookup(req.files['picture'][0].path),
                fileName: req.files['picture'][0].filename
            });
            profilePictureUrl = profilePictureUpload.Location;
            req.body['profilePicture'] = profilePictureUrl;
        }
    }
    if (req.body.username) {
        const checkUsername = await db.getUserByUsername(req.body.username);
        if (checkUsername) {
            res.status(400).send({
                "error": "username"
            });
            return;
        }
        if (/[ .-]/.test(req.body.username)) {
            res.status(400).send({
                "error": "username"
            });
            return;
        }
    }    

    const updateRes = await db.updateProfile(req.user.id, req.body);
    if (updateRes) {
        res.send(updateRes);
    } else {
        res.status(401).send({
            "error": "username"
        });
    }
});

/**
   * @swagger
   * /reportUser:
   *   post:
   *     tags: [Profile Routes]
   *     summary: Report a user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               uUserId:
   *                 type: integer
   *               rReportId:
   *                 type: integer
   *               reason:
   *                 type: string
   *     responses:
   *       200:
   *         description: Report status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 result:
   *                   type: boolean
   *       401:
   *         description: Unauthorized
   */
router.post('/reportUser', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const userId = req.user.id
    const uUserId = req.body['uUserId'] ?? "";
    const rReportId = req.body['rReportId'] ?? 0;
    const reason = req.body['reason'] ?? 0;
    console.log("User reported");
    const response = await db.ReportUser(rReportId, uUserId, userId, reason);
    console.log(response);
    res.send({
        "result": response,
    });
});

/**
   * @swagger
   * /delete:
   *   post:
   *     tags: [Profile Routes]
   *     summary: Delete user profile
   *     responses:
   *       200:
   *         description: Profile deleted
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 result:
   *                   type: boolean
   *       401:
   *         description: Unauthorized
   */
router.post('/delete', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const userId = req.user.id;
    const response = await db.deleteProfile(userId);
    console.log(response);
    res.send({
        "result": response,
    });
});

/**
   * @swagger
   * /blockUser:
   *   post:
   *     tags: [Profile Routes]
   *     summary: Block a user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               userId:
   *                 type: integer
   *               uUserId:
   *                 type: integer
   *               blockId:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Block status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 result:
   *                   type: boolean
   */
router.post('/blockUser', async (req, res) => {
    const userId = req.body['userId'] ?? null;
    const uUserId = req.body['uUserId'] ?? "";
    const blockId = req.body['blockId'] ?? 0;
    console.log(userId, blockId, uUserId);
    const response = await db.blockUser(blockId, uUserId, userId);
    console.log(response);
    res.send({
        "result": response,
    });
});

/**
   * @swagger
   * /unblockUser:
   *   post:
   *     tags: [Profile Routes]
   *     summary: Unblock a user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               userId:
   *                 type: integer
   *               uUserId:
   *                 type: integer
   *               blockId:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Unblock status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 result:
   *                   type: boolean
   */
router.post('/unblockUser', async (req, res) => {
    const userId = req.body['userId'] ?? null;
    const uUserId = req.body['uUserId'] ?? "";
    const blockId = req.body['blockId'] ?? 0;
    console.log(userId, blockId, uUserId);
    const response = await db.unblockUser(blockId, uUserId, userId);
    console.log(response);
    res.send({
        "result": response,
    });
});

/**
   * @swagger
   * /getInbox:
   *   get:
   *     tags: [Profile Routes]
   *     summary: Get user inbox messages
   *     parameters:
   *       - in: query
   *         name: from
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Pagination offset
   *     responses:
   *       200:
   *         description: Inbox messages
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 total:
   *                   type: integer
   *                 inbox:
   *                   type: array
   *                   items:
   *                     type: object
   *       401:
   *         description: Unauthorized
   */
router.get('/getInbox', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const from = req.query['from'] ?? 0;

    const inbox = await db.getInbox(req.user.id, from);
    res.send({
        message: "success",
        total: inbox ? inbox.length : 0,
        inbox,
    });
});

/**
   * @swagger
   * /getMessages:
   *   get:
   *     tags: [Profile Routes]
   *     summary: Get user messages
   *     parameters:
   *       - in: query
   *         name: from
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Pagination offset
   *       - in: query
   *         name: userId
   *         schema:
   *           type: integer
   *           default: 0
   *         description: User ID
   *     responses:
   *       200:
   *         description: List of messages
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                 total:
   *                   type: integer
   *                 messages:
   *                   type: array
   *                   items:
   *                     type: object
   *       401:
   *         description: Unauthorized
   */
router.get('/getMessages', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const from = req.query['from'] ?? 0;
    const userId = req.query['userId'] ?? 0;

    const messages = await db.getMessages(req.user.id, userId, from);
    res.send({
        message: "success",
        total: messages ? messages.length : 0,
        messages,
    });
});

function extractAudio(input, filename) {
    console.log(`Extracting audio from ${input} with filename ${filename}`);
    return new Promise((resolve, reject) => {
        ffmpeg(input)
            .audioCodec('libmp3lame')
            .save(`./uploads/sounds/${filename}`)
            .on('end', () => {
                console.log('Audio extraction completed');
                resolve(`sounds/${filename}`);
            })
            .on('error', (err) => {
                console.error(err);
                reject(err);
            });
    });
}

ffprobeStatic = require('ffprobe-static');

async function getVideoDimensions(input) {
    try {
        const metadata = await ffprobe(input, { path: ffprobeStatic.path });
        const { width, height } = metadata.streams[0];
        return { width, height };
    } catch (err) {
        console.error(err);
        throw new Error('Failed to get video dimensions');
    }
}

function generateThumbnail(input, filename) {
    console.log(`Generating thumbnail for ${input} with filename ${filename}`);
    return new Promise((resolve, reject) => {
        ffmpeg(input).screenshots({
            count: 1,
            filename: filename,
            folder: './uploads/thumbnails',
        }).on('end', () => {
            console.log('Thumbnail generation completed');
            resolve(`thumbnails/${filename}`);
        }).on('error', (err) => {
            console.error(err);
            reject(err);
        });
    });
}

// const ffprobe = require('ffprobe'),

async function generateBlurredThumbnail(input) {
    try {
        console.log(`Generating blurred thumbnail for ${input}`);
        const fullPath = path.resolve(input);
        console.log("Full Path", fullPath, "Input", input);

        if (!fs.existsSync(fullPath)) {
            throw new Error(`Input file is missing: ${fullPath}`);
        }
        const output = fullPath.replace(/\.[^/.]+$/, "") + "_blurred.jpg";
        console.log("This is the output", output);
        await sharp(fullPath)
            .blur(30) 
            .toFile(output); 
        console.log('BLurred Thumbnail generation completed');
        return `thumbnails/${path.basename(output)}`;
    } catch (error) {
        console.error("There is an error", error);
    }
}


const { exec } = require('child_process');
const upload_manager = require('../config/upload_manager');
const { type } = require('os');
const { threadId } = require('worker_threads');

async function generateGif(input, filename) {
    const outputPath = `gifs/${filename}`;
    const output = `uploads/gifs/${filename}`;

    return new Promise((resolve, reject) => {
        exec(`ffmpeg -i ${input} -vf format=rgb8,format=rgb24,scale=-1:250,fps=10 -t 3 ${output}`, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            }
            resolve(outputPath);
        });
    });
}

module.exports = router