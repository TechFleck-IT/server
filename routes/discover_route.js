const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const config = require("../config/config");
const db = require('../config/db_handler');
const mime = require('mime-types');
const upload_manager = require('../config/upload_manager');
const cron = require('node-cron');
  router.use(express.static(__dirname + '/public'));
  router.use('/uploads', express.static('uploads'));
  
/**
 * @swagger
 * tags:
 *   name: Discover Routes
 *   description: Discover Routes APIs
 * /top_users:
 *   get:
 *     summary: Get top users
 *     tags: [Discover Routes]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           default: ""
 *         description: Search query
 *     responses:
 *       200:
 *         description: A list of top users
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
router.get('/top_users', async (req, res) => {
  const authUserId = req.user ? req.user.id : 0;
  const from = req.query['from'] ?? 0;
  const searchQuery = req.query['search'] ?? "";
  const users = await db.searchUsers(authUserId, searchQuery, from, 10);
  res.send({
      "users": users,
  });
});

/**
 * @swagger
 * tags:
 *   name: Discover Routes
 *   description: Discover Routes APIs
 * /top:
 *   get:
 *     summary: Get top users, videos, and sounds
 *     tags: [Discover Routes]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           default: ""
 *         description: Search query
 *     responses:
 *       200:
 *         description: A list of top users, videos, and sounds
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                 videos:
 *                   type: array
 *                   items:
 *                     type: object
 *                 sounds:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/top', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const from = req.query['from'] ?? 0;
    const searchQuery = req.query['search'] ?? "";
    const users = await db.searchUsers(authUserId, searchQuery, from, 5);
    const videos = await db.getDiscoverVideos(authUserId, searchQuery, from, 5);
    const sounds = await db.getDiscoverSounds(authUserId, searchQuery, from, 5);
    res.send({
        "users": users,
        "videos": videos,
        "sounds": sounds,
    });
});

/**
 * @swagger
 * tags:
 *   name: Discover Routes
 *   description: Discover Routes APIs
 * /video:
 *   get:
 *     summary: Get video by ID
 *     tags: [Discover Routes]
 *     parameters:
 *       - in: query
 *         name: videoId
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *       400:
 *         description: Video not found
 */
router.get('/video', async (req, res) => {
  const authUserId = req.user ? req.user.id : 0;
  const videoId = req.query['videoId'] ?? 0;
  const videos = await db.getVideoById(authUserId, videoId);
  if(videos){
    res.send(videos);
  }
  else{
    res.status(400).send({message: "Video not found"});
  }
});

