const Tag = require('../../models/tags/tags_model');

exports.getTagsData = async (req, res) => {
    const tags = await Tag.getAll();
    const data = {  
        tags: tags,
    };
    res.render('pages/tags', data);
}

exports.postAddTag = async (req, res) => {
    const userData = req.body;

    const result = await Tag.create(userData);
    res.send({ status: 'success', message: 'Your data has been inserted successfully!' });
}

exports.postUpPriority = async (req, res) => {
    try {
        const userData = req.body;
    
        const result = await Tag.updatePriority(userData.id, 'up');      
    
        res.send({ status: 'success', message: 'Your Priority has been updated successfully!' });
      } catch (error) {
  
        res.send({ status: 'error', message: error.message });
      }
}

exports.postDownPriority = async (req, res) => {
    try {
        const userData = req.body;
    
        const result = await Tag.updatePriority(userData.id, 'down');      
    
        res.send({ status: 'success', message: 'Your Priority has been updated successfully!' });
      } catch (error) {
        console.error(error);
        res.send({ status: 'error', message: error.message });
      }
}

exports.postDeleteTag = async (req, res) => {
    const userData = req.body;
    const result = await Tag.delete(userData.id);
    res.send({ status: 'success', message: 'Your tag has been deleted successfully!' });
}
