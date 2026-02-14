import express from "express"
import axios from "axios"

var router = express.Router()

/* =======================
   GET RAW DATA FROM SITE
======================= */
var igee_deel = async (url) => {
  try {
    var endpoint =
      "https://igram.website/content.php?url=" + encodeURIComponent(url)

    var { data } = await axios.post(endpoint, "", {
      headers: {
        authority: "igram.website",
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "content-type": "application/x-www-form-urlencoded",
        referer: "https://igram.website/",
        "sec-ch-ua": '"Chromium";v="139", "Not;A=Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "user-agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Mobile Safari/537.36"
      }
    })

    return data

  } catch (e) {
    return { error: e.message }
  }
}

/* =======================
   PARSE HTML
======================= */
var parse = (html) => {
  var clean = html.replace(/\n|\t/g, "")

  var videoMatch = [...clean.matchAll(/<source src="([^"]+)/g)].map(
    (x) => x[1]
  )

  var imageMatch = [...clean.matchAll(/<img src="([^"]+)/g)].map(
    (x) => x[1]
  )

  if (imageMatch.length > 0) imageMatch = imageMatch.slice(1)

  var captionRaw = clean.match(
    /<p class="text-sm"[^>]*>(.*?)<\/p>/
  )

  var caption = captionRaw
    ? captionRaw[1].replace(/<br ?\/?>/g, "\n")
    : ""

  var likes = clean.match(/far fa-heart"[^>]*><\/i>\s*([^<]+)/)
  var comments = clean.match(/far fa-comment"[^>]*><\/i>\s*([^<]+)/)
  var time = clean.match(/far fa-clock"[^>]*><\/i>\s*([^<]+)/)

  return {
    is_video: videoMatch.length > 0,
    videos: videoMatch,
    images: imageMatch,
    caption: caption,
    likes: likes ? likes[1] : null,
    comments: comments ? comments[1] : null,
    time: time ? time[1] : null
  }
}

/* =======================
   DETECT TYPE
======================= */
var detectContentType = (url) => {
  if (url.includes("/reel/")) return "Reel"
  if (url.includes("/stories/")) return "Story"
  if (url.includes("/p/")) return "Post"
  return "Unknown"
}

/* ==============================
   MAIN FUNCTION
============================== */
var instagram = async (url) => {
  if (!url || typeof url !== "string") {
    throw new Error("Invalid Instagram URL")
  }

  var contentType = detectContentType(url)
  var raw = await igee_deel(url)

  if (!raw || raw.error) {
    throw new Error(raw.error || "Failed to fetch data")
  }

  if (!raw.html) {
    throw new Error("No HTML found in response")
  }

  var parsed = parse(raw.html)

  var result = {
    contentType: contentType,
    type: parsed.is_video ? "video" : "image",
    caption: parsed.caption || "",
    likes: parsed.likes || null,
    comments: parsed.comments || null,
    time: parsed.time || null,
    total: 0,
    media: []
  }

  if (parsed.is_video && parsed.videos.length > 0) {
    result.media = parsed.videos.map(function (url, i) {
      return {
        type: "video",
        url: url,
        index: i + 1
      }
    })
  } else if (parsed.images.length > 0) {
    result.media = parsed.images.map(function (url, i) {
      return {
        type: "image",
        url: url,
        index: i + 1
      }
    })
  }

  if (result.media.length === 0) {
    throw new Error("No media found")
  }

  result.total = result.media.length

  return result
}

/* ==============================
   ROUTE - GET ONLY
   /api/instagram?url=
============================== */
router.get("/instagram", async (req, res) => {
  try {
    var url = req.query.url

    if (!url)
      return res.status(400).json({
        status: false,
        message: "Provide Instagram URL using ?url="
      })

    if (!url.match(/instagram\.com|instagr\.am/i))
      return res.status(400).json({
        status: false,
        message: "Invalid Instagram URL"
      })

    var result = await instagram(url)

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
