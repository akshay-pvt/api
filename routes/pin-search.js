import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const router = express.Router();

// =====================
// HELPERS
// =====================
function slugify(text = '') {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// =====================
// SHAZAM SEARCH
// =====================
async function searchSong(query) {
    const { data } = await axios.get(
        'https://www.shazam.com/services/amapi/v1/catalog/ID/search',
        {
            params: { types: 'songs', term: query, limit: 1 },
            headers: { 'User-Agent': 'Mozilla/5.0' }
        }
    );

    const song = data?.results?.songs?.data?.[0];
    if (!song) return null;

    return `https://www.shazam.com/id-id/song/${song.id}/${slugify(
        song.attributes.name
    )}?tab=lyrics`;
}

// =====================
// SHAZAM SCRAPER
// =====================
async function getSongDetails(url) {
    const { data: html } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0',
            'Accept-Language': 'en-US,en;q=0.9'
        }
    });

    const $ = cheerio.load(html);
    const song = {};

    const jsonLd = $('script[type="application/ld+json"]').html();
    if (jsonLd) {
        const j = JSON.parse(jsonLd);
        song.title = j.name || null;
        song.artist = j.byArtist?.name || null;
        song.album = j.inAlbum?.name || null;
        song.releaseDate = j.datePublished || null;
        song.genre = j.genre || null;
        song.cover = j.thumbnailUrl || null;
    }

    const lyrics = [];
    $('.LyricsContent_lyricSection__ciW_E').each((_, el) => {
        const text = $(el)
            .find('.LyricsContent_lyricLine__pSlCU')
            .map((_, l) => $(l).text().trim())
            .get()
            .join('\n');

        if (text) lyrics.push(text);
    });

    song.lyrics = lyrics.join('\n\n') || null;
    return song;
}

// =====================
// LYRICS ROUTE (YTDL STYLE)
// =====================
router.get('/lyrics', async (req, res) => {
    const query = req.query.query;

    if (!query) {
        return res.status(400).json({
            status: false,
            message: "query is required",
            example: "/lyrics?query=Believer"
        });
    }

    try {
        const url = await searchSong(query);

        if (!url) {
            return res.json({
                status: false,
                message: "Song not found"
            });
        }

        const details = await getSongDetails(url);

        res.json({
            status: true,
            data: details
        });

    } catch (err) {
        res.status(500).json({
            status: false,
            message: err.message
        });
    }
});

export default router;
