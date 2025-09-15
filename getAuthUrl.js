import open from "open";

const clientId = process.env.SPOTIFY_CLIENT_ID;
const redirectUri = "https://spotactivity.test/callback";
const scope = [
  "user-read-recently-played",
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-read-private"
].join(" ");

const authUrl = `https://accounts.spotify.com/authorize?response_type=code&client_id=${clientId}&scope=${encodeURIComponent(scope)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

console.log("Buka URL ini di browser untuk login Spotify:");
console.log(authUrl);

// otomatis buka di browser
//open(authUrl);
