import express from 'express'
import cors from 'cors'
import path from 'path'
import cookieParser from 'cookie-parser'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import os from 'os'

import spotifyRoute from './routes/spotify.js'
import spotifysearch from './routes/spotify-search.js'
import asciiRoute from "./routes/ascii.js"
import twitterRoute from "./routes/twitter.js"
import instagramRoute from "./routes/instagram.js"
import pinSearch from './routes/pin-search.js'
import publicaiRoute from './routes/publicai.js'
import ytdl from './routes/ytdl.js'
import ytdl2 from './routes/ytdl2.js'
import pindl from './routes/pin.js'
import lyrics from './routes/lyrics.js'
import dolphin from './routes/dolphin.js'
import terabox from './routes/terabox.js'
import askai from './routes/ask-ai.js'
import deepimg from './routes/deep-image.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// =====================
// LIVE USERS TRACKER
// =====================
const activeUsers = new Map()
const ACTIVE_WINDOW = 30 * 1000 // 30 seconds (real API "live")

// =====================
// MIDDLEWARE
// =====================
app.use(cors())
app.use(express.json())
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

// Track users (must be before routes)
app.use((req, res, next) => {
    const ip =
        req.headers["x-forwarded-for"]?.split(",")[0] ||
        req.socket.remoteAddress

    activeUsers.set(ip, Date.now())
    next()
})

// Cleanup inactive users
setInterval(() => {
    const now = Date.now()
    for (const [ip, lastSeen] of activeUsers.entries()) {
        if (now - lastSeen > ACTIVE_WINDOW) {
            activeUsers.delete(ip)
        }
    }
}, 10 * 1000) // every 10 sec

// =====================
// PAGES
// =====================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home.html'))
})

app.get('/docs', (req, res) => {
    const userAgent = req.headers['user-agent']
    if (!userAgent || userAgent.includes('curl') || userAgent.includes('Postman')) {
        return res.status(403).send('Forbidden')
    }
    res.sendFile(path.join(__dirname, 'public', 'docs.html'))
})

// =====================
// API ROUTES
// =====================
app.use('/api', spotifyRoute)
app.use('/api', spotifysearch)
app.use('/api', asciiRoute)
app.use('/api', twitterRoute)
app.use('/api', instagramRoute)
app.use('/api', pinSearch)
app.use('/api', publicaiRoute)
app.use('/api', ytdl)
app.use('/api', ytdl2)
app.use('/api', pindl)
app.use('/api', lyrics)
app.use('/api', dolphin)
app.use('/api', terabox)
app.use('/api', askai)
app.use('/api', deepimg)

// =====================
// LIVE STATS ENDPOINT
// =====================
app.get('/live-stats', (req, res) => {
    res.json({
        status: true,
        live_users: activeUsers.size,
        window: "last 30 seconds",
        timestamp: new Date().toISOString()
    })
})

// =====================
// STATUS / HEALTH ENDPOINT
// =====================
app.get('/status', (req, res) => {
    const uptime = process.uptime() * 1000

    const memoryUsagePercent = Math.round(
        (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100
    )

    const cpuUsage = process.cpuUsage()
    const cpuPercent = Math.round((cpuUsage.user + cpuUsage.system) / 1000 / 1000)

    res.json({
        status: 'ok',
        uptime_ms: Math.round(uptime),
        memory_usage_percent: memoryUsagePercent,
        cpu_usage_ms: cpuPercent
    })
})

// =====================
// START SERVER
// =====================
app.listen(PORT, () => {
    console.log(`🔥 Server running → http://localhost:${PORT}`)
})