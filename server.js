const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');

const app = express();
const PORT = process.env.PORT || 3000;

// Static frontend
app.use(express.static(__dirname));

// Multer storage (in-memory or tmp folder)
const upload = multer({
    dest: path.join(__dirname, 'uploads'),
    limits: {
        fileSize: 1024 * 1024 * 1024 // 1 GB limit
    }
});

// Ensure uploads and output directories exist
const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
};

ensureDir(path.join(__dirname, 'uploads'));
ensureDir(path.join(__dirname, 'converted'));

// Simple health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

// MIME/type helpers
function getCategory(mimeType) {
    if (!mimeType) return null;
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('text/')) return 'text';
    const textLike = ['application/json', 'application/xml', 'application/javascript', 'application/x-javascript'];
    if (textLike.includes(mimeType)) return 'text';
    return null;
}

function getImageFormatForMime(targetMime) {
    const map = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp'
    };
    return map[targetMime] || null;
}

function getAudioVideoFormatForMime(targetMime) {
    const map = {
        // audio
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'audio/wav': 'wav',
        'audio/x-wav': 'wav',
        'audio/ogg': 'ogg',
        'audio/webm': 'webm',
        'audio/aac': 'aac',
        // video
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/ogg': 'ogg',
        'video/x-msvideo': 'avi',
        'video/x-matroska': 'mkv'
    };
    return map[targetMime] || null;
}

// Text conversion helpers (server-side)
function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function jsonToXml(obj, rootName = 'root') {
    let xml = `<?xml version="1.0" encoding="UTF-8\"?>\n<${rootName}>\n`;

    function parseValue(value, key) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            let result = `<${key}>\n`;
            for (const k in value) {
                result += parseValue(value[k], k);
            }
            result += `</${key}>\n`;
            return result;
        }
        if (Array.isArray(value)) {
            let result = '';
            value.forEach((item) => {
                result += parseValue(item, key);
            });
            return result;
        }
        return `  <${key}>${escapeXml(String(value))}</${key}>\n`;
    }

    for (const key in obj) {
        xml += parseValue(obj[key], key);
    }
    xml += `</${rootName}>`;
    return xml;
}

function xmlToJson(xmlString) {
    const parseNode = (input) => {
        const obj = {};
        const tagRegex = /<([^\/?!][^>\s]*)([^>]*)>([\s\S]*?)<\/\1>/g;
        let match;
        let hasChildren = false;

        while ((match = tagRegex.exec(input)) !== null) {
            hasChildren = true;
            const tagName = match[1];
            const inner = match[3].trim();
            const value = tagRegex.test(inner) ? parseNode(inner) : inner;
            tagRegex.lastIndex = 0;

            if (obj[tagName]) {
                if (!Array.isArray(obj[tagName])) {
                    obj[tagName] = [obj[tagName]];
                }
                obj[tagName].push(value);
            } else {
                obj[tagName] = value;
            }
        }

        if (!hasChildren) {
            return input.trim();
        }

        return obj;
    };

    return parseNode(xmlString);
}

function htmlToText(html) {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

app.post('/api/convert', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const { mimetype, originalname, path: inputPath } = req.file;
    const targetMime = req.body.targetMime;
    const originalMime = req.body.originalMime || mimetype;
    const category = getCategory(mimetype);

    if (!category) {
        fs.unlink(inputPath, () => { });
        return res.status(400).json({ error: 'Unsupported file type' });
    }

    const baseName = path.basename(originalname, path.extname(originalname));

    // Images via ffmpeg
    if (category === 'image') {
        const imgFormat = getImageFormatForMime(targetMime);
        if (!imgFormat) {
            fs.unlink(inputPath, () => { });
            return res.status(400).json({ error: 'Unsupported target image format' });
        }

        const outputFileName = `${baseName}.${imgFormat}`;
        const outputPath = path.join(__dirname, 'converted', outputFileName);

        ffmpeg(inputPath)
            .output(outputPath)
            .on('end', () => {
                fs.unlink(inputPath, () => { });

                res.download(outputPath, outputFileName, (err) => {
                    fs.unlink(outputPath, () => { });
                    if (err && !res.headersSent) {
                        res.status(500).json({ error: 'Error sending converted file' });
                    }
                });
            })
            .on('error', (err) => {
                console.error('ffmpeg image error:', err.message);
                fs.unlink(inputPath, () => { });
                if (fs.existsSync(outputPath)) {
                    fs.unlink(outputPath, () => { });
                }
                res.status(500).json({ error: 'Image conversion failed' });
            })
            .run();
        return;
    }

    // Audio/Video via ffmpeg
    if (category === 'audio' || category === 'video') {
        const mediaFormat = getAudioVideoFormatForMime(targetMime);
        if (!mediaFormat) {
            fs.unlink(inputPath, () => { });
            return res.status(400).json({ error: 'Unsupported target media format' });
        }

        const outputFileName = `${baseName}.${mediaFormat}`;
        const outputPath = path.join(__dirname, 'converted', outputFileName);

        ffmpeg(inputPath)
            .output(outputPath)
            .on('end', () => {
                fs.unlink(inputPath, () => { });

                res.download(outputPath, outputFileName, (err) => {
                    fs.unlink(outputPath, () => { });
                    if (err && !res.headersSent) {
                        res.status(500).json({ error: 'Error sending converted file' });
                    }
                });
            })
            .on('error', (err) => {
                console.error('ffmpeg media error:', err.message);
                fs.unlink(inputPath, () => { });
                if (fs.existsSync(outputPath)) {
                    fs.unlink(outputPath, () => { });
                }
                res.status(500).json({ error: 'Media conversion failed' });
            })
            .run();
        return;
    }

    // Text via JS on backend (но тоже через бэкенд)
    if (category === 'text') {
        const outputExtMap = {
            'text/plain': 'txt',
            'text/html': 'html',
            'application/json': 'json',
            'application/xml': 'xml'
        };

        const ext = outputExtMap[targetMime] || 'txt';
        const outputFileName = `${baseName}.${ext}`;
        const outputPath = path.join(__dirname, 'converted', outputFileName);

        fs.readFile(inputPath, 'utf8', (readErr, content) => {
            if (readErr) {
                fs.unlink(inputPath, () => { });
                return res.status(500).json({ error: 'Error reading text file' });
            }

            let convertedContent = content;

            try {
                if (originalMime === 'application/json' && targetMime === 'application/xml') {
                    convertedContent = jsonToXml(JSON.parse(content));
                } else if (originalMime === 'application/xml' && targetMime === 'application/json') {
                    convertedContent = JSON.stringify(xmlToJson(content), null, 2);
                } else if (originalMime === 'text/html' && targetMime === 'text/plain') {
                    convertedContent = htmlToText(content);
                }
            } catch (e) {
                fs.unlink(inputPath, () => { });
                return res.status(500).json({ error: 'Error processing text file' });
            }

            fs.writeFile(outputPath, convertedContent, 'utf8', (writeErr) => {
                fs.unlink(inputPath, () => { });

                if (writeErr) {
                    return res.status(500).json({ error: 'Error writing converted text file' });
                }

                res.download(outputPath, outputFileName, (err) => {
                    fs.unlink(outputPath, () => { });
                    if (err && !res.headersSent) {
                        res.status(500).json({ error: 'Error sending converted file' });
                    }
                });
            });
        });
        return;
    }

    fs.unlink(inputPath, () => { });
    return res.status(400).json({ error: 'Unsupported file type' });
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

