import express from "express"
import axios from "axios"

var router = express.Router()

/* ================================
   TWITTER / X FUNCTION
================================ */
var twmate = async (url) => {

  if (!url) throw new Error("Twitter/X URL is required")

  var { data } = await axios.post(
    "https://twmate.com/id2/?",
    `page=${encodeURIComponent(url)}&ftype=all&ajax=1`,
    {
      headers: {
        authority: "twmate.com",
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        origin: "https://twmate.com",
        referer: "https://twmate.com/id2/",
        "x-requested-with": "XMLHttpRequest",
        "user-agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 Chrome Mobile Safari/537.36"
      }
    }
  )

  var clean = data.replace(/\n|\t/g, "")

  var get = (regex) =>
    clean.match(regex) ? clean.match(regex)[1].trim() : null

  var qualities = [
    ...clean.matchAll(
      /<tr[^>]*>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>[\s\S]*?href="([^"]+)"/g
    )
  ].map((v) => ({
    quality: v[1].trim(),
    type: v[2].trim(),
    download_url: v[3].trim()
  }))

  return {
    title: get(/<h4>(.*?)<\/h4>/),
    thumbnail: get(/<img src="([^"]+)/),
    duration: get(/Durasi\s*:\s*([^<]+)/),
    likes: get(/Suka\s*:\s*([^<]+)/),
    qualities
  }
}

/* ================================
   GET → /api/twitter?url=
================================ */
router.get("/twitter", async (req, res) => {
  try {
    var url = req.query.url

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Provide Twitter/X url using ?url="
      })
    }

    var result = await twmate(url)

    res.json({
      status: true,
      creator: "Akshay-Eypz",
      result: result
    })

  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message
    })
  }
})

export default router
