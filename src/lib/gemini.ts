import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export interface GeminiFeedbackResponse {
    category: 'accessibility' | 'visual_hierarchy' | 'content' | 'ui_pattern';
    severity: 'high' | 'medium' | 'low';
    roles: ('designer' | 'reviewer' | 'pm' | 'developer')[];
    bbox: { x: number; y: number; width: number; height: number };
    anchorType: 'bbox' | 'point';
    title: string;
    text: string;
    recommendations: string[];
    modelVersion?: string;  // Added to track which model was used
}

const FEEDBACK_PROMPT = `You are an expert UX reviewer. Given a design screenshot, return ONLY a JSON array of feedback items.

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

Rules:
- Coordinates must be relative values between 0–1, tightly fitted to the UI element.
- Round coordinates to 2 decimal places.
- CRITICAL: Carefully examine the image and identify the EXACT boundaries of UI elements.
- For text elements: bbox should tightly wrap the text, not include excessive padding.
- For buttons: bbox should include the button border and any visible padding.
- For containers: bbox should include the entire container including its background.
- Start coordinates (x, y) should be at the TOP-LEFT corner of the element.
- Width and height should be the ACTUAL size of the element, not estimated.
- Double-check your coordinate calculations before outputting.
- Each feedback must belong to exactly ONE category.
- Each feedback must list 1–3 relevant roles (not all roles).
- Provide 3–8 feedback items. If fewer than 3 issues exist, suggest improvements.
- Recommendations must always be an array, even if only one item is provided.
- Recommendations must be specific and actionable, not vague.
- Use "bbox" for UI elements, "point" for specific small hotspots (e.g., icons).

Category Guidelines:
- "accessibility": WCAG compliance, color contrast, keyboard navigation, screen readers
- "visual_hierarchy": Information structure, typography scale, emphasis, content flow
- "content": Copy clarity, microcopy, labels, error messages, information architecture
- "ui_pattern": Component consistency, interaction patterns, layout standards

Role Assignment (assign 1-3 most relevant):
- "designer": Visual design, layout, typography, color schemes, spacing, branding
- "developer": Technical implementation, accessibility compliance, performance
- "pm": User experience strategy, business requirements, feature clarity, user journey
- "reviewer": Quality assurance, usability testing, best practices, edge cases

Severity Levels:
- "high": Blocks core functionality, major accessibility violations, critical UX issues
- "medium": Impacts usability, minor accessibility issues, inconsistent patterns
- "low": Polish improvements, minor inconsistencies, enhancement opportunities

COORDINATE ACCURACY GUIDELINES:
- Look at the image dimensions and mentally divide it into a grid.
- Locate each UI element's precise position within this grid.
- Measure from the top-left corner (0,0) to bottom-right (1,1).
- Be especially careful with text elements - they should have tight bounding boxes.
- For the npm command text, it should be around the terminal/code area.
- For headings, measure the actual text boundaries, not the entire section.
- For buttons, include the clickable area but not excessive margins.

If unsure, choose the closest matching category. 
Return output as a JSON array only. Do not include explanations, markdown, or extra text outside the array.`;

export async function analyzeImageWithGemini(
    imageBuffer: Buffer,
    mimeType: string
): Promise<GeminiFeedbackResponse[]> {
    try {
        const modelVersion = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
        const model = genAI.getGenerativeModel({
            model: modelVersion,
            generationConfig: {
                temperature: 0.1, // Lower temperature for more consistent responses
                maxOutputTokens: 4096, // Limit output to reduce quota usage
            },
        });

        const imagePart = {
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType
            }
        };

        console.log(`Starting Gemini analysis with model: ${modelVersion}`);
        const result = await model.generateContent([FEEDBACK_PROMPT, imagePart]);
        const response = await result.response;
        const text = response.text();

        // Clean up the response text to extract JSON
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error('No valid JSON array found in response');
        }

        const feedbackItems = JSON.parse(jsonMatch[0]) as GeminiFeedbackResponse[];

        // Validate the response
        if (!Array.isArray(feedbackItems)) {
            throw new Error('Response is not an array');
        }

        // Validate each feedback item and improve coordinates
        feedbackItems.forEach((item, index) => {
            if (!validateFeedbackItem(item)) {
                throw new Error(`Invalid feedback item at index ${index}`);
            }
            // Improve coordinate precision
            item.bbox = improveBoundingBox(item.bbox);
            // Add model version to track which AI model was used
            item.modelVersion = modelVersion;
        });

        console.log(`Gemini analysis completed successfully with ${feedbackItems.length} feedback items`);
        return feedbackItems;
    } catch (error) {
        console.error('Gemini API Error:', error);

        // Provide more specific error messages for common issues
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        if (errorMessage.includes('429') || errorMessage.includes('quota')) {
            throw new Error(`Gemini API rate limit exceeded. ${errorMessage}`);
        } else if (errorMessage.includes('API key')) {
            throw new Error(`Gemini API key issue. Please check your API key configuration.`);
        } else if (errorMessage.includes('SAFETY')) {
            throw new Error(`Image content flagged by safety filters. Please try a different image.`);
        }

        throw new Error(`Failed to analyze image: ${errorMessage}`);
    }
}

