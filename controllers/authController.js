// Validation happens before pre save hooks when validateBeforeSave=true
// Order : validation -> pre save-> save->post save

const { promisify } = require('util');
const crypto = require('crypto');
const User = require('./../models/userModel');
const jwt = require('jsonwebtoken');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const Email = require('./../utils/email');

// Create token using JWT
const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Send token to client with a standard response
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  res.status(statusCode).json({
    status: 'success',
    token
  });
};

// Creating new user
exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role
  });

  const url = `${req.protocol}://${req.get('host')}/me`;
  await new Email(newUser, url).sendWelcome();

  const token = signToken(newUser._id);

  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
    httpOnly: true
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  /*
   To hide the password in output. The below line doesn't break our app,
  or anything like that because the user has already been saved to the
  database with the password intact. This user here was just to
  send the data back to the client, which won't modify in our db
  */
  newUser.password = undefined;

  res.status(200).json({
    status: 'success',
    token: token,
    data: {
      user: newUser
    }
  });
});

// Login Handler
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  // 1.) Check if email & password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  // 2.) Check if user exists and password is correct
  const user = await User.findOne({ email: email }).select('+password');

  // If user doesnt exist or if password is incorrect, throw error
  if (!user || !(await user.correctPassword(password, user.password)))
    return next(new AppError('Incorrect email or password', 401));

  // 3.) If everythig fine, send token to client
  createSendToken(user, 200, res);
});

///////////////// Route protection
exports.protect = catchAsync(async (req, res, next) => {
  // 1.) Getting token and check if it exists
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt && req.cookies.jwt !== 'loggedout') {
    token = req.cookies.jwt;
  }

  if (!token) return next(new AppError('You are not logged in. Please log in to get access.', 401));

  // 2.) Verifying token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3.) Check if user still exists
  const freshUser = await User.findById(decoded.id);
  if (!freshUser) return next(new AppError('the user does no longer exist', 401));

  // 4.) Check if user changed passwrd after the token was issued
  if (freshUser.changedPasswordAfter(decoded.iat)) {
    return next(new AppError('User recently changed password. Please login again!!', 401));
  }

  // GRANT ACCESS TO PROTECTED ROUTE
  req.user = freshUser;
  res.locals.user = freshUser;
  next();
});
/////////////////

////// For rendering pages: no error throwing
exports.isLoggedIn = async (req, res, next) => {
  // 1.) Getting token and check if it exists
  try {
    if (req.cookies.jwt) {
      // 2.) Verifying token
      const decoded = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

      // 3.) Check if user still exists
      const freshUser = await User.findById(decoded.id);
      if (!freshUser) return next();

      // 4.) Check if user changed passwrd after the token was issued
      if (freshUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // There is a logged in user
      res.locals.user = freshUser;
    }
    return next();
  } catch (err) {
    return next();
  }
};

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
};

// Authorisation
exports.restrictTo = (...roles) => {
  // The middleware fn below will have access to roles because of closures
  return (req, res, next) => {
    // roles: authorized people
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You are not authorised to perform this action', 403));
    }

    next();
  };
};

/////////////////////RESET PASSWORD FUNCTIONALITY

// I.) FORGOT PASSWORD

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1.) Get user based on POST email
  const user = await User.findOne({ email: req.body.email });
  if (!user) return next(new AppError('There is no user with that email address', 404));

  // 2.) Generate random token
  const resetToken = user.createPasswordResetToken();
  // Without validateBeforeSave set to false it wont work cause it will ask us to enter the mandatory fields like email, password, etc.
  // Thats why we specify this option
  await user.save({ validateBeforeSave: false });

  // 3.)Send it back to user email

  try {
    const resetURL = `${req.protocol}://${req.get(
      'host'
    )}/api/v1/users/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset();

    res.status(200).json({
      status: 'success',
      message: 'Please check your email for further steps.'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(new AppError('There was an while sending the email! Please try again later', 500));
  }
});

// 2.) Reset the password
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1.) Get user based on token
  const hashToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 2.) If token is valid and theres a user, set the new password
  if (!user) return next(new AppError('Invalid token or expired', 400));
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 3.) Update changedPasswordAt propety for the user

  // 4.) Log the user in (i.e. send JWT)
  createSendToken(user, 200, res);
});
////////////////////////////

// Update the password
exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1.) Get the user
  const user = await User.findById(req.user._id).select('+password');

  // 2.) Check if POSTed password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password)))
    return next(new AppError('Wrong Password. Please try again', 401));

  // 3.) Update the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();
  // User.findByIdAndUpdate() will NOT work!!! as no pre save middlewares

  // 4.) Log user in, send JWT
  createSendToken(user, 200, res);
});
