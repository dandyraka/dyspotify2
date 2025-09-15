import axios from "axios";

// Ambil secrets dari environment
const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const tokens = JSON.parse(process.env.SPOTIFY_REFRESH_TOKENS);

// Refresh access token dari refresh token
async function refreshAccessToken(refreshToken) {
  const res = await axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    {
      headers: {
        "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  return res.data.access_token;
}

// Ambil recent plays user
async function getRecentPlays(accessToken) {
  const res = await axios.get("https://api.spotify.com/v1/me/player/recently-played?limit=10", {
    headers: { Authorization: "Bearer " + accessToken },
  });
  return res.data.items;
}

async function main() {
  for (const userId in tokens) {
    try {
      const accessToken = await refreshAccessToken(tokens[userId]);
      const recent = await getRecentPlays(accessToken);
      console.log(`Recent plays ${userId}:`, recent.map(r => r.track.name));
    } catch (err) {
      console.error(`Gagal fetch untuk ${userId}:`, err.response?.data || err.message);
    }
  }
}

main();