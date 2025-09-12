#!/bin/bash

# Generate NextAuth Secret Script

echo "🔐 Generating NextAuth secret..."

# Generate a secure random secret
SECRET=$(openssl rand -base64 32)

echo "✅ Generated NextAuth secret:"
echo ""
echo "NEXTAUTH_SECRET=\"$SECRET\""
echo ""
echo "📝 Copy this to your .env file"
echo ""

# Optionally update .env file if it exists
if [ -f .env ]; then
    read -p "🤔 Would you like to automatically update your .env file? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Check if NEXTAUTH_SECRET already exists
        if grep -q "NEXTAUTH_SECRET=" .env; then
            # Replace existing secret
            if [[ "$OSTYPE" == "darwin"* ]]; then
                # macOS
                sed -i '' "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\"$SECRET\"/" .env
            else
                # Linux
                sed -i "s/NEXTAUTH_SECRET=.*/NEXTAUTH_SECRET=\"$SECRET\"/" .env
            fi
            echo "✅ Updated existing NEXTAUTH_SECRET in .env file"
        else
            # Add new secret
            echo "" >> .env
            echo "NEXTAUTH_SECRET=\"$SECRET\"" >> .env
            echo "✅ Added NEXTAUTH_SECRET to .env file"
        fi
    fi
fi

echo ""
echo "🚀 Next steps:"
echo "1. Set up Google OAuth credentials (see GOOGLE_OAUTH_SETUP.md)"
echo "2. Update GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env"
echo "3. Restart your development server: npm run dev"
