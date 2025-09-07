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
        const modelVersion = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
        const model = genAI.getGenerativeModel({
            model: modelVersion
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

        return feedbackItems;
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`);
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