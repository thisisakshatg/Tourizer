const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const cors = require('cors');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const tourRouter = require('./routes/tourRoutes');
const userRouter = require('./routes/userRoutes');
const reviewRouter = require('./routes/reviewRoutes');
const viewRouter = require('./routes/viewRoutes');
const bookingRouter = require('./routes/bookingRoutes');
const bookingController = require('./controllers/bookingController');
const bodyParser = require('body-parser');

// Starting application
const app = express();

app.enable('trust proxy');

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

// 1) GLOBAL MIDDLEWARES
//////////////////////////// Implement CORS(all routes) : Access-Control-Allow-Origin *
app.use(cors());
// If to allow specific domains:
// app.use(cors({
//   origin:'https://www.natours.com'
// }))

// Responding to options request for CORS (preflight phase)
app.options('*', cors());
// app.options('/api/v1/tours/:id', cors());

// Serving static files
app.use(express.static(path.join(__dirname, 'public')));

// Set security HTTP headers
app.use(helmet());

// i.) rate limiter: prevents Denial-of-service and brute force attcaks
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests received. Please try again in an hour!'
});
app.use('/api', limiter);

/*This MUST be before body parser because stripe needs
 the checkout session data that it put on req.body in RAW format, 
 NOT JSON!!*/
app.post(
  '/webhook-checkout',
  bodyParser.raw({ type: 'application/json' }),
  bookingController.webhookCheckout
);

// Body parser: reading data from body to req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Data Sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data Sanitisation against XSS
app.use(xss());

// Prevent parameter pollution
/* whitelist parameter allows certain paramters like duration to repeat
 while querying */
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price'
    ]
  })
);

// compresses all texts in responses
app.use(compression());

// if (process.env.NODE_ENV === 'development') {
//   app.use(morgan('dev'));
// }

// OWN MIDDLEWARE
// app.use((req, res, next) => {
//   console.log('Hello from middleware');
//   console.log(req.cookies);
//   next();
// });

// app.use((req, res, next) => {
//   req.Time = new Date().toISOString();
//   next();
// });

// 3) ROUTES

app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);

app.all('*', (req, res, next) => {
  // const err = new Error(`Couldn't locate ${req.originalUrl}`);
  // err.status = 'fail';
  // err.statusCode = 404;
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
