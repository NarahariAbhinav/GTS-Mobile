// Denim-Inspired Premium Theme
// Inspired by: raw denim fabric, copper rivets, contrast stitching, selvedge edges
// Aesthetic: warm editorial luxury (fashion-forward, not corporate)

export const COLORS = {
  // Core Palette (from provided image)
  indigo: '#22394B',         // Deep denim — headers, tab bar, nav
  denimDark: '#1A3C58',      // Darker wash blue
  denim: '#275981',          // Medium wash blue — secondary elements
  denimLight: '#82AFCF',     // Light wash blue — accents
  copper: '#c27c3e',         // Copper rivet — primary CTA, accent buttons (Complementary to blue)
  copperLight: '#d4923f',    // Lighter copper for hover/pressed states
  stitch: '#d4a04a',         // Golden contrast stitch — badges, highlights

  // Backgrounds (Cool-toned to complement the blue denim)
  cream: '#F4F7F9',          // Icy light blue-white — page backgrounds
  warmWhite: '#ffffff',      // Cards, modals
  sand: '#E8EFF4',           // Subtle cool depth layer (stat strips, table headers)

  // Text
  dark: '#030E17',           // Darkest denim from image — primary text
  body: '#22394B',           // Deep denim — body text
  muted: '#6B88A1',          // Muted blue-gray — secondary/label text
  placeholder: '#B7D0DB',    // Lightest blue from image — input placeholders

  // Borders & Dividers
  border: '#D1E0EA',         // Cool card borders
  divider: '#E4EDF3',        // Subtle dividers inside cards

  // Status (universal meanings preserved)
  statusDev: '#275981',      // In Development — medium denim
  statusProd: '#3b82f6',     // In Production — blue
  statusQA: '#d4a04a',       // QA Pending — golden stitch
  statusApproved: '#22a06b', // Approved — green
  statusDispatched: '#8b5cf6',// Dispatched — purple

  // Verification
  verified: '#22a06b',       // Green
  verifiedBg: '#e6f5ec',
  pending: '#d4a04a',        // Golden
  pendingBg: '#fdf6e3',
  rejected: '#dc2626',       // Red
  rejectedBg: '#fee2e2',

  // Misc
  danger: '#dc2626',
  dangerLight: '#fca5a5',
  overlay: 'rgba(3, 14, 23, 0.6)',  // Darkest denim overlay for modals
};

export const FONTS = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};
