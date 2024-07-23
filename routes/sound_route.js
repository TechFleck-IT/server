const express = require('express');
const router = express.Router();
const db = require('../config/db_handler');

/**
 * @swagger
 * tags:
 *   name: Sound Routes
 *   description: API routes related to sounds
 */

/**
   * @swagger
   * /:
   *   get:
   *     tags: [Sound Routes]
   *     summary: Get sound details
   *     parameters:
   *       - in: query
   *         name: soundId
   *         schema:
   *           type: integer
   *           default: 0
   *         description: ID of the sound
   *     responses:
   *       200:
   *         description: Sound details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 sound:
   *                   type: object
   *       401:
   *         description: Unauthorized
   */
router.get('', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const soundId = req.query['soundId'] ?? 0;
    const sound = await db.getSound(authUserId, soundId);
    res.send({sound: sound});
});

/**
   * @swagger
   * /videos:
   *   get:
   *     tags: [Sound Routes]
   *     summary: Get videos associated with a sound
   *     parameters:
   *       - in: query
   *         name: soundId
   *         schema:
   *           type: integer
   *           default: 0
   *         description: ID of the sound
   *       - in: query
   *         name: from
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Pagination offset
   *     responses:
   *       200:
   *         description: List of videos
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 videos:
   *                   type: array
   *                   items:
   *                     type: object
   *       401:
   *         description: Unauthorized
   */
router.get('/videos', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const soundId = req.query['soundId'] ?? 0;
    const from = req.query['from'] ?? 0;
    const videos = await db.getSoundVideos(null, authUserId, soundId, from);
    res.send({videos: videos});
});

/**
   * @swagger
   * /favorite:
   *   post:
   *     tags: [Sound Routes]
   *     summary: Toggle favorite status of a sound
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               soundId:
   *                 type: integer
   *               value:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Favorite status toggled
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
router.post('/favorite', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const authUserId = req.user ? req.user.id : 0;
    const soundId = req.body['soundId'] ?? 0;
    const value = req.body['value'] ?? 0;
    const response = await db.toggleFavSound(authUserId, soundId, value);
    res.send({
        "result": response,
    });
});

module.exports = router