import express from "express"
import axios from "axios"

const router = express.Router()

router.get("/terabox", async (req, res) => {
  try {
    const url = req.query.url

    if (!url) {
      return res.status(400).json({
        status: false,
        message: "Provide terabox url using ?url="
      })
    }

    // Call the NEW working API
    const { data } = await axios.post(
      "https://eypz-bypass.vercel.app/api/terabox",
      {
        url: url,
        apikey: "eypz-pvt"
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0"
        },
        timeout: 20000
      }
    )

    if (!data?.status || !data?.result?.list || !data.result.list.length) {
      throw new Error("No file data found")
    }

    const file = data.result.list[0]

    const result = {
      file_name: file.server_filename || file.path?.replace("/", ""),
      size: file.size,
      dlink: file.dlink,
      thumbnail: file.thumbs?.url1 || null
    }

    res.json({
      status: true,
      creator: "Akshay-Eypz",
      result
    })

  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message
    })
  }
})

export default router