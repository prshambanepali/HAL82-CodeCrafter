# 🚀 UdyamTank

**Where Ideas Meet Investment** — A platform connecting visionary startups with strategic investors.


---

## 📖 Project Overview

*UdyamTank* is a comprehensive startup ecosystem platform designed to bridge the gap between innovation and investment. It provides a unified space where startups can pitch their ideas, investors can discover promising ventures, and the entire entrepreneurial ecosystem can thrive together.

### 🎯 Problem It Solves

- *For Startups:* Difficulty in reaching the right investors and showcasing their vision effectively
- *For Investors:* Lack of a centralized platform to discover, evaluate, and track promising startups
- *For Talent:* Limited visibility into startup opportunities for interns and influencers seeking collaboration

### 👥 Target Users

| User Type | Description |
|-----------|-------------|
| *Startups* | Entrepreneurs looking to pitch ideas and secure funding |
| *Investors* | Angel investors & VCs seeking innovative investment opportunities |
| *Interns* | Students and professionals looking for startup internship roles |
| *Influencers* | Content creators seeking brand collaboration opportunities |
| *Admins* | Platform administrators managing users and content |

---

## ✨ Key Features

### 🏢 For Startups
- *Pitch Creation* — Create detailed startup pitches with problem statements, solutions, and financial metrics
- *Investor Analytics* — Real-time analysis of TAM, growth rate, burn rate, runway, and revenue forecasts
- *Product Showcase* — Display web dashboard, mobile app previews, and demo videos
- *Hire Talent* — Browse and connect with interns and influencers directly from the dashboard

### 💼 For Investors
- *Startup Feed* — Browse curated startup pitches with detailed metrics
- *Save & Track* — Bookmark interesting startups for follow-up
- *Express Interest* — One-click CTA to show investment interest
- *Filter by Industry* — Discover startups by sector (Fintech, HealthTech, etc.)

### 👨‍💻 For Interns & Influencers
- *Profile Cards* — Showcase skills, experience, and social presence
- *Visibility* — Get discovered by startups looking to hire
- *Direct Contact* — Easy connection with potential employers

### 🔐 Platform Features
- *Role-Based Access Control (RBAC)* — Secure access based on user roles
- *JWT Authentication* — Secure token-based authentication
- *Google OAuth* — One-click sign-in with Google
- *Admin Dashboard* — User management and content moderation
- *Responsive Design* — Works seamlessly on desktop and mobile

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| HTML5 | Structure and semantic markup |
| CSS3 | Styling with custom properties, gradients, and animations |
| JavaScript  | Client-side interactivity and API integration |

### Backend
| Technology | Purpose |
|------------|---------|
| Node.js | Runtime environment |
| Express.js | Web application framework |
| PostgreSQL | Relational database |
| JWT | Token-based authentication |
| Google Auth Library | OAuth 2.0 integration |

### Dev Tools
| Tool | Purpose |
|------|---------|
| Nodemon | Auto-restart during development |
| dotenv | Environment variable management |
| CORS | Cross-origin resource sharing |

---

## ⚙️ How It Works

┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   User      │────▶│   Frontend  │────▶│   Backend   │
│  (Browser)  │◀────│  (HTML/CSS/ │◀────│  (Express)  │
│             │     │     JS)     │     │             │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                        ┌─────────────┐
                                        │  PostgreSQL │
                                        │  Database   │
                                        └─────────────┘

### User Flow

1. *Sign Up / Login* — Users register with email/password or Google OAuth
2. *Role Selection* — Choose role: Startup, Investor, Intern, or Influencer
3. *Dashboard Access* — Role-specific dashboard with relevant features
4. *Interaction* — Startups pitch, investors browse, talent gets discovered
5. *Connection* — Express interest, save posts, or initiate contact

---

## 📦 Installation / Setup Instructions

### Prerequisites

- *Node.js* (v18 or higher)
- *PostgreSQL* (v14 or higher)
- *npm* or *yarn*

### Step 1: Clone the Repository

git clone https://github.com/your-username/udyamtank.git
cd udyamtank

### Step 2: Setup Database

# Login to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE udyamtank;

# Connect and run schema
\c udyamtank
\i server/src/db/schema.sql

### Step 3: Configure Environment Variables

