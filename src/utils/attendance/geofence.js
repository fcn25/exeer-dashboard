const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Haversine distance in meters between two WGS84 coordinates.
 */
export function distanceMeters(lat1, lon1, lat2, lon2) {
  const φ1 = toRadians(lat1);
  const φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1);
  const Δλ = toRadians(lon2 - lon1);

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

export function isWithinGeofence(
  userLat,
  userLon,
  branchLat,
  branchLon,
  radiusMeters,
) {
  const distance = distanceMeters(userLat, userLon, branchLat, branchLon);
  return distance <= Number(radiusMeters);
}

export const GEOFENCE_OUT_OF_RANGE_MESSAGE =
  "عذراً، أنت خارج النطاق الجغرافي لمقر العمل.";
