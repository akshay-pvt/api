import express from 'express'
import axios from 'axios'

var router = express.Router()

var publicai = async (question) => {
  try {
    if (!question) throw new Error('Question is required.')

    var generateId = (length = 16) =>
      Array.from({ length }, () =>
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
      ).join('')

    var { data } = await axios.post(
      'https://publicai.co/api/chat',
      {
        tools: {},
        id: generateId(),
        messages: [
          {
            id: generateId(),
            role: 'user',
            parts: [
              {
                type: 'text',
                text: question
              }
            ]
          }
        ],
        trigger: 'submit-message'
      },
      {
        headers: {
          origin: 'https://publicai.co',
          referer: 'https://publicai.co/chat',
          'user-agent':
            'Mozilla/5.0 (Linux; Android 15; SM-F958 Build/AP3A.240905.015) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
        }
      }
    )

    var result = data
      .split('\n\n')
      .filter(line => line && !line.includes('[DONE]'))
      .map(line => JSON.parse(line.substring(6)))
      .filter(line => line.type === 'text-delta')
      .map(line => line.delta)
      .join('')

    if (!result) throw new Error('No result found.')

    return result
  } catch (error) {
    throw new Error(error.message)
  }
}

/* ====== ROUTE ====== */
router.get('/publicai', async (req, res) => {
  try {
    var q = req.query.q
    if (!q)
      return res.status(400).json({
        status: false,
        message: 'Query is required',
        example: '/api/publicai?q=Hello'
      })

    var answer = await publicai(q)
    res.json({
      creator: "Akshay-Eypz",
      status: true,
      query: q,
      answer
    })
  } catch (e) {
    res.status(500).json({
      status: false,
      error: e.message
    })
  }
})

export default router
