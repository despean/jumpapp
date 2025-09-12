#!/bin/bash

# Setup script for JumpApp development environment

echo "🚀 Setting up JumpApp development environment..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    
    # Update the database URL for local Docker setup
    sed -i '' 's|postgresql://username:password@localhost:5432/jumpapp|postgresql://jumpapp_user:jumpapp_password@localhost:5432/jumpapp|' .env
    
    echo "✅ .env file created with local database configuration"
    echo "⚠️  Please update the other API keys in .env file:"
    echo "   - NEXTAUTH_SECRET"
    echo "   - GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET"
    echo "   - LINKEDIN_CLIENT_ID & LINKEDIN_CLIENT_SECRET"
    echo "   - FACEBOOK_CLIENT_ID & FACEBOOK_CLIENT_SECRET"
    echo "   - OPENAI_API_KEY"
    echo ""
else
    echo "ℹ️  .env file already exists"
fi

echo "🐳 Starting PostgreSQL with Docker..."
docker-compose up -d postgres

echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 10

echo "🗄️  Running database migrations..."
npm run db:push

echo ""
echo "🎉 Setup complete!"
echo "📊 PostgreSQL is running on: localhost:5432"
echo "🔧 pgAdmin is available at: http://localhost:5050"
echo "   Email: admin@jumpapp.com"
echo "   Password: admin123"
echo ""
echo "🚀 You can now run: npm run dev"
