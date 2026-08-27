const { Schema, model } = require('mongoose');

const STATUSES = ['todo', 'doing', 'done'];

/*
 * A card on a board.
 *
 * Tasks reference their board rather than being embedded in it, so a board
 * document stays small and one task can be updated without rewriting the rest.
 * `position` orders cards within a column; a moved card is appended to the end
 * of its new column.
 */
const taskSchema = new Schema(
  {
    board: { type: Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    title: { type: String, required: [true, 'Task title is required.'], trim: true, maxlength: 140 },
    description: { type: String, default: '', trim: true, maxlength: 2000 },
    status: { type: String, enum: STATUSES, default: 'todo' },
    priority: { type: String, default: '', trim: true, maxlength: 40 },
    position: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

// The board view reads one column at a time, in order.
taskSchema.index({ board: 1, status: 1, position: 1 });

taskSchema.set('toJSON', {
  transform(doc, ret) {
    delete ret.__v;
    return ret;
  },
});

module.exports = model('Task', taskSchema);
module.exports.STATUSES = STATUSES;
