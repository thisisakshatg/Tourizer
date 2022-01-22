const Tour = require('./../models/tourModel');
const User = require('./../models/userModel');
const Booking = require('./../models/bookingModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

const csp =
  "default-src 'self' https://js.stripe.com/v3/ https://cdnjs.cloudflare.com https://api.mapbox.com; base-uri 'self'; block-all-mixed-content; connect-src 'self' https://js.stripe.com/v3/ https://cdnjs.cloudflare.com/ https://*.mapbox.com/; font-src 'self' https://fonts.google.com/ https: data:;frame-ancestors 'self'; img-src 'self' data:; object-src 'none'; script-src 'self' https://js.stripe.com/v3/ https://cdnjs.cloudflare.com/ https://api.mapbox.com/ blob:; script-src-attr 'none'; style-src 'self' https: 'unsafe-inline'; upgrade-insecure-requests;";

exports.alerts = (req, res, next) => {
  const { alert } = req.query;
  if (alert === 'booking')
    res.locals.alert =
      'Your booking was successful. Please check your email for confirmation. If your booking is not showing immediately, please come back later!';
  next();
};

exports.getOverview = catchAsync(async (req, res, next) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();

  // 2) Build template

  // 3) Render that template
  res
    .status(200)
    .set('Content-Security-Policy', csp)
    .render('overview', {
      title: 'All Tours',
      tours: tours
    });
});

exports.getTour = catchAsync(async (req, res, next) => {
  // 1.) Get tour data including reviews and guides
  const tourSlug = req.params.tourSlug;
  const tour = await Tour.findOne({ slug: tourSlug }).populate({
    path: 'reviews',
    select: 'review rating user'
  });

  if (!tour) return next(new AppError('No tour found with that name', 404));

  // 2.) Build template
  // 3.) Render template
  res
    .status(200)
    .set('Content-Security-Policy', csp)
    .render('tour', {
      title: `${tour.name} Tour`,
      tour: tour
    });
});

exports.login = (req, res) => {
  res
    .status(200)
    .set('Content-Security-Policy', csp)
    .render('login', {
      title: 'Account Login'
    });
};

exports.getAccount = async (req, res) => {
  const user = await User.findById(req.user.id);
  res
    .status(200)
    .set('Content-Security-Policy', csp)
    .render('account', {
      title: 'Your account',
      user: user
    });
};

// exports.updateUserData = catchAsync(async (req, res, next) => {
//   const updatedUser = await User.findByIdAndUpdate(
//     req.user.id,
//     {
//       name: req.body.name,
//       email: req.body.email
//     },
//     {
//       new: true,
//       runValidators: true
//     }
//   );
//   res.status(200).render('account', {
//     title: 'Your Account',
//     user: updatedUser
//   });
// });

exports.getMyTours = catchAsync(async (req, res, next) => {
  // 1) find all bookings
  const bookings = await Booking.find({ user: req.user.id });

  // 2) find tours with the returned ids
  const tourIDs = bookings.map(el => el.tour);
  const tours = await Tour.find({ _id: { $in: tourIDs } });

  res.status(200).render('overview', {
    title: 'My Tours',
    tours
  });
});