function improveBoundingBox(bbox: { x: number; y: number; width: number; height: number }) {
    // Round to 2 decimal places
    const x = Math.round(bbox.x * 100) / 100;
    const y = Math.round(bbox.y * 100) / 100;
    const width = Math.round(bbox.width * 100) / 100;
    const height = Math.round(bbox.height * 100) / 100;

    // Ensure bounding box doesn't exceed image boundaries
    const adjustedWidth = Math.min(width, 1 - x);
    const adjustedHeight = Math.min(height, 1 - y);

    // Ensure minimum size for visibility
    const minSize = 0.02; // 2% minimum
    const finalWidth = Math.max(adjustedWidth, minSize);
    const finalHeight = Math.max(adjustedHeight, minSize);

    return {
        x: Math.max(0, Math.min(x, 1 - finalWidth)),
        y: Math.max(0, Math.min(y, 1 - finalHeight)),
        width: finalWidth,
        height: finalHeight
    };
}

function validateFeedbackItem(item: unknown): item is GeminiFeedbackResponse {
    const requiredFields = ['category', 'severity', 'roles', 'bbox', 'anchorType', 'title', 'text', 'recommendations'];

    for (const field of requiredFields) {
        if (!(field in (item as Record<string, unknown>))) {
            return false;
        }
    }

    const feedbackItem = item as Record<string, unknown>;

    // Validate category
    if (!['accessibility', 'visual_hierarchy', 'content', 'ui_pattern'].includes(feedbackItem.category as string)) {
        return false;
    }

    // Validate severity
    if (!['high', 'medium', 'low'].includes(feedbackItem.severity as string)) {
        return false;
    }

    // Validate roles
    if (!Array.isArray(feedbackItem.roles) || !(feedbackItem.roles as string[]).every((role: string) =>
        ['designer', 'reviewer', 'pm', 'developer'].includes(role)
    )) {
        return false;
    }

    // Validate bbox coordinates (should be between 0 and 1)
    const bbox = feedbackItem.bbox as Record<string, unknown>;
    if (typeof bbox !== 'object' ||
        typeof bbox.x !== 'number' || bbox.x < 0 || bbox.x > 1 ||
        typeof bbox.y !== 'number' || bbox.y < 0 || bbox.y > 1 ||
        typeof bbox.width !== 'number' || bbox.width < 0 || bbox.width > 1 ||
        typeof bbox.height !== 'number' || bbox.height < 0 || bbox.height > 1) {
        return false;
    }

    // Validate anchorType
    if (!['bbox', 'point'].includes(feedbackItem.anchorType as string)) {
        return false;
    }

    // Validate strings
    if (typeof feedbackItem.title !== 'string' || typeof feedbackItem.text !== 'string') {
        return false;
    }

    // Validate recommendations
    if (!Array.isArray(feedbackItem.recommendations) || !(feedbackItem.recommendations as string[]).every((rec: string) => typeof rec === 'string')) {
        return false;
    }

    return true;
}

export async function retryAnalysis(
    imageBuffer: Buffer,
    mimeType: string,
    maxRetries: number = 3
): Promise<GeminiFeedbackResponse[]> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await analyzeImageWithGemini(imageBuffer, mimeType);
        } catch (error) {
            lastError = error as Error;
            console.warn(`Analysis attempt ${attempt} failed:`, error);

            // Check if it's a rate limit error
            const errorMessage = error instanceof Error ? error.message : '';
            const isRateLimit = errorMessage.includes('429') ||
                errorMessage.includes('quota') ||
                errorMessage.includes('rate limit');

            if (isRateLimit && attempt < maxRetries) {
                // For rate limit errors, wait longer with exponential backoff
                const delay = Math.min(60000, 1000 * Math.pow(2, attempt)); // Max 60 seconds
                console.log(`Rate limit hit. Waiting ${delay / 1000}s before retry ${attempt + 1}...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else if (attempt < maxRetries) {
                // For other errors, shorter wait
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            } else {
                // If it's the last attempt and rate limit, provide helpful error
                if (isRateLimit) {
                    throw new Error(
                        'Gemini API rate limit exceeded. Please wait a few minutes before uploading more images, ' +
                        'or consider upgrading your API plan for higher limits. ' +
                        'Free tier limits: 15 requests per minute, 1,500 requests per day.'
                    );
                }
            }
        }
    }

    throw lastError!;
}

// Add a simple rate limiter to prevent too many concurrent requests
class RateLimiter {
    private queue: Array<() => void> = [];
    private running = 0;
    private maxConcurrent = 2; // Limit concurrent requests
    private minInterval = 2000; // 2 seconds between requests
    private lastRequestTime = 0;

    async execute<T>(fn: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try {
                    // Ensure minimum interval between requests
                    const now = Date.now();
                    const timeSinceLastRequest = now - this.lastRequestTime;
                    if (timeSinceLastRequest < this.minInterval) {
                        await new Promise(r => setTimeout(r, this.minInterval - timeSinceLastRequest));
                    }

                    this.lastRequestTime = Date.now();
                    const result = await fn();
                    resolve(result);
                } catch (error) {
                    reject(error);
                } finally {
                    this.running--;
                    this.processQueue();
                }
            });
            this.processQueue();
        });
    }

    private processQueue() {
        if (this.running < this.maxConcurrent && this.queue.length > 0) {
            this.running++;
            const next = this.queue.shift()!;
            next();
        }
    }
}

const rateLimiter = new RateLimiter();

// Wrap the analysis function with rate limiting
export async function analyzeImageWithRateLimit(
    imageBuffer: Buffer,
    mimeType: string
): Promise<GeminiFeedbackResponse[]> {
    return rateLimiter.execute(() => retryAnalysis(imageBuffer, mimeType));
}