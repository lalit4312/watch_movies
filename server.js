const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'movies-db.json');
const UPLOAD_DIR = path.join(__dirname, 'public', 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, unique + ext);
    }
});

function fileFilter(req, file, cb) {
    if (file.fieldname === 'video') {
        const allowedTypes = /mp4|mkv|avi|webm|mov/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mime = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('video/');
        if (ext || mime) cb(null, true);
        else cb(new Error('Only video files are allowed (MP4, MKV, AVI, WebM, MOV)'));
    } else if (file.fieldname === 'thumbnail') {
        const allowed = /jpeg|jpg|png|gif|webp/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype) || file.mimetype.startsWith('image/');
        if (ext || mime) cb(null, true);
        else cb(new Error('Only image files are allowed (JPEG, PNG, GIF, WebP)'));
    } else {
        cb(null, true);
    }
}

const upload = multer({ 
    storage,
    limits: { fileSize: 2000 * 1024 * 1024 },
    fileFilter
});

const imageUpload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

function loadMovies() {
    try {
        if (fs.existsSync(DB_FILE)) {
            return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
        }
    } catch (e) { console.error('Error loading movies:', e); }
    return [];
}

function saveMovies(movies) {
    fs.writeFileSync(DB_FILE, JSON.stringify(movies, null, 2));
}

let moviesDB = loadMovies();

let clients = [];

app.get('/api/stream/movies', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    
    const clientId = Date.now();
    const newClient = { id: clientId, res };
    clients.push(newClient);
    
    req.on('close', () => {
        clients = clients.filter(c => c.id !== clientId);
    });
});

function notifyClients(movie) {
    clients.forEach(client => {
        client.res.write(`data: ${JSON.stringify({ type: 'new_movie', movie })}\n\n`);
    });
}

app.get('/api/movies', (req, res) => {
    const { category, page = 1, limit = 20, sort } = req.query;
    let filtered = [...moviesDB];
    
    if (category && category !== 'all') {
        filtered = filtered.filter(m => 
            m.category?.toLowerCase().includes(category.toLowerCase()) ||
            m.title.toLowerCase().includes(category.toLowerCase())
        );
    }
    
    if (sort === 'views') {
        filtered.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sort === 'rating') {
        filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    }
    
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + parseInt(limit));
    
    res.json({
        movies: paginated,
        total: filtered.length,
        page: parseInt(page),
        totalPages: Math.ceil(filtered.length / limit)
    });
});

app.get('/api/movies/search', (req, res) => {
    const { q } = req.query;
    if (!q) return res.json({ movies: [] });
    
    const results = moviesDB.filter(m => 
        m.title.toLowerCase().includes(q.toLowerCase())
    );
    res.json({ movies: results });
});

app.get('/api/movie/:id', (req, res) => {
    const movie = moviesDB.find(m => m.id == req.params.id);
    if (movie) {
        movie.views = (movie.views || 0) + 1;
        saveMovies(moviesDB);
        res.json(movie);
    } else {
        res.status(404).json({ error: 'Movie not found' });
    }
});

