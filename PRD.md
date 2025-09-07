# DesignSight — MERN Prototype (72-hour MVP)

This document describes the implementation plan, requirements, and timeboxed schedule for the DesignSight prototype.
The goal is to build a working MVP in 72 hours, covering image upload, AI-based design feedback, overlays, comments, role-based filtering, and export.

## 1. High-Level Architecture
### Backend

- Next.js API routes (backend + frontend in one repo)
- MongoDB for storing projects, images, feedback, comments, and users/roles
- AI analysis service (synchronous call on upload using Gemini API)
- File storage: local disk (Docker volume) for MVP; can extend to S3

### Frontend

- Next.js + React + Tailwind + TypeScript
- Image viewer with overlays (SVG/Canvas)
- Role switcher for Designer / Reviewer / PM / Developer views
- Threaded comments panel

### AI Integration

- Gemini 1.5 Pro / Flash API (multimodal) — processes image + returns JSON with issues and bounding boxes
- Strict prompt design to force structured JSON
- JSON schema validation + retry if parsing fails

### DevOps

**docker-compose:**
- web (Next.js app + API)
- mongo (MongoDB)
- .env.example for keys/config

## 2. MVP Scope (72h must-haves)

### Essential

- Project creation + image upload
- AI analysis pipeline (Gemini API) → structured feedback with bounding boxes
- Overlay feedback highlights on uploaded designs
- Role-based filtering of feedback
- Threaded comments (CRUD)
- Export to JSON and PDF (Puppeteer/HTML → PDF)
- docker-compose setup
- README + demo video

### Stretch (if time allows)

- Real-time collaboration (websocket)
- Image thumbnailing + progressive loading

## 3. Tech Choices & Rationale

- **Next.js + TypeScript** → single repo for API + frontend
- **MongoDB** → flexible schema for feedback + comments
- **Tailwind CSS + Shadcn UI** → fast UI building
- **Gemini API** → one multimodal model handles both vision + reasoning
- **Puppeteer** → PDF export
- **Jest** → unit/integration tests

## 4. Data Models (MongoDB)

### Project
```typescript
{
  _id: ObjectId,
  name: string,
  description?: string,
  ownerId: ObjectId,
  createdAt: Date
}
```

### Image
```typescript
{
  _id: ObjectId,
  projectId: ObjectId,
  filename: string,
  url: string,
  width: number,
  height: number,
  uploadedAt: Date,
  status: 'uploaded'|'processing'|'done'|'failed',
  analysisId?: ObjectId
}
```

### FeedbackItem
```typescript
{
  _id: ObjectId,
  imageId: ObjectId,
  category: 'accessibility'|'visual_hierarchy'|'copy'|'ui_pattern',
  severity: 'high'|'medium'|'low',
  roles: ['designer','reviewer','pm','developer'],
  bbox: { x: number, y: number, width: number, height: number }, // relative (0–1)
  anchorType: 'bbox'|'point',
  text: string,
  recommendations: string[],
  aiProvider: 'gemini',
  createdAt: Date,
  createdBy?: ObjectId
}
```

### Comment
```typescript
{
  _id: ObjectId,
  feedbackId: ObjectId,
  parentId?: ObjectId,
  authorId: ObjectId,
  body: string,
  createdAt: Date,
  editedAt?: Date
}
```

### User
```typescript
{
  _id: ObjectId,
  name: string,
  email: string,
  role: 'designer'|'reviewer'|'pm'|'developer'
}
```

## 5. API Endpoints

- `POST /api/projects` → create project
- `GET /api/projects` → list projects
- `POST /api/projects/:pid/images` → upload image + trigger analysis
- `GET /api/images/:id` → image metadata + feedback
- `GET /api/images/:id/file` → serve uploaded file
- `POST /api/images/:id/analyze` → run Gemini analysis
- `GET /api/images/:id/feedback?role=designer` → role-filtered feedback
- `POST /api/feedback/:fid/comments` → add comment
- `GET /api/feedback/:fid/comments` → list comments
- `GET /api/images/:id/export/json` → export feedback JSON
- `GET /api/images/:id/export/pdf` → export feedback PDF

