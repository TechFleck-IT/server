const express = require("express");
const db = require("../config/db_handler");
const router = express.Router();
const sendSuccess = require(".././utils/send_success");


router.get('/counties', async (req, res) => {
    const countries = await db.getAllCountries();
    sendSuccess(res,200, countries);
});

router.get('/cities/country/:id', async (req, res) => {
    const cities = await db.getCitiesByCountryId(req.params.id);
    sendSuccess(res,200, cities);
});

router.get('/business-types', async (req, res) => {
    const businessTypes = await db.getAllBusinessTypes();
    sendSuccess(res,200, businessTypes);
});

router.get('/category/business-type/:id', async (req, res) => {
    const category = await db.getBusinessTypesCategoryByBusinessTypeId(req.params.id);
    sendSuccess(res,200, category);
});

router.get('/video-types', async (req, res) => {
    const category = await db.getVideoTypes();
    sendSuccess(res,200, category);
});

module.exports = router