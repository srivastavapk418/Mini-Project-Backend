const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    otpVerificationTimePhone: { type: Date, required: false },
    phoneNumberCode: { type: String, required: false },
    mobileOtpCount: { type: Number, required: false },
    status: { type: String, required: false },
    isPhoneNumberVerified: { type: Boolean, required: false },
    token: { type: String, required: false },
    loginAt: { type: Date, required: false },
  },
  { timestamps: true }
);
module.exports = mongoose.model("User", userSchema);
