'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Reply, Send, User } from 'lucide-react';

interface Comment {
    _id: string;
    feedbackId: string;
    parentId?: string;
    authorId: string;
    body: string;
    createdAt: string;
    editedAt?: string;
    author?: {
        name: string;
        email: string;
        role: string;
    };
    replies?: Comment[];
}

interface CommentsProps {
    feedbackId: string;
    comments: Comment[];
    onCommentAdded: (comment: Comment) => void;
}

export default function Comments({ feedbackId, comments, onCommentAdded }: CommentsProps) {
    const [newComment, setNewComment] = useState('');
    const [replyTo, setReplyTo] = useState<string | null>(null);
    const [replyText, setReplyText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const submitComment = async (body: string, parentId?: string) => {
        if (!body.trim()) return;

        setSubmitting(true);
        try {
            const response = await fetch(`/api/feedback/${feedbackId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    body: body.trim(),
                    authorId: '60f1b0b3e6b3a12f8c123456', // Mock user ID for MVP
                    parentId
                }),
            });

            const data = await response.json();
            if (data.success) {
                onCommentAdded(data.data);
                if (parentId) {
                    setReplyTo(null);
                    setReplyText('');
                } else {
                    setNewComment('');
                }
            } else {
                alert('Failed to add comment: ' + data.error);
            }
        } catch (error) {
            console.error('Failed to submit comment:', error);
            alert('Failed to add comment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmitComment = (e: React.FormEvent) => {
        e.preventDefault();
        submitComment(newComment);
    };

    const handleSubmitReply = (e: React.FormEvent, parentId: string) => {
        e.preventDefault();
        submitComment(replyText, parentId);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) {
            return 'Just now';
        } else if (diffInHours < 24) {
            return `${diffInHours}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    const renderComment = (comment: Comment, isReply = false) => (
        <div key={comment._id} className={`${isReply ? 'ml-8 mt-2' : 'mb-4'}`}>
            <Card className="bg-muted/50">
                <CardContent className="p-3">
                    <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
                            <User className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                                <span className="font-medium text-sm">
                                    {comment.author?.name || 'Anonymous'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {comment.author?.role || 'User'}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    •
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {formatDate(comment.createdAt)}
                                </span>
                                {comment.editedAt && (
                                    <span className="text-xs text-muted-foreground">
                                        (edited)
                                    </span>
                                )}
                            </div>
                            <p className="text-sm mb-2">{comment.body}</p>
                            {!isReply && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setReplyTo(replyTo === comment._id ? null : comment._id)}
                                    className="text-xs h-6 px-2"
                                >
                                    <Reply className="w-3 h-3 mr-1" />
                                    Reply
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Reply form */}
                    {replyTo === comment._id && (
                        <form
                            onSubmit={(e) => handleSubmitReply(e, comment._id)}
                            className="mt-3 ml-11"
                        >
                            <div className="flex space-x-2">
                                <Input
                                    placeholder="Write a reply..."
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    className="text-sm"
                                    disabled={submitting}
                                />
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={!replyText.trim() || submitting}
                                >
                                    <Send className="w-3 h-3" />
                                </Button>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>

            {/* Render replies */}
            {comment.replies && comment.replies.map(reply => (
                <div key={reply._id}>
                    {renderComment(reply, true)}
                </div>
            ))}
        </div>
    );

    // Organize comments into threads (top-level comments with their replies)
    const topLevelComments = comments.filter(comment => !comment.parentId);
    const commentReplies = comments.filter(comment => comment.parentId);

    // Attach replies to their parent comments
    const threaded = topLevelComments.map(comment => ({
        ...comment,
        replies: commentReplies.filter(reply => reply.parentId === comment._id)
    }));

    return (
        <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-4">
                <MessageSquare className="w-5 h-5" />
                <h3 className="font-semibold">
                    Comments ({comments.length})
                </h3>
            </div>

            {/* Add new comment form */}
            <Card>
                <CardContent className="p-4">
                    <form onSubmit={handleSubmitComment}>
                        <div className="flex space-x-3">
                            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
                                <User className="w-4 h-4" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <Input
                                    placeholder="Write a comment..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    disabled={submitting}
                                />
                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={!newComment.trim() || submitting}
                                    >
                                        <Send className="w-4 h-4 mr-2" />
                                        {submitting ? 'Posting...' : 'Post Comment'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Comments list */}
            <div className="space-y-4">
                {threaded.length === 0 ? (
                    <div className="text-center py-8">
                        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                            No comments yet. Be the first to comment!
                        </p>
                    </div>
                ) : (
                    threaded.map(comment => (
                        <div key={comment._id}>
                            {renderComment(comment)}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}