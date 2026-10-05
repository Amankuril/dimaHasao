import { Redirect } from 'expo-router';

// Web: /app/book-ride -> the taxi module (the v1 ride screen was retired).
export default function BookRide() {
  return <Redirect href="/taxi/user" />;
}
