const { Schema, model } = require('mongoose');

/*
 * A board and the people who can see it.
 *
 * Membership is stored here as a list of user ids rather than on the User, so
 * "who is on this board" is one document read and adding a member never touches
 * an account. The owner is always kept in `members` too, so a membership check
 * is a single test.
 */
const boardSchema = new Schema(
  {
    // The id the client puts in its URLs (App.jsx:12 uses 'group-13'). Stable
    // and human-readable, so the frontend needs no ObjectId to address a board.
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9_-]+$/, 'Board id may only contain letters, numbers, dashes and underscores.'],
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

boardSchema.methods.hasMember = function hasMember(userId) {
  return this.members.some((id) => String(id) === String(userId));
};

module.exports = model('Board', boardSchema);
