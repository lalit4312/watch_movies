const API_BASE = '';
let currentPage = 1;
let currentCategory = '';
let allMovies = [];
let isLoading = false;

const moviesGrid = document.getElementById('moviesGrid');
const featuredGrid = document.getElementById('featuredGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const searchResultsList = document.getElementById('searchResultsList');
const closeSearch = document.getElementById('closeSearch');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const movieModal = document.getElementById('movieModal');
const modalClose = document.getElementById('modalClose');
const navbar = document.querySelector('.navbar');

const videoModal = document.getElementById('videoModal');
const videoModalClose = document.getElementById('videoModalClose');
const videoPlayer = document.getElementById('videoPlayer');

async function fetchMovies() {
    try {
        const res = await fetch('/api/movies');
        const data = await res.json();
        allMovies = data.movies;
        renderFeatured(allMovies);
        renderMovies(allMovies);
    } catch (e) {
        console.error('Error loading movies:', e);
    }
}

function setupRealtimeUpdates() {
    const eventSource = new EventSource('/api/stream/movies');
    
    eventSource.onmessage = function(event) {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'new_movie') {
                const movie = data.movie;
                allMovies.unshift(movie);
                renderMovies(allMovies);
                renderFeatured(allMovies);
                showNewMovieNotification(movie);
            }
        } catch (e) {
            console.log('SSE message:', event.data);
        }
    };
    
    eventSource.onerror = function() {
        console.log('SSE connection error, retrying...');
        setTimeout(setupRealtimeUpdates, 5000);
    };
}

function showNewMovieNotification(movie) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(135deg, #e50914, #ff6b6b);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        z-index: 3000;
        animation: slideIn 0.5s ease-out;
        box-shadow: 0 10px 40px rgba(229, 9, 20, 0.4);
    `;
    notification.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 0.25rem;">New Movie Added!</div>
        <div style="font-size: 0.9rem; opacity: 0.9;">${movie.title}</div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.5s ease-out forwards';
        setTimeout(() => notification.remove(), 500);
    }, 4000);
}

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

function createMovieCard(movie) {
    const year = movie.year || '2025';
    const quality = movie.quality || 'HD';
    const posterUrl = movie.posterUrl || movie.image || '';
    const views = movie.views || 0;
    const rating = movie.rating || 0;
    const ratingCount = movie.ratingCount || 0;
    const viewsFormatted = views >= 1000 ? (views / 1000).toFixed(1) + 'K' : views;
    const ratingDisplay = rating > 0 ? rating.toFixed(1) : 'N/A';
    
    return `
        <div class="movie-card" data-id="${movie._id || movie.id}" data-title="${movie.title}" data-link="/watch/${movie._id || movie.id}" data-image="${posterUrl}" data-video="${movie.videoUrl || ''}">
            ${posterUrl
                ? `<img src="${posterUrl}" alt="${movie.title}" class="poster" onerror="this.parentElement.innerHTML='<div class=\\'placeholder-poster\\'><i class=\\'fas fa-film\\'></i></div>'">`
                : `<div class="placeholder-poster"><i class="fas fa-film"></i></div>`
            }
            <div class="info">
                <div class="title">${movie.title}</div>
                <div class="meta">
                    <span><i class="fas fa-eye"></i> ${viewsFormatted}</span>
                    <span class="quality">${quality}</span>
                </div>
                <div class="rating-display"><i class="fas fa-star"></i> ${ratingDisplay}${ratingCount > 0 ? ` (${ratingCount})` : ''}</div>
            </div>
            <div class="overlay">
                <div class="play-btn"><i class="fas fa-play"></i></div>
            </div>
        </div>
    `;
}

function renderMovies(movies, grid = moviesGrid) {
    if (!movies.length) {
        grid.innerHTML = '<p style="color:#a3a3a3;padding:2rem;text-align:center;">No movies found</p>';
        return;
    }
    grid.innerHTML = movies.map(createMovieCard).join('');
    addCardClickHandlers();
}

function renderFeatured(movies) {
    featuredGrid.innerHTML = movies.slice(0, 6).map(createMovieCard).join('');
    addCardClickHandlers();
}

function addCardClickHandlers() {
    document.querySelectorAll('.movie-card').forEach(card => {
        card.addEventListener('click', () => {
            const data = card.dataset;
            if (data.video) {
                playVideo(data.video, data.title);
            } else if (data.link && data.link !== '#') {
                window.location.href = data.link;
            } else {
                openModal(data);
            }
        });
    });
}

function openModal(data) {
    document.getElementById('modalTitle').textContent = data.title;
    document.getElementById('modalExcerpt').textContent = `Watch ${data.title} online in HD quality.`;
    document.getElementById('modalImage').src = data.image || '';
    document.getElementById('modalImage').style.display = data.image ? 'block' : 'none';
    
    const watchBtn = document.getElementById('modalWatchBtn');
    if (data.video) {
        watchBtn.onclick = (e) => {
            e.preventDefault();
            playVideo(data.video, data.title);
        };
    }
    
    movieModal.classList.add('active');
}

function playVideo(videoUrl, title) {
    videoPlayer.src = videoUrl;
    document.querySelector('#videoModal .modal-title').textContent = title;
    videoModal.classList.add('active');
    videoPlayer.play();
}

function closeModal() {
    movieModal.classList.remove('active');
}

function closeVideoModal() {
    videoPlayer.pause();
    videoPlayer.src = '';
    videoModal.classList.remove('active');
}

modalClose.addEventListener('click', closeModal);
movieModal.addEventListener('click', (e) => {
    if (e.target === movieModal) closeModal();
});

if (videoModalClose) {
    videoModalClose.addEventListener('click', closeVideoModal);
    videoModal.addEventListener('click', (e) => {
        if (e.target === videoModal) closeVideoModal();
    });
}

async function searchMovies(query) {
    if (!query || query.length < 2) {
        searchResults.classList.remove('active');
        return;
    }
    
    const results = allMovies.filter(m => 
        m.title.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 10);
    
    if (results.length > 0) {
        searchResultsList.innerHTML = results.map(movie => `
            <div class="search-result-item" data-id="${movie._id || movie.id}" data-video="${movie.videoUrl || ''}" data-title="${movie.title}" data-link="/watch/${movie._id || movie.id}" data-image="${movie.posterUrl || ''}">
                ${movie.posterUrl ? `<img src="${movie.posterUrl}" alt="">` : '<div style="width:60px;height:80px;background:var(--card-hover);border-radius:4px;display:flex;align-items:center;justify-content:center;"><i class="fas fa-film" style="color:var(--text-muted)"></i></div>'}
                <div class="info">
                    <div class="title">${movie.title}</div>
                    <div class="meta">
                        <span><i class="fas fa-eye"></i> ${movie.views || 0}</span>
                        <span><i class="fas fa-star"></i> ${movie.rating > 0 ? movie.rating.toFixed(1) : 'N/A'}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        document.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const data = item.dataset;
                if (data.video) {
                    playVideo(data.video, data.title);
                } else if (data.link) {
                    window.location.href = data.link;
                }
                searchResults.classList.remove('active');
            });
        });
        
        searchResults.classList.add('active');
    } else {
        searchResultsList.innerHTML = '<p style="padding:1rem;color:var(--text-muted)">No movies found</p>';
        searchResults.classList.add('active');
    }
}

