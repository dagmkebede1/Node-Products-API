const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const UserSchema = new mongoose.Schema({
  img: { type: String },

  firstname: {
    type: String,
    required: [true, "Please provide your Firstname"],
    minlength: 1,
  },
  lastname: {
    type: String,
    required: [true, "Please provide your Lasttname"],
    minlength: 1,
  },
  email: {
    unique: [true, "this email exists in the system try other"],
    type: String,
    validate: [validator.isEmail, "Please provide a valid email Address"],
    lowercase: true,
  },
  phone: {
    type: String,
  },
  sex: {
    type: String,
    enum: {
      values: ["male", "female"],
      message: "{VALUE} is not Supported",
    },
  },
  password: {
    type: String,
    required: true,
    minlength: 8,
    select: false,
  },
  passwordConform: {
    type: String,
    required: true,
    validate: {
      validator: function (passCon) {
        return passCon === this.password;
      },
      message: `The password you entered is not the same`,
    },
  },
  passwordChangedAt: { type: Date },
  role: {
    type: String,
    enum: ["guest", "admin"],
  },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});
//pre is built in mongoose Middleware!
// hashing the password feild before saving in the db and removing the conform field
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordConform = undefined;
  next();
});

//the authomatic setting of passwordChangedAt filed.
UserSchema.pre("save", function (next) {
  if (!this.isModified("password") || this.isNew) return next();

  this.passwordChangedAt = Date.now() - 1000;
  next();
});
//Only geting the active users in the find query
UserSchema.pre(/^find/, function (next) {
  //this points to the current query, which starts with find
  this.find({ active: true });
  next();
});
//the function that compares the hashed in the db and intered one using bycrypt package
UserSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

//the token should be invalid if the user changed his password
UserSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp; //ex: 100 < 200 --- true
  }
  // False means NOT changed
  return false;
};

//Creating a Password reset token using built in crypto
UserSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  console.log(resetToken, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model("User", UserSchema);
