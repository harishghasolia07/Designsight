import { GoogleGenerativeAI } from '@google/generative-ai';
import { IFeedbackItem } from '@/models';

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
}

const FEEDBACK_PROMPT = `You are an expert UX reviewer. Given a design screenshot, return ONLY JSON feedback items.
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

Focus on:
- Accessibility issues (color contrast, text size, focus indicators)
- Visual hierarchy problems (unclear content structure)
- Content issues (unclear copy, missing information)
- UI pattern violations (inconsistent components, poor layouts)

IMPORTANT: Assign roles specifically based on relevance:
- "designer": Visual design, layout, typography, color, spacing
- "developer": Technical implementation, code-related fixes, accessibility compliance
- "pm": User experience, business logic, feature clarity
- "reviewer": Quality assurance, usability, best practices

Do NOT assign all roles to every item. Each feedback should have 1-3 most relevant roles only.

Provide 3-8 actionable feedback items with accurate bounding boxes.`;

export async function analyzeImageWithGemini(
    imageBuffer: Buffer,
    mimeType: string
): Promise<GeminiFeedbackResponse[]> {
    try {
        const model = genAI.getGenerativeModel({
            model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
        });

        const imagePart = {
            inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType
            }
        };

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

        // Validate each feedback item
        feedbackItems.forEach((item, index) => {
            if (!validateFeedbackItem(item)) {
                throw new Error(`Invalid feedback item at index ${index}`);
            }
        });

        return feedbackItems;
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

function validateFeedbackItem(item: any): item is GeminiFeedbackResponse {
    const requiredFields = ['category', 'severity', 'roles', 'bbox', 'anchorType', 'title', 'text', 'recommendations'];

    for (const field of requiredFields) {
        if (!(field in item)) {
            return false;
        }
    }

    // Validate category
    if (!['accessibility', 'visual_hierarchy', 'content', 'ui_pattern'].includes(item.category)) {
        return false;
    }

    // Validate severity
    if (!['high', 'medium', 'low'].includes(item.severity)) {
        return false;
    }

    // Validate roles
    if (!Array.isArray(item.roles) || !item.roles.every((role: string) =>
        ['designer', 'reviewer', 'pm', 'developer'].includes(role)
    )) {
        return false;
    }

    // Validate bbox coordinates (should be between 0 and 1)
    const { bbox } = item;
    if (typeof bbox !== 'object' ||
        typeof bbox.x !== 'number' || bbox.x < 0 || bbox.x > 1 ||
        typeof bbox.y !== 'number' || bbox.y < 0 || bbox.y > 1 ||
        typeof bbox.width !== 'number' || bbox.width < 0 || bbox.width > 1 ||
        typeof bbox.height !== 'number' || bbox.height < 0 || bbox.height > 1) {
        return false;
    }

    // Validate anchorType
    if (!['bbox', 'point'].includes(item.anchorType)) {
        return false;
    }

    // Validate strings
    if (typeof item.title !== 'string' || typeof item.text !== 'string') {
        return false;
    }

    // Validate recommendations
    if (!Array.isArray(item.recommendations) || !item.recommendations.every((rec: any) => typeof rec === 'string')) {
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

            if (attempt < maxRetries) {
                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    throw lastError!;
}