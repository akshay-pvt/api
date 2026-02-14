import express from "express"
import axios from "axios"

var router = express.Router()

/* ================================
   DOLPHIN AI FUNCTION
================================ */
var dolphinai = async (question, { template = "logical" } = {}) => {
  try {
    const templates = ["logical", "creative", "summarize", "code-beginner", "code-advanced"]

    if (!question) throw new Error("Question is required.")
    if (!templates.includes(template)) {
      throw new Error(`Available templates: ${templates.join(", ")}`)
    }

    const { data } = await axios.post(
      "https://chat.dphn.ai/api/chat",
      {
        messages: [
          {
            role: "user",
            content: question
          }
        ],
        model: "dolphinserver:24B",
        template: template
      },
      {
        headers: {
          origin: "https://chat.dphn.ai",
          referer: "https://chat.dphn.ai/",
          "user-agent":
            "Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36"
        }
      }
    )

    const result = data
      .split("\n\n")
      .filter((line) => line && line.startsWith("data: {"))
      .map((line) => JSON.parse(line.substring(6)))
      .map((line) => line.choices[0].delta.content)
      .join("")

    if (!result) throw new Error("No result found.")

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

/* ================================
   GET → /api/dolphin?question=&template=
================================ */
router.get("/dolphin", async (req, res) => {
  try {
    var question = req.query.question
    var template = req.query.template || "logical"

    if (!question) {
      return res.status(400).json({
        status: false,
        message: "Provide question using ?question="
      })
    }

    var result = await dolphinai(question, { template })

    res.json({
      status: true,
      creator: "Akshay-Eypz",
      template: template,
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