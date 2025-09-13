# JumpApp - Post-Meeting Social Media Content Generator

Transform your meeting insights into engaging social media content automatically.

## 🚀 Features

- **Google Calendar Integration**: Connect multiple Google accounts and sync calendar events
- **AI Notetaker**: Automatically join meetings with Recall.ai bot
- **Smart Content Generation**: AI-powered social media post creation from meeting transcripts
- **Multi-Platform Posting**: Publish to LinkedIn and Facebook with one click
- **Automation Rules**: Configure custom templates and auto-posting preferences
- **Meeting Management**: View transcripts, generate follow-up emails, and track post performance

## 🛠️ Tech Stack

- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: NextAuth.js (Google, LinkedIn, Facebook OAuth)
- **AI Integration**: OpenAI API for content generation
- **Meeting Recording**: Recall.ai API
- **State Management**: Zustand + TanStack Query

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL database
- Google Cloud Console project (for OAuth and Calendar API)
- LinkedIn Developer Application
- Facebook Developer Application  
- OpenAI API key
- Recall.ai API access

## 🚀 Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd jumpapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your API keys and database URL in the `.env` file.

4. **Set up the database**
   ```bash
   npm run db:push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/jumpapp"

# NextAuth.js
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here"

# Google OAuth & Calendar
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# LinkedIn OAuth
LINKEDIN_CLIENT_ID="your-linkedin-client-id"
LINKEDIN_CLIENT_SECRET="your-linkedin-client-secret"

# Facebook OAuth
FACEBOOK_CLIENT_ID="your-facebook-client-id"
FACEBOOK_CLIENT_SECRET="your-facebook-client-secret"

# Recall.ai
RECALL_AI_API_KEY="your-recall-ai-api-key"

# OpenAI
OPENAI_API_KEY="your-openai-api-key"
```

## 📚 API Setup Guides

### Google Cloud Console
1. Create a new project or select existing
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials
4. Add authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`

### LinkedIn Developer
1. Create a LinkedIn App
2. Add redirect URL: `http://localhost:3000/api/auth/callback/linkedin`
3. Request access to required scopes

### Facebook Developer
1. Create a Facebook App
2. Add Facebook Login product
3. Configure redirect URI: `http://localhost:3000/api/auth/callback/facebook`

## 🗄️ Database Schema

The application uses Drizzle ORM with PostgreSQL. Key tables include:

- `users` - User accounts and profiles
- `google_accounts` - Connected Google accounts for calendar access
- `meetings` - Calendar events and meeting metadata
- `transcripts` - Meeting transcripts from Recall.ai
- `social_media_posts` - Generated and posted content
- `automations` - User-defined posting rules

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Run database migrations
- `npm run db:studio` - Open Drizzle Studio

## 🔐 Security Notes

- Never commit `.env` files or API keys to version control
- Use environment variables for all sensitive configuration
- Implement proper OAuth scopes and permissions
- Regularly rotate API keys and secrets

