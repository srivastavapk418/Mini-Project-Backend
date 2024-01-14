const router = require("express").Router();
const {
  sendOTP,
  resendOtp,
  verifyMobileOtp,
  logout,
  loginUser,
} = require("../controller/userController");

router.post("/register", sendOTP);
router.post("/resend", resendOtp);
router.post("/verify", verifyMobileOtp);
router.post("/login", loginUser);
router.post("/logout", logout);

router.all("/*", function (req, res) {
  return res.status(404).send({ status: false, message: "Page Not Found" });
});
module.exports = router;
