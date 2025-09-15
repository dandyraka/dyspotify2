import axios from "axios";
import fs from "fs";
import 'dotenv/config';
import path from "path";

const clientId = process.env.SPOTIFY_CLIENT_ID;
const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
const tokens = JSON.parse(process.env.SPOTIFY_REFRESH_TOKENS);
//const tokens = tkn;

const liveFile = path.resolve("./live.json");
const historyFile = path.resolve("./history.json");

// load file lama kalau ada
let history = [];
if (fs.existsSync(historyFile)) {
  history = JSON.parse(fs.readFileSync(historyFile, "utf-8"));
}

let friends = [];
if (fs.existsSync(liveFile)) {
  friends = JSON.parse(fs.readFileSync(liveFile, "utf-8")).friends || [];
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

async function getMe(accessToken) {
  try {
    const res = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: "Bearer " + accessToken },
    });
    return {
      name: res.data.display_name,
      uri: res.data.uri,
      imageUrl: res.data.images?.[0]?.url || null
    };
  } catch (err) {
    console.error("Error getMe:", err.response?.data || err.message);
    return null;
  }
}

// Ambil recent plays user
async function getRecentPlays(accessToken) {
  const res = await axios.get(
    "https://api.spotify.com/v1/me/player/recently-played?limit=10",
    {
      headers: { Authorization: "Bearer " + accessToken },
    }
  );
  return res.data.items;
}

// Ambil currently playing (lagu yang sedang diputar)
async function getCurrentlyPlaying(accessToken) {
  try {
    const res = await axios.get("https://api.spotify.com/v1/me/player/currently-playing", {
      headers: { Authorization: "Bearer " + accessToken },
    });
    if (res.status === 204 || !res.data || !res.data.item) {
      return null; // tidak ada yang diputar
    }
    const item = res.data.item;
    return {
      timestamp: Date.now(),
      track: item.name,
      uri: item.uri,
      imageUrl: item.album.images?.[0]?.url || null,
      albumUri: item.album.uri,
      albumName: item.album.name,
      artist: item.artists.map((a) => a.name).join(", "),
      artistUri: item.artists[0]?.uri,
      contextUri: res.data.context?.uri || null,
      contextName: res.data.context?.type || null,
      contextIndex: 0, // Spotify API jarang kasih index, jadi default 0
    };
  } catch (err) {
    console.error("Error getCurrentlyPlaying:", err.response?.data || err.message);
    return null;
  }
}

async function main() {
  let liveFriends = [];

  for (const userId in tokens) {
    try {
      const { refreshToken } = tokens[userId];
      const accessToken = await refreshAccessToken(refreshToken);

      // ambil profile user
      const me = await getMe(accessToken);
      if (!me) {
        console.log(`Gagal ambil profile user ${userId}`);
        continue;
      }

      const recent = await getRecentPlays(accessToken);
      for (const item of recent) {
        const entry = {
          timestamp: new Date(item.played_at).getTime(),
          user: me.name,
          userId: userId,
          track: item.track.name,
          artist: item.track.artists.map((a) => a.name).join(", "),
          uri: item.track.uri,
          imageUrl: item.track.album.images?.[0]?.url || null,
        };

        const exists = history.some(
          (h) =>
            h.userId === entry.userId &&
            h.timestamp === entry.timestamp &&
            h.track === entry.track
        );
        if (!exists) history.push(entry);
      }

      const nowPlaying = await getCurrentlyPlaying(accessToken);
      if (nowPlaying) {
        liveFriends.push({
          timestamp: nowPlaying.timestamp,
          user: {
            uri: me.uri,
            name: me.name,
            imageUrl: me.imageUrl,
          },
          track: {
            uri: nowPlaying.uri,
            name: nowPlaying.track,
            imageUrl: nowPlaying.imageUrl,
            album: {
              uri: nowPlaying.albumUri,
              name: nowPlaying.albumName,
            },
            artist: {
              uri: nowPlaying.artistUri,
              name: nowPlaying.artist,
            },
            context: {
              uri: nowPlaying.contextUri,
              name: nowPlaying.contextName,
              index: nowPlaying.contextIndex,
            },
          },
        });

        console.log(`Now playing untuk ${me.name}: ${nowPlaying.track}`);
      }
    } catch (err) {
      console.error(`Gagal fetch untuk ${userId}:`, err.response?.data || err.message);
    }
  }

  history.sort((a, b) => b.timestamp - a.timestamp);
  history = history.slice(0, 10);
  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  fs.writeFileSync(liveFile, JSON.stringify({ friends: liveFriends }, null, 2));

  console.log("Update selesai → history.json & live.json diupdate.");
}


main();