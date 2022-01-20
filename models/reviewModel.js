const mongoose = require('mongoose');
const Tour = require('./tourModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, ' Please write a review']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: [true, 'Please rate the given review']
    },
    createdAt: {
      type: Date,
      default: Date.now(),
      select: false
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour']
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'A review must belong to a user']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// QUERY MIDDLEWARE:
reviewSchema.pre(/^find/, function(next) {
  // this.populate({
  //   path: 'tour',
  //   select: 'name'
  // }).populate({
  //   path: 'user',
  //   select: 'name photo'
  // });
  this.populate({
    path: 'user',
    select: 'name photo'
  });
  next();
});

// static methods: this keyword points to current model
// Static method iss called by: Model_name.method_name()

reviewSchema.statics.calcAverageRatings = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(
      tourId,
      {
        ratingsQuantity: stats[0].nRating,
        ratingsAverage: stats[0].avgRating
      },
      { runValidators: true }
    );
  } else {
    await Tour.findByIdAndUpdate(
      tourId,
      {
        ratingsQuantity: 0,
        ratingsAverage: 4.5
      },
      { runValidators: true }
    );
  }
};

///////Recalculating averageRating after adding new review to a tour/////////
reviewSchema.post('save', function(doc, next) {
  // this points to curent review
  // this.constructor points to documents ctor i.e. model
  this.constructor.calcAverageRatings(this.tour);
  next();
});

/* findByIdAndUpdate, findbyIdAndDelete: no document middlewares exist. 
Only query middlewares for these two. behind the scenes converted to
findOneAndUpdate, findOneAndDelete */

// QUERY MIDDLEWARE
reviewSchema.post(/^findOneAnd/, async function(doc, next) {
  await doc.constructor.calcAverageRatings(doc.tour);
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
