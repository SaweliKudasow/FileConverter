const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const conversionOptions = document.getElementById('conversionOptions');
const targetFormat = document.getElementById('targetFormat');
const convertBtn = document.getElementById('convertBtn');
const downloadArea = document.getElementById('downloadArea');
const downloadBtn = document.getElementById('downloadBtn');
const progress = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');
const error = document.getElementById('error');

let currentFile = null;
let convertedBlob = null;
let currentFileType = null; // 'image' | 'text' | 'audio' | 'video' | null

// Supported formats
const supportedFormats = {
    image: {
        // Common image types that browsers can decode
        input: [
            'image/jpeg',
            'image/png',
            'image/webp',
            'image/gif',
            'image/bmp',
            'image/svg+xml',
            'image/x-icon',
            'image/vnd.microsoft.icon'
        ],
        output: [
            { value: 'image/jpeg', label: 'JPEG' },
            { value: 'image/png', label: 'PNG' },
            { value: 'image/webp', label: 'WEBP' }
        ]
    },
    text: {
        // Explicitly listed text-like types (in addition to generic text/* below)
        input: [
            'text/plain',
            'text/html',
            'application/json',
            'application/xml',
            'text/css',
            'text/javascript',
            'application/javascript',
            'text/markdown',
            'text/csv'
        ],
        output: [
            { value: 'text/plain', label: 'TXT' },
            { value: 'text/html', label: 'HTML' },
            { value: 'application/json', label: 'JSON' },
            { value: 'application/xml', label: 'XML' }
        ]
    },
    media: {
        audio: {
            input: [
                'audio/mpeg',
                'audio/mp3',
                'audio/wav',
                'audio/x-wav',
                'audio/ogg',
                'audio/webm',
                'audio/aac'
            ],
            output: [
                { value: 'audio/mpeg', label: 'MP3' },
                { value: 'audio/wav', label: 'WAV' },
                { value: 'audio/ogg', label: 'OGG' },
                { value: 'audio/webm', label: 'WEBM' }
            ]
        },
        video: {
            input: [
                'video/mp4',
                'video/webm',
                'video/ogg',
                'video/x-msvideo',
                'video/x-matroska'
            ],
            output: [
                { value: 'video/mp4', label: 'MP4' },
                { value: 'video/webm', label: 'WEBM' },
                { value: 'video/ogg', label: 'OGG' }
            ]
        }
    }
};

// Handle click on upload area
uploadArea.addEventListener('click', () => fileInput.click());

// Handle drag and drop
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('dragover');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

// Handle file selection
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

function handleFile(file) {
    error.classList.remove('active');
    currentFile = file;
    fileName.textContent = `File: ${file.name} (${formatFileSize(file.size)})`;
    fileInfo.classList.add('active');

    // Determine file type
    const fileType = getFileType(file.type);
    currentFileType = fileType;

    if (!fileType) {
        showError('Unsupported file type. Images and text files are supported.');
        conversionOptions.classList.remove('active');
        return;
    }

    // Populate conversion options
    let formats;

    if (fileType === 'audio') {
        formats = supportedFormats.media.audio.output;
    } else if (fileType === 'video') {
        formats = supportedFormats.media.video.output;
    } else {
        formats = supportedFormats[fileType].output;
    }
    targetFormat.innerHTML = '';

    formats.forEach((format) => {
        // Don't show current format
        if (format.value !== file.type) {
            const option = document.createElement('option');
            option.value = format.value;
            option.textContent = format.label;
            targetFormat.appendChild(option);
        }
    });

    if (targetFormat.options.length === 0) {
        showError('No conversion formats available for this file.');
        conversionOptions.classList.remove('active');
    } else {
        conversionOptions.classList.add('active');
    }

    downloadArea.classList.remove('active');
}

