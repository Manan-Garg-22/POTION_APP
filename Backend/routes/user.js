const express = require("express");
const router = express.Router();
require("dotenv").config();
const { body, validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const User = require("../models/USER");
const Events = require("../models/EVENTS");
const NGO = require("../models/NGO");
const DonationLogs = require("../models/DonationLogs");
var jwt = require("jsonwebtoken");
const Applied = require("../models/UserApplied");
const JWT_SECRET = process.env.JWT_SECRET;

//  Register

router.post(
  "/check_user",
  [body("email", "Enter a valid Email").isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    let check = false;
    if (!errors.isEmpty()) {
      return res.status(400).json({ check, errors: errors.array() });
    }
    try {
      let user = await User.findOne({ email: req.body.email });
      if (user) {
        return res.json({ check });
      }
      check = true;

      return res.json({ check });
    } catch (error) {
      console.log({ error: error.message });
      res.json({ error: error.message });
    }
  }
);
router.post(
  "/Register",
  [
    // validating the name ,email and password.
    body("name", "Enter a valid name").isLength({ min: 4 }),
    body("email", "Enter a valid Email").isEmail(),
    body("password", "Password must have at least 5 characters").isLength({
      min: 5,
    }),
  ],
  async (req, res) => {
    console.log("here i am");
    const errors = validationResult(req);
    let success = false;
    if (!errors.isEmpty()) {
      return res.status(400).json({ success, errors: errors.array() });
    }
    // checking for non unique email.
    try {
      let user = await User.findOne({ email: req.body.email });
      console.log(" below email");
      if (user) {
        return res
          .status(400)
          .json({ success, message: "this user already exists" });
      }

      const myPass = req.body.password;

      // these are returning promises . Hence we should use await . here we encypting the password
      const salt = bcrypt.genSaltSync(saltRounds);
      const hash = bcrypt.hashSync(myPass, salt);

      user = await User.create({
        name: req.body.name,
        password: hash,
        email: req.body.email,
        UPI: req.body.UPI,
        payee: req.body.payee,
        category: req.body.category,
      });

      const data = {
        user: {
          id: user.id,
        },
      };
      const { password, ...userWithoutPassword } = user.toObject();

      success = true;
      const token = jwt.sign(data, JWT_SECRET);
      res.json({ sucess: success, user: userWithoutPassword });
    } catch (error) {
      console.error("something went wrong");
      res.status(500).json({ error: error.message });
    }
  }
);

// Login

router.post(
  "/login",
  [
    // validating the name ,email and password.
    body("email", "Enter a valid Email").isEmail(),
    body("pass", "Password should not be blank").exists(),
  ],
  async (req, res) => {
    // CHECKING FOR INFORMATION ENTERED BY THE USER
    const errors = validationResult(req);
    let success = false;
    if (!errors.isEmpty()) {
      return res.status(400).json({ success, errors: errors.array() });
    }

    try {
      //  destructuring of ther request
      const { email, pass } = req.body;
      let user = await User.findOne({ email });
      if (!user) {
        return res
          .status(400)
          .json({ success, message: "Such user does not exists" });
      }

      const passCompare = await bcrypt.compare(pass, user.password);
      if (!passCompare) {
        return res
          .status(400)
          .json({ success, error: "Please enter the correct credetials" });
      }

      const data = {
        user: {
          id: user.id,
        },
      };
      const { password, ...userWithoutPassword } = user.toObject();

      success = true;
      const token = jwt.sign(data, JWT_SECRET);
      res.json({ success, user: userWithoutPassword });
    } catch (error) {
      console.error(error.message);
      res.status(500).json({ error: error.message });
    }
  }
);

// apply for an event
router.post("/apply", async (req, res) => {
  try {
    let success = false;
    // checking if the user has already applied for the event .

    let e = req.body.email;
    let eid = req.body.Eid;

    const check = await Applied.findOne({
      Eid: eid,
      email: e,
    });
    if (check) {
      return res
        .status(400)
        .json({ success, error: "You have already applied for the event" });
    }

    let event = await Applied.create({
      name: req.body.name,
      email: req.body.email,
      message: req.body.message,
      Resume: req.body.resume,
      Eid: req.body.Eid,
    });

    const data = {
      event: {
        id: event.id,
      },
    };
    success = true;
    console.log(event.id);
    res.json({ success, data });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: error.message });
  }
});

// find events for which user applied

router.get("/findmyevents", async (req, res) => {
  try {
    const data = await Applied.find({ email: req.query.email });
    const events = [];

    for (let i = 0; i < data.length; i++) {
      const item = await Events.findById(data[i].Eid);
      events.push(item);
    }
    let success = true;
    res.json({ success, events });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});
// find all events
router.get("/getevents", async (req, res) => {
  try {
    const data = await Events.find();
    let success = true;
    res.json({ success, data });
  } catch (error) {
    res.json({ error: error.message });
  }
});
// donation

router.post("/donate", async (req, res) => {
  try {
    const targetNGO = await NGO.find({ email: req.body.ngoEmail });
    targetNGO.funds += req.body.donationAmount;
    await DonationLogs.create({
      fromUser: req.body.email,
      toNgo: targetNGO.email,
      amount: req.body.donationAmount,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
module.exports = router;
