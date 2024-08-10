module.exports = send_success = (res, statusCode, data, results = 1) => {
    res.status(statusCode).send(
        {
            status:"success",
            results,
            data: data
        }
    )
}