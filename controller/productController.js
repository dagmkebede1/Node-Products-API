const CatchAsync = require("../utils/CatchAsync");
const { StatusCodes } = require("http-status-codes");
const AppError = require("../utils/AppError");
const products = require("../model/products");

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

const createProduct = CatchAsync(async (req, res, next) => {
  const currentUser = req.user;

  // Creating Products by the Admin
  if (currentUser.role === "admin") {
    const filteredBody = filterObj(
      req.body,
      "name",
      "price",
      "featured",
      "rating",
      "company"
    );
    const newProducts = new products(filteredBody);

    const savedProducts = await newProducts.save();
    res.status(StatusCodes.CREATED).json({
      status: "success",
      data: { savedProducts },
    });
  }
});

const updateProduct = CatchAsync(async (req, res, next) => {
  const id = req.params.id;
  const currentUser = req.user;
  //   const filteredBody = filterObj(
  //     req.body,
  //     "name",
  //     "price",
  //     "featured",
  //     "rating",
  //     "company"
  //   );
  const { name, price, featured, rating, company } = req.body;

  // Updating Patient's Data by Receptionist
  if (currentUser.role === "admin") {
    const product = await products.findById({ _id: id });
    if (name) product.name = name;
    if (price) product.price = price;
    if (featured) product.featured = featured;
    if (rating) product.rating = rating;
    if (company) product.company = company;

    await product.save({ runValidators: false });

    if (!product) {
      res.status(StatusCodes.NOT_FOUND).json({
        status: "success",
        message: `No Patient with ID : ${id}`,
      });
    } else {
      res.status(StatusCodes.OK).json({
        status: "success",
        data: product,
      });
    }
  }
});

const deleteProduct = CatchAsync(async (req, res, next) => {
  const id = req.params.id;
  const currentUser = req.user;

  if (currentUser.role === "admin") {
    const deletedProduct = await products.findByIdAndDelete(
      { _id: id },
      { new: true }
    );
    if (!deletedProduct) {
      res.status(StatusCodes.NOT_FOUND).json({
        status: "success",
        message: `No Patient with ID : ${id}`,
      });
    } else {
      res.status(StatusCodes.OK).json({
        status: "success",
        data: { deletedProduct },
      });
    }
  } else {
    return next(
      new AppError(
        `You Do Not Have Permission to Delete Patient`,
        StatusCodes.BAD_REQUEST
      )
    );
  }
});

const getAllproducts = CatchAsync(async (req, res) => {
  const data = await products.find();
  res.status(200).json({ data, nbHits: data.length });
});

const getProduct = CatchAsync(async (req, res) => {
  const { featured, company, name, sort, field, numericFilters } = req.query;
  let queryObject = {};
  //fiter by featured
  if (featured) {
    queryObject.featured = featured === "true" ? true : false;
  }
  //filter by a company
  if (company) {
    queryObject.company = company;
  }
  //search by a name
  if (name) {
    queryObject.name = { $regex: name, $options: "i" };
  }
  if (numericFilters) {
    const operatorMap = {
      ">": "$gt",
      ">=": "$gte",
      "=": "$eq",
      "<": "$lt",
      "<=": "$lte",
    };
    const regEx = /\b(<|>|>=|=|<|<=)\b/g;
    let filters = numericFilters.replace(
      regEx,
      (match) => `-${operatorMap[match]}-`
    );
    // console.log(filters);
    const options = ["price", "rating"];
    filters = filters.split(",").forEach((item) => {
      const [field, operator, value] = item.split("-");
      if (options.includes(field)) {
        queryObject[field] = { [operator]: Number(value) };
      }
    });
  }
  // console.log(queryObject)
  let result = products.find(queryObject);
  //sort by alphabetical string(name, company) and numbers(price)
  if (sort) {
    const sortlist = sort.split(",").join(" ");
    result = result.sort(sortlist);
  } else {
    result = result.sort("createdAt");
  }
  //select the elements to apper from the filter
  if (field) {
    const fieldlist = field.split(",").join(" ");
    result = result.select(fieldlist);
  }
  //page number is an input from client and default 1
  //limit is how many items to apper on the single page
  //skip is also an input from the client it helps to skip items per the pages
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  result = result.skip(skip).limit(limit);

  // console.log(queryObject);
  const data = await result;

  res.status(200).json({ data, nbHits: data.length });
});

module.exports = {
  createProduct,
  getAllproducts,
  getProduct,
  updateProduct,
  deleteProduct,
};
