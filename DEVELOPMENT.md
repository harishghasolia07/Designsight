# Development Scripts

## Start MongoDB Locally (Windows)

### Option 1: Using Docker (Recommended)
```bash
# Start MongoDB container
docker run -d --name designsight-mongo -p 27017:27017 mongo:5

# Stop MongoDB container
docker stop designsight-mongo

# Remove MongoDB container
docker rm designsight-mongo
```

### Option 2: Using Docker Compose (Full Stack)
```bash
# Start all services (MongoDB + App)
docker-compose up

# Start only MongoDB
docker-compose up mongo

# Stop all services
docker-compose down
```

## Environment Setup for Local Development

1. Copy `.env.example` to `.env`
2. Update the MongoDB URI for local development:
   ```
   MONGODB_URI=mongodb://localhost:27017/designsight
   ```
3. Add your Gemini API key:
   ```
   GEMINI_API_KEY=your-actual-api-key-here
   ```

## Quick Test Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Start production server
npm start
```

## MongoDB Data Initialization

The app will automatically create the necessary collections when you:
1. Create your first project
2. Upload your first image
3. The AI analysis completes

## Troubleshooting

1. **MongoDB Connection Error**: Ensure MongoDB is running on port 27017
2. **File Upload Issues**: Check that the uploads directory exists and has write permissions
3. **Gemini API Errors**: Verify your API key is valid and has quota available