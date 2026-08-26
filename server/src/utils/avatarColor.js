/*
 * Colour for the initial-circle MemberManager renders next to each member.
 * Picked deterministically from the username so the same person keeps the same
 * colour across re-seeds, and so two members are unlikely to collide.
 */
const PALETTE = [
  '#4F46E5', // indigo
  '#0EA5E9', // sky
  '#059669', // emerald
  '#D97706', // amber
  '#DC2626', // red
  '#DB2777', // pink
  '#7C3AED', // violet
  '#0891B2', // cyan
];

function avatarColorFor(seed = '') {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length];
}

module.exports = { avatarColorFor, PALETTE };
