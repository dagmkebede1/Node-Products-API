const Mongoose = require("mongoose");

const productSchema = new Mongoose.Schema(
  {
    name: { type: String, required: [true, "product name must be provided!"] },
    price: { type: Number, required: [true, "price must be provided!"] },
    featured: { type: Boolean, default: false },
    rating: { type: Number, default: 4.5 },
    company: {
      type: String,
      // enum: {
      //   values: ["apple", "dell", "hp", "lenevo"],
      //   message: "{VALUE} is not supported",
      // },
    },
    image: {
      type: String,
      required: [true, "image must be provided!"],
    },
  },
  { timestamps: true }
);

module.exports = Mongoose.model("Product", productSchema);
