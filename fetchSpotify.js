import axios from "axios";
import fs from "fs";

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const tokens = JSON.parse(process.env.SPOTIFY_REFRESH_TOKENS);

const historyFile = "history.json";
const liveFile = "live.json";

// load file lama kalau ada
let history = [];
if (fs.existsSync(historyFile)) {
  history = JSON.parse(fs.readFileSync(historyFile, "utf-8"));
}

let live = {};
if (fs.existsSync(liveFile)) {
  live = JSON.parse(fs.readFileSync(liveFile, "utf-8"));
}

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
        "Authorization":
          "Basic " +
          Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );
  return res.data.access_token;
}

// Ambil recent plays user
async function getRecentPlays(accessToken) {
  const res = await axios.get(
    "https://api.spotify.com/v1/me/player/recently-played?limit=5",
    {
      headers: { Authorization: "Bearer " + accessToken },
    }
  );
  return res.data.items;
}

async function main() {
  for (const userId in tokens) {
    try {
      const { refreshToken, displayName } = tokens[userId];
      const accessToken = await refreshAccessToken(refreshToken);
      const recent = await getRecentPlays(accessToken);

      for (const item of recent) {
        const entry = {
          timestamp: new Date(item.played_at).getTime(),
          user: displayName,
          userId: userId,
          track: item.track.name,
          artist: item.track.artists.map((a) => a.name).join(", "),
          uri: item.track.uri,
          imageUrl: item.track.album.images?.[0]?.url || null,
        };

        // cek duplikat berdasarkan (userId + timestamp + track)
        const exists = history.some(
          (h) =>
            h.userId === entry.userId &&
            h.timestamp === entry.timestamp &&
            h.track === entry.track
        );
        if (!exists) {
          history.push(entry);
        }

        // update live (selalu overwrite dengan lagu terbaru user ini)
        if (!live[userId] || entry.timestamp > live[userId].timestamp) {
          live[userId] = entry;
        }
      }
    } catch (err) {
      console.error(
        `Gagal fetch untuk ${userId}:`,
        err.response?.data || err.message
      );
    }
  }

  // simpan file
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  fs.writeFileSync(liveFile, JSON.stringify(live, null, 2));

  console.log("Update selesai → history.json & live.json diupdate.");
}

main();