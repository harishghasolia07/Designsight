# DesignSight - AI-Powered Design Feedback Platform

DesignSight is a comprehensive design feedback platform that leverages AI to provide intelligent, role-based feedback on design images. Built as a 72-hour MVP, it offers image upload, AI analysis, overlay feedback visualization, threaded comments, and export functionality.

## 🚀 Features

- **AI-Powered Analysis**: Automatic design feedback using Google's Gemini API
- **Rate Limiting Protection**: Multi-layer rate limiting to prevent API abuse
- **Role-Based Filtering**: Filter feedback by Designer, Reviewer, PM, or Developer roles
- **Visual Overlays**: Interactive feedback overlays directly on design images
- **Threaded Comments**: Collaborative discussion on feedback items
- **Export Options**: JSON and PDF export of feedback reports
- **Project Management**: Organize designs into projects
- **Real-time Status**: Track image processing and analysis status

## 🏗️ Architecture

- **Frontend**: Next.js 15 + React + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose ODM
- **AI**: Google Gemini 1.5 Flash/Pro API
- **File Storage**: Local file system (Docker volume)
- **PDF Generation**: Puppeteer
- **Deployment**: Docker + Docker Compose

## 📋 Prerequisites

- Node.js 18+ 
- Docker and Docker Compose
- Google Gemini API key

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd designsight
```

### 2. Environment Setup

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
# Server
PORT=3000
NODE_ENV=development

# MongoDB (for Docker setup)
MONGODB_URI=mongodb://mongo:27017/designsight

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# Gemini AI API (Required)
GEMINI_API_KEY=your-gemini-api-key-here
GEMINI_MODEL=gemini-1.5-flash

# Rate Limiting (Optional - defaults shown)
RATE_LIMIT_GEMINI_PER_MINUTE=5        # Image analyses per minute per user
RATE_LIMIT_GEMINI_PER_DAY=100         # Image analyses per day per user
RATE_LIMIT_API_PER_15MIN=100          # General API calls per 15 min
RATE_LIMIT_AUTH_PER_15MIN=5           # Auth attempts per 15 min

# JWT Authentication
JWT_SECRET=your-jwt-secret-here
JWT_EXPIRES_IN=7d

# PDF Export
PDF_TMP_DIR=./tmp

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Get Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key to your `.env` file

### 4. Install Dependencies

```bash
npm install
```

## 🚀 Running the Application

### Option 1: Docker (Recommended)

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up -d --build
```

The application will be available at `http://localhost:3000`

### Option 2: Local Development

1. **Start MongoDB** (using Docker):
```bash
docker run -d -p 27017:27017 --name designsight-mongo mongo:5
```

2. **Update environment** for local MongoDB:
```env
MONGODB_URI=mongodb://localhost:27017/designsight
```

3. **Start the development server**:
```bash
npm run dev
```

## 📖 Usage Guide

### 1. Creating a Project

1. Navigate to the dashboard
2. Click "New Project"
3. Enter project name and description
4. Click "Create Project"

### 2. Uploading Images

1. Open your project
2. Drag and drop images or click "Choose Files"
3. Wait for AI analysis to complete (status shows as "Analysis Complete")

### 3. Viewing Feedback

1. Click "View" on an analyzed image
2. Use the role filter to see specific feedback
3. Click on overlay highlights to see details
4. View recommendations and add comments

### 4. Exporting Reports

1. In the image viewer, click "Export"
2. Choose JSON for raw data or PDF for formatted report

## 🔧 API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create a new project

### Images
- `POST /api/projects/:id/images` - Upload image to project
- `GET /api/images/:id` - Get image details and feedback
- `GET /api/images/:id/feedback` - Get filtered feedback
- `GET /api/files/:projectId/:filename` - Serve uploaded files

### Feedback & Comments
- `POST /api/feedback/:id/comments` - Add comment to feedback
- `GET /api/feedback/:id/comments` - Get feedback comments

