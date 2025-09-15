import axios from "axios";

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const redirectUri = "https://spotactivity.test/callback";

// Ganti ini dengan code dari step sebelumnya
const authorizationCode = process.env.SPOTIFY_AUTH_CODE;

async function getRefreshToken() {
  const res = await axios.post(
    "https://accounts.spotify.com/api/token",
    new URLSearchParams({
      grant_type: "authorization_code",
      code: authorizationCode,
      redirect_uri: redirectUri,
    }),
    {
      headers: {
        "Authorization": "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  console.log("Access Token:", res.data.access_token);
  console.log("Refresh Token:", res.data.refresh_token);
}

getRefreshToken();