## 6. AI Integration (Gemini)

### Prompt Template
```
You are an expert UX reviewer. Given a design screenshot, return ONLY JSON feedback items.
Each item must follow this schema:

{
  "category": "accessibility" | "visual_hierarchy" | "content" | "ui_pattern",
  "severity": "high" | "medium" | "low",
  "roles": ["designer","reviewer","pm","developer"],
  "bbox": { "x": 0.12, "y": 0.34, "width": 0.10, "height": 0.08 },
  "anchorType": "bbox" | "point",
  "title": "Short title",
  "text": "1–2 sentence feedback",
  "recommendations": ["Specific actionable fix"]
}

Coordinates must be relative values between 0–1.
Return ONLY valid JSON array.
```

### Example Gemini Response
```json
[
  {
    "category": "accessibility",
    "severity": "high",
    "roles": ["designer","developer"],
    "bbox": { "x": 0.72, "y": 0.85, "width": 0.15, "height": 0.08 },
    "anchorType": "bbox",
    "title": "Low button contrast",
    "text": "The 'Sign Up' button has insufficient contrast.",
    "recommendations": ["Use #004080 for WCAG AA compliance"]
  }
]
```

## 7. Frontend UX

- **Dashboard** → list projects/images
- **Image viewer** → show uploaded design with overlays
- **Overlay highlights** → color-coded by severity
- **Sidebar** → feedback details + comments thread
- **Role switcher** → filter visible feedback
- **Export modal** → choose JSON/PDF export

## 8. Exports

- **JSON**: raw feedback items with coordinates, roles, and comments
- **PDF**: screenshot + overlays + grouped feedback items + comments

## 9. Security & Privacy

- API keys in .env
- Local file storage (volume)
- Simple role-based filtering (prototype only)
- Documented production considerations (OAuth/JWT, S3)

## 10. Tests

- **Unit tests**: JSON schema validation, coordinate normalization
- **Integration tests**: image upload → analysis → feedback saved
- **Mock Gemini API responses** for cost control

## 11. docker-compose

```yaml
version: "3.8"
services:
  web:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./uploads:/data/uploads
    env_file:
      - .env
    depends_on:
      - mongo
  mongo:
    image: mongo:5
    restart: always
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
volumes:
  mongo-data:
```

## 12. .env.example

```bash
# Server
PORT=3000
MONGO_URI=mongodb://mongo:27017/designsight

# Storage
UPLOAD_DIR=/data/uploads

# Gemini API
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-1.5-flash

# PDF
PDF_TMP_DIR=/tmp

# Auth
JWT_SECRET=dev-secret
```

## 13. Cost Estimates

- **Gemini Flash**: cheaper, fast → good for MVP
- **Gemini Pro**: higher quality, higher cost
- **Expected cost**: $5–$15 total for demo (2–3 images)

## 14. 72-Hour Schedule

### Day 0 (0–12h)
- Repo setup, Next.js + Tailwind + Docker + Mongo
- Project + image upload APIs
- Basic upload UI + viewer page

### Day 1 (12–24h)
- Gemini API integration
- Prompt + response parsing + schema validation
- Store feedback in DB
- Overlay feedback on image

### Day 2 (24–36h)
- Role filtering UI
- Comments API + threaded UI
- CRUD for comments

### Day 3 (36–60h)
- JSON export
- PDF export
- Error handling + retries
- Tests (unit + integration)

### Day 3 (60–72h)
- UX polish (colors, tooltips)
- Demo recording (2–4 min)
- README + TODO.md + final push

## 15. Deliverables Checklist

- ✅ GitHub repo (clean structure)
- ✅ docker-compose.yml
- ✅ .env.example
- ✅ README.md with setup + provider notes
- ✅ Demo video
- ✅ API docs
- ✅ TODO.md with known limitations
- ✅ Exports: JSON + PDF
- ✅ Sample screenshots + analysis

---

## ⚡ Summary

This MVP will let users upload designs → get AI-powered feedback with overlays → filter by role → comment → export JSON/PDF.
All powered by Gemini API in one streamlined stack.