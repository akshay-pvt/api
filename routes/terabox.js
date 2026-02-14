import express from 'express'
import axios from 'axios'
import crypto from 'crypto'

const router = express.Router()

// Temporary in-memory storage (ID -> Spotify URL)
const streamCache = new Map()

async function spotify(input) {
  if (!input) throw new Error('Input is required.')

  const { data: s } = await axios.get(
    `https://spotdown.org/api/song-details?url=${encodeURIComponent(input)}`,
    {
      headers: {
        origin: 'https://spotdown.org',
        referer: 'https://spotdown.org/',
        'user-agent':
          'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
      }
    }
  )

  const song = s.songs[0]
  if (!song) throw new Error('Track not found.')

  return song
}

/* =========================
   1. GENERATE STREAM LINK
========================= */

router.get('/spotify', async (req, res) => {
  try {
    const query = req.query.q

    if (!query) {
      return res.status(400).json({
        status: false,
        message: 'Provide Spotify URL or query using ?q='
      })
    }

    const song = await spotify(query)

    const id = crypto.randomBytes(6).toString('hex')
    streamCache.set(id, song.url)

    res.json({
      status: true,
      metadata: {
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        cover: song.thumbnail
      },
      stream_url: `${req.protocol}://${req.get('host')}/api/spotify/${id}`
    })

  } catch (e) {
    res.status(500).json({
      status: false,
      message: e.message
    })
  }
})

/* =========================
   2. STREAM AUDIO ROUTE
========================= */

router.get('/spotify/:id', async (req, res) => {
  try {
    const { id } = req.params
    const spotifyUrl = streamCache.get(id)

    if (!spotifyUrl) {
      return res.status(404).json({
        status: false,
        message: 'Stream expired or invalid ID'
      })
    }

    const { data } = await axios.post(
      'https://spotdown.org/api/download',
      { url: spotifyUrl },
      {
        responseType: 'stream',
        headers: {
          origin: 'https://spotdown.org',
          referer: 'https://spotdown.org/',
          'user-agent':
            'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.86 Mobile Safari/537.36'
        }
      }
    )

    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Accept-Ranges', 'bytes')

    data.pipe(res)

  } catch (e) {
    res.status(500).json({
      status: false,
      message: e.message
    })
  }
})

export default router
