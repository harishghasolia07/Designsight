import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Image, FeedbackItem, Comment, IImage, IFeedbackItem } from '@/models';
import puppeteer from 'puppeteer';
import { join } from 'path';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ imageId: string }> }
) {
    let browser: any = null;

    try {
        await dbConnect();

        const { imageId } = await params;

        // Get image details
        const image = await Image.findById(imageId).lean() as IImage | null;
        if (!image) {
            return NextResponse.json(
                { success: false, error: 'Image not found' },
                { status: 404 }
            );
        }

        // Get all feedback for this image
        const feedback = await FeedbackItem.find({ imageId }).lean() as unknown as IFeedbackItem[];

        // Get comments for each feedback item
        const feedbackWithComments = await Promise.all(
            feedback.map(async (item) => {
                const comments = await Comment.find({ feedbackId: item._id })
                    .populate('authorId', 'name email role')
                    .lean();

                return {
                    ...item,
                    comments: comments.map(comment => ({
                        id: comment._id,
                        body: comment.body,
                        author: comment.authorId,
                        createdAt: comment.createdAt
                    }))
                } as IFeedbackItem & { comments: any[] };
            })
        );

        // Launch Puppeteer
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Generate HTML content for PDF
        const htmlContent = generatePDFHTML(image, feedbackWithComments);

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '20mm',
                right: '20mm',
                bottom: '20mm',
                left: '20mm'
            }
        });

        await browser.close();

        // Set filename for download
        const filename = `${image.filename.split('.')[0]}_feedback_report_${new Date().toISOString().split('T')[0]}.pdf`;

        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });

    } catch (error) {
        console.error('PDF export error:', error);

        if (browser) {
            await browser.close();
        }

        return NextResponse.json(
            { success: false, error: 'Failed to generate PDF report' },
            { status: 500 }
        );
    }
}

