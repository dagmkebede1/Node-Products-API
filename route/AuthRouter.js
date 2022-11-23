const express = require("express");
const Router = express.Router();
const userController = require("../controller/userController");
const AuthController = require("../controller/AuthController");
const imageHanddler = require("../middlewares/imageHanddler");
//Auth


Router.route("/signup").post(AuthController.signup);
Router.route("/login").post(AuthController.login);
Router.route("/user/forgotPassword").post(AuthController.forgotPassword);
Router.route("/user/resetPassword/:token").patch(AuthController.resetPassword);

//User Activity
//1) updating his profiles!
Router.use(AuthController.protect);
Router.route("/user/updateMyPassword").patch(AuthController.updatePassword);
Router.route("/me").get(userController.getMe);
Router.route("/user/updateMe").patch(userController.updateMe);
//2) Deleting himself
Router.route("/user/deleteMe").delete(userController.deleteMe);

//Immplemented by Admin (SUper User)

Router.route("/users")
  .get(AuthController.restrictTo("admin"), userController.findAlluser)
  // .get(userController.findAlluser)
  .post(AuthController.restrictTo("admin"), userController.createUser);

Router.route("/users/:id")
  .get(AuthController.restrictTo("admin"), userController.findUser)
  .patch(AuthController.restrictTo("admin"), userController.updateUsers)
  .delete(AuthController.restrictTo("admin"), userController.deleteUser);
module.exports = Router;