/**
 * @swagger
 * tags:
 *   name: Discover Routes
 *   description: Discover Routes APIs
 * /sounds:
 *   get:
 *     summary: Get sounds
 *     tags: [Discover Routes]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           default: ""
 *         description: Search query
 *       - in: query
 *         name: isFavorite
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Filter by favorite sounds
 *     responses:
 *       200:
 *         description: A list of sounds
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 sounds:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/sounds', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const from = req.query['from'] ?? 0;
    const searchQuery = req.query['search'] ?? "";
    const isFavourite = req.query['isFavorite'] ?? false;
    let sounds;
    if(isFavourite == "true") {
       sounds = await db.getFavSounds(authUserId);
    }
    else{
      console.log(searchQuery)
       sounds = await db.getDiscoverSounds(authUserId, searchQuery, from);
    }
    res.send({
        "sounds": sounds,
    });
});

/**
 * @swagger
 * tags:
 *   name: Discover Routes
 *   description: Discover Routes APIs
 * /videos:
 *   get:
 *     summary: Get videos with filters
 *     tags: [Discover Routes]
 *     parameters:
 *       - in: query
 *         name: uUserId
 *         schema:
 *           type: string
 *           default: ""
 *         description: User ID for filtering
 *       - in: query
 *         name: from
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           default: ""
 *         description: Search query
 *       - in: query
 *         name: filter
 *         schema:
 *           type: string
 *           default: "foryou"
 *         description: Filter type (foryou, featured, following, exclusive)
 *     responses:
 *       200:
 *         description: A list of videos
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
    const authUserId = req.user ? req.user.id : -1;
    const uUserId = req.query['uUserId'] ?? "";
    const from = req.query['from'] ?? 0;
    const searchQuery = req.query['search'] ?? "";
    const filter = req.query['filter'] ?? "foryou";
    console.log("from", from, filter, authUserId);

    var videos;
    if (filter == "featured") {
        videos = await db.discoverFeatured(authUserId, uUserId, from);
    } else if (filter == "following") {
        videos = await db.discoverFollowing(authUserId, uUserId, from);
    } else if (filter == "exclusive") {
        videos = await db.discoverExclusive(authUserId, uUserId, from);
    } else {
        videos = await db.getDiscoverVideos(authUserId, "", from);
    }
    if(searchQuery){
      videos = await db.getDiscoverVideos(authUserId, searchQuery, from);
    }
    res.send({
        "videos": videos,
    });
});

/**
 * @swagger
 * tags:
 *   name: Discover Routes
 *   description: Discover Routes APIs
 * /people:
 *   get:
 *     summary: Search people
 *     tags: [Discover Routes]
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination offset
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           default: ""
 *         description: Search query
 *     responses:
 *       200:
 *         description: A list of people
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
router.get('/people', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const from = req.query['from'] ?? 0;
    const query = req.query['search'] ?? 0;
    const users = await db.searchUsers(authUserId, query, from);
    res.send({
        "users": users,
    });
});

/**
 * @swagger
 * tags:
 *   name: Discover Routes
 *   description: Discover Routes APIs
 * /tags:
 *   get:
 *     summary: Get tags
 *     tags: [Discover Routes]
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
 *     responses:
 *       200:
 *         description: A list of tags and banners
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 banners:
 *                   type: array
 *                   items:
 *                     type: object
 *                 tags:
 *                   type: array
 *                   items:
 *                     type: object
 */
router.get('/tags', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const userId = req.query['userId'] ?? 0;
    const from = req.query['from'] ?? 0;
    const banners = await db.getExploreBanners();
    const hashtagsVideos = await db.getExploreTags(authUserId, from);
    res.send({
        "banners": banners,
        "tags": hashtagsVideos,
    });
});

/**
 * @swagger
 * tags:
 *   name: Discover Routes
 *   description: Discover Routes APIs
 * /tag:
 *   get:
 *     summary: Get tag details
 *     tags: [Discover Routes]
 *     parameters:
 *       - in: query
 *         name: tagId
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Tag ID
 *       - in: query
 *         name: tagName
 *         schema:
 *           type: string
 *           default: ""
 *         description: Tag name
 *     responses:
 *       200:
 *         description: Tag details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/tag', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const tagId = req.query['tagId'] ?? 0;
    const tagName = req.query['tagName'] ?? "";   
    const results = await db.getTagDetails(authUserId, tagId, tagName);
    res.send(results);
});

router.get("/search", async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const searchValue = req.query['value'] ?? "";
    const from = req.query['from'] ?? 0;
    const limit = req.query['limit'] ?? 10;
    const searchKey = req.query['key'] ?? "TOP";


    await db.addToSearchHistory(req.user.id, searchValue)

    if (searchKey === "TOP"){
        const users = await db.searchInUser(searchValue, from, limit);
        const videos = await db.searchInVideo(searchValue, from, limit)
       return res.send({users, videos})
    }
    if (searchKey === "VIDEO"){
        const videos = await db.searchInVideo(searchValue, from, limit)
        return res.send({videos})
    }
    if (searchKey === "USER"){
        const users = await db.searchInUser(searchValue, from, limit);
        return  res.send({users})
    }
    if (searchKey === "RESTAURANT"){
        const users = await db.searchInUserWithType(searchValue,"BUSINESS", from, limit);
        return  res.send({users})
    }
    if (searchKey === "CHEF"){
        const users = await db.searchInUserWithType(searchValue,"CHEF", from, limit);
        return res.send({users})
    }

    return res.send({})

})

router.get("/search-history", async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }

   let history = await db.getSearchHistory(req.user.id);
    return res.send({history})

})


module.exports = router