const express = require("express");
const router = express.Router();

const { getBeds, updateBeds, createBed } = require("../controllers/bedController");

router.get("/", getBeds);
router.post("/", createBed);
router.patch("/:id", updateBeds);


module.exports = router;