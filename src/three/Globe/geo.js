import * as THREE from 'three';

const D2R = Math.PI / 180;

/** latitude/longitude (degrees) -> point on a sphere. lon 0 faces +z, east is +x */
export function latLon(lat, lon, r = 1) {
  const la = lat * D2R;
  const lo = lon * D2R;
  return new THREE.Vector3(Math.cos(la) * Math.sin(lo) * r, Math.sin(la) * r, Math.cos(la) * Math.cos(lo) * r);
}

// SolveX is based in Port Harcourt, Nigeria
export const HQ = { name: 'Port Harcourt', lat: 4.82, lon: 7.03 };

export const CITIES = [
  { name: 'Lagos', lat: 6.52, lon: 3.38 },
  { name: 'Abuja', lat: 9.07, lon: 7.4 },
  { name: 'Accra', lat: 5.6, lon: -0.19 },
  { name: 'Casablanca', lat: 33.57, lon: -7.59 },
  { name: 'Cairo', lat: 30.04, lon: 31.24 },
  { name: 'Addis Ababa', lat: 9.03, lon: 38.74 },
  { name: 'Nairobi', lat: -1.29, lon: 36.82 },
  { name: 'Johannesburg', lat: -26.2, lon: 28.04 },
  { name: 'Cape Town', lat: -33.92, lon: 18.42 },
  { name: 'London', lat: 51.51, lon: -0.13 },
  { name: 'Paris', lat: 48.86, lon: 2.35 },
  { name: 'Berlin', lat: 52.52, lon: 13.4 },
  { name: 'Lisbon', lat: 38.72, lon: -9.14 },
  { name: 'Istanbul', lat: 41.01, lon: 28.98 },
  { name: 'Moscow', lat: 55.76, lon: 37.62 },
  { name: 'Dubai', lat: 25.2, lon: 55.27 },
  { name: 'Mumbai', lat: 19.08, lon: 72.88 },
  { name: 'Delhi', lat: 28.61, lon: 77.21 },
  { name: 'Singapore', lat: 1.35, lon: 103.82 },
  { name: 'Jakarta', lat: -6.21, lon: 106.85 },
  { name: 'Shanghai', lat: 31.23, lon: 121.47 },
  { name: 'Seoul', lat: 37.57, lon: 126.98 },
  { name: 'Tokyo', lat: 35.68, lon: 139.69 },
  { name: 'Sydney', lat: -33.87, lon: 151.21 },
  { name: 'New York', lat: 40.71, lon: -74.01 },
  { name: 'Toronto', lat: 43.65, lon: -79.38 },
  { name: 'San Francisco', lat: 37.77, lon: -122.42 },
  { name: 'Mexico City', lat: 19.43, lon: -99.13 },
  { name: 'Bogota', lat: 4.71, lon: -74.07 },
  { name: 'Lima', lat: -12.05, lon: -77.04 },
  { name: 'Sao Paulo', lat: -23.55, lon: -46.63 },
  { name: 'Buenos Aires', lat: -34.6, lon: -58.38 },
];

// arcs: from Port Harcourt out to the world, plus a few between other cities
export const ARC_PAIRS = [
  ['Port Harcourt', 'London'],
  ['Port Harcourt', 'New York'],
  ['Port Harcourt', 'Dubai'],
  ['Port Harcourt', 'Mumbai'],
  ['Port Harcourt', 'Singapore'],
  ['Port Harcourt', 'Sao Paulo'],
  ['Port Harcourt', 'Nairobi'],
  ['Port Harcourt', 'Cape Town'],
  ['Port Harcourt', 'Tokyo'],
  ['Port Harcourt', 'San Francisco'],
  ['Port Harcourt', 'Sydney'],
  ['London', 'New York'],
  ['Dubai', 'Singapore'],
  ['New York', 'Sao Paulo'],
  ['Tokyo', 'San Francisco'],
];