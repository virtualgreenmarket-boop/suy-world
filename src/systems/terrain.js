// Shared terrain height query — used by player step-up and animal navigation

export const PLAZA_HALF     = 41;   // plaza floor extends -41..+41 on both axes
export const PLAZA_SURFACE  = 0.7;  // top surface of the raised plaza floor
export const PATH_SURFACE   = 0.2;  // top surface of ground-level stone paths
export const PATH_HALF_W    = 4.7;  // half-width of each path slab

export function getSurfaceY(x, z) {
  // Inside the plaza
  if (Math.abs(x) <= PLAZA_HALF && Math.abs(z) <= PLAZA_HALF) return PLAZA_SURFACE;

  // North path  (from plaza z=-41 down to hangar z≈-90)
  if (Math.abs(x) <= PATH_HALF_W && z < -PLAZA_HALF && z > -92) return PATH_SURFACE;
  // South path
  if (Math.abs(x) <= PATH_HALF_W && z >  PLAZA_HALF && z < 92)  return PATH_SURFACE;
  // East path
  if (Math.abs(z) <= PATH_HALF_W && x >  PLAZA_HALF && x < 92)  return PATH_SURFACE;
  // West path (to marina)
  if (Math.abs(z) <= PATH_HALF_W && x < -PLAZA_HALF && x > -108) return PATH_SURFACE;

  return 0;
}
