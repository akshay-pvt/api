import express from 'express';
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';

const router = express.Router();

const CONFIG = {
    BASE_URL: 'https://chat-deep.ai',
    ENDPOINT: 'https://chat-deep.ai/wp-admin/admin-ajax.php',
    HEADERS: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest'
    }
};

/**
 * Utility to extract nonce from the main page
 */
async function fetchNonce() {
    try {
        const response = await fetch(CONFIG.BASE_URL, { headers: CONFIG.HEADERS });
        const html = await response.text();
        const nonceMatch = html.match(/"nonce":"([a-f0-9]+)"/);

        if (!nonceMatch) throw new Error('NONCE_NOT_FOUND');
        return nonceMatch[1];
    } catch (error) {
        throw new Error(`AUTH_FAILURE: ${error.message}`);
    }
}

/**
 * Parser to separate thinking process and final response
 */
function parseContent(raw) {
    const thinkMatch = raw.match(/<think>([\s\S]*?)<\/think>/i);
    const think = thinkMatch ? thinkMatch[1].trim() : null;
    const response = raw.replace(/<think>[\s\S]*?<\/think>/i, '').trim();

    return { think, response };
}

/**
 * Main function to communicate with the AI
 * @param {string} prompt - User message
 * @param {string} mode - 'think' for deepseek-chat, 'flash' for reasoner
 */
async function ask(prompt, mode = "flash") {
    try {
        const nonce = await fetchNonce();
        const model = mode === "think" ? "deepseek-chat" : "deepseek-reasoner";

        const payload = new URLSearchParams({
            action: 'deepseek_chat',
            message: prompt,
            model: model,
            nonce: nonce,
            save_conversation: '0',
            session_only: '1'
        });

        const response = await fetch(CONFIG.ENDPOINT, {
            method: 'POST',
            headers: {
                ...CONFIG.HEADERS,
                'Content-Type': 'application/x-www-form-urlencoded',
                'Origin': CONFIG.BASE_URL,
                'Referer': `${CONFIG.BASE_URL}/`
            },
            body: payload
        });

        if (!response.ok) throw new Error(`HTTP_ERROR_${response.status}`);

        const data = await response.json();
        const rawContent = data?.data?.response || data?.response || "";

        return mode === "think"
            ? parseContent(rawContent)
            : { response: rawContent.replace(/<think>[\s\S]*?<\/think>/i, '').trim() };

    } catch (error) {
        return { error: true, message: error.message };
    }
}

/**
 * Route to ask the AI and return the result.
 * Expects `prompt` as a query parameter and `mode` (optional) to be either "think" or "flash".
 */
router.get('/ask-ai', async (req, res) => {
    const { prompt, mode } = req.query;

    if (!prompt) {
        return res.status(400).json({
            status: 'error',
            message: 'Prompt is required',
            example: '/ask-ai?prompt=Your%20question%20here'
        });
    }

    try {
        const result = await ask(prompt, mode);
        
        if (result.error) {
            return res.status(500).json({
                status: 'error',
                message: result.message
            });
        }

        res.json({
            status: 'success',
            result: result
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

export default router;