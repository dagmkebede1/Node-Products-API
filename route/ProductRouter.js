const express = require("express");
const Router = express.Router();
const AuthController = require("../controller/AuthController");
const {
  createProduct,
  getProduct,
  getAllproducts,
  updateProduct,
  deleteProduct,
} = require("../controller/productController");

Router.route("/products")
  .get(getAllproducts)
  .get(AuthController.protect, createProduct);
Router.route("/products/:id")
  .get(getProduct)
  .patch(AuthController.protect, updateProduct)
  .delete(AuthController.protect, deleteProduct);

Router.route("/products").post(AuthController.protect, createProduct);

module.exports = Router;