Create a .env file in the server directory:

env
PORT=3000
DATABASE_URL=postgresql://postgres:password@localhost:5432/udyamtank
JWT_SECRET=your_super_secret_jwt_key
GOOGLE_CLIENT_ID=your_google_client_id
CLIENT_ORIGIN=http://127.0.0.1:5500

### Step 4: Install Dependencies

cd server
npm install

### Step 5: Start the Server

npm run dev

### Step 6: Open Frontend

Open client/index.html with a live server (VS Code Live Server extension recommended):

http://127.0.0.1:5500/client/index.html

---

## 📁 Folder Structure

likeand-post/
├── client/                     # Frontend application
│   ├── index.html              # Landing page
│   ├── assets/
│   │   └── css/
│   │       ├── styles.css      # Main stylesheet
│   │       └── influencer.css  # Influencer-specific styles
│   ├── js/
│   │   ├── api.js              # API helper functions
│   │   ├── auth.js             # Authentication utilities
│   │   ├── config.js           # Frontend configuration
│   │   ├── guards.js           # Route protection
│   │   ├── ui.js               # UI utilities (toast, etc.)
│   │   ├── startup-page.js     # Startup dashboard logic
│   │   ├── investor-page.js    # Investor dashboard logic
│   │   └── ...                 # Other page scripts
│   └── pages/
│       ├── sign-in.html        # Login page
│       ├── sign-up.html        # Registration page
│       ├── startup.html        # Startup dashboard
│       ├── investor.html       # Investor dashboard
│       ├── intern.html         # Intern dashboard
│       ├── influencer.html     # Influencer dashboard
│       ├── admin.html          # Admin panel
│       └── ...                 # Other pages
│
├── server/                     # Backend application
│   ├── package.json            # Dependencies
│   └── src/
│       ├── server.js           # Express app entry point
│       ├── config/
│       │   ├── env.js          # Environment config
│       │   └── passport.js     # Auth strategies
│       ├── db/
│       │   ├── db.js           # Database connection
│       │   └── schema.sql      # Database schema
│       ├── middleware/
│       │   ├── auth.js         # JWT verification
│       │   └── rbac.js         # Role-based access
│       ├── routes/
│       │   ├── auth.routes.js  # Auth endpoints
│       │   ├── user.routes.js  # User endpoints
│       │   ├── admin.routes.js # Admin endpoints
│       │   ├── post.routes.js  # Post/pitch endpoints
│       │   └── campaigns.routes.js
│       └── utils/
│           ├── jwt.js          # JWT utilities
│           └── password.js     # Password hashing
│
└── README.md                   # Project documentation

---

## 🔮 Future Improvements

### Planned Features

- [ ] *Real-time Chat* — Direct messaging between startups and investors
- [ ] *Video Pitch Upload* — Allow startups to upload pitch videos
- [ ] *Investment Tracking* — Dashboard for investors to track portfolio
- [ ] *Smart Matching* — AI-powered startup-investor matching algorithm
- [ ] *Mobile App* — React Native mobile application
- [ ] *Email Notifications* — Alerts for new matches and interests
- [ ] *Analytics Dashboard* — Platform-wide metrics and insights
- [ ] *Payment Integration* — Premium features and subscription plans

### Scalability Ideas

- Microservices architecture for independent scaling
- Redis caching for improved performance
- CDN integration for static assets
- Kubernetes deployment for container orchestration

---

## 👨‍💻 Contributors

| Name
|--------------------|
| [Prashamshya Banepali] 
| [Pranisha Shrestha]
| [Ayusha Shrestha] 
| [Dhan Bahadur Khattri] 

---

## 📄 License / Usage

This project is developed for *educational and demonstration purposes*.

MIT License

Copyright (c) 2026 UdyamTank Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.

---

## 🙏 Acknowledgments

- Inspired by platforms like AngelList, Product Hunt, and Shark Tank
- Built with modern web technologies and best practices
- Special thanks to the open-source community

---

<div align="center">

*⭐ Star this repository if you found it helpful!*

Made with ❤️ by the UdyamTank Team

[Report Bug](https://github.com/your-username/udyamtank/issues) · [Request Feature](https://github.com/your-username/udyamtank/issues)

</div>
github.com
