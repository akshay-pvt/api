import express from 'express';
import axios from 'axios';

const router = express.Router();

/**
 * DeepImg AI Image Generator (Flux-1 Dev)
 * Source: api-preview.chatgot.io
 * Owners: AgungDevX
 */
const Agung = {
    config: {
        apiUrl: 'https://api-preview.chatgot.io/api/v1/deepimg/flux-1-dev',
        imageSize: '1024x1024',
        headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://deepimg.ai',
            'Referer': 'https://deepimg.ai/',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
        }
    },

    /**
     * @returns {String} Random Device ID
     */
    _getDeviceId: () => {
        return `dev-${Math.floor(Math.random() * 1000000)}`;
    },

    /**
     * @param {String} prompt - Deskripsi gambar
     */
    generate: async (prompt) => {
        try {
            if (!prompt) return { status: 400, success: false, owners: "AgungDevX", message: "Promptna mana, mang?" };

            const response = await axios.post(Agung.config.apiUrl, {
                prompt: prompt,
                size: Agung.config.imageSize,
                device_id: Agung._getDeviceId()
            }, { 
                headers: Agung.config.headers 
            });

            const imageUrl = response.data?.data?.images?.[0]?.url;

            if (!imageUrl) throw new Error("Gagal meunangkeun URL gambar.");

            return {
                status: 200,
                success: true,
                owners: "AgungDevX",
                payload: {
                    url: imageUrl,
                    model: 'flux-1-dev',
                    prompt: prompt
                }
            };

        } catch (err) {
            return {
                status: 500,
                success: false,
                owners: "AgungDevX",
                message: err.response?.data?.message || err.message
            };
        }
    }
};

// --- Route to generate image using the DeepImg AI ---

router.get('/generate-image', async (req, res) => {
    const { prompt } = req.query;

    if (!prompt) {
        return res.status(400).json({
            status: 'error',
            message: 'Prompt is required',
            example: '/generate-image?prompt=A%20futuristic%20Sundanese%20warrior%20with%20neon%20kris'
        });
    }

    try {
        const result = await Agung.generate(prompt);
        
        if (result.success) {
            res.json({
                status: 'success',
                result: result.payload
            });
        } else {
            res.status(result.status).json({
                status: 'error',
                message: result.message
            });
        }
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

export default router;