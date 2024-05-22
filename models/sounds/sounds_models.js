const utils = require('../../utils');
const multer = require('multer');
var path = require('path');
const db = require('../../db_wrapper');

exports.getSoundsData = async (req, res) => {
    var from = req.query["from"] ?? 0;
    sounds = await db.query("SELECT * FROM sounds LIMIT ?, 20", [from]);
    const data = {  
        sounds: sounds,
    };
    res.render('pages/sounds', data);
}

exports.getFetchSound = async (req, res) => {
    var from = req.query["from"] ?? 0;
    sounds = await db.query("SELECT * FROM sounds LIMIT ?, 50", [parseInt(from)]);
    const data = {  
        sounds: sounds,
    };
    res.send(data);
}

// const soundStorage = multer.diskStorage({
//     destination: function (req, file, cb) {
//       cb(null, 'uploads/sounds')
//     },
//     filename: function (req, file, cb) {
//       const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
//       cb(null, uniqueSuffix)
//     }
// })
// const uploadSoundCategory = multer({ storage: soundStorage} );
// exports.postAddSound = uploadSoundCategory.single('sound'), async (req, res) => {
    
//     if (req.session.user.power == 0) {
//         res.send({ status: 'success', message: 'You are on a demo account. Changes were not applied.' });
//         return;
//       }
//     userData = req.body;

//     var soundUrl = "";
//     var soundPath = "";
//     if (req.file) {
//         // Sound is uploaded
//         soundUrl = config.hostAddress + "uploads/sounds/" + req.file.filename;
//         soundPath = req.file.path;
//         console.log(soundUrl, soundPath)
//     } 
//     if(soundUrl == ""){
//         const addSound = await db.execute(`INSERT INTO sounds (user_id, title, artist) VALUES (?, ?, ?);`, [userData.id, userData.title, userData.artist]);
//     }
//     else{
//         const addSound = await db.execute(`INSERT INTO sounds (user_id, title, soundUrl, soundPath, artist) VALUES ( ?, ?, ?, ?, ?);`, [userData.id, userData.title, soundUrl, soundPath, userData.artist]);

//     }
//     res.send({ status: 'success', message: 'Your data has been inserted successfully!' });
// }

exports.postDeleteSound = async (req, res) => {

    if (req.session.user.power == 0) {
        res.send( { status: 'success', message: 'You are on a demo account. Changes were not applied.' });
        return;
      }
    userData = req.body;
    const deleteSound = await db.execute(`DELETE FROM sounds WHERE id = ?`, [userData.id]);
    res.send({ status: 'success', message: 'Sound has been deleted successfully!' });
}