app.post('/api/movie/:id/rate', (req, res) => {
    const movie = moviesDB.find(m => m.id == req.params.id);
    const { rating } = req.body;
    
    if (!movie) {
        return res.status(404).json({ error: 'Movie not found' });
    }
    
    const ratingValue = parseFloat(rating);
    if (isNaN(ratingValue) || ratingValue < 1 || ratingValue > 5) {
        return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    if (!movie.totalRating) movie.totalRating = 0;
    if (!movie.ratingCount) movie.ratingCount = 0;
    
    movie.totalRating = (movie.totalRating || 0) + ratingValue;
    movie.ratingCount = (movie.ratingCount || 0) + 1;
    movie.rating = parseFloat((movie.totalRating / movie.ratingCount).toFixed(1));
    
    saveMovies(moviesDB);
    res.json({ success: true, rating: movie.rating, ratingCount: movie.ratingCount });
});

app.post('/api/admin/upload', (req, res) => {
    upload.fields([
        { name: 'video', maxCount: 1 },
        { name: 'thumbnail', maxCount: 1 }
    ])(req, res, function(err) {
        if (err) {
            return res.status(400).json({ error: err.message });
        }
        
        try {
            const files = req.files;
            
            if (!files || !files.video || !files.video[0]) {
                return res.status(400).json({ error: 'Video file is required' });
            }
            
            const videoFile = files.video[0];
            
            const ext = path.extname(videoFile.originalname).toLowerCase();
            const allowedVideoExt = /mp4|mkv|avi|webm|mov/;
            if (!allowedVideoExt.test(ext) && !videoFile.mimetype.startsWith('video/')) {
                if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
                return res.status(400).json({ error: 'Only video files are allowed (MP4, MKV, AVI, WebM, MOV)' });
            }
            
            const { title, description, category, year } = req.body;
            
            const videoUrl = '/uploads/' + videoFile.filename;
            
            let thumbnailUrl = '';
            if (files.thumbnail && files.thumbnail[0]) {
                const thumbFile = files.thumbnail[0];
                const thumbExt = path.extname(thumbFile.originalname).toLowerCase();
                const allowedImgExt = /jpeg|jpg|png|gif|webp/;
                if (allowedImgExt.test(thumbExt) || thumbFile.mimetype.startsWith('image/')) {
                    thumbnailUrl = '/uploads/' + thumbFile.filename;
                }
            }
            
            const newMovie = {
                id: Date.now(),
                title: title || 'Untitled',
                description: description || '',
                category: category || 'Bollywood',
                year: year || new Date().getFullYear().toString(),
                videoUrl: videoUrl,
                posterUrl: thumbnailUrl,
                views: 0,
                rating: 0,
                totalRating: 0,
                ratingCount: 0,
                isLocal: true,
                fileSize: videoFile.size,
                uploadedAt: new Date().toISOString()
            };
            
            moviesDB.unshift(newMovie);
            saveMovies(moviesDB);
            
            notifyClients(newMovie);
            
            res.json({ success: true, movie: newMovie });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});

app.post('/api/admin/add', imageUpload.single('thumbnail'), (req, res) => {
    const { title, description, category, year, videoUrl } = req.body;
    
    const thumbnailUrl = req.file ? '/uploads/' + req.file.filename : '';
    
    const newMovie = {
        id: Date.now(),
        title: title || 'Untitled',
        description: description || '',
        category: category || 'Bollywood',
        year: year || new Date().getFullYear().toString(),
        videoUrl: videoUrl || '',
        posterUrl: thumbnailUrl,
        views: 0,
        rating: 0,
        totalRating: 0,
        ratingCount: 0,
        uploadedAt: new Date().toISOString()
    };
    
    moviesDB.unshift(newMovie);
    saveMovies(moviesDB);
    
    notifyClients(newMovie);
    
    res.json({ success: true, movie: newMovie });
});

app.delete('/api/admin/movie/:id', (req, res) => {
    const id = parseInt(req.params.id);
    const movie = moviesDB.find(m => m.id === id);
    
    if (movie && movie.videoUrl && movie.isLocal) {
        const filePath = path.join(__dirname, 'public', movie.videoUrl);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    
    if (movie && movie.posterUrl && !movie.posterUrl.startsWith('http')) {
        const filePath = path.join(__dirname, 'public', movie.posterUrl);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    
    moviesDB = moviesDB.filter(m => m.id !== id);
    saveMovies(moviesDB);
    res.json({ success: true });
});

app.get('/api/admin/movies', (req, res) => {
    res.json(moviesDB);
});

app.get('/api/featured', (req, res) => {
    const featured = moviesDB.slice(0, 12);
    res.json({ movies: featured });
});

app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;
    
    if (!ADMIN_PASSWORD) {
        return res.status(500).json({ error: 'Admin password not configured. Please set ADMIN_PASSWORD in .env file' });
    }
    
    if (password === ADMIN_PASSWORD) {
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

app.post('/api/admin/change-password', (req, res) => {
    res.status(400).json({ error: 'Password cannot be changed from admin panel. Please update ADMIN_PASSWORD in .env file' });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/watch/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'watch.html'));
});

if (moviesDB.length === 0) {
    moviesDB = [
        { id: 1, title: 'Sample Movie', category: 'Hindi', year: '2025', videoUrl: '/uploads/sample.mp4', posterUrl: '', views: 1250, rating: 4.5, isLocal: false }
    ];
    saveMovies(moviesDB);
}

console.log('Server starting on port', PORT);
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Admin panel: http://localhost:${PORT}/admin`);
    console.log(`Upload folder: ${UPLOAD_DIR}`);
});
