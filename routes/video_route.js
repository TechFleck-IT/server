const express = require('express');
const router = express.Router();
const db = require('../config/db_handler');
const adminFirebase = require("firebase-admin");
/**
 * @swagger
 * tags:
 *   name: Video Routes
 *   description: API routes related to videos
 */


/**
   * @swagger
   * /viewed:
   *   post:
   *     tags: [Video Routes]
   *     summary: Mark a video as viewed
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               video_id:
   *                 type: integer
   *               user_id:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Video marked as viewed
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
router.post('/viewed', async (req, res) => {
    let own;
    const userId = req.user ? req.user.id : 0;
    const videoId = req.body['video_id'] ?? 0;
    const adUserId = req.body['user_id'] ?? 0;

    if(userId === adUserId){
        own = true;
    }
    else{
        own = false;
    }
    const response = await db.markVideoViewed(userId, videoId, own);
    res.send({
        "result": response,
    });

});

/**
   * @swagger
   * /deleteVideo:
   *   post:
   *     tags: [Video Routes]
   *     summary: Delete a video
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               video_id:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Video deleted
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
router.post('/deleteVideo', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const videoId = req.body['video_id'] ?? 0;

    const response = await db.deleteVideo(req.user.id, videoId);
    res.send({
        "result": response,
    });
});

/**
   * @swagger
   * /like:
   *   post:
   *     tags: [Video Routes]
   *     summary: Toggle like status of a video
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               video_id:
   *                 type: integer
   *               value:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Like status toggled
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
router.post('/like', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    // const token = req.body["token"];
    const token = '';
    const videoId = req.body['video_id'] ?? 0;
    const value = req.body['value'] ?? false;
    const response = await db.toggleVideoLike(req.user.id, videoId, value);
    if (response) {
        if (value) {
            const videoData = await db.getVideoOnlyById(videoId);
            if (videoData) {
                global.addNotification(req.user, videoData.user.id, {
                    type: "liked",
                },
                videoId);
            }
        }
    }
    res.send({
        "result": response,
    });
});

/**
   * @swagger
   * /getReports:
   *   get:
   *     tags: [Video Routes]
   *     summary: Get reports
   *     responses:
   *       200:
   *         description: List of reports
   *         content:
   *           application/json:
   *             schema:
   *               type: array
   *               items:
   *                 type: object
   *       401:
   *         description: Unauthorized
   */
router.get('/getReports', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const reports = await db.getReports(authUserId);
    res.send(reports);
});

/**
   * @swagger
   * /reportVideo:
   *   post:
   *     tags: [Video Routes]
   *     summary: Report a video
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
   *                 type: string
   *               videoId:
   *                 type: integer
   *               reason:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Video reported
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
router.post('/reportVideo', async (req, res) => {
    const userId = req.body['userId'] ?? null;
    const uUserId = req.body['uUserId'] ?? "";
    const videoId = req.body['videoId'] ?? 0;
    const reason = req.body['reason'] ?? 0;
    console.log(userId, videoId, uUserId, reason);
    const response = await db.reportVideo(videoId,uUserId, userId, reason);
    console.log(response);
    res.send({
        "result": response,
    });
});

/**
   * @swagger
   * /notInterested:
   *   post:
   *     tags: [Video Routes]
   *     summary: Mark a video as not interested
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
   *               videoId:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Video marked as not interested
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
router.post('/notInterested', async (req, res) => {
    const userId = req.body['userId'] ?? null;
    const uUserId = req.body['uUserId'] ?? null;
    const videoId = req.body['videoId'] ?? 0;
    console.log(userId, videoId, uUserId, "notInterested API");
    const response = await db.notInterested(videoId, uUserId, userId);
    res.send({
        "result": response,
    });
});

/**
   * @swagger
   * /likeComment:
   *   post:
   *     tags: [Video Routes]
   *     summary: Toggle like status of a comment
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               comment_id:
   *                 type: integer
   *               value:
   *                 type: boolean
   *     responses:
   *       200:
   *         description: Like status toggled
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
router.post('/likeComment', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const commentId = req.body['comment_id'] ?? 0;
    const value = req.body['value'] ?? false;
    const response = await db.toggleCommentLike(req.user.id, commentId, value);
    if (response) {
        if (value) {
            const videoData = await db.getCommentOnlyById(commentId);
            if (videoData) {
                global.addNotification(req.user, videoData.user_id, {
                    type: "comment_liked",
                },
                videoData.video_id,
                commentId,
                );
            }
        }
    }
    res.send({
        "result": response,
    });
});

/**
   * @swagger
   * /comments:
   *   get:
   *     tags: [Video Routes]
   *     summary: Get comments
   *     parameters:
   *       - in: query
   *         name: from
   *         schema:
   *           type: integer
   *           default: 0
   *         description: Pagination offset
   *       - in: query
   *         name: videoId
   *         schema:
   *           type: integer
   *         description: ID of the video
   *       - in: query
   *         name: commentId
   *         schema:
   *           type: integer
   *         description: ID of the comment
   *     responses:
   *       200:
   *         description: List of comments
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 comments:
   *                   type: array
   *                   items:
   *                     type: object
   *       401:
   *         description: Unauthorized
   */
