
const sendErrorDev = (err, req, res) => {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });

};

const sendErrorProd = (err,req,res)=>{

        // A) Operational, trusted error: send message to client
        if (err.isOperational) {
            return res.status(err.statusCode).json({
                status: err.status,
                message: err.message
            });
        }
        // B) Programming or other unknown error: don't leak error details
        // 1) Log error
        console.error('ERROR 💥', err);
        // 2) Send generic message
        return res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!'
        });

}



module.exports = ((err, req, res, next) => {
    // error handling MW
    console.log(err);
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // note that there is no handling for diff env right now
    if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV == null) {
        sendErrorDev(err, req,res);
    } else if (process.env.NODE_ENV === 'prod') {
        sendErrorProd(err,req,res)
    }



});