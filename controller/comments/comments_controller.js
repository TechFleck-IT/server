const commentModel = require('../../models/comments/comments_models');

exports.getCommentData = async (req, res) => {
  const data = await commentModel.getCommentData();
  res.render('pages/comments', data);
}

exports.postDeleteComment = async (req, res) => {
  if (req.session.user.power == 0) {
    res.send({ status: 'success', message: 'You are on a demo account. Changes were not applied.' });
    return;
  }
  userData = req.body;
  await commentModel.deleteComment(userData.id);
  res.send({ status: 'success', message: 'Comment has been deleted successfully!' });
}

exports.getEditCommentVideo = async (req, res) => {
  const id = req.query.id;
  const data = await commentModel.getCommentVideo(id);
  res.render('pages/comment_video_details', data);
}