router.get('/comments', async (req, res) => {
    const authUserId = req.user ? req.user.id : 0;
    const from = req.query['from'] ?? 0;
    const videoId = req.query['videoId'] ?? false;
    const commentId = req.query['commentId'] ?? false;
    var comments;
    if (videoId) {
        comments = await db.getComments(authUserId, videoId, from);
    } else if (commentId) { 
        comments = await db.getReplies(authUserId, commentId, from);
    } else {
        comments = [];
    }
    res.send({
        "comments": comments,
    });
});

/**
   * @swagger
   * /comment:
   *   post:
   *     tags: [Video Routes]
   *     summary: Add a comment
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               video_id:
   *                 type: integer
   *               comment_id:
   *                 type: integer
   *               comment:
   *                 type: string
   *     responses:
   *       200:
   *         description: Comment added
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: integer
   *       401:
   *         description: Unauthorized
   *       400:
   *         description: Invalid request
   */
router.post('/comment', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const videoId = req.body['video_id'] ?? 0;
    const commentId = req.body['comment_id'] ?? 0;
    const comment = req.body['comment'] ?? '';
    const response = await db.addComment(req.user.id, videoId, comment, commentId);
    if (response) {
        console.log(response)
        if (commentId == 0) {
            const videoData = await db.getVideoOnlyById(videoId);
            if (videoData) {
                global.addNotification(req.user, videoData.user.id, {
                    type: "comment",
                }, 
                    videoId,
                    response.id,
                );
            }
        } else {
            const videoData = await db.getCommentOnlyById(commentId);
            if (videoData) {
                console.log("Comment data", videoData);
                global.addNotification(req.user, videoData.user_id, {
                    type: "comment_replied",
                }, {
                    commentId: commentId,
                });
            }
        }
        res.send({
            "id": response.id,
        });
    } else {
        res.status(400).send({
            error: "invalid"
        });
    }
});

/**
   * @swagger
   * /deleteComment:
   *   post:
   *     tags: [Video Routes]
   *     summary: Delete a comment
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               commentId:
   *                 type: integer
   *               videoId:
   *                 type: integer
   *               parentId:
   *                 type: integer
   *     responses:
   *       200:
   *         description: Comment deleted
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
router.post('/deleteComment', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    const commentId = req.body['commentId'] ?? 0;
    const videoId = req.body['videoId'] ?? 0;
    const parentId = req.body['parentId'] ?? 0;
    const response = await db.deleteVideoComment(commentId, parentId, videoId);
    res.send({
        "result": response,
    });
});

router.post('/bookmark', async (req, res) => {
    if (!req.user) {
        res.status(401).send({
            error: "unauthorized"
        });
        return;
    }
    // const token = req.body["token"];
    const token = '';
    const videoId = req.body['video_id'] ?? 0;
    const value = req.body['value'] ?? false;
    const response = await db.bookmark(req.user.id, videoId, value);
    res.send({
        "result": response,
    });
});


module.exports = router