function generatePDFHTML(image: IImage, feedback: (IFeedbackItem & { comments: any[] })[]): string {
    const severityColors: Record<string, string> = {
        high: '#ef4444',
        medium: '#f59e0b',
        low: '#10b981'
    };

    const categoryColors: Record<string, string> = {
        accessibility: '#ef4444',
        visual_hierarchy: '#3b82f6',
        copy: '#10b981',
        ui_pattern: '#8b5cf6'
    };

    const severityBreakdown = {
        high: feedback.filter(item => item.severity === 'high').length,
        medium: feedback.filter(item => item.severity === 'medium').length,
        low: feedback.filter(item => item.severity === 'low').length
    };

    const categoryBreakdown = {
        accessibility: feedback.filter(item => item.category === 'accessibility').length,
        visual_hierarchy: feedback.filter(item => item.category === 'visual_hierarchy').length,
        copy: feedback.filter(item => item.category === 'copy').length,
        ui_pattern: feedback.filter(item => item.category === 'ui_pattern').length
    };

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Design Feedback Report</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          line-height: 1.6;
          color: #333;
          background: white;
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #e5e7eb;
        }
        
        .header h1 {
          font-size: 28px;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .header p {
          color: #6b7280;
          font-size: 14px;
        }
        
        .summary {
          background: #f9fafb;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        
        .summary h2 {
          font-size: 18px;
          margin-bottom: 16px;
          color: #1f2937;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        
        .stat-group h3 {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .stat-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .stat-item:last-child {
          border-bottom: none;
        }
        
        .stat-label {
          font-size: 14px;
          color: #4b5563;
          text-transform: capitalize;
        }
        
        .stat-value {
          font-weight: 600;
          font-size: 16px;
        }
        
        .feedback-section {
          margin-top: 40px;
        }
        
        .feedback-section h2 {
          font-size: 20px;
          margin-bottom: 20px;
          color: #1f2937;
        }
        
        .feedback-item {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin-bottom: 20px;
          page-break-inside: avoid;
        }
        
        .feedback-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        
        .feedback-title {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 4px;
        }
        
        .feedback-meta {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        
        .severity-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          text-transform: uppercase;
          color: white;
        }
        
        .category-badge {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          background: #f3f4f6;
          color: #374151;
          text-transform: capitalize;
        }
        
        .feedback-description {
          color: #4b5563;
          margin-bottom: 16px;
          line-height: 1.5;
        }
        
        .recommendations {
          margin-bottom: 16px;
        }
        
        .recommendations h4 {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .recommendations ul {
          list-style-position: inside;
          color: #4b5563;
        }
        
        .recommendations li {
          margin-bottom: 4px;
        }
        
        .roles {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        
        .role-tag {
          padding: 3px 8px;
          background: #dbeafe;
          color: #1d4ed8;
          font-size: 11px;
          border-radius: 12px;
          text-transform: capitalize;
        }
        
        .ai-info {
          margin-top: 12px;
          font-size: 11px;
          color: #6b7280;
          font-style: italic;
        }
        
        .comments-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }
        
        .comments-title {
          font-size: 14px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .comment {
          background: #f9fafb;
          padding: 12px;
          border-radius: 6px;
          margin-bottom: 8px;
        }
        
        .comment-body {
          font-size: 13px;
          color: #4b5563;
          margin-bottom: 4px;
        }
        
        .comment-meta {
          font-size: 11px;
          color: #6b7280;
        }
        
        .page-break {
          page-break-before: always;
        }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Design Feedback Report</h1>
        <p>Generated on ${new Date().toLocaleDateString()} for ${image.filename}</p>
      </div>
      
      <div class="summary">
        <h2>Summary</h2>
        <div class="stats-grid">
          <div class="stat-group">
            <h3>By Severity</h3>
            <div class="stat-item">
              <span class="stat-label">High Priority</span>
              <span class="stat-value" style="color: ${severityColors.high}">${severityBreakdown.high}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Medium Priority</span>
              <span class="stat-value" style="color: ${severityColors.medium}">${severityBreakdown.medium}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Low Priority</span>
              <span class="stat-value" style="color: ${severityColors.low}">${severityBreakdown.low}</span>
            </div>
          </div>
          
          <div class="stat-group">
            <h3>By Category</h3>
            <div class="stat-item">
              <span class="stat-label">Accessibility</span>
              <span class="stat-value">${categoryBreakdown.accessibility}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Visual Hierarchy</span>
              <span class="stat-value">${categoryBreakdown.visual_hierarchy}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Copy</span>
              <span class="stat-value">${categoryBreakdown.copy}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">UI Pattern</span>
              <span class="stat-value">${categoryBreakdown.ui_pattern}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div class="feedback-section">
        <h2>Detailed Feedback (${feedback.length} items)</h2>
        
        ${feedback.map((item, index) => `
          <div class="feedback-item">
            <div class="feedback-header">
              <div>
                <div class="feedback-title">${index + 1}. ${item.title}</div>
                <div class="feedback-meta">
                  <span class="severity-badge" style="background-color: ${severityColors[item.severity]}">
                    ${item.severity}
                  </span>
                  <span class="category-badge">
                    ${item.category.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="feedback-description">
              ${item.text}
            </div>
            
            <div class="recommendations">
              <h4>Recommendations:</h4>
              <ul>
                ${item.recommendations.map((rec: string) => `<li>${rec}</li>`).join('')}
              </ul>
            </div>
            
            <div class="roles">
              ${item.roles.map((role: string) => `<span class="role-tag">${role}</span>`).join('')}
            </div>
            
            ${item.aiModelVersion ? `<div class="ai-info">Generated by: ${item.aiModelVersion}</div>` : ''}
            
            ${item.comments.length > 0 ? `
              <div class="comments-section">
                <div class="comments-title">Comments (${item.comments.length})</div>
                ${item.comments.map((comment: any) => `
                  <div class="comment">
                    <div class="comment-body">${comment.body}</div>
                    <div class="comment-meta">
                      ${comment.author?.name || 'Anonymous'} • ${new Date(comment.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    </body>
    </html>
  `;
}