const cluster = require("../models/searchEngine.js");

var express = require('express');
const searchEngine = require("../models/searchEngine.js");
var router = express.Router();

searchEngine.buildIndex();

router.get("/",
    (req, res) => searchEngine.query(res, req));

module.exports = router;