const express = require("express");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const ProductRouter = require("./route/ProductRouter");
const authRouter = require("./route/AuthRouter");
const globalErrorHanddler = require("./middlewares/errorHanddler");
const notFound = require("./route/notFound");
const AppError = require("./utils/AppError");
const CatchAsync = require("./utils/CatchAsync");
const mongoSanitize = require("express-mongo-sanitize");
const xss = require("xss-clean");
const hpp = require("hpp");
const port = 3000 || process.env.PORT;
const app = express();

//Secure the Header
app.use(helmet());
app.use(cors());
app.use(cookieParser());
//Limit the requests from the same IP's....protections against {DDOS & brute force attacks}
const Limiter = rateLimit({
  max: 500,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, Please try again in an hour",
});
app.use("/", Limiter);
app.use(express.json({ limit: "10kb" }));
//Data Sanitization against NoSQL query injections
app.use(mongoSanitize());

//Data Sanitization against XSS attacks
// app.use(xss());

//Prevent Parameter Pollution

app.use(
  hpp({
    whitelist: ["name", "price", "sort", "featured", "rating", "company"],
  })
);
app.use(ProductRouter);
app.use(authRouter);

app.use(notFound);

app.use(globalErrorHanddler);

const start = CatchAsync(async (uri, port) => {
  await mongoose.connect(uri);
  console.log("Database connected Successfully!");
  app.listen(port, console.log(`server running on port: ${port}`));
});

start(process.env.MONGO_URI, port);
