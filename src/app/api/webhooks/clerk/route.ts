import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
    if (!webhookSecret) {
        return NextResponse.json(
            { success: false, error: 'Webhook secret not configured' },
            { status: 500 }
        );
    }

    // Get the headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get('svix-id');
    const svix_timestamp = headerPayload.get('svix-timestamp');
    const svix_signature = headerPayload.get('svix-signature');

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
        return NextResponse.json(
            { success: false, error: 'Missing svix headers' },
            { status: 400 }
        );
    }

    // Get the body
    const payload = await request.text();

    // Create a new Svix instance with your webhook secret
    const wh = new Webhook(webhookSecret);

    let evt: any;

    // Verify the payload with the headers
    try {
        evt = wh.verify(payload, {
            'svix-id': svix_id,
            'svix-timestamp': svix_timestamp,
            'svix-signature': svix_signature,
        });
    } catch (err) {
        console.error('Error verifying webhook:', err);
        return NextResponse.json(
            { success: false, error: 'Invalid signature' },
            { status: 400 }
        );
    }

    // Handle the webhook
    const { id } = evt.data;
    const eventType = evt.type;

    try {
        await dbConnect();

        switch (eventType) {
            case 'user.created':
                await User.create({
                    clerkId: evt.data.id,
                    name: `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim() || 'User',
                    email: evt.data.email_addresses[0]?.email_address || '',
                    role: 'designer' // Default role
                });
                console.log(`User created: ${evt.data.id}`);
                break;

            case 'user.updated':
                await User.findOneAndUpdate(
                    { clerkId: evt.data.id },
                    {
                        name: `${evt.data.first_name || ''} ${evt.data.last_name || ''}`.trim() || 'User',
                        email: evt.data.email_addresses[0]?.email_address || '',
                        updatedAt: new Date()
                    }
                );
                console.log(`User updated: ${evt.data.id}`);
                break;

            case 'user.deleted':
                await User.findOneAndDelete({ clerkId: evt.data.id });
                console.log(`User deleted: ${evt.data.id}`);
                break;

            default:
                console.log(`Unhandled event type: ${eventType}`);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Webhook processing error:', error);
        return NextResponse.json(
            { success: false, error: 'Failed to process webhook' },
            { status: 500 }
        );
    }
}