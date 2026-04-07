const express = require("express");
const USSDController = require("../controllers/ussd.controller");

const router = express.Router();

router.post("/callback", USSDController.handleUSSD);

module.exports = router;