### Export
- `GET /api/images/:id/export/json` - Export feedback as JSON
- `GET /api/images/:id/export/pdf` - Export feedback as PDF

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## 🛡️ Rate Limiting & Security

### Built-in Rate Limiting

The application includes **comprehensive rate limiting** to protect the Gemini API from abuse:

- ✅ **Per-User Limits**: 5 image analyses per minute, 100 per day
- ✅ **IP-Based Fallback**: Rate limiting works for anonymous users too
- ✅ **Sliding Window**: Accurate tracking with automatic cleanup
- ✅ **Standard Headers**: HTTP 429 responses with `Retry-After` headers
- ✅ **Configurable**: Adjust limits via environment variables

**Rate Limiting Flow:**
```
User Upload → Rate Check → Within Limits? → Process Image
                              ↓ No
                          429 Error
                          + Retry Info
```

**Response when limit exceeded:**
```json
{
  "error": "Too many image analysis requests. Please wait before uploading more images.",
  "limit": 5,
  "remaining": 0,
  "reset": 1700000000,
  "retryAfter": 45
}
```

**Default Limits:**
- 🕐 **Per Minute**: 5 image analyses per user
- 📅 **Per Day**: 100 image analyses per user
- 🌐 **API Calls**: 100 requests per 15 minutes
- 🔐 **Auth Attempts**: 5 per 15 minutes per IP

📖 See [RATE_LIMIT_GUIDE.md](./RATE_LIMIT_GUIDE.md) for detailed configuration and usage.

## 🔒 Security Considerations

### For Production Deployment:

1. **Authentication**: ✅ Integrated with Clerk for user authentication
2. **Rate Limiting**: ✅ Multi-layer protection with per-user tracking
3. **File Storage**: Use cloud storage (AWS S3, Google Cloud Storage)
4. **Database**: Use managed MongoDB service (MongoDB Atlas)
5. **API Security**: ✅ Rate limiting enabled + input validation
6. **HTTPS**: Enable SSL/TLS encryption
7. **Environment Variables**: Secure API key management
8. **CORS**: Configure appropriate CORS policies
9. **Content Security**: Validate and sanitize file uploads

## 🐛 Troubleshooting

### Common Issues

1. **Gemini API Errors**:
   - Verify API key is correct
   - Check API quota and billing
   - Ensure image format is supported

2. **MongoDB Connection Issues**:
   - Verify MongoDB is running
   - Check connection string format
   - Ensure network connectivity

3. **File Upload Issues**:
   - Check file size limits
   - Verify upload directory permissions
   - Ensure supported image formats

4. **PDF Export Issues**:
   - Verify Puppeteer installation
   - Check system dependencies for headless Chrome

### Docker Issues

```bash
# View logs
docker-compose logs

# Restart services
docker-compose restart

# Reset everything
docker-compose down -v
docker-compose up --build
```

## 📊 Performance Considerations

- **Image Optimization**: Images are automatically resized and compressed
- **AI Analysis**: Uses Gemini Flash for fast processing
- **Caching**: Static files are cached with appropriate headers
- **Database Indexing**: Optimize queries with proper indexes

## 🛣️ Roadmap

### Immediate Improvements (Post-MVP)
- [ ] User authentication and authorization
- [ ] Real-time collaboration with WebSockets
- [ ] Image thumbnailing and progressive loading
- [ ] Advanced filtering and sorting options
- [ ] Bulk image processing

### Future Features
- [ ] Integration with design tools (Figma, Sketch)
- [ ] Custom AI training for specific design systems
- [ ] Advanced analytics and reporting
- [ ] Mobile app support
- [ ] API for third-party integrations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Google Gemini AI](https://ai.google.dev/) for powerful multimodal AI capabilities
- [Next.js](https://nextjs.org/) for the excellent React framework
- [Tailwind CSS](https://tailwindcss.com/) for utility-first CSS
- [MongoDB](https://www.mongodb.com/) for flexible document storage
- [Puppeteer](https://pptr.dev/) for PDF generation

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the troubleshooting section
- Review the API documentation

---

**Built with ❤️ for better design collaboration**