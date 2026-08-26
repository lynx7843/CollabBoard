const { Schema, model } = require('mongoose');
const {
  USERNAME_PATTERN,
  EMAIL_PATTERN,
  USERNAME_MIN,
  USERNAME_MAX,
  NAME_MAX,
} = require('../utils/patterns');

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required.'],
      trim: true,
      minlength: [1, 'Name is required.'],
      maxlength: [NAME_MAX, `Name must be ${NAME_MAX} characters or fewer.`],
    },
    username: {
      type: String,
      required: [true, 'Username is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [USERNAME_MIN, `Username must be at least ${USERNAME_MIN} characters.`],
      maxlength: [USERNAME_MAX, `Username must be ${USERNAME_MAX} characters or fewer.`],
      match: [
        USERNAME_PATTERN,
        'Username may only contain letters, numbers, dots, dashes and underscores.',
      ],
    },
    email: {
      type: String,
      required: [true, 'Email is required.'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_PATTERN, 'Enter a valid email address.'],
    },
    passwordHash: {
      type: String,
      required: true,
      // Excluded from every query unless explicitly re-selected, so a hash
      // cannot end up in a response by accident.
      select: false,
    },
    avatarColor: { type: String, default: '#4F46E5' },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

// Second line of defence behind `select: false` — covers res.json(user) on a
// document that was loaded with the hash explicitly selected.
userSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

module.exports = model('User', userSchema);
