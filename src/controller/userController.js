// const { getEnv } = require("../config/env");
const { USER_ACTIVE_STATUS } = require("../constants/users");
const userModel = require("../model/userModel");
const random = require("randomstring");
const jwt = require("jsonwebtoken");
const client = require("twilio")(
  "AC7b525fd3f754fabafd82797bcba6c228",
  "60ba221a1bdbce4a2e1d6b34e12a0646"
);
const createAccessToken = async (id, mobileNumber) => {
  const accessToken = jwt.sign(
    {
      id,
      mobileNumber,
    },
    "Style",
    {
      expiresIn: `30d`,
    }
  );
  return accessToken;
};

const generateOtp = async () => {
  const randomGenerateOTP = random.generate({
    length: 5,
    charset: "numeric",
  });
  return randomGenerateOTP;
};

const getMe = async (phone) => {
  const user = await userModel.findOne({
    phone,
    status: USER_ACTIVE_STATUS.ACTIVATED,
  });

  return user;
};

const sentTwilioOtp = async (randomGenerateOTP, phone) => {
  const sms = await client.messages.create({
    body: `Your OTP code is ${randomGenerateOTP}`,
    from: "+12016769950",
    to: `${phone}`,
  });
  if (sms.sid) return { status: true };
  return { status: false };
};

const findByIdOnTimeIncrement = async (userId, randomGenerateOTP) => {
  const updated = await userModel.findOneAndUpdate(
    { _id: userId },
    {
      mobileOtpCount: 1,
      phoneNumberCode: randomGenerateOTP,
      otpVerificationTimePhone: new Date(),
    },
    {
      new: true,
    }
  );

  if (updated) return "user updated";
  else
    return res.status(400).send({
      status: false,
      message: "unable to update userdata",
    });
};

const sendOTP = async (req, res) => {
  const currentTime = new Date();
  if (Object.keys(req.body).length == 0) {
    return res
      .status(400)
      .send({ status: false, message: "request body can't be empty" });
  }
  const { phone, firstName, lastName, email, password } = req.body;
  const randomGenerateOTP = await generateOtp();
  const findData = await getMe(phone);
  if (findData) {
    const diffTime = Math.ceil(
      Math.abs(
        findData.otpVerificationTimePhone.getTime() - currentTime.getTime()
      ) / 60000
    );

    if (findData.mobileOtpCount >= 5 && diffTime < 20) {
      return res.status(400).send({
        status: false,
        message: "maximum limit exceeded for otp sending",
      });
    } else if (findData.mobileOtpCount >= 5 && diffTime >= 30) {
      const otptwilio = await sentTwilioOtp(randomGenerateOTP, phone);
      if (!otptwilio.status)
        return res
          .status(400)
          .send({ status: false, message: "unable to send otp" });

      const userId = findData._id;
      await findByIdOnTimeIncrement(userId, randomGenerateOTP);

      return res
        .status(200)
        .send({ status: true, message: "otp send successfully" });
    } else if (findData.mobileOtpCount < 5) {
      const otptwilio = await sentTwilioOtp(randomGenerateOTP, phone);
      if (!otptwilio.status)
        return res
          .status(400)
          .send({ status: false, message: "unable to send otp" });

      await userModel.findOneAndUpdate(
        { _id: findData?._id },
        {
          otpVerificationTimePhone: new Date(),
          phoneNumberCode: randomGenerateOTP,
          mobileOtpCount: findData.mobileOtpCount + 1,
        },
        { new: true }
      );

      return res
        .status(200)
        .send({ status: true, message: "otp send successfully" });
    }
    return res.status(400).send({ status: false, message: "invalid request" });
  } else {
    const otptwilio = await sentTwilioOtp(randomGenerateOTP, phone);
    if (!otptwilio.status)
      return res
        .status(400)
        .send({ status: false, message: "unable to send otp" });

    await userModel.create({
      phone,
      firstName,
      lastName,
      email,
      password,
      mobileOtpCount: 1,
      otpVerificationTimePhone: new Date(),
      phoneNumberCode: randomGenerateOTP,
      status: USER_ACTIVE_STATUS.ACTIVATED,
      isPhoneNumberVerified: false,
    });

    return res
      .status(201)
      .send({ status: true, message: "otp send successfully" });
  }
};

