const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'A user must have a name']
  },
  email: {
    type: String,
    required: [true, 'A user must have an email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email']
  },
  photo: {
    type: String,
    default: 'default.jpg'
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },
  password: {
    type: String,
    required: [true, ' A user must have a password'],
    minLength: 8,
    select: false
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      /* 
      Custom validation below WONT work for findByIdAndUpdate to update
      Meaning, with findByIdAndUpdate, it will work only when the document is created and updated
      Other than that, this keyword will be undefined for that.

      To achieve the validation in all scenarios i.e. save,update,create,
      use save method which runs he validators including custom ones as well.
   */
      validator: function(el) {
        return el === this.password;
      },
      message: `Passwords don't match!!`
    }
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
});

///////////////////DOCUMENT MIDDLEWARE: this= curr document
userSchema.pre('save', async function(next) {
  // Only run this fn if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash password with cost=12. Higher the cost, better the encryption, slower the process.
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field so that it doesnt persist in database by setting it to undefined
  this.passwordConfirm = undefined;
  next();
});

userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();

  this.passwordChangedAt = Date.now();
  next();
});

/////////////////// QUERY MIDDLEWARE: this= current query
userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

////////////////// INSTANCE METHODS: available on all documents of a collection
userSchema.methods.correctPassword = async function(inputPassword, userPassword) {
  return await bcrypt.compare(inputPassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }

  // False means pwd NOT changed
  return false;
};

userSchema.methods.createPasswordResetToken = function() {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  // console.log({ resetToken }, this.passwordResetToken);

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
