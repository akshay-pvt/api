import express from "express"
import axios from "axios"

const router = express.Router()

/* ================================
   SPOTIFY SEARCH SCRAPER FUNCTION
================================ */
const spotifySearch = async (query) => {
  try {
    if (!query) throw new Error("Query is required.")

    const { data } = await axios.get("https://spotdown.org/api/song-details", {
      params: { url: query },
      headers: {
        origin: "https://spotdown.org",
        referer: "https://spotdown.org/",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36",
        accept: "application/json, text/plain, */*"
      }
    })

    const songs = data.songs

    if (!songs || songs.length === 0) {
      throw new Error("No results found.")
    }

    return songs
  } catch (error) {
    throw new Error(error.message)
  }
}

/* ================================
   GET → /api/spotify-search?q=
================================ */
router.get("/spotify-search", async (req, res) => {
  try {
    const query = req.query.q

    if (!query) {
      return res.status(400).json({
        status: false,
        message: "Provide search query using ?q="
      })
    }

    const result = await spotifySearch(query)

    res.json({
      status: true,
      creator: "Akshay-Eypz",
      query: query,
      total: result.length,
      results: result
    })
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message
    })
  }
})

export default router