const resendOtp = async (req, res) => {
  const currentTime = new Date();
  if (Object.keys(req.body).length == 0) {
    return res
      .status(400)
      .send({ status: false, message: "request body can't be empty" });
  }
  const user = await getMe(req.body.phone);
  if (!user)
    return res.status(400).send({ status: false, message: "user not found" });
  const randomGenerateOTP = await generateOtp();

  const diffTime = Math.ceil(
    Math.abs(user.otpVerificationTimePhone.getTime() - currentTime.getTime()) /
      60000
  );
  if (user.mobileOtpCount >= 5 && diffTime < 30) {
    return res.status(400).send({
      status: false,
      message: "maximum limit exceeded for otp sending",
    });
  } else if (user.mobileOtpCount >= 5 && diffTime >= 30) {
    const otp = await sentTwilioOtp(randomGenerateOTP, req.body.phone);
    if (!otp.status)
      return res.status(400).send({
        status: false,
        message: "unable to send otp",
      });

    await findByIdOnTimeIncrement(user._id, randomGenerateOTP);

    return res
      .status(200)
      .send({ status: true, message: "otp send successfully" });
  } else if (user.mobileOtpCount < 5) {
    const otp = await sentTwilioOtp(randomGenerateOTP, req.body.phone);
    if (!otp.status)
      return res.status(400).send({
        status: false,
        message: "unable to send otp",
      });

    const updatedData = await userModel.findOneAndUpdate(
      { _id: user._id },
      {
        mobileOtpCount: user.mobileOtpCount + 1,
        phoneNumberCode: randomGenerateOTP,
        otpVerificationTimePhone: new Date(),
      },
      { new: true }
    );
    if (!updatedData)
      return res.status(400).send({
        status: false,
        message: "unable to update user",
      });

    return res
      .status(200)
      .send({ status: true, message: "otp send successfully" });
  }
  return res.status(400).send({ status: false, message: "invalid request" });
};

const verifyMobileOtp = async (req, res) => {
  const currentTime = new Date();
  if (!req.body.phone || !req.body.otpCode) {
    return res
      .status(400)
      .send({ status: false, message: "invalid request body" });
  }
  const userData = await userModel.findOne({
    phone: req.body.phone,
  });
  if (!userData)
    return res
      .status(400)
      .send({ status: false, message: "maximum limit exceeded" });

  if (userData.mobileOtpCount > 5)
    return res
      .status(400)
      .send({ status: false, message: "maximum limit exceeded" });

  if (
    !userData.isPhoneNumberVerified &&
    userData.phoneNumberCode === req.body.otpCode
  ) {
    const mobileOtpTime = userData.otpVerificationTimePhone;
    const diff = Math.abs(mobileOtpTime - currentTime.getTime());
    const totalSeconds = Math.ceil(diff / 1000);

    if (totalSeconds > 120)
      return res
        .status(400)
        .send({ status: false, message: "Request timout resend OTP" });

    const updatedUser = await userModel.findOneAndUpdate(
      { _id: userData?._id },
      {
        isPhoneNumberVerified: true,
      },
      { new: true }
    );

    if (!updatedUser)
      return res
        .status(400)
        .send({ status: false, message: "unable to update user" });

    return res.status(200).send({
      status: true,
      message: "phone verified successfully",
    });
  } else if (
    userData.isPhoneNumberVerified &&
    userData.phoneNumberCode === req.body.otpCode
  ) {
    const mobileOtpTime = userData.otpVerificationTimePhone;
    const diff = Math.abs(mobileOtpTime - currentTime.getTime());
    const totalSeconds = Math.ceil(diff / 1000);

    if (totalSeconds > 120)
      return res
        .status(400)
        .send({ status: false, message: "Request timout resend OTP" });

    return res.status(200).send({
      status: true,
      message: "phone verified successfully",
    });
  }

  return res.status(400).send({ status: false, message: "invalid request" });
};

const loginUser = async (req, res) => {
  if (!req.body.phone || !req.body.password)
    return res
      .status(400)
      .send({ status: false, message: "invalid request body" });

  const userData = await getMe(req.body.phone);
  const accessToken = await createAccessToken(userData?._id, userData?.phone);

  const updatedUser = await userModel.findOneAndUpdate(
    { phone: req.body.phone, password: req.body.password },
    {
      token: accessToken,
      isPhoneNumberVerified: true,
      loginAt: new Date(),
    },
    { new: true }
  );

  if (!updatedUser)
    return res
      .status(400)
      .send({ status: false, message: "unable to login invalid credentials" });

  return res.status(200).send({
    status: true,
    data: {
      accessToken,
      userId: userData._id,
    },
  });
};

const logout = async (req, res) => {
  if (!req.body.userId || !req.body.accessToken)
    return res
      .status(400)
      .send({ status: false, message: "invalid request body" });

  const updateUser = await userModel.findOneAndUpdate(
    { _id: req.body.userId, token: req.body.accessToken },
    { token: "", loginAt: null },
    { new: true }
  );

  if (!updateUser)
    return res.status(400).send({ status: false, message: "invalid request" });

  return res.status(200).send({ status: true, message: "logout successfully" });
};

module.exports = {
  sendOTP,
  resendOtp,
  verifyMobileOtp,
  loginUser,
  logout,
};