function getFileType(mimeType) {
    if (!mimeType) {
        return null;
    }

    // Treat any image/* as image if the browser can decode it
    if (mimeType.startsWith('image/')) {
        return 'image';
    }

    if (mimeType.startsWith('audio/')) {
        return 'audio';
    }

    if (mimeType.startsWith('video/')) {
        return 'video';
    }

    // Generic text types
    if (mimeType.startsWith('text/')) {
        return 'text';
    }

    // Common text-like application types
    const textLikeTypes = [
        'application/json',
        'application/xml',
        'application/javascript',
        'application/x-javascript'
    ];

    if (textLikeTypes.includes(mimeType)) {
        return 'text';
    }

    return null;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function showError(message) {
    error.textContent = message;
    error.classList.add('active');
}

convertBtn.addEventListener('click', async () => {
    if (!currentFile) return;

    error.classList.remove('active');
    convertBtn.disabled = true;
    progress.classList.add('active');
    progressBar.style.width = '30%';

    try {
        const targetMimeType = targetFormat.value;

        progressBar.style.width = '60%';

        // Всегда отправляем файл на бэкенд
        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('targetMime', targetMimeType);
        formData.append('originalMime', currentFile.type || '');

        const response = await fetch('/api/convert', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const data = await response.json().catch(() => null);
            const message = data && data.error ? data.error : 'Conversion failed';
            throw new Error(message);
        }

        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = currentFile.name;
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?([^"]+)"?/);
            if (match && match[1]) {
                filename = match[1];
            }
        } else {
            const extension = getExtensionFromMimeType(targetMimeType);
            filename = currentFile.name.replace(/\.[^/.]+$/, '') + '.' + extension;
        }

        convertedBlob = blob;

        progressBar.style.width = '100%';

        setTimeout(() => {
            downloadBtn.href = URL.createObjectURL(convertedBlob);
            downloadBtn.download = filename;
            downloadArea.classList.add('active');
            progress.classList.remove('active');
            convertBtn.disabled = false;
        }, 500);
    } catch (err) {
        showError('Conversion error: ' + err.message);
        progress.classList.remove('active');
        convertBtn.disabled = false;
    }
});

async function convertImage(file, targetMimeType) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to create image'));
                        }
                    },
                    targetMimeType,
                    0.9
                );
            };
            img.onerror = () => reject(new Error('Error loading image'));
            img.src = e.target.result;
        };
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsDataURL(file);
    });
}

async function convertText(file, targetMimeType) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                let content = e.target.result;
                let convertedContent = '';

                // Conversion between formats
                if (file.type === 'application/json' && targetMimeType === 'application/xml') {
                    convertedContent = jsonToXml(JSON.parse(content));
                } else if (file.type === 'application/xml' && targetMimeType === 'application/json') {
                    convertedContent = JSON.stringify(xmlToJson(content), null, 2);
                } else if (file.type === 'text/html' && targetMimeType === 'text/plain') {
                    // Simple text extraction from HTML
                    const div = document.createElement('div');
                    div.innerHTML = content;
                    convertedContent = div.textContent || div.innerText || '';
                } else {
                    convertedContent = content;
                }

                const blob = new Blob([convertedContent], { type: targetMimeType });
                resolve(blob);
            } catch (err) {
                reject(new Error('Error processing text file: ' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsText(file);
    });
}

function jsonToXml(obj, rootName = 'root') {
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<${rootName}>\n`;

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
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

    function parseNode(node) {
        if (node.nodeType === 3) {
            return node.textContent.trim();
        }

        const obj = {};
        if (node.childNodes.length === 1 && node.childNodes[0].nodeType === 3) {
            return node.childNodes[0].textContent.trim();
        }

        for (const child of node.childNodes) {
            if (child.nodeType === 1) {
                const name = child.nodeName;
                if (obj[name]) {
                    if (!Array.isArray(obj[name])) {
                        obj[name] = [obj[name]];
                    }
                    obj[name].push(parseNode(child));
                } else {
                    obj[name] = parseNode(child);
                }
            }
        }
        return obj;
    }

    return parseNode(xmlDoc.documentElement);
}

function escapeXml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function getExtensionFromMimeType(mimeType) {
    const extensions = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/webp': 'webp',
        'text/plain': 'txt',
        'text/html': 'html',
        'application/json': 'json',
        'application/xml': 'xml',
        'text/css': 'css',
        'text/javascript': 'js',
        'application/javascript': 'js',
        'text/markdown': 'md',
        'text/csv': 'csv',
        'audio/mpeg': 'mp3',
        'audio/mp3': 'mp3',
        'audio/wav': 'wav',
        'audio/x-wav': 'wav',
        'audio/ogg': 'ogg',
        'audio/webm': 'webm',
        'audio/aac': 'aac',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/ogg': 'ogg',
        'video/x-msvideo': 'avi',
        'video/x-matroska': 'mkv'
    };
    return extensions[mimeType] || 'bin';
}
