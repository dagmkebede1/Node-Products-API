const AppError = require("../utils/AppError");

const notFound =
  ("*",
  (req, res, next) => {
    next(new AppError(`Resourse not found on the ${req.Originalurl}`, 404));
  });

module.exports = notFound;
