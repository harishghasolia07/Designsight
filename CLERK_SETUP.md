# Clerk Authentication Setup

This project uses Clerk for authentication with the **latest Clerk v5 API**. Follow these steps to set up Clerk in your development environment.

## Important Note About Clerk Version

This project uses Clerk v5 which has updated APIs:
- ✅ Uses `clerkMiddleware` instead of deprecated `authMiddleware`
- ✅ Uses `@clerk/nextjs/server` for server-side auth functions
- ✅ Compatible with Next.js 15

## 1. Create a Clerk Account

1. Go to [https://clerk.com](https://clerk.com) and sign up for a free account
2. Create a new application in your Clerk dashboard
3. Choose your preferred authentication methods (email/password, Google, GitHub, etc.)

## 2. Get Your API Keys

From your Clerk dashboard:

1. Go to "API Keys" in the sidebar
2. Copy your **Publishable Key** (starts with `pk_test_`)
3. Copy your **Secret Key** (starts with `sk_test_`)

## 3. Set Up Webhooks (Optional but Recommended)

1. Go to "Webhooks" in your Clerk dashboard
2. Create a new webhook endpoint: `http://localhost:3000/api/webhooks/clerk`
3. Select these events:
   - `user.created`
   - `user.updated` 
   - `user.deleted`
4. Copy the **Webhook Secret** (starts with `whsec_`)

## 4. Configure Environment Variables

Copy `.env.example` to `.env` and update these values:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_actual_secret_key_here
CLERK_WEBHOOK_SECRET=whsec_your_actual_webhook_secret_here
```

## 5. Middleware Configuration

The middleware has been updated to use the new Clerk v5 API with `clerkMiddleware`. The configuration in `src/middleware.ts` protects specific routes while allowing public access to sign-in/sign-up pages.

```typescript
// Example of protected routes
const isProtectedRoute = createRouteMatcher([
  '/projects(.*)',
  '/images(.*)',
  '/api/projects(.*)',
  '/api/images(.*)',
  '/api/feedback(.*)',
  '/api/dashboard(.*)'
]);
```

## 6. Test Authentication

1. Start your development server: `npm run dev`
2. Visit `http://localhost:3000`
3. You should be redirected to sign in
4. Create a new account or sign in
5. You should be redirected back to the dashboard

## Authentication Features Included

- ✅ Sign in/Sign up pages
- ✅ User button with profile management
- ✅ Protected routes (middleware)
- ✅ User context throughout the app
- ✅ Webhook integration for user sync
- ✅ Automatic user creation in database

## Customization

### Adding More Authentication Providers

In your Clerk dashboard:
1. Go to "User & Authentication" → "Social Connections"
2. Enable providers like Google, GitHub, Discord, etc.
3. Follow the setup instructions for each provider

### Customizing Sign-in/Sign-up Pages

The sign-in and sign-up pages are located at:
- `src/app/sign-in/[[...sign-in]]/page.tsx`
- `src/app/sign-up/[[...sign-up]]/page.tsx`

You can customize the styling by wrapping the Clerk components or using Clerk's appearance API.

### User Roles

The system includes a basic role system:
- `designer` (default)
- `reviewer`
- `pm` (Product Manager)
- `developer`

Users are assigned the `designer` role by default. You can implement role selection during onboarding or add an admin interface to manage roles.

## Production Deployment

For production:

1. Create a production application in Clerk
2. Update your environment variables with production keys
3. Update the webhook URL to your production domain
4. Ensure your domain is added to Clerk's allowed origins

## Troubleshooting

### Common Issues

1. **"Invalid publishable key"**: Make sure you're using the correct key for your environment
2. **Webhook not working**: Check that the webhook URL is accessible and the secret is correct
3. **Redirect loops**: Verify your middleware configuration and public routes
4. **Database connection issues**: Ensure MongoDB is running and accessible

### Getting Help

- [Clerk Documentation](https://clerk.com/docs)
- [Clerk Discord Community](https://discord.com/invite/b5rXHjAg7A)
- [Next.js + Clerk Guide](https://clerk.com/docs/quickstarts/nextjs)