let searchTimeout;
searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchMovies(e.target.value), 300);
});

searchBtn.addEventListener('click', () => searchMovies(searchInput.value));
closeSearch.addEventListener('click', () => searchResults.classList.remove('active'));

document.addEventListener('click', (e) => {
    if (!searchResults.contains(e.target) && !searchInput.contains(e.target)) {
        searchResults.classList.remove('active');
    }
});

document.querySelectorAll('.category-card, .nav-menu a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const category = link.dataset.category;
        currentCategory = category;
        filterMovies(category);
        
        document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
        link.classList.add('active');
        
        document.getElementById('movies').scrollIntoView({ behavior: 'smooth' });
    });
});

async function filterMovies(category) {
    if (!category || category === 'all') {
        renderMovies(allMovies);
        return;
    }
    
    const res = await fetch(`/api/movies?category=${category}`);
    const data = await res.json();
    renderMovies(data.movies);
}

loadMoreBtn.addEventListener('click', async () => {
    currentPage++;
    const res = await fetch(`/api/movies?page=${currentPage}`);
    const data = await res.json();
    moviesGrid.innerHTML += data.movies.map(createMovieCard).join('');
    addCardClickHandlers();
});

document.getElementById('yearFilter')?.addEventListener('change', async (e) => {
    const year = e.target.value;
    if (!year) {
        renderMovies(allMovies);
        return;
    }
    const filtered = allMovies.filter(m => m.year === year);
    renderMovies(filtered);
});

document.getElementById('sortFilter')?.addEventListener('change', async (e) => {
    const sort = e.target.value;
    const res = await fetch(`/api/movies?sort=${sort}`);
    const data = await res.json();
    renderMovies(data.movies);
    currentPage = 1;
});

window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    fetchMovies();
    setupRealtimeUpdates();
});
