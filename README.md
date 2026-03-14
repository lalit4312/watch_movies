# WatchMovies - Production-Ready Movie Streaming Platform

A scalable, production-ready movie streaming platform built with Node.js, Express, MongoDB, and modern frontend technologies.

## Features

- Movie upload and management
- Cloud storage (Cloudinary/S3)
- JWT-based admin authentication
- MongoDB database with Mongoose
- Real-time updates (SSE)
- Video.js player with adaptive streaming
- User ratings and view tracking
- Analytics dashboard
- Search and filtering
- Responsive design
- Security best practices

## Architecture

```
/server
  /config         - Configuration files
  /controllers    - Route controllers
  /middleware     - Auth, upload, rate limiting
  /models         - MongoDB schemas
  /routes         - API routes
  /services       - Cloud storage, analytics
  server.js       - Main server file
/public
  index.html      - Main frontend
  admin.html     - Admin dashboard
  watch.html     - Movie watch page
  script.js      - Frontend JavaScript
  styles.css     - Styles
```

## Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Cloudinary account (for media storage)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd watch-movies
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Update `.env` with your configuration:
```env
PORT=3000
NODE_ENV=development

# MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/watchmovies

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Admin credentials
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@watchmovies.com
ADMIN_PASSWORD=your_secure_password
```

5. Seed the database:
```bash
node server/seed.js
```

6. Start the server:
```bash
npm start
```

Visit `http://localhost:3000` for the frontend and `http://localhost:3000/admin` for the admin panel.

## Deployment

### Backend (Render)

1. Push your code to GitHub
2. Create a new Web Service on Render
3. Connect your GitHub repository
4. Set environment variables in Render dashboard
5. Build command: `npm install`
6. Start command: `node server/server.js`

### Database (MongoDB Atlas)

1. Create a free MongoDB Atlas account
2. Create a cluster
3. Create a database user
4. Get connection string
5. Add to `.env`

### Video Storage (Cloudinary)

1. Create a free Cloudinary account
2. Get cloud name, API key, and API secret
3. Add to `.env`

### Frontend (Vercel)

1. Push code to GitHub
2. Import project on Vercel
3. Configure in `vercel.json`
4. Deploy automatically

## API Endpoints

### Public
- `GET /api/movies` - List movies
- `GET /api/movies/search` - Search movies
- `GET /api/featured` - Featured movies
- `GET /api/movie/:id` - Get movie details
- `POST /api/movie/:id/rate` - Rate a movie

### Admin (Protected)
- `POST /api/auth/login` - Admin login
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/movies` - List all movies
- `POST /api/admin/upload` - Upload movie
- `PUT /api/admin/movie/:id` - Update movie
- `DELETE /api/admin/movie/:id` - Delete movie

## Security

- JWT authentication for admin routes
- Rate limiting on all endpoints
- File type validation
- File size limits
- Input sanitization
- CORS configuration

## License

MIT
