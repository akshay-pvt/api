import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

const SAVE_PIN_API = 'https://savepinmedia.com/php/api/api.php';

const commonHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
    'Accept': '*/*',
    'X-Requested-With': 'XMLHttpRequest',
    'Referer': 'https://savepinmedia.com/'
};

router.get('/pindl', async (req, res) => {
    const pinUrl = req.query.url;

    if (!pinUrl) {
        return res.status(400).json({
            status: false,
            message: "URL is required",
            example: "/pindl?url=PINTEREST_URL"
        });
    }

    try {
        const targetUrl = `${SAVE_PIN_API}?url=${encodeURIComponent(pinUrl)}`;

        const response = await axios.get(targetUrl, { headers: commonHeaders });
        const html = response.data;

        const $ = cheerio.load(html);

        // Extract relative download link
        const relativeDownloadPath = $('.button-download a').attr('href');

        let directVideoUrl = null;
        if (relativeDownloadPath && relativeDownloadPath.includes('id=')) {
            directVideoUrl = decodeURIComponent(relativeDownloadPath.split('id=')[1]);
        }

        const author = $('.info span a').text().trim() || null;
        const thumbnail = $('.photo img').attr('src') || null;

        if (!directVideoUrl) {
            return res.status(500).json({
                status: false,
                message: "Failed to extract video URL"
            });
        }

        res.json({
            status: true,
            author: author,
            thumbnail: thumbnail,
            direct_video_url: directVideoUrl,
            creator: "Akshay-Eypz"
        });

    } catch (err) {
        res.status(500).json({
            status: false,
            message: err.message
        });
    }
});

export default router;
