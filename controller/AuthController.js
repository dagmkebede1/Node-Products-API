const mongoose = require("mongoose");
const { promisify } = require("util");
const User = require("../model/users");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const AppError = require("../utils/AppError");
const CatchAsync = require("../utils/CatchAsync");
const sendEmail = require("../utils/email");
const jwt = require("jsonwebtoken");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

exports.signup = CatchAsync(async (req, res, next) => {
  const savedUser = await User.create({
    firstname: req.body.firstname,
    lastname: req.body.lastname,
    sex: req.body.sex,
    email: req.body.email,
    password: req.body.password,
    passwordConform: req.body.passwordConform,
    role: req.body.role,
    phone: req.body.phone,
  });

  const token = signToken(savedUser._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    //this will be true in the hosting and productions
    secure: false,
    httpOnly: true,
  };
  res.cookie("jwt", token, cookieOptions);
  //removing the password from the output of saved user but its found in the database!
  savedUser.password = undefined;
  res.status(200).json({
    status: "success",
    token,
    expiresIn: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    data: { savedUser },
  });
});

exports.login = CatchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //checking for the entry
  if (!email || !password) {
    return next(new AppError("Please provide Email and Password!", 400));
    //400: bad request
  }
  //checking for the user
  const user = await User.findOne({ email }).select("+password");

  //checking for the user password
  if (!user || !(await user.correctPassword(password, user.password))) {
    //401: unAuthorized Request
    return next(new AppError("Invalid email or password", 401));
  }

  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    //this will be true in the hosting and productions
    secure: false,
    httpOnly: true,
  };
  res.cookie("jwt", token, cookieOptions);
  res.status(200).json({
    status: "success",
    expiresIn: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),

    token: token,
  });
});

exports.protect = CatchAsync(async (req, res, next) => {
  //1) Getting token and checking if its there!
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access", 401)
    );
  }
  //2) Verification Token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  //3) checking if the user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist.",
        401
      )
    );
  }
  //4) cheach if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again", 401)
    );
  }
  //GRANT THE ACCESS!
  req.user = currentUser;
  next();
});

//specifing the roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // roles ['admin', 'user', 'staff']
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("you do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

exports.forgotPassword = CatchAsync(async (req, res, next) => {
  //1) Get user based on the POSTED email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError("There is no user with that email address.", 404));
  }

  //2) Generate the random reset Token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  //3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/user/resetPassword/${resetToken}`;

  const message = `Forgot your password? Summit a PATCH request with your new password and passwordConfirm to: ${resetURL}. \nIf you didn't forget your password, please Ignore this email`;
  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset token (valid for 10 min)",
      message,
    });

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
  }
});

exports.resetPassword = CatchAsync(async (req, res, next) => {
  //1) Get user based on the token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2) If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400)); //400: bad requset
  }

  user.password = req.body.password;
  user.passwordConform = req.body.passwordConform;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  //3) update changePasswordAt property for the user----in the schema pre Middleware
  //4) log the user in, send JWT
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    //this will be true in the hosting and productions
    secure: false,
    httpOnly: true,
  };
  res.cookie("jwt", token, cookieOptions);
  res.status(200).json({
    status: "success",
    expiresIn: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),

    token: token,
  });
});

exports.updatePassword = CatchAsync(async (req, res, next) => {
  //1) Get user from collesction
  const user = await User.findById(req.user.id).select("+password");

  //2) Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Your current password is wrong.", 401)); //unathorized
  }
  //3) if so, update password
  user.password = req.body.password;
  user.passwordConform = req.body.passwordConform;
  await user.save();

  //4) Log user in, send JWT
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    //this will be true in the hosting and productions
    secure: false,
    httpOnly: true,
  };
  res.cookie("jwt", token, cookieOptions);
  res.status(200).json({
    status: "success",
    expiresIn: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),

    token: token,
  });
});
