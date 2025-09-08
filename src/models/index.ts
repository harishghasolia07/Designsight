import mongoose, { Schema, Document } from 'mongoose';

// Project Model
export interface IProject extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    ownerId: string; // Clerk user ID
    createdAt: Date;
}

const ProjectSchema = new Schema<IProject>({
    name: { type: String, required: true },
    description: { type: String },
    ownerId: { type: String, required: true }, // Store Clerk user ID directly
    createdAt: { type: Date, default: Date.now }
});

// Image Model
export interface IImage extends Document {
    _id: mongoose.Types.ObjectId;
    projectId: mongoose.Types.ObjectId;
    filename: string;
    url: string;
    width: number;
    height: number;
    uploadedAt: Date;
    status: 'uploaded' | 'processing' | 'done' | 'failed';
    analysisId?: mongoose.Types.ObjectId;
}

const ImageSchema = new Schema<IImage>({
    projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
    filename: { type: String, required: true },
    url: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
    status: {
        type: String,
        enum: ['uploaded', 'processing', 'done', 'failed'],
        default: 'uploaded'
    },
    analysisId: { type: Schema.Types.ObjectId, ref: 'Analysis' }
});

// FeedbackItem Model
export interface IBbox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface IFeedbackItem extends Document {
    _id: mongoose.Types.ObjectId;
    imageId: mongoose.Types.ObjectId;
    category: 'accessibility' | 'visual_hierarchy' | 'copy' | 'ui_pattern';
    severity: 'high' | 'medium' | 'low';
    roles: ('designer' | 'reviewer' | 'pm' | 'developer')[];
    bbox: IBbox;
    anchorType: 'bbox' | 'point';
    title: string;
    text: string;
    recommendations: string[];
    aiProvider: 'gemini';
    aiModelVersion?: string;  // Added to track specific AI model version
    createdAt: Date;
    createdBy?: mongoose.Types.ObjectId;
}

const FeedbackItemSchema = new Schema<IFeedbackItem>({
    imageId: { type: Schema.Types.ObjectId, ref: 'Image', required: true },
    category: {
        type: String,
        enum: ['accessibility', 'visual_hierarchy', 'copy', 'ui_pattern'],
        required: true
    },
    severity: {
        type: String,
        enum: ['high', 'medium', 'low'],
        required: true
    },
    roles: [{
        type: String,
        enum: ['designer', 'reviewer', 'pm', 'developer']
    }],
    bbox: {
        x: { type: Number, required: true, min: 0, max: 1 },
        y: { type: Number, required: true, min: 0, max: 1 },
        width: { type: Number, required: true, min: 0, max: 1 },
        height: { type: Number, required: true, min: 0, max: 1 }
    },
    anchorType: {
        type: String,
        enum: ['bbox', 'point'],
        required: true
    },
    title: { type: String, required: true },
    text: { type: String, required: true },
    recommendations: [{ type: String }],
    aiProvider: {
        type: String,
        enum: ['gemini'],
        default: 'gemini'
    },
    aiModelVersion: {
        type: String
    },
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }
});

// Comment Model
export interface IComment extends Document {
    _id: mongoose.Types.ObjectId;
    feedbackId: mongoose.Types.ObjectId;
    parentId?: mongoose.Types.ObjectId;
    authorId: mongoose.Types.ObjectId;
    body: string;
    createdAt: Date;
    editedAt?: Date;
}

const CommentSchema = new Schema<IComment>({
    feedbackId: { type: Schema.Types.ObjectId, ref: 'FeedbackItem', required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment' },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    body: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    editedAt: { type: Date }
});

// User Model (for Clerk integration)
export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    clerkId: string; // Clerk user ID
    name: string;
    email: string;
    role?: 'designer' | 'reviewer' | 'pm' | 'developer';
    createdAt: Date;
    updatedAt: Date;
}

const UserSchema = new Schema<IUser>({
    clerkId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: {
        type: String,
        enum: ['designer', 'reviewer', 'pm', 'developer'],
        default: 'designer'
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Export models - Handle Next.js hot reloading properly
export const Project = mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);
export const Image = mongoose.models.Image || mongoose.model<IImage>('Image', ImageSchema);
export const FeedbackItem = mongoose.models.FeedbackItem || mongoose.model<IFeedbackItem>('FeedbackItem', FeedbackItemSchema);
export const Comment = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);
export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);