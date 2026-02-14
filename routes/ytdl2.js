import express from 'express';
import axios from 'axios';

const router = express.Router();

const apiBase = 'https://ytdown.to/proxy.php';

const commonHeaders = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36'
};

// =====================
// PRO TIP: Faster retries
// =====================
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function waitForDownloadUrl(mediaUrl, maxRetries = 5, delay = 1500) {
    for (let i = 0; i < maxRetries; i++) {
        const res = await axios.post(
            apiBase,
            `url=${encodeURIComponent(mediaUrl)}`,
            { headers: commonHeaders }
        );

        if (res?.data?.api?.fileUrl && !res.data.api.fileUrl.includes('Processing')) {
            return res.data.api.fileUrl;
        }

        await sleep(delay);
    }
    return null;
}

// =====================
// HELPER
// =====================
function getYouTubeId(url) {
    const match = url.match(
        /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([^&?/]+)/
    );
    return match ? match[1] : null;
}

// =====================
// YTDL ROUTE
// =====================
router.get('/ytdl', async (req, res) => {
    const youtubeUrl = req.query.url;

    if (!youtubeUrl) {
        return res.status(400).json({
            status: false,
            message: "URL is required",
            example: "/ytdl?url=YOUTUBE_URL"
        });
    }

    try {
        const step1 = await axios.post(
            apiBase,
            `url=${encodeURIComponent(youtubeUrl)}`,
            { headers: commonHeaders }
        );

        const data = step1.data.api || step1.data;

        if (!data.mediaItems?.length) {
            return res.status(500).json({
                status: false,
                message: "No media items found"
            });
        }

        const formats = [];

        for (const item of data.mediaItems) {
            const downloadUrl = await waitForDownloadUrl(item.mediaUrl);

            // ❌ Skip processing / dead items
            if (!downloadUrl) continue;

            formats.push({
                type: item.type,
                quality: item.mediaQuality,
                resolution: item.mediaRes || "N/A",
                size: item.mediaFileSize || "N/A",
                ext: item.mediaExtension,
                downloadUrl
            });
        }

        const videoId = getYouTubeId(youtubeUrl);
        const thumbnail = videoId
            ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
            : null;

        res.json({
            status: true,
            title: data.title,
            thumbnail,
            formats
        });

    } catch (err) {
        res.status(500).json({
            status: false,
            message: err.message
        });
    }
});

export default router;
