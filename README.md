# Task Manager (Monstager for short)

A full-stack, gamified task management application built with React and Flask, featuring user authentication, offline support, and monster battle mechanics. Deployed with HTTPS, custom domains, and production-grade infrastructure.

## Live/Video Demo

- **Frontend:** [https://monstager.xyz](https://monstager.xyz)

https://github.com/carterantrobus/Task-Manager/blob/main/frontend/public/assets/Task-Manager-Demo.mp4

## Features

### Core Task Management
- **User Authentication** - Secure login/register with JWT tokens
- **CRUD Operations** - Create, read, update, delete tasks
- **Task Properties** - Priority levels, status tracking, due dates
- **Multiple Views** - List, Board (Kanban), Status, and Calendar views
- **Search & Filter** - Find tasks by text, completion status, priority
- **Real-time Updates** - Instant UI updates with optimistic rendering

### Gamification System
- **Monster Battle Mechanics** - Defeat monsters by completing tasks
- **Theme Unlocking** - Unlock new UI themes by defeating special monsters
- **Milestone Achievements** - Special rewards at milestone monster defeats
- **Sound Effects** - Audio feedback for actions and achievements
- **Progress Tracking** - Persistent monster health and theme unlocks

## Tech Stack

### Frontend
- **React 18** - Modern UI framework
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **React Router** - Client-side routing
- **Context API** - State management

### Backend
- **Flask** - Python web framework
- **SQLAlchemy** - Database ORM
- **Flask-JWT-Extended** - JWT authentication
- **Flask-CORS** - Cross-origin resource sharing
- **Gunicorn** - WSGI server

### Database
- **SQLite** - Development (with PostgreSQL support for production)
- **Alembic** - Database migrations

### Infrastructure
- **AWS EC2** - Cloud server hosting
- **Nginx** - Reverse proxy and SSL termination
- **Let's Encrypt** - Free SSL certificates
- **Netlify** - Frontend hosting and CDN

### DevOps
- **GitHub Actions** - CI/CD pipeline
- **Docker** - Containerization support
- **Terraform** - Infrastructure as Code

## Deployment Architecture

```
┌─────────────────┐    ┌─────────────────-┐    ┌─────────────────-┐
│   Frontend      │    │   Backend        │    │   Database       │
│                 │    │                  │    │                  │
│ Netlify CDN     │◄──►│ Nginx + Gunicorn │◄──►│ SQLite/PostgreSQL│
│ monstager.xyz   │    │ api.monstager.xyz│    │                  │
│                 │    │                  │    │                  │
│ React App       │    │ Flask API        │    │ User Data        │
└─────────────────┘    └─────────────────-┘    └─────────────────-┘
```

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- Python 3.8+
- Git

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/carterantrobus/Task-Manager.git
   cd Task-Manager
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   ```

4. **Environment Variables**
   Create `.env` files in both `backend/` and `frontend/` directories:
   ```bash
   # backend/.env
   JWT_SECRET_KEY=your-secret-key
   POSTGRES_URI=sqlite:///tasks.db  # or your PostgreSQL URI
   
   # frontend/.env
   REACT_APP_API_URL=http://localhost:5000
   ```

5. **Run the Application**
   ```bash
   # Terminal 1 - Backend
   cd backend
   python app.py
   
   # Terminal 2 - Frontend
   cd frontend
   npm start
   ```

<!-- ### Production Deployment

#### Backend (AWS EC2)
1. **Launch EC2 instance** with Ubuntu
2. **Configure security groups** to allow ports 22, 80, 443
3. **Install dependencies:**
   ```bash
   sudo apt update
   sudo apt install nginx certbot python3-certbot-nginx
   ```
4. **Deploy application:**
   ```bash
   git clone <your-repo>
   cd Task-Manager/backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
5. **Configure Nginx:**
   ```bash
   sudo nano /etc/nginx/sites-available/api.monstager.xyz
   # Add reverse proxy configuration
   sudo ln -s /etc/nginx/sites-available/api.monstager.xyz /etc/nginx/sites-enabled/
   ```
6. **Start services:**
   ```bash
   sudo /path/to/venv/bin/gunicorn --chdir backend wsgi:app --bind 127.0.0.1:8000
   sudo systemctl start nginx
   sudo certbot --nginx -d api.monstager.xyz
   ``` 

#### Frontend (Netlify)
1. **Connect GitHub repository** to Netlify
2. **Configure build settings:**
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `build`
3. **Set environment variables:**
   - `REACT_APP_API_URL`: `https://api.monstager.xyz`
4. **Deploy** -->

## API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/profile` - Get user profile
- `POST /auth/request-password-reset` - Request password reset
- `POST /auth/reset-password` - Reset password

### Tasks
- `GET /tasks` - Get all user tasks
- `POST /tasks` - Create new task
- `PUT /tasks/{id}` - Update task
- `DELETE /tasks/{id}` - Delete task

## Gamification System

### Monster Battle Mechanics
- Each task completion damages a monster
- Defeat monsters to progress through levels
- Special monsters unlock new UI themes

### Theme System
- Unlock new themes by defeating specific monsters
- Themes change the entire UI color scheme
- Progress persists across sessions

## Security Features

- **JWT Authentication** - Secure token-based auth
- **HTTPS/SSL** - Encrypted data transmission
- **CORS Protection** - Controlled cross-origin requests
- **Input Validation** - Server-side data validation
- **SQL Injection Protection** - ORM-based queries

## Offline Support

The application works offline with the following features:
- **Local Storage** - Tasks cached in browser
- **Pending Queue** - Changes queued when offline
- **Auto-sync** - Automatic sync when connection restored
<!-- - **Optimistic UI** - Immediate feedback for user actions -->

## Testing

```bash
# Backend tests
cd backend
python -m pytest

# Frontend tests
cd frontend
npm test
```

## Performance

- **Lazy Loading** - Components load on demand
- **Optimized Bundles** - Code splitting and tree shaking
- **CDN Delivery** - Static assets served globally
- **Database Indexing** - Optimized queries
- **Caching** - Browser and server-side caching

<!-- ## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/feature`)
3. Commit your changes (`git commit -m 'Add feature'`)
4. Push to the branch (`git push origin feature/feature`)
5. Open a Pull Request -->

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Attributions

### Icons
- Monster icons from [Flaticon](https://www.flaticon.com/) - [License Type]
- Used under Flaticon's free license with attribution
- Images used:
   - [Scifi icons](https://www.flaticon.com/free-icons/scif) created by Freepik
   - [Blob icons](https://www.flaticon.com/free-icons/blob) created by Nack_Thanakorn
   - [Rat icons](https://www.flaticon.com/free-icons/rat) created by bsd
   - [Spider icons](https://www.flaticon.com/free-icons/spider) created by Luvdat
   - [Scary icons](https://www.flaticon.com/free-icons/scary) created by Imogen.Oh
   - [Goblin icons](https://www.flaticon.com/free-icons/goblin) created by Park Jisun
   - [Conscience icons](https://www.flaticon.com/free-icons/conscience) created by Park Jisun
   - [Skeleton ribs](https://www.flaticon.com/free-icons/skeleton-ribs) icons created by Iconic Artisan
   - [Costume icons](https://www.flaticon.com/free-icons/costume) created by smashingstocks
   - [Nightmare icons](https://www.flaticon.com/free-icons/nightmare) created by Zain Jutt
   - [Snake icons](https://www.flaticon.com/free-icons/snake) created by Freepik
   - [Troll icons](https://www.flaticon.com/free-icons/troll) created by Smashicons
   - [Troll icons](https://www.flaticon.com/free-icons/troll) created by Freepik
   - [Wraith icons](https://www.flaticon.com/free-icons/wraith) created by Park Jisun
   - [Giant icons](https://www.flaticon.com/free-icons/giant) created by Freepik
   - [Giant icons](https://www.flaticon.com/free-icons/giant) created by wanicon
   - [Mud icons](https://www.flaticon.com/free-icons/mud) created by Flat Icons
   - [Golem icons](https://www.flaticon.com/free-icons/golem) created by Freepik
   - [Animal icons](https://www.flaticon.com/free-icons/animal) created by max.icons
   - [Scorpion icons](https://www.flaticon.com/free-icons/scorpion) created by Freepik
   - [Esoteric icons](https://www.flaticon.com/free-icons/esoteric) created by Freepik
   - [Chinese zodiac icons](https://www.flaticon.com/free-icons/chinese-zodiac) created by vectorsmarket15
   - [Dragon icons](https://www.flaticon.com/free-icons/dragon) created by Chanut-is-Industries
   - [Space warrior icons](https://www.flaticon.com/free-icons/space-warrior) created by Freepik
   - [Supernatural icons](https://www.flaticon.com/free-icons/supernatural) created by winnievinzence
   - [Elements icons](https://www.flaticon.com/free-icons/elements) created by Freepik
   - [Demon icons](https://www.flaticon.com/free-icons/demon) created by Smashicons

---
