class APIFeatures {
  constructor(query, queryObj) {
    this.query = query;
    this.queryObj = queryObj;
  }

  filter() {
    const initialQueryObj = { ...this.queryObj };
    const excludedFields = ['page', 'sort', 'limit', 'fields'];
    excludedFields.forEach(el => delete initialQueryObj[el]);

    // 1B) Advanced filtering
    let queryStr = JSON.stringify(initialQueryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    const finalQueryObj = JSON.parse(queryStr);

    this.query = this.query.find(finalQueryObj);

    return this;
  }

  sort() {
    if (this.queryObj.sort) {
      const sortBy = this.queryObj.sort.split(',').join(' ');
      this.query = this.query.sort(sortBy);
      // sort="price ratingsAverage", for descending: -price
    } else {
      this.query = this.query.sort('-createdAt _id');
    }

    return this;
  }

  limitFields() {
    if (this.queryObj.fields) {
      const fields = this.queryObj.fields.split(',').join(' ');
      this.query = this.query.select(fields);
      // include : "price ratings", exclude: "-price"
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  paginate() {
    const page = this.queryObj.page * 1 || 1;
    const limit = this.queryObj.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}
module.exports = APIFeatures;
