const { validationResult } = require('express-validator');
const AppError = require("../utils/appError");


module.exports = ((req, res, next) => {
    const errors = validationResult(req);
    console.log(errors)
    if (!errors.isEmpty()){
        throw new AppError(errors.array()[0].msg,400)
    }
        next()

});