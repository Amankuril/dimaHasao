import { Redirect } from 'expo-router';

// Web renders the same feed at /food/delivery and /food/delivery/feed; here
// the feed tab lives at /food/delivery and /feed points to it.
export default function FeedAlias() {
  return <Redirect href="/food/delivery" />;
}
