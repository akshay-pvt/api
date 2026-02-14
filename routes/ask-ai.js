import express from "express"
import ax from "axios"
import FormData from "form-data"
import * as ch from "cheerio"

var router = express.Router()

/* ================================
   ASCII CONVERTER FUNCTION
================================ */

var doConvert = async (imageUrl) => {

  if (!imageUrl) throw new Error("Image URL required")

  var form = new FormData()

  form.append("format", "ascii")
  form.append("width", "100")
  form.append("textcolor", "#000000")
  form.append("bgcolor", "#ffffff")
  form.append("invert", "0")
  form.append("contrast", "1")

  var imgBuffer = await ax.get(imageUrl, {
    responseType: "arraybuffer"
  })

  form.append("image", Buffer.from(imgBuffer.data), {
    filename: "image.jpg",
    contentType: "image/jpeg"
  })

  var res = await ax.post(
    "https://www.text-image.com/convert/result.cgi",
    form,
    {
      headers: {
        ...form.getHeaders(),
        Origin: "https://www.text-image.com",
        Referer: "https://www.text-image.com/convert/ascii.html"
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    }
  )

  var $ = ch.load(res.data)

  var ascii = $("#tiresult").text().trim()
  var shareLink = $("#sharebutton")
    .parent()
    .find("a")
    .attr("href") ?? null

  return { ascii, shareLink }
}

/* ================================
   GET → /ascii?url=
================================ */

router.get("/ascii", async (req, res) => {
  try {
    var url = req.query.url

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Provide image url using ?url="
      })
    }

    var data = await doConvert(url)

    res.json({
      status: true,
      creator: "Izumi",
      result: data
    })

  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message
    })
  }
})


/* ================================
   POST → /ascii
   { "url": "IMAGE_URL" }
================================ */

router.post("/", async (req, res) => {
  try {
    var url = req.body.url

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Provide image url in body"
      })
    }

    var data = await doConvert(url)

    res.json({
      status: true,
      creator: "Akshay-Eypz",
      result: data
    })

  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message
    })
  }
})

export default router
