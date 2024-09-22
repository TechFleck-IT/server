const mysql = require('mysql2');
const crypto = require('crypto');
const constants = require('./constants');
const config = require('./config');
const { truncate } = require('fs/promises');
const {randomBytes, scrypt} = require("crypto");
const {promisify} = require("util");
const AppError = require("../utils/appError");
const scryptAsync = promisify(scrypt)

function getTime() {
    return Math.floor(new Date().getTime() / 1000)
}

class DbHandler {
    constructor(host_, user_, password_, database_, port_ = 3306) {
        this.pool = mysql.createPool({
            connectionLimit: 5,
            host: host_,
            user: user_,
            password: password_,
            database: database_,
            port: port_,
            charset: 'utf8mb4'
        }, (err) => {
            if (err) {
                console.error("Unexpected error while establishing connection with database");
            }
        });
        this.pool.on('connection', function (connection) {
            console.log("New connection called on MySQL Pool");
        });
        this.pool.on('error', function (err) {
            console.error("Connection with MySQL server lost.");
        });
        if (!DbHandler.instance) {
            console.log("Instantiating new database");
            DbHandler.instance = this;
        }
        return DbHandler.instance;
    }

    getConfigs() {
        return new Promise(function (resolve, reject) {
            var query = "SELECT * FROM config";
            query = mysql.format(query);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) reject(err);
                    var configs = [];
                    for (let i = 0; i < results.length; i++) {
                        configs[results[i]['name']] = results[i]['value'];
                    }
                    resolve(configs);
                });
            });
        }.bind(this));
    }

    getUserByUsername(username) {
        return new Promise(
          function (resolve, reject) {
            var query = "SELECT * FROM users WHERE username = ?";
            var params = [username];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
              connection.query(query, function (err, results, fields) {
                connection.release();
                
                if (err) {
                  console.log("[Error]", err);
                  resolve(null);
                  return;
                }
                if (results && results.length > 0) {
                  var user = results[0];
                  resolve(user);
                } else {
                  resolve(null);
                }
              });
            });
          }.bind(this)
        );
    }

    toggleLike(userId, postId, value) {
        return new Promise(async (resolve, reject) => {
            if (value) {
                var query = "INSERT IGNORE INTO post_likes (user_id, post_id) VALUES (?, ?)";
                var params = [userId, postId];
                query = mysql.format(query, params);
                this.pool.getConnection(function (err, connection) {
                    connection.query(query, async function (err, results, fields) {
                        if (err) {
                            console.error(err);
                            resolve(false);
                        } else {
                            try {
                                await connection.execute("UPDATE posts SET likes = likes + 1 WHERE id = ?", [postId]);
                                resolve(true);
                            } catch (err) {
                                console.error(err);
                                resolve(false);
                            }
                        }
                        connection.release();
                    }.bind(this));
                }.bind(this));
            } else {
                var query = "DELETE FROM post_likes WHERE user_id = ? AND post_id = ?";
                var params = [userId, postId];
                query = mysql.format(query, params);
                this.pool.getConnection(function (err, connection) {
                    connection.query(query, async function (err, results, fields) {
                        if (err) {
                            console.error(err);
                            resolve(false);
                        } else {
                            try {
                                await connection.execute("UPDATE posts SET likes = GREATEST(likes - 1, 0) WHERE id = ?", [postId]);
                                resolve(true);
                            } catch (err) {
                                console.error(err);
                                resolve(false);
                            }
                        }
                        connection.release();
                    }.bind(this));
                }.bind(this));
            }
        });
    }

    addSound(authUserId, soundUrl, soundPath, albumPhotoUrl, duration, artist) {
        return new Promise(async resolve => {
            const promisePool = this.pool.promise();
            var params = [authUserId, `Original Sound - ${artist}`, soundUrl, soundPath, albumPhotoUrl, duration, artist];
            const [rows, fields] = await promisePool.query("INSERT INTO sounds (user_id, title, soundUrl, soundPath, albumPhotoUrl, duration, artist) VALUES (?, ?, ?, ?, ?, ?, ?)", params);
            if (rows.insertId) {
                const soundId = rows.insertId;
                resolve({
                    "soundId": soundId,
                    "icon": albumPhotoUrl,
                    "soundUrl": soundUrl,
                });
            } else {
                resolve(null);
            }
        });
    }

    toggleFavSound(authUserId, soundId, value) {
        return new Promise(function (resolve, reject) {
            if (value) {
                var query = "INSERT IGNORE INTO sound_favorites (sound_id, user_id) VALUES (?, ?)";
                var params = [soundId, authUserId];
            } else {
                var query = "DELETE FROM sound_favorites WHERE sound_id = ? AND user_id = ?";
                var params = [soundId, authUserId];
            }
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            });
        }.bind(this));
    }

    uploadVideo(authUserId, videoPath, thumbnailUrl, gifUrl, videoReference, caption, soundId, allowComments, allowSharing, isPrivate, allowDuet, allowGifts, exclusiveAmount, duration, height, width, description, type, location) {
        return new Promise(async resolve => {
            const promisePool = this.pool.promise();
            // const connection = await promisePool.getConnection();
            const hashtags = caption.match(/#[\w\u0590-\u05ff]+/g) || [];
            const tags = (caption.match(/#\w+/g) || []).map(tag => tag.slice(1));
            const cleanTags = hashtags.join(', ');
            const cleanTitle = caption.replace(/#[\w\u0590-\u05ff]+/g, '').trim();
            var params = [authUserId, cleanTitle, cleanTags, videoPath, thumbnailUrl, gifUrl, videoReference, getTime(), soundId, allowComments, allowSharing, allowDuet, isPrivate, allowGifts, exclusiveAmount > 0, exclusiveAmount, height, width, description, type, location];
            const [rows, fields] = await promisePool.query("INSERT INTO videos (user_id, title, tags, videoUrl, thumbnailUrl, videoGifUrl, videoGifPath, videoTime, soundId, allowComments, allowSharing, allowDuet, isPrivate, receiveGifts, isExclusive, exclusiveAmount, height, width, description, video_type_id, city_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);", params);
            if (rows.insertId) {
                const videoId = rows.insertId;
                for (const tag of tags) {
                    const [result] = await promisePool.query(
                        "INSERT INTO tags (tag, totalVideos, priority) VALUES (?, 1, 1) ON DUPLICATE KEY UPDATE totalVideos = totalVideos + 1, priority = priority + 1",
                        [tag]
                    );
                    const tagId = result.insertId;

                    if (tagId !== 0) {
                        const [rows] = await promisePool.query(
                            "SELECT * FROM video_tags WHERE video_id = ? AND tag_id = ?",
                            [videoId, tagId]
                        );

                        if (rows.length === 0) {
                            await promisePool.query(
                                "INSERT INTO video_tags (video_id, tag_id) VALUES (?, ?)",
                                [videoId, tagId]
                            );
                        }
                    }
                }
                if (soundId !== 0) {
                    await promisePool.query("UPDATE sounds SET videos = videos + 1 WHERE id = ?", [soundId]);
                }
                await promisePool.query("UPDATE users SET totalVideos = totalVideos + 1 WHERE id = ?", [authUserId]);
                const videoResponse = await this.getVideoById(authUserId, videoId);
                resolve(videoResponse);
            } else {
                resolve(null);
            }
            // connection.release();
        });
    }

    getCommentOnlyById(commentId) {
        return new Promise(async resolve => {
            const promisePool = this.pool.promise();
            const [rows, fields] = await promisePool.query("SELECT * FROM comments WHERE id = ?", [commentId]);
            if (rows.length > 0) {
                resolve(rows[0]);
            } else {
                resolve(null);
            }
        });
    }

    getVideoOnlyById(videoId) {
        return new Promise(async resolve => {
            const promisePool = this.pool.promise();
            const [rows, fields] = await promisePool.query("SELECT * FROM videos WHERE id = ?", [videoId]);
            if (rows.length > 0) {
                resolve(this.parseVideoObject(rows[0]));
            } else {
                resolve(null);
            }
        });
    }

    getVideoById(authUserId, videoId) {
        return new Promise(async resolve => {
            const promisePool = this.pool.promise();
            // const connection = await promisePool.getConnection();
            var params = [authUserId, authUserId, authUserId, videoId];
            const [rows, fields] = await promisePool.query("SELECT s.title as 'sound_title',(? = v.user_id) as viewer_own, v.*, u.name, u.profilePicture, u.username, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId WHERE v.id = ?", params);
            if (rows.length > 0) {
                resolve(this.parseVideoObject(rows[0]));
            } else {
                resolve(null);
            }
            // connection.release();
        });
    }

    getVideoCountsById(userId, videoId) {
        return new Promise(async resolve => {
            const promisePool = this.pool.promise();
            // const connection = await promisePool.getConnection();
            var params = [userId, videoId];
            const [rows, fields] = await promisePool.query("SELECT v.*, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked FROM videos v WHERE v.id = ?", params);
            if (rows.length > 0) {
                resolve({
                    likes: rows[0].likes,
                    comments: rows[0].comments,
                    views: rows[0].views,
                    gifts: rows[0].rewards,
                    viewer_liked: Boolean(rows[0].viewer_liked)
                });
            } else {
                resolve(null);
            }
            // connection.release();
        });
    }

    deleteVideoComment(commentId, parentId, videoId) {
        return new Promise(
          function (resolve, reject) {
            console.log(commentId, parentId, videoId)
            var query = "DELETE FROM comments WHERE id = ?";
            var params = [commentId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
              connection.query(query, async function (err, results, fields) {
                if (err) {
                  resolve(false);
                } else {
                  if (parentId != 0) {
                    await connection.execute(
                      "DELETE FROM comments WHERE  parentId = ? AND id = ?",
                      [parentId, commentId]
                    );
                    await connection.execute(
                      "UPDATE comments SET replies = replies - 1 WHERE id = ?",
                      [parentId]
                    );
                    await connection.execute(
                      "UPDATE videos SET comments = comments - 1 WHERE id = ?",
                      [videoId]
                    );
                  } else {
                    await connection.execute("DELETE FROM comments WHERE id = ?", [
                      commentId,
                    ]);
                    await connection.execute(
                      "UPDATE videos SET comments = comments - 1 WHERE id = ?",
                      [videoId]
                    );
                  }
                  resolve(true);
                }
                connection.release();
              });
            });
          }.bind(this)
        );
      }

    toggleCommentLike(userId, commentId, value) {
        return new Promise(function (resolve, reject) {
            if (value) {
                var query = "INSERT IGNORE INTO comment_likes (comment_id, user_id) VALUES (?, ?)";
                var params = [commentId, userId];
            } else {
                var query = "DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?";
                var params = [userId, commentId];
            }
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        resolve(false);
                    } else {

                        resolve(true);
                    }
                });
            });
        }.bind(this));
    }

    toggleVideoLike(userId, videoId, value) {
        return new Promise(function (resolve, reject) {
            if (value) {
                var query = "INSERT IGNORE INTO likes (video_id, user_id) VALUES (?, ?)";
                var params = [videoId, userId];
            } else {
                var query = "DELETE FROM likes WHERE user_id = ? AND video_id = ?";
                var params = [userId, videoId];
            }
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.log(err);
                        resolve(false);
                    } else {
                        // Video
                        if (results.affectedRows > 0) {
                            if (results.insertId == 0) {
                                await connection.execute("UPDATE videos SET likes = GREATEST(likes - 1, 0) WHERE id = ?", [videoId]);
                                resolve(true);
                            } else {
                                await connection.execute("UPDATE videos SET likes = likes + 1 WHERE id = ?", [videoId]);
                                resolve(true);
                            }
                        }
                    }
                    connection.release();
                });
            });
        }.bind(this));
    }

    bookmark(userId, videoId, value) {
        return new Promise(function (resolve, reject) {
            if (value) {
                var query = "INSERT IGNORE INTO bookmark (video_id, user_id) VALUES (?, ?)";
                var params = [videoId, userId];
            } else {
                var query = "DELETE FROM bookmark WHERE user_id = ? AND video_id = ?";
                var params = [userId, videoId];
            }
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.log(err);
                        resolve(false);
                    } else {
                        resolve(true)
                    }
                    connection.release();
                });
            });
        }.bind(this));
    }

    markVideoViewed(userId, videoId, own) {
        return new Promise(async (resolve) => {
            const promisePool = this.pool.promise();
            const [row, field] = await promisePool.query("SELECT video_id FROM ad_viewed WHERE user_id = ? AND video_id = ?", [userId, videoId]);
            const adVideoId = row.length ? row[0].video_id : 0;
            if (adVideoId) {
                console.log("Video seen already.");
            } else {
                if (!own) {
                    await promisePool.query("INSERT IGNORE INTO ad_viewed (user_id, video_id) VALUES (?, ?)", [userId, videoId]);
                    await promisePool.query("UPDATE videos SET views = views + 1 WHERE id = ?", [videoId]);
                }
                else {
                    console.log("User's own video.");
                }
            }
            resolve(true);
        });
    }

    deleteVideo(userId, videoId) {
        return new Promise(async resolve => {
            const promisePool = this.pool.promise();
            // const connection = await promisePool.getConnection();
            const [rows, fields] = await promisePool.query("DELETE FROM videos WHERE id = ? AND user_id = ?", [videoId, userId]);
            if (rows.affectedRows > 0) {
                await promisePool.query("UPDATE users SET totalVideos = GREATEST(totalVideos - 1, 0) WHERE id = ?", [userId]);
            }
            // connection.release();
            resolve(rows.affectedRows > 0);
        });
    }

    toggleVideoBookmark(userId, videoId, value) {
        return new Promise(function (resolve, reject) {
            if (value) {
                var query = "INSERT IGNORE INTO bookmark (video_id, user_id) VALUES (?, ?)";
                var params = [videoId, userId];
            } else {
                var query = "DELETE FROM bookmark WHERE user_id = ? AND video_id = ?";
                var params = [userId, videoId];
            }
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    console.log(err);
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            });
        }.bind(this));
    }

    followUser(userId, profileId) {
        return new Promise(function (resolve, reject) {
            var query = "INSERT IGNORE INTO followers (follower, following) VALUES (?, ?);";
            var params = [userId, profileId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    console.log(err);
                    if (err) {
                        resolve(false);
                    } else {
                        if (results.insertId > 0) {
                            await connection.execute("UPDATE users SET totalFollowers = totalFollowers + 1 WHERE id = ?", [profileId]);
                            await connection.execute("UPDATE users SET totalFollowings = totalFollowings + 1 WHERE id = ?", [userId]);
                        }
                        resolve(true);
                    }
                    connection.release();
                });
            });
        }.bind(this));
    }

    reportVideo(videoId, uUserId, userId, reason) {
        return new Promise(function (resolve, reject) {
            var query = "INSERT IGNORE INTO reports (video_id, user_id, unique_id, report_reason) VALUES (?, ?, ?, ?);";
            var params = [videoId, userId, uUserId, reason];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    console.log(err);
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                    connection.release();
                });
            });
        }.bind(this));
    }

    ReportUser(rReportId, uUserId, userId, reason) {
        return new Promise(function (resolve, reject) {
            var query = "INSERT IGNORE INTO report_users (report_user_id, user_id, unique_id, report_reason) VALUES (?, ?, ?, ?);";
            var params = [rReportId, userId, uUserId, reason];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    console.log("Err:" + err);
                    console.log("Results:" + results);
                    console.log(rReportId, userId, uUserId, reason);
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                    connection.release();
                });
            });
        }.bind(this));
    }

    notInterested(videoId, uUserId, userId) {
        console.log(videoId, uUserId, userId, "In db handler")
        return new Promise(function (resolve, reject) {
            var query = "INSERT IGNORE INTO not_interested (video_id, user_id, unique_id) VALUES (?, ?, ?);";
            var params = [videoId, userId, uUserId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    console.log(err);
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                    connection.release();
                });
            });
        }.bind(this));
    }

    blockUser(blockId, uUserId, userId) {
        return new Promise(function (resolve, reject) {
            var query = "INSERT IGNORE INTO blocked_users (blocked_by, blocked_id, unique_id) VALUES (?, ?, ?);";
            var params = [userId, blockId, uUserId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    console.log(err);
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                    connection.release();
                });
            });
        }.bind(this));
    }

    unblockUser(blockId, uUserId, userId) {
        return new Promise(function (resolve, reject) {
            var query = "DELETE FROM blocked_users WHERE blocked_by = ? OR blocked_id = ? AND unique_id = ?;";
            var params = [userId, blockId, uUserId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    console.log(err);
                    if (err) {
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                    connection.release();
                });
            });
        }.bind(this));
    }

    unfollowUser(userId, profileId) {
        return new Promise(function (resolve, reject) {
            var query = "DELETE FROM followers WHERE follower = ? AND following = ?";
            var params = [userId, profileId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        resolve(false);
                    } else {
                        if (results.affectedRows > 0) {
                            await connection.execute("UPDATE users SET totalFollowers = GREATEST(totalFollowers - 1, 0) WHERE id = ?", [profileId]);
                            await connection.execute("UPDATE users SET totalFollowings = GREATEST(totalFollowings - 1, 0) WHERE id = ?", [userId]);
                        }
                        this.deleteNotification(userId, 'follow', profileId);
                        resolve(true);
                    }
                    connection.release();
                }.bind(this));
            }.bind(this));
        }.bind(this));
    }

    getUserById(id) {
        return new Promise(function (resolve, reject) {
            var query = "SELECT * FROM users WHERE id = ?";
            var params = [id];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("[Error]", err);
                        resolve(null);
                        return;
                    }
                    if (results && results.length > 0) {
                        var user = results[0];
                        user['instagram'] = user['instagram'] ?? "";
                        user['facebook'] = user['facebook'] ?? "";
                        user['twitter'] = user['twitter'] ?? "";
                        user["password"] = user['password'] ?? "";
                        user['profilePicture'] = user['profilePicture'] ?? "";
                        user['about'] = user['about'] ?? "";
                        user['isVerified'] = user['isVerified'] == 1;
                        user['isPrivateLikes'] = user['isPrivateLikes'] == 1;
                        user['token'] = user['token'] ?? "";
                        resolve(user);
                    } else {
                        resolve(null);
                    }
                });
            });
        }.bind(this));
    }

    async changePassword(id, value) {

       let user = await this.getUserById(id);

       if (user.password !== value.currentPassword) {
           throw new AppError("current password is incorrect", 401)
       }
       if (user.password === value.newPassword){
           throw new AppError("new password is the same is the current password", 400)
       }

       await this.updateProfile(id, {password:value.newPassword})
    }

    getUserByAuth(auth) {
        return new Promise(function (resolve, reject) {
            var query = "SELECT * FROM users WHERE auth = ?";
            var params = [auth];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("[Error]", err);
                        resolve(null);
                        return;
                    }
                    if (results && results.length > 0) {
                        var user = results[0];
                        user['instagram'] = user['instagram'] ?? "";
                        user['facebook'] = user['facebook'] ?? "";
                        user['twitter'] = user['twitter'] ?? "";
                        user['profilePicture'] = user['profilePicture'] ?? "";
                        user['about'] = user['about'] ?? "";
                        user['isVerified'] = user['isVerified'] == 1;
                        user['isPrivateLikes'] = user['isPrivateLikes'] == 1;
                        user['refferal_code'] = user['refferal_code'] ?? "";
                        resolve(user);
                    } else {
                        resolve(null);
                    }
                });
            });
        }.bind(this));
    }

    getUserByUid(uid) {
        return new Promise(function (resolve, reject) {
            var query = "SELECT * FROM users WHERE uid = ?";
            var params = [uid];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("[Error]", err);
                        resolve(null);
                        return;
                    }
                    if (results && results.length > 0) {
                        var user = results[0];
                        user['instagram'] = user['instagram'] ?? "";
                        user['facebook'] = user['facebook'] ?? "";
                        user['twitter'] = user['twitter'] ?? "";
                        user['profilePicture'] = user['profilePicture'] ?? "";
                        user['about'] = user['about'] ?? "";
                        user['isVerified'] = user['isVerified'] == 1;
                        user['isPrivateLikes'] = user['isPrivateLikes'] == 1;
                        resolve(user);
                    } else {
                        resolve(null);
                    }
                });
            });
        }.bind(this));
    }
    getUserByEmail(uid) {
        return new Promise(function (resolve, reject) {
            var query = "SELECT * FROM users WHERE email = ?";
            var params = [uid];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("[Error]", err);
                        resolve(null);
                        return;
                    }
                    if (results && results.length > 0) {
                        var user = results[0];
                        user['instagram'] = user['instagram'] ?? "";
                        user['facebook'] = user['facebook'] ?? "";
                        user['twitter'] = user['twitter'] ?? "";
                        user['profilePicture'] = user['profilePicture'] ?? "";
                        user['about'] = user['about'] ?? "";
                        user['isVerified'] = user['isVerified'] == 1;
                        user['isPrivateLikes'] = user['isPrivateLikes'] == 1;
                        resolve(user);
                    } else {
                        resolve(null);
                    }
                });
            });
        }.bind(this));
    }

    getCitiesByCountryId(id) {
        return new Promise(function (resolve, reject) {
            let query = "SELECT * FROM cities WHERE country_id = ?";
            const params = [id];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("[Error]", err);
                        resolve(null);
                        return;
                    }
                   resolve(results)
                });
            });
        }.bind(this));
    }

    getAllBusinessTypes() {
        return new Promise(function (resolve, reject) {
            let query = "SELECT * FROM business_types";
            query = mysql.format(query);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("[Error]", err);
                        resolve(null);
                        return;
                    }
                    resolve(results)
                });
            });
        }.bind(this));
    }
    getBusinessTypesCategoryByBusinessTypeId(id) {
        return new Promise(function (resolve, reject) {
            let query = "SELECT * FROM business_types_category WHERE business_types_id = ?";
            const params = [id];
            query = mysql.format(query,params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("[Error]", err);
                        resolve(null);
                        return;
                    }
                    resolve(results)
                });
            });
        }.bind(this));
    }

    getAllCountries() {
        return new Promise(function (resolve, reject) {
            var query = "SELECT * FROM countries";
            query = mysql.format(query);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("[Error]", err);
                        resolve(null);
                        return;
                    }
                    resolve(results)
                });
            });
        }.bind(this));
    }

    getVideoTypes() {
        return new Promise(function (resolve, reject) {
            var query = "SELECT * FROM video_type";
            query = mysql.format(query);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("[Error]", err);
                        resolve(null);
                        return;
                    }
                    resolve(results)
                });
            });
        }.bind(this));
    }

    registerUser(uid, name, email, password, appVersion, phoneModel, login_type, location,cityId,address,categoryId, accountType,phoneNumber,websiteLink, profilePic) {
        return new Promise(async resolve => {

            if (login_type === 4) {
                var existingUser  = await this.getUserByEmail(email)
                if (existingUser){
                    resolve( new AppError("Email is already registered!", 401));
                }
                uid  = crypto.randomBytes(64).toString('hex');
            }

            var userObj = await this.getUserByUid(uid);
            if (userObj) {
                // console.log(userObj);
                if (userObj.provider === login_type) {
                    resolve({ user: userObj });
                } else {
                    resolve(null);
                }
            } else {
                var query = "INSERT IGNORE INTO users (name, email, username, password, auth, appVersion, phoneModel, country, provider, createTime, uid, refferal_code, city_id, address, business_types_category_id, accountType, phone, websiteLink, profilePicture ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,? ,? ,? ,? ,?, ?);";
                const auth = crypto.randomBytes(64).toString('hex');
                const reff = crypto.randomBytes(3).toString('hex');
                var params = [name, email, uid, password, auth, appVersion, phoneModel, location, login_type, getTime(), uid, reff,cityId,address,categoryId,accountType,phoneNumber,websiteLink, profilePic];
                query = mysql.format(query, params);
                this.pool.getConnection(function (err, connection) {
                    connection.query(query, async function (err, results, fields) {
                        connection.release();
                        if (err) {
                            console.error("[Error] " + err);
                            resolve(null);
                            return;
                        } else {
                            if (results.insertId > 0) {
                                const userObj = await this.getUserByAuth(auth);
                                resolve({ user: userObj });
                            } else {
                                resolve(null);
                            }
                        }
                    }.bind(this));
                }.bind(this));
            }
        });
    }

    getFollowers(userId, profileId) {
        return new Promise(resolve => {
            var query = "SELECT u.id, name, `profilePicture`, exists(select * from followers where following = u.id and follower = ?) as viewer_follower, (IF(follower = ?, 1, 0)) AS viewer_own from followers join users u on u.id = follower where following = ?";
            var params = [userId, userId, profileId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var users = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                users.push({
                                    "id": e.id,
                                    "name": e.name,
                                    "username": e.username,
                                    "profilePicture": e.profilePicture,
                                    "following": e.viewer_follower == 1,
                                    "own": e.viewer_own == 1,
                                });
                            }
                        }
                        resolve(users);
                    }
                });
            });
        });
    }

    deleteNotification(userId, type, profileId = 0, videoId = 0, streamId = 0, postId = 0, commentId = 0) {
        return new Promise((resolve, reject) => {
            let notificationType = constants.notificationTypes.get(type) ?? -1;
            var query = "DELETE FROM notifications WHERE userId = ? AND notificationType = ?";
            var params = [userId, notificationType];
            if (videoId !== 0) {
                query += " AND videoId = ?";
                params.push(videoId);
            }
            if (streamId !== 0) {
                query += " AND streamId = ?";
                params.push(streamId);
            }
            if (postId !== 0) {
                query += " AND postId = ?";
                params.push(postId);
            }
            if (commentId !== 0) {
                query += " AND commentId = ?";
                params.push(commentId);
            }
            if (profileId !== 0) {
                query += " AND receiverId = ?";
                params.push(profileId);
            }
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        resolve(null);
                    } else {
                        resolve(results.affectedRows);
                    }
                });
            });
        });
    }

    insertNotification(receiverId, userId, notificationMessage, notificationType, videoId, postId, commentId, streamId) {
        return new Promise((resolve, reject) => {
            console.log()
            var query = "INSERT INTO notifications (receiverId, userId, notificationMessage, videoId, postId, commentId, streamId, notificationTime, notificationType) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            var params = [receiverId, userId, notificationMessage, videoId, postId, commentId, streamId, Math.floor(Date.now() / 1000), notificationType];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        reject(err);
                    } else {
                        resolve(results.insertId);
                    }
                });
            });
        });
    }

    getNotifications(userId, from) {
        return new Promise(resolve => {
            var query = "SELECT n.*, u.name, u.profilePicture FROM notifications n LEFT JOIN users u ON n.userId = u.id WHERE n.receiverId = ? ORDER BY n.id DESC LIMIT ?, 10";
            var params = [userId, parseInt(from)];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var notifications = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                let obj = {
                                    "id": e.id,
                                    "receiverId": e.receiverId,
                                    "notificationMessage": JSON.parse(e.notificationMessage),
                                    "notificationTime": e.notificationTime,
                                    "postId": e.postId ?? 0,
                                    "videoId": e.videoId ?? 0,
                                    "commentId": e.commentId ?? 0,
                                    "streamId": e.streamId ?? 0,
                                }
                                if (e.name != null) {
                                    obj.user = {
                                        "id": e.userId,
                                        "name": e.name,
                                        "picture": e.profilePicture,
                                    };
                                }
                                notifications.push(obj);
                            }
                        }
                        resolve(notifications);
                    }
                });
            });
        });
    }

    getFollowings(userId, profileId) {
        return new Promise(resolve => {
            console.log("getFollowings", userId, profileId)
            var query = "select u.id, name, `profilePicture`, exists(select * from followers where following = u.id and follower = ?) as viewer_follower, (IF(following = ?, 1, 0)) AS viewer_own from followers join users u on u.id = following where follower = ?";
            var params = [userId, userId, profileId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var users = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                users.push({
                                    "id": e.id,
                                    "name": e.name,
                                    "username": e.username,
                                    "profilePicture": e.profilePicture,
                                    "following": e.viewer_follower == 1,
                                    "own": e.viewer_own == 1,
                                });
                            }
                        }
                        resolve(users);
                    }
                });
            });
        });
    }

    getBlockedUsers(userId) {
        return new Promise(resolve => {
            var query = "SELECT b.*, u.name, u.profilePicture, u.username FROM blocked_users b JOIN users u ON u.id = b.blocked_id WHERE b.blocked_by = ?";
            var params = [userId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var users = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                users.push({
                                    "id": e.blocked_id,
                                    "name": e.name,
                                    "username": e.username,
                                    "profilePicture": e.profilePicture,
                                });
                            }
                        }
                        resolve(users);
                    }
                });
            });
        });
    }

    getReports(userId) {
        return new Promise(resolve => {
            var query = "SELECT * FROM report_reasons";
            query = mysql.format(query);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var reasons = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                reasons.push({
                                    "id": e.id,
                                    "name": e.reason,
                                    "points": e.points,
                                });
                            }
                        }
                        resolve(reasons);
                    }
                });
            });
        });
    }

    searchUsers(userId, searchQuery, from = 0, threshold = 10) {
        return new Promise(resolve => {
            const self = this; // Capture the reference to 'this'
    
            if (searchQuery != "") {
                var query = "SELECT u.*, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) AS viewer_follower, (IF(u.id = ?, 1, 0)) AS viewer_own FROM users u LEFT JOIN blocked_users bu ON u.id = bu.blocked_id AND bu.blocked_by = ? WHERE u.name LIKE CONCAT('%', ?, '%') AND bu.blocked_id IS NULL";
                var params = [userId, userId, userId, searchQuery];
            } else {
                var query = "SELECT u.*, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) AS viewer_follower, (IF(u.id = ?, 1, 0)) AS viewer_own FROM users u LEFT JOIN blocked_users bu ON u.id = bu.blocked_id AND bu.blocked_by = ? WHERE bu.blocked_id IS NULL ORDER BY u.totalVideos DESC LIMIT ?, ?;";
                var params = [userId, userId, userId, parseInt(from), parseInt(threshold)];
            }
            query = mysql.format(query, params);
    
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var users = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                users.push({
                                    "id": e.id,
                                    "name": e.name,
                                    "username": e.username,
                                    "profilePicture": e.profilePicture,
                                    "level": null,
                                    "following": e.viewer_follower == 1,
                                    "own": e.viewer_own == 1,
                                });
                            }
                        }
                        resolve(users);
                    }
                });
            });
        });
    }

    getProfile(userId, profileId) {
        return new Promise(resolve => {
            var query = "SELECT u.*,\n" +
                "       EXISTS(SELECT * FROM followers WHERE follower = ? AND following = u.id) AS following,\n" +
                "       (? = u.id)                                                              AS viewer_own,\n" +
                "       (SELECT COUNT(*) FROM followers WHERE following = u.id)                 as followers,\n" +
                "       (SELECT COUNT(*) FROM followers WHERE follower = u.id)                  as followings,\n" +
                "       (SELECT COUNT(*) FROM videos WHERE user_id = u.id)                      as videos\n" +
                "FROM users u\n" +
                "WHERE u.id = ?\n" +
                "  AND NOT EXISTS(SELECT * FROM blocked_users WHERE blocked_by = ? AND blocked_id = u.id)\n" +
                "  AND NOT EXISTS(SELECT * FROM blocked_users WHERE blocked_by = u.id AND blocked_id = ?)";
            var params = [userId, userId, profileId, userId, userId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve(false);
                    } else {
                        if (results.length > 0) {
                            const e = results[0];
                            // resolve(this.parseUserObject(e));
                            const levels = null;
                            const userObj = this.parseUserObject(e);
                            userObj.level = levels ? levels : null;
                            resolve(userObj);
                        } else {
                            resolve(false);
                        }
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    discoverFollowing(userId, uUserId, from = 0, threshold = 10) {
        return new Promise(resolve => {
            var query = "SELECT s.title as 'sound_title', albumPhotoUrl, (? = v.user_id) as viewer_own, v.*, u.name, u.profilePicture, u.username, u.levelXP, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END as isUnlocked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following, LOG10(ABS(v.likes + views) + v.videoTime / 300000) as score FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId WHERE v.isPrivate = 0 AND EXISTS(SELECT id FROM followers WHERE follower = ? AND following = v.user_id ) GROUP BY v.id ORDER BY score DESC LIMIT ?, ?";
            var params = [userId, userId, userId, userId, userId, parseInt(from), parseInt(threshold)];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var videos = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                // videos.push(this.parseVideoObject(e));
                                const levels = null;
                                const videoObj = this.parseVideoObject(e);
                                videoObj.user.level = levels ? levels : null;
                                videos.push(videoObj);
                            }
                        }
                        // connection.release();
                        resolve(videos);
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    discoverFeatured(userId, uUserId, from = 0, threshold = 10) {
        return new Promise(resolve => {
            var query = "SELECT s.title AS 'sound_title', albumPhotoUrl, (? = v.user_id) AS viewer_own, v.*, u.name, u.profilePicture, u.username, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) AS viewer_liked, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END AS isUnlocked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) AS viewer_following, LOG10(ABS(v.likes + views) + v.videoTime / 300000) AS score FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId WHERE v.isPrivate = 0 AND u.isVerified = 1 AND NOT EXISTS(SELECT id FROM not_interested ni WHERE ni.video_id = v.id AND (ni.user_id = ? OR ni.unique_id = ?)) AND NOT EXISTS(SELECT id FROM blocked_users WHERE blocked_id = v.user_id AND (blocked_by = ? OR unique_id = ?)) AND NOT EXISTS(SELECT id FROM reports WHERE ( user_id = ? OR unique_id = ?) AND video_id = v.id) AND NOT EXISTS(SELECT id FROM report_users WHERE (user_id = ? OR unique_id = ?) AND report_user_id = v.user_id) AND v.user_id != ? AND v.user_id GROUP BY v.id ORDER BY v.id DESC LIMIT ?, ?";
            var params = [userId, userId, userId, userId, userId, uUserId, userId, uUserId, userId, uUserId, userId, uUserId, userId, parseInt(from), parseInt(threshold)];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var videos = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                videos.push(this.parseVideoObject(e));
                            }
                        }
                        resolve(videos);
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    discoverExclusive(userId, uUserId, from = 0, threshold = 15) {
        return new Promise(resolve => {
            var query = "SELECT s.title as 'sound_title', albumPhotoUrl, (? = v.user_id) as viewer_own, v.*, u.name, u.profilePicture, u.username, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END as isUnlocked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following, LOG10(ABS(v.likes + views) + v.videoTime / 300000) as score FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId WHERE v.isExclusive = 1 GROUP BY v.id ORDER BY id DESC LIMIT ?, ?";
            var params = [userId, userId, userId, userId, parseInt(from), parseInt(threshold)];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var videos = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                videos.push(this.parseVideoObject(e));
                            }
                        }
                        resolve(videos);
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    getDiscoverVideos(userId, searchQuery, from = 0, threshold = 15) {
        return new Promise(resolve => {
            if (searchQuery == "") {
                var query = "SELECT s.title                                                                          AS 'sound_title',\n" +
                    "       albumPhotoUrl,\n" +
                    "       (? = v.user_id)                                                                  AS viewer_own,\n" +
                    "       v.*,\n" +
                    "       u.name,\n" +
                    "       u.profilePicture,\n" +
                    "       u.username,\n" +
                    "       u.levelXP,\n" +
                    "       EXISTS(SELECT * FROM followers fs WHERE u.id = fs.following AND fs.follower = ?) AS is_following,\n" +
                    "       EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?)                AS viewer_liked,\n" +
                    "       EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id)         AS viewer_following,\n" +
                    "       EXISTS(SELECT * FROM bookmark WHERE user_id = ? AND video_id = v.id)             AS isBookMarked,\n" +
                    "       (SELECT COUNT(*) FROM bookmark WHERE video_id = v.id)                            AS totalBookMarks,\n" +
                    "       (SELECT count(*) FROM followers WHERE following = u.id)                          AS totalUserFollowers,\n" +
                    "       (v.comments + v.likes + v.views) * (NOW() - v.videoTime) * RAND()                AS priority\n" +
                    "FROM videos v\n" +
                    "         JOIN users u ON u.id = v.user_id\n" +
                    "         LEFT JOIN sounds s ON s.id = v.soundId\n" +
                    "         LEFT JOIN ad_viewed av ON av.video_id = v.id AND av.user_id = ?\n" +
                    "WHERE v.isPrivate = 0\n" +
                    "ORDER BY priority DESC\n" +
                    "LIMIT ?, ?";
                var params = [userId, userId, userId,userId, userId, userId, parseInt(from) * parseInt(threshold), parseInt(threshold)];
            } else {
                var query = "SELECT s.title as 'sound_title', albumPhotoUrl, (? = v.user_id) as viewer_own, v.*, u.name, u.profilePicture, u.username, u.levelXP, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END as isUnlocked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following, LOG10(ABS(v.likes + views) + v.videoTime / 300000) as score FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId WHERE v.title LIKE CONCAT('%', ?, '%') ORDER BY id DESC LIMIT ?, ?";
                var params = [userId, userId, userId, userId, searchQuery, parseInt(from), parseInt(threshold)];
            }
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var videos = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                const levels = null;
                                const videoObj = this.parseVideoObject(e);
                                videoObj.user.level = levels ? levels : null;
                                videos.push(videoObj);
                            }
                        }
                        resolve(videos);
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    getSound(userId, soundId) {
        return new Promise(resolve => {
            var query = "SELECT *, EXISTS(SELECT sound_id from sound_favorites WHERE sound_id = ? AND user_id = ?) as isFav FROM sounds WHERE id = ?";
            var params = [soundId, userId, soundId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve(null);
                    } else {
                        if (results.length > 0) {
                            const e = results[0];
                            const sound = this.parseSoundObject(e);
                            const soundVideos = await this.getSoundVideos(connection, userId, e.id);
                            sound.videos = soundVideos;
                            resolve(sound);
                        } else {
                            resolve(null);
                        }
                    }
                    connection.release();
                }.bind(this));
            }.bind(this));
        });
    }

    getDiscoverSounds(userId, searchQuery, from = 0, threshold = 10) {
        return new Promise(resolve => {
            if (searchQuery == "") {
                var query = "SELECT * FROM sounds ORDER BY admin DESC, videos DESC LIMIT ?, ?";
                var params = [parseInt(from), parseInt(threshold)];
            } else {
                var query = "SELECT * FROM sounds WHERE title LIKE CONCAT('%', ?, '%') ORDER BY videos DESC LIMIT ?, ?";
                var params = [searchQuery, parseInt(from), parseInt(threshold)]
            }
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                        connection.release();
                    } else {
                        var videos = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                const sound = this.parseSoundObject(e);
                                const soundVideos = await this.getSoundVideos(connection, userId, e.id);
                                sound.videos = soundVideos;
                                videos.push(sound);
                            }
                        }
                        connection.release();
                        resolve(videos);
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    getFavSounds(userId) {
        return new Promise(resolve => {
            var query = "SELECT s.*, fs.* FROM sounds s JOIN sound_favorites fs ON fs.sound_id = s.id WHERE fs.user_id = ?";
            var params = [userId];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                        connection.release();
                    } else {
                        var sounds = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                const sound = this.parseSoundObject(e);
                                sounds.push(sound);
                            }
                        }
                        connection.release();
                        resolve(sounds);
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    getProfileVideos(userId, profileId, videoType, from = 0) {
        return new Promise(resolve => {
          if (videoType === 0) {
              var params = [userId, userId, userId, profileId, parseInt(from) * 15];
              // Normal query
              var query = "SELECT s.title                                                                                     as 'sound_title',\n" +
                  "       v.*,\n" +
                  "       (? = v.user_id)                                                                             as viewer_own,\n" +
                  "       u.name,\n" +
                  "       u.profilePicture,\n" +
                  "       u.username,\n" +
                  "       u.levelXP,\n" +
                  "       EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?)                           as viewer_liked,\n" +
                  "       EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id)                    as viewer_following\n" +
                  "FROM videos v\n" +
                  "         JOIN users u ON u.id = v.user_id\n" +
                  "         LEFT JOIN sounds s ON s.id = v.soundId\n" +
                  "WHERE v.user_id = ?\n" +
                  "GROUP BY v.id\n" +
                  "ORDER BY v.id DESC\n" +
                  "LIMIT ?, 15";
              // var query = "SELECT s.title as 'sound_title', (? = v.user_id) as viewer_own, v.*, u.name, u.profilePictureBase64, u.username, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following, LOG10(ABS(v.likes + views) + v.videoTime / 300000) as score FROM videos v JOIN users u ON u.id = v.user_id JOIN sounds s ON s.id = v.soundId WHERE v.isPrivate = 0 GROUP BY v.id ORDER BY score DESC LIMIT ?, 15";
          }else{
            var query = "SELECT s.title                                                                                     as 'sound_title',\n" +
                "       v.*,\n" +
                "       (? = v.user_id)                                                                             as viewer_own,\n" +
                "       u.name,\n" +
                "       u.profilePicture,\n" +
                "       u.username,\n" +
                "       u.levelXP,\n" +
                "       EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?)                           as viewer_liked,\n" +
                "       EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id)                    as viewer_following\n" +
                "FROM videos v\n" +
                "         JOIN users u ON u.id = v.user_id\n" +
                "         LEFT JOIN sounds s ON s.id = v.soundId\n" +
                "WHERE v.user_id = ?\n" +
                "AND v.video_type_id = ?\n" +
                "GROUP BY v.id\n" +
                "ORDER BY v.id DESC\n" +
                "LIMIT ?, 15"
              var params = [userId, userId, userId, profileId, videoType ,parseInt(from) * 15];
          }

            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var videos = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                // videos.push(this.parseVideoObject(e));
                                const levels = null;
                                const videoObj = this.parseVideoObject(e);
                                videoObj.user.level = levels ? levels : null;
                                videos.push(videoObj);
                            }
                        }
                        resolve(videos);
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    getUserSavedVideos(userId, profileId, from = 0) {
        return new Promise(resolve => {

                var params = [userId, userId, profileId, userId, userId, userId, userId, parseInt(from) * 15];
                // Normal query
                var query = "SELECT v.*,\n" +
                    "       (? = v.user_id)                                                          as viewer_own,\n" +
                    "       u.name,\n" +
                    "       u.profilePicture,\n" +
                    "       u.username,\n" +
                    "       u.levelXP,\n" +
                    "       EXISTS(SELECT * FROM followers fs WHERE u.id = fs.following AND fs.follower = ?) AS is_following,\n" +
                    "       EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?)        as viewer_liked,\n" +
                    "       EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following,\n" +
                    "       EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id)         AS viewer_following,\n" +
                    "       EXISTS(SELECT * FROM bookmark WHERE user_id = ? AND video_id = v.id)             AS isBookMarked,\n" +
                    "       (SELECT COUNT(*) FROM bookmark WHERE video_id = v.id)                            AS totalBookMarks,\n" +
                    "       (SELECT count(*) FROM followers WHERE following = u.id)                          AS totalUserFollowers\n" +
                    "FROM bookmark bm\n" +
                    "         JOIN users u ON u.id = bm.user_id\n" +
                    "         JOIN videos v ON v.id = bm.video_id\n" +
                    "\n" +
                    "WHERE bm.user_id = ?\n" +
                    "LIMIT ?, 15;";

            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var videos = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                // videos.push(this.parseVideoObject(e));
                                const levels = null;
                                const videoObj = this.parseVideoObject(e);
                                videoObj.user.level = levels ? levels : null;
                                videos.push(videoObj);
                            }
                        }
                        resolve(videos);
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    addComment(userId, videoId, comment, commentId) {
        return new Promise(resolve => {
            var query = "INSERT INTO comments (user_id, video_id, comment, parentId, commentTime) VALUES (?, ?, ?, ?, ?)";
            var params = [userId, videoId, comment, commentId, getTime()];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    console.error(err);
                    if (err) {
                        resolve(null);
                        return;
                    } else {
                        if (results.insertId > 0) {
                            await connection.execute("UPDATE videos SET comments = comments + 1 WHERE id = ?", [videoId]);
                        }
                        if (commentId > 0) {
                            await connection.execute("UPDATE comments SET replies = replies + 1 WHERE id = ?", [commentId]);
                        }
                        resolve({
                            "id": results.insertId,
                        });
                    }
                    connection.release();
                }.bind(this));
            }.bind(this));
        });
    }

    getReplies(userId, commentId, from = 0, limit= 15) {
        return new Promise(resolve => {
            var query = "SELECT c.*,\n" +
                "       u.name,\n" +
                "       u.profilePicture,\n" +
                "       u.username,\n" +
                "       EXISTS(SELECT * FROM comment_likes WHERE user_id = ? AND comment_id = c.id)                      as liked,\n" +
                "       CASE WHEN EXISTS(SELECT user_id FROM comments WHERE user_id = ? AND id = c.id) THEN 1 ELSE 0 END as own,\n" +
                "       (SELECT COUNT(*) FROM comment_likes WHERE  comment_id = c.id) AS total_likes\n" +
                "FROM comments c\n" +
                "         JOIN users u ON u.id = c.user_id\n" +
                "WHERE parentId = ?\n" +
                "LIMIT ?, ?";
            var params = [userId, userId, commentId, parseInt(from) * parseInt(limit), parseInt(limit) ];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var comments = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                comments.push({
                                    "id": e.id,
                                    "comment": e.comment,
                                    "own": e.own == 1,
                                    "liked": e.liked == 1,
                                    "video_id": e.video_id,
                                    "time": e.commentTime,
                                    "replies": e.replies,
                                    "likes": e.total_likes,
                                    "user": {
                                        "id": e.user_id,
                                        "name": e.name,
                                        "username": e.username,
                                        "profilePicture": e.profilePicture,
                                    },
                                });
                            }
                        }
                        resolve(comments);
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    getComments(userId, videoId, from = 0, limit = 15) {
        return new Promise(resolve => {
            var query = "SELECT c.*,\n" +
                "       u.name,\n" +
                "       u.profilePicture,\n" +
                "       u.username,\n" +
                "       EXISTS(SELECT * FROM comment_likes WHERE user_id = ? AND comment_id = c.id)                      as liked,\n" +
                "       CASE WHEN EXISTS(SELECT user_id FROM comments WHERE user_id = ? AND id = c.id) THEN 1 ELSE 0 END as own,\n" +
                "       (SELECT COUNT(*) FROM comment_likes WHERE comment_id = c.id)                                     AS total_likes\n" +
                "FROM comments c\n" +
                "         JOIN users u ON u.id = c.user_id\n" +
                "WHERE video_id = ?\n" +
                "  AND parentId = 0\n" +
                "LIMIT ?, ?";
            var params = [userId, userId, videoId, parseInt(from) * parseInt(limit),parseInt(limit)];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var comments = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                comments.push({
                                    "id": e.id,
                                    "comment": e.comment,
                                    "own": e.own == 1,
                                    "liked": e.liked == 1,
                                    "video_id": e.video_id,
                                    "time": e.commentTime,
                                    "replies": e.replies,
                                    "likes": e.total_likes,
                                    "user": {
                                        "id": e.user_id,
                                        "name": e.name,
                                        "username": e.username,
                                        "profilePicture": e.profilePicture,
                                    },
                                });
                            }
                        }
                        resolve(comments);
                    }
                }.bind(this));
            }.bind(this));
        });
    }

    deleteProfile(userId) {
        return new Promise(resolve => {
            this.pool.getConnection(async function (err, connection) {
                var query = "DELETE FROM users WHERE id = ?";
                var params = [userId];
                query = mysql.format(query, params);
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        resolve(null);
                    } else {
                        if (results.affectedRows > 0) {
                            connection.execute("DELETE FROM messages WHERE user_id = ? OR receiver_id = ?", [
                                userId,
                                userId
                            ]);
                            connection.execute("DELETE FROM posts WHERE user_id = ?", [
                                userId
                            ]);
                            connection.execute("DELETE FROM videos WHERE user_id = ?", [
                                userId
                            ]);
                            connection.execute("DELETE FROM post_comments WHERE user_id = ?", [
                                userId
                            ]);
                            connection.execute("DELETE FROM comments WHERE user_id = ?", [
                                userId
                            ]);
                            connection.execute("DELETE FROM bookmark WHERE user_id = ?", [
                                userId
                            ]);
                            connection.execute("DELETE FROM followers WHERE follower = ? OR following = ?", [
                                userId,
                                userId
                            ]);
                            connection.execute("DELETE FROM notifications WHERE userId = ? OR receiverId = ?", [
                                userId,
                                userId
                            ]);
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    }
                    connection.release();
                });
            });
        });
    }

    updateUserToken(userId, token) {
        return new Promise(async (resolve, reject) => {
            const promisePool = this.pool.promise();
            let connection;
            try {
                connection = await promisePool.getConnection();
                // Check if the token already exists for the user
                const [existingTokenRows, existingTokenFields] = await connection.query(
                    "SELECT * FROM user_fcm_tokens WHERE user_id = ? AND fcm_token = ?",
                    [userId, token]
                );
    
                if (existingTokenRows.length > 0) {
                    // Token already exists, no need to insert
                    resolve(true);
                } else {
                    // Token does not exist, insert it
                    const [insertRows, insertFields] = await connection.query(
                        "INSERT INTO user_fcm_tokens (user_id, fcm_token) VALUES (?, ?)",
                        [userId, token]
                    );
                    if (insertRows.affectedRows > 0) {
                        resolve(token);
                    } else {
                        resolve(false);
                    }
                }
            } catch (error) {
                reject(error);
            } finally {
                if (connection) {
                    connection.release();
                }
            }
        });
    }

    updateToken(userId, token) {
        return new Promise(async (resolve, reject) => {
            const promisePool = this.pool.promise();
            console.log("Db handler", userId, token)
            let connection;
            try {
                connection = await promisePool.getConnection();
                const [rows, fields] = await connection.query('UPDATE users SET token = ? WHERE id = ?', [token, userId]);
                console.log(rows);
                if (rows.affectedRows > 0) {
                    const [result] = await connection.query('SELECT token from users where id = ?', [userId]);
                    console.log(result);
                    resolve(result);
                    return;
                }
                resolve(false);
            } catch (error) {
                reject(error);
            } finally {
                if (connection) {
                    connection.release();
                }
            }
        });
    }

    getExploreBanners() {
        return new Promise(resolve => {
            var query = "SELECT * FROM banners";
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var banners = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                banners.push(e);
                            }
                        }
                        resolve(banners);
                    }
                    connection.release();
                }.bind(this));
            }.bind(this));
        });
    }

    getTags() {
        return new Promise(resolve => {
            var query = "SELECT * FROM tags ORDER BY totalVideos DESC LIMIT 10";
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var coins = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                coins.push({
                                    "id": e.id,
                                    "tag": e.tag,
                                    "totalVideos": e.totalVideos
                                });
                            }
                        }
                        resolve(coins);
                    }
                    connection.release();
                }.bind(this));
            }.bind(this));
        });
    }

    getExploreTags(userId, from = 0) {
        return new Promise(resolve => {
            var query = "SELECT * FROM tags WHERE totalVideos != 0 ORDER BY priority DESC LIMIT ?, 10";
            var params = [parseInt(from)];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var tags = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                const videos = await this.getTagVideos(connection, userId, e.id);
                                const tag = {
                                    "id": e.id,
                                    "views": e.views,
                                    "tag": e.tag,
                                    "totalVideos": e.totalVideos,
                                    "videos": await this.getTagVideos(connection, userId, e.id),
                                };
                                if (videos.length > 0) tags.push(tag);
                            }
                        }
                        resolve(tags);
                    }
                    connection.release();
                }.bind(this));
            }.bind(this));
        });
    }

    getTagDetails(userId, tagId, tagName = "") {
        return new Promise(resolve => {
            var query = "SELECT * FROM tags WHERE tag = ?";
            var params = [tagName];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve(null);
                    } else {
                        if (results.length > 0) {
                            const e = results[0];
                            const tag = {
                                "id": e.id,
                                "views": e.views,
                                "tag": e.tag,
                                "totalVideos": e.totalVideos,
                                "videos": await this.getTagVideos(connection, userId, e.id),
                            };
                            resolve(tag);
                        } else {
                            resolve(null);
                        }
                    }
                    connection.release();
                }.bind(this));
            }.bind(this));
        });
    }

    getTagVideos(connection, userId, tagId, from = 0) {
        return new Promise(resolve => {
            var query = "SELECT s.title AS 'sound_title', v.*, u.name, u.profilePictureBase64, u.username, u.levelXP, (? = v.user_id) AS viewer_own, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END AS isUnlocked, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) AS viewer_liked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) AS viewer_following FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId LEFT JOIN blocked_users bu ON u.id = bu.blocked_id AND bu.blocked_by = ? WHERE v.id IN (SELECT video_id FROM video_tags WHERE tag_id = ?) AND v.isPrivate = 0 AND bu.blocked_id IS NULL LIMIT ?, 10";
            var params = [userId, userId, userId, userId, userId, tagId, parseInt(from)];
            query = mysql.format(query, params);
            connection.query(query, async function (err, results, fields) {
                if (err) {
                    console.error(err);
                    console.error(results);
                    resolve([]);
                } else {
                    var videos = [];
                    if (results.length > 0) {
                        for (let i = 0; i < results.length; i++) {
                            const e = results[i];
                            // videos.push(this.parseVideoObject(e));
                            const levels = null;
                            const videoObj = this.parseVideoObject(e);
                            videoObj.user.level = levels ? levels : null;
                            videos.push(videoObj);
                        }
                    }
                    resolve(videos);
                }
                connection.release();
            }.bind(this));
        });
    }

    getSoundVideos(connection, userId, soundId, from = 0) {
        return new Promise(resolve => {
            if (connection) {
                var query = "SELECT s.title as 'sound_title', v.*, u.name, u.profilePictureBase64, u.username, (? = v.user_id) as viewer_own, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END as isUnlocked, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId AND v.isPrivate = 0 WHERE s.id = ? LIMIT ?, 10";
                var params = [userId, userId, userId, userId, soundId, parseInt(from)];
                query = mysql.format(query, params);
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        console.error(results);
                        resolve([]);
                    } else {
                        var videos = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const e = results[i];
                                videos.push(this.parseVideoObject(e));
                            }
                        }
                        resolve(videos);
                    }
                }.bind(this));
            } else {
                this.pool.getConnection(function (err, connection) {
                    var query = "SELECT s.title as 'sound_title', v.*, u.name, u.profilePictureBase64, u.username, (? = v.user_id) as viewer_own, CASE WHEN exclusiveAmount = 0 THEN 1 ELSE EXISTS(SELECT id FROM purchased_content WHERE user_id = ? AND video_id = v.id) END as isUnlocked, EXISTS(SELECT * FROM likes WHERE video_id = v.id AND user_id = ?) as viewer_liked, EXISTS(SELECT id FROM followers WHERE follower = ? AND following = u.id) as viewer_following FROM videos v JOIN users u ON u.id = v.user_id LEFT JOIN sounds s ON s.id = v.soundId AND v.isPrivate = 0 WHERE s.id = ? LIMIT ?, 10";
                    var params = [userId, userId, userId, userId, soundId, parseInt(from)];
                    query = mysql.format(query, params);
                    connection.query(query, async function (err, results, fields) {
                        connection.release();
                        if (err) {
                            console.error(err);
                            console.error(results);
                            resolve([]);
                        } else {
                            var videos = [];
                            if (results.length > 0) {
                                for (let i = 0; i < results.length; i++) {
                                    const e = results[i];
                                    videos.push(this.parseVideoObject(e));
                                }
                            }
                            resolve(videos);
                        }
                    }.bind(this));
                }.bind(this));
            }
        });
    }

    parseUserObject(obj) {
        return {
            "id": obj["id"],
            "name": obj["name"] ?? "",
            "username": obj["username"],
            "profilePicture": obj["profilePicture"] ?? "",
            "bio": obj["about"] ?? "",
            "country": obj["country"] ?? "",
            "twitter": obj["twitter"] ?? "",
            "instagram": obj["instagram"] ?? "",
            "facebook": obj["facebook"] ?? "",
            "isVerified": obj["isVerified"] == 1,
            "totalVideos": obj["videos"],
            "totalViews": obj["totalViews"],
            "totalGifts": obj["totalGifts"],
            "totalFollowers": obj["followers"],
            "totalFollowings": obj["followings"],
            "totalLikes": obj["totalLikes"],
            "totalLiked": obj["totalLiked"],
            "isPrivateLikes": obj["isPrivateLikes"] == 1,
            "following": obj["following"] == 1,
            "coins": obj["coins"],
            "accountType": obj["accountType"],
            "websiteLike": obj["websiteLike"],
            "address":obj["address"],
            "cityId": obj["cityId"],
            "phoneNumber": obj["phone"],
            "email":obj["email"],
            "products": obj["products"],
            "websiteLink": obj["websiteLink"] ?? "",
            "own": obj["viewer_own"] == 1,
            "public_key": {
                "public_exponent": obj["public_exponent"],
                "public_modulus": obj["public_modulus"]
            },
        };
    }

    parsePostObject(obj) {
        return {
            "id": obj["id"],
            "caption": obj["caption"],
            "contentData": obj["contentData"],
            "tags": obj["tags"],
            "liked": obj["viewer_liked"] == 1,
            "viewed": obj["viewed"] == 1,
            "allowComments": obj["allowComments"] == 1,
            "allowSharing": obj["allowSharing"] == 1,
            "allowGifts": obj["allowGifts"] == 1,
            "exclusiveCoins": obj["exclusiveAmount"],
            "locked": obj["isUnlocked"] == 0,
            "likes": obj["likes"],
            "comments": obj["comments"],
            "gifts": obj["gifts"] ?? 0,
            // User node
            "user": {
                "id": obj["user_id"],
                "name": obj["name"],
                "profilePicture": obj["profilePicture"] ?? "",
                "following": obj["following"] == 1,
                "levelBadge": obj["levelBadge"] ?? "",
                "levelName": obj["levelName"] ?? "",
                "levelIcon": obj["levelIcon"] ?? "",
                "levelColor": obj["levelColor"] ?? "",
                "own": obj["viewer_own"] == 1,
            },
        };
    }

    parseVideoObject(obj) {
        var i = {
            "id": obj["id"] ?? 0,
            "title": obj["title"] ?? "",
            "tags": obj["tags"] ?? "",
            "gifUrl": obj["videoGifUrl"],
            "thumbnailUrl": obj["thumbnailUrl"],
            "videoUrl": obj["videoUrl"] ?? "",
            "liked": obj["viewer_liked"] == 1,
            "viewed": obj["viewed"] == 1,
            "own": obj["viewer_own"] == 1,
            "allowDuet": obj["allowDuet"] == 1,
            "allowComments": obj["allowComments"] == 1,
            "allowSharing": obj["allowSharing"] == 1,
            "allowGifts": obj["allowGifts"] == 1,
            "exclusiveCoins": obj["exclusiveAmount"] ?? 0,
            "locked": obj["isUnlocked"] == 0,
            "likes": obj["likes"] ?? 0,
            "timestamp": obj["videoTime"] ?? 0,
            "comments": obj["comments"],
            "gifts": obj["rewards"] ?? 0,
            "height": obj["height"],
            "width": obj["width"],
            "views": obj["views"],
            "videoType":obj["video_type_id"],
            "isBookMarked": obj["isBookMarked"] !== 0,
            "totalBookMarks": obj["totalBookMarks"],
            // User node
            "user": {
                "totalFollowers": obj["totalUserFollowers"],
                "id": obj["user_id"] ?? 0,
                "name": obj["name"] ?? "",
                "username": obj["username"] ?? "",
                "picture": obj["profilePicture"] ?? "",
                "levelBadge": obj["levelBadge"] ?? "",
                "levelName": obj["levelName"] ?? "",
                "levelIcon": obj["levelIcon"] ?? "",
                "levelColor": obj["levelColor"] ?? "",
                "isfollowing": obj["is_following"] !== 0,
            },
        };
        if (obj.soundId) {
            i['sound'] = {
                "id": obj["soundId"] ?? 0,
                "title": obj["sound_title"] ?? "",
                "icon": obj["albumPhotoUrl"] ?? "",
            };
        }
        return i;
    }

    parseAdVideoObject(obj) {
        var i = {
            "id": obj["id"] ?? 0,
            "title": obj["title"] ?? "",
            "tags": obj["tags"] ?? "",
            "gifUrl": obj["videoGifUrl"],
            "thumbnailUrl": obj["thumbnailUrl"],
            "videoUrl": obj["videoUrl"] ?? "",
            "clickable_url": obj["clickable_url"] ?? "",
            "budget": obj["budget"] ?? 0,
            "targetViews": obj["days_count"] ?? 0,
            "liked": obj["viewer_liked"] == 1,
            "duration": obj["total_duration"] ?? 0,
            "viewed": obj["viewed"] == 1,
            "own": true,
            "isAd": 1,
            "allowDuet": obj["allowDuet"] == 0,
            "allowComments": obj["allowComments"] == 0,
            "allowSharing": obj["allowSharing"] == 1,
            "allowGifts": obj["allowGifts"] == 1,
            "exclusiveCoins": obj["exclusiveAmount"] ?? 0,
            "locked": obj["isUnlocked"] == 0,
            "likes": obj["likes"] ?? 0,
            "comments": obj["comments"],
            "gifts": obj["gifts"] ?? 0,
            "views": obj["total_views"],
            // User node
            "user": {
                "id": obj["user_id"] ?? 0,
                "name": obj["name"] ?? "",
                "username": obj["username"] ?? "",
                "picture": obj["profilePicture"] ?? "",
                "levelBadge": obj["levelBadge"] ?? "",
                "levelName": obj["levelName"] ?? "",
                "levelIcon": obj["levelIcon"] ?? "",
                "levelColor": obj["levelColor"] ?? "",
            },
        };
        if (obj.soundId) {
            i['sound'] = {
                "id": obj["soundId"] ?? 0,
                "title": obj["sound_title"] ?? "",
                "icon": obj["albumPhotoUrl"] ?? "",
            };
        }
        return i;
    }

    parseSoundObject(obj) {
        var i = {
            "id": obj["id"] ?? 0,
            "title": obj["title"] ?? "",
            "icon": obj["albumPhotoUrl"] ?? "",
            "soundUrl": obj["soundUrl"] ?? "",
            "artist": obj["artist"] ?? "",
            "favorite": obj["isFav"] == 1,
            "duration": obj["duration"] ?? "",
            "totalVideos": obj["videos"] ?? "",
        };
        if (obj.name) {
            i['user'] = {
                "id": obj["user_id"] ?? 0,
                "name": obj["name"] ?? "",
                "username": obj["username"] ?? "",
                "picture": obj["profilePicture"],
                "levelBadge": obj["levelBadge"] ?? "",
                "levelNumber": obj["levelNumber"] ?? 1,
                "levelIcon": obj["levelIcon"] ?? "",
                "levelColor": obj["levelColor"] ?? "",
            };
        }
        return i;
    }

    // Messaging Module

    getInbox(authUserId, from, threshold = 10) {
        return new Promise(function (resolve, reject) {
            var query = "SELECT DISTINCT u.isVerified, u.id as userId, CASE WHEN m.user_id = ? THEN r.name ELSE s.name END AS IbName, CASE WHEN m.user_id = ? THEN 1 ELSE 0 END AS isOwn, CASE WHEN m.user_id = ? THEN r.profilePicture ELSE s.profilePicture END AS IbProfilePicture, m.id, m.message, m.`sentTime`, m.deliveredTime, m.seenTime, (SELECT COUNT(*) from messages WHERE (user_id = ? AND receiver_id = m.receiver_id AND seenTime = 0) OR (user_id = m.user_id AND receiver_id = ? AND seenTime = 0)) AS messageCount FROM messages m JOIN users r ON m.receiver_id = r.id JOIN users s ON m.user_id = s.id JOIN users u ON u.id = CASE WHEN m.user_id = ? THEN m.receiver_id ELSE m.user_id END JOIN ( SELECT CASE WHEN user_id = ? THEN receiver_id ELSE user_id END AS chat_partner_id, MAX(sentTime) AS max_sent_time FROM messages WHERE user_id = ? OR receiver_id = ? GROUP BY chat_partner_id ) max_sent_times ON CASE WHEN m.user_id = ? THEN m.receiver_id ELSE m.user_id END = max_sent_times.chat_partner_id AND m.`sentTime` = max_sent_times.max_sent_time ORDER BY m.sentTime DESC LIMIT ?,?";
            var params = [authUserId, authUserId, authUserId, authUserId, authUserId, authUserId, authUserId, authUserId, authUserId, authUserId, parseInt(from), parseInt(threshold)];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        resolve(false);
                    } else {
                        let messages = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const message = results[i];
                                messages.push({
                                    "messageCount": message.messageCount,
                                    "messageId": message.id,
                                    "message": {
                                        type: JSON.parse(message.message).type,
                                        message: JSON.parse(message.message).text
                                    },
                                    "sentTime": message.sentTime,
                                    "user": {
                                        "id": message.userId,
                                        "name": message.IbName,
                                        "profilePicture": message.IbProfilePicture,
                                        "isVerified": message.isVerified
                                    },
                                });
                            }
                            resolve(messages);
                        }
                        else {
                            resolve(null)
                        }
                    }
                });
            });
        }.bind(this));
    }


    getMessages(authUserId, userId, from, threshold = 10) {
        return new Promise(function (resolve, reject) {
            var query = "SELECT m.*, r.name AS receiverName, r.isVerified AS receiverVerified, r.`profilePicture` AS receiverProfilePicture, s.name AS senderName, s.isVerified AS senderVerified, s.`profilePicture` AS senderProfilePicture, CASE WHEN m.user_id = ? THEN 1 ELSE 0 END AS isOwn FROM messages m JOIN users r ON m.receiver_id = r.id JOIN users s ON m.user_id = s.id WHERE ((user_id = ? AND receiver_id = ?) OR (user_id = ? AND receiver_id = ?)) ORDER BY `sentTime` ASC LIMIT ?, ?";
            var params = [authUserId, authUserId, userId, userId, authUserId, parseInt(from), parseInt(threshold)];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        resolve(false);
                    } else {
                        let messages = [];
                        if (results.length > 0) {
                            for (let i = 0; i < results.length; i++) {
                                const message = results[i];
                                // messages.push(message)
                                messages.push({
                                    "messageId": message.id,
                                    "sentTime": message.sentTime,
                                    "deliveredTime": message.deliveredTime,
                                    "seenTime": message.seenTime,
                                    "ack": message.ack,
                                    "isOwn": message.isOwn,
                                    "message": {
                                        type: JSON.parse(message.message).type,
                                        message: JSON.parse(message.message).text
                                    },
                                    "sender": {
                                        "id": message.user_id,
                                        "name": message.senderName,
                                        "profilePicture": message.senderProfilePicture,
                                        "isVerified": message.senderVerified
                                    },
                                    "receiver": {
                                        "id": message.receiver_id,
                                        "name": message.receiverName,
                                        "profilePicture": message.receiverProfilePicture,
                                        "isVerified": message.receiverVerified
                                    },
                                });
                            }
                            resolve(messages);
                        }
                        else {
                            resolve(null)
                        }
                    }
                });
            });
        }.bind(this));
    }

    getPendingMessages(userId) {
        return new Promise(async resolve => {
            this.pool.getConnection(async function (err, connection) {
                var query = "SELECT m.*, u.name, u.profilePicture FROM messages m JOIN users u ON u.id = m.user_id WHERE m.deliveredTime = 0 AND m.receiver_id = ?";
                var params = [userId];
                query = mysql.format(query, params);
                connection.query(query, async function (err, results, fields) {
                    // connection.release();
                    var messages = [];
                    for (let i = 0; i < results.length; i++) {
                        const message = results[i];
                        messages.push({
                            "serverMessageId": message.id,
                            "message": message.message,
                            "sentTime": message.sentTime,
                            "user": {
                                "id": message.user_id,
                                "name": message.name,
                                "profilePicture": message.profilePicture,
                            },
                        });
                    }
                    connection.release();
                    resolve(messages);
                });
            });
        });
    }

    addMessage(user, conversationId, message, isAdmin = false) {
        return new Promise(async function (resolve, reject) {
            this.pool.getConnection(async function (err, connection) {
                var canMessage = true;
                // Check if sender is blocked by receiver
                const isSenderBlocked = await this.isBlocked(user.id, conversationId);
                if (isSenderBlocked) {
                    connection.release();
                    resolve(null);
                    return;
                }

                // Check if receiver is blocked by sender
                const isReceiverBlocked = await this.isBlocked(conversationId, user.id);
                if (isReceiverBlocked) {
                    connection.release();
                    resolve(null);
                    return;
                }
                if (canMessage || isAdmin) {
                    var query = "INSERT INTO messages (user_id, receiver_id, message, sentTime, ack) VALUES (?, ?, ?, ?, 1);";
                    const createTime = parseInt((new Date().getTime() / 1000).toFixed(0));
                    var params = [user.id, conversationId, message, createTime];
                    query = mysql.format(query, params);
                    connection.query(query, async function (err, results, fields) {
                        connection.release();
                        if (err) {
                            console.error("Error: ", err);
                            resolve(null);
                            return;
                        } else {
                            if (results.insertId > 0) {
                                resolve({
                                    "serverMessageId": results.insertId,
                                    "message": message,
                                    "timestamp": createTime,
                                    "user": {
                                        id: user.id,
                                        name: user.name,
                                        profilePicture: user.profilePicture,
                                    },
                                });
                            } else {
                                resolve(null);
                                return;
                            }
                        }
                    });
                } else {
                    connection.release();
                    resolve(null);
                }
            }.bind(this));
        }.bind(this));
    }

    isBlocked(userId, blockedUserId) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM blocked_users WHERE blocked_by = ? AND blocked_id = ?';
            const params = [userId, blockedUserId];
            const formattedQuery = mysql.format(query, params);

            this.pool.getConnection((err, connection) => {
                if (err) {
                    reject(err);
                    return;
                }

                connection.query(formattedQuery, (err, results, fields) => {
                    connection.release();

                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(results.length > 0);
                });
            });
        });
    }

    checkUsername(values) {
        return new Promise(function (resolve, reject) {
            var query = "SELECT * FROM users WHERE username = ?";
            var params = [values.username];
            query = mysql.format(query, params);
            this.pool.getConnection(function (err, connection) {
                connection.query(query, function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("[Error]", err);
                        resolve(null);
                        return;
                    }
                    if (results && results.length > 0) {
                        var user = results[0];
                        resolve(user);
                    } else {
                        connection.release();
                        resolve(null);
                    }
                });
            });
        }.bind(this));
    }

    updateProfile(userId, values) {
        return new Promise(async (resolve, reject) => {

            const query = 'UPDATE users SET ? WHERE id = ?';
            const params = [values, userId];
            const formattedQuery = mysql.format(query, params);

            this.pool.getConnection((err, connection) => {
                if (err) {
                    reject(err);
                    return;
                }

                connection.query(formattedQuery, (err, results, fields) => {
                    connection.release();

                    if (err) {
                        reject(err);
                        return;
                    }

                    if (results.affectedRows > 0) {
                        resolve(values);
                    } else {
                        resolve(null);
                    }
                });
            });
        });
    }

    updateProfilePic(userId, pictureUrl) {

            const query = 'UPDATE users SET profilePicture = ? WHERE id = ?';
            const params = [userId, pictureUrl];
            const formattedQuery = mysql.format(query, params);
        return new Promise(function (resolve, reject) {
            this.pool.getConnection(async function (err, connection) {
                var query = "UPDATE users SET profilePicture = ? WHERE id = ?";
                var params = [pictureUrl, userId];
                query = mysql.format(query, params);
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("Error: ", err);
                        resolve(null);
                    } else {
                        if (results.affectedRows > 0) {
                            resolve(true);
                        } else {
                            resolve(true);
                        }
                    }
                });
            });
        }.bind
        (this));

    }

    updateBio(userId, bio) {

        const query = 'UPDATE users about bio = ? WHERE id = ?';
        const params = [userId, bio];
        const formattedQuery = mysql.format(query, params);
        return new Promise(function (resolve, reject) {
            this.pool.getConnection(async function (err, connection) {
                var query = "UPDATE users SET about = ? WHERE id = ?";
                var params = [bio, userId];
                query = mysql.format(query, params);
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("Error: ", err);
                        resolve(null);
                    } else {
                        if (results.affectedRows > 0) {
                            resolve(true);
                        } else {
                            resolve(true);
                        }
                    }
                });
            });
        }.bind
        (this));

    }

    messageDelivered(conversationId, serverMessageId) {
        return new Promise(function (resolve, reject) {
            this.pool.getConnection(async function (err, connection) {
                var query = "UPDATE messages SET deliveredTime = ?, ack = 0 WHERE id = ?";
                const createTime = getTime();
                var params = [createTime, serverMessageId];
                query = mysql.format(query, params);
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("Error: ", err);
                        resolve(null);
                        return;
                    } else {
                        if (results.affectedRows > 0) {
                            resolve({
                                "serverMessageId": serverMessageId,
                                "timestamp": createTime,
                            });
                        } else {
                            resolve(null);
                            return;
                        }
                    }
                });
            });
        }.bind
            (this));
    }

    messageSeen(conversationId, serverMessageId) {
        return new Promise(function (resolve, reject) {
            this.pool.getConnection(async function (err, connection) {
                var query = "UPDATE messages SET seenTime = ?, ack = 0 WHERE id = ?";
                const createTime = getTime();
                var params = [createTime, serverMessageId];
                query = mysql.format(query, params);
                connection.query(query, async function (err, results, fields) {
                    connection.release();
                    if (err) {
                        console.error("Error: ", err);
                        resolve(null);
                        return;
                    } else {
                        if (results.affectedRows > 0) {
                            resolve({
                                "serverMessageId": serverMessageId,
                                "timestamp": createTime,
                            });
                        } else {
                            resolve(null);
                            return;
                        }
                    }
                });
            });
        }.bind
            (this));
    }
    async toHash(password){
        const salt = crypto.randomBytes(8).toString('hex');
        const buf = (await scryptAsync(password, salt,64));
        return `${buf.toString('hex')}.${salt}`
    }

    async compare(storedPassword, suppliedPassword){
        const [hashedPassword,salt] = storedPassword.split('.');
        const buf = (await scryptAsync(suppliedPassword, salt,64))
        return buf.toString('hex')===hashedPassword;
    }
}


module.exports = new DbHandler(config.dbConfig.dbHost,
    config.dbConfig.dbUsername,
    config.dbConfig.dbPassword,
    config.dbConfig.dbName,
    config.dbConfig.dbPort);