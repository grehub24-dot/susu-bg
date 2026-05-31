const express = require("express");
const UserController = require("../controllers/user.controller");

const router = express.Router();

router.get("/profile", UserController.getProfile);
router.put("/profile", UserController.updateProfile);

module.exports = router;
