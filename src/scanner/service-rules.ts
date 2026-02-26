// Copied from deployment-buddy/lib/service-detection.ts — kept in sync
// These are the service detection rules used for matching env vars to services

export type ServiceRule = {
  name: string;
  icon: string;
  key_url: string;
  env_patterns: string[];
  config_files: string[];
  expected_env_vars: string[];
};

export const SERVICE_RULES: ServiceRule[] = [
  {
    name: "Supabase", icon: "⚡", key_url: "https://supabase.com/dashboard/project/_/settings/api",
    env_patterns: ["SUPABASE_", "NEXT_PUBLIC_SUPABASE_"],
    config_files: ["supabase/config.toml"],
    expected_env_vars: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_URL"],
  },
  {
    name: "Stripe", icon: "💳", key_url: "https://dashboard.stripe.com/apikeys",
    env_patterns: ["STRIPE_"],
    config_files: [],
    expected_env_vars: ["STRIPE_SECRET_KEY", "STRIPE_PUBLISHABLE_KEY", "STRIPE_WEBHOOK_SECRET"],
  },
  {
    name: "Clerk", icon: "🔐", key_url: "https://dashboard.clerk.com",
    env_patterns: ["CLERK_", "NEXT_PUBLIC_CLERK_"],
    config_files: [],
    expected_env_vars: ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"],
  },
  {
    name: "Auth0", icon: "🔑", key_url: "https://manage.auth0.com",
    env_patterns: ["AUTH0_"],
    config_files: [],
    expected_env_vars: ["AUTH0_SECRET", "AUTH0_BASE_URL", "AUTH0_ISSUER_BASE_URL", "AUTH0_CLIENT_ID", "AUTH0_CLIENT_SECRET"],
  },
  {
    name: "SendGrid", icon: "📧", key_url: "https://app.sendgrid.com/settings/api_keys",
    env_patterns: ["SENDGRID_"],
    config_files: [],
    expected_env_vars: ["SENDGRID_API_KEY"],
  },
  {
    name: "Resend", icon: "📬", key_url: "https://resend.com/api-keys",
    env_patterns: ["RESEND_"],
    config_files: [],
    expected_env_vars: ["RESEND_API_KEY"],
  },
  {
    name: "OpenAI", icon: "🤖", key_url: "https://platform.openai.com/api-keys",
    env_patterns: ["OPENAI_"],
    config_files: [],
    expected_env_vars: ["OPENAI_API_KEY"],
  },
  {
    name: "Anthropic", icon: "🧠", key_url: "https://console.anthropic.com/settings/keys",
    env_patterns: ["ANTHROPIC_"],
    config_files: [],
    expected_env_vars: ["ANTHROPIC_API_KEY"],
  },
  {
    name: "Google AI", icon: "💎", key_url: "https://aistudio.google.com/apikey",
    env_patterns: ["GOOGLE_AI_", "GEMINI_"],
    config_files: [],
    expected_env_vars: ["GOOGLE_AI_API_KEY"],
  },
  {
    name: "Firebase", icon: "🔥", key_url: "https://console.firebase.google.com",
    env_patterns: ["FIREBASE_", "NEXT_PUBLIC_FIREBASE_"],
    config_files: ["firebase.json", ".firebaserc"],
    expected_env_vars: ["FIREBASE_API_KEY", "FIREBASE_PROJECT_ID"],
  },
  {
    name: "AWS", icon: "☁️", key_url: "https://console.aws.amazon.com/iam",
    env_patterns: ["AWS_"],
    config_files: [],
    expected_env_vars: ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION"],
  },
  {
    name: "Upstash", icon: "🔴", key_url: "https://console.upstash.com",
    env_patterns: ["UPSTASH_"],
    config_files: [],
    expected_env_vars: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  },
  {
    name: "Neon", icon: "🐘", key_url: "https://console.neon.tech",
    env_patterns: ["NEON_"],
    config_files: [],
    expected_env_vars: ["DATABASE_URL"],
  },
  {
    name: "PlanetScale", icon: "🪐", key_url: "https://app.planetscale.com",
    env_patterns: ["PLANETSCALE_"],
    config_files: [],
    expected_env_vars: ["DATABASE_URL"],
  },
  {
    name: "Vercel", icon: "▲", key_url: "https://vercel.com/account/tokens",
    env_patterns: ["VERCEL_"],
    config_files: ["vercel.json"],
    expected_env_vars: [],
  },
  {
    name: "Cloudflare", icon: "🌐", key_url: "https://dash.cloudflare.com/profile/api-tokens",
    env_patterns: ["CLOUDFLARE_"],
    config_files: ["wrangler.toml"],
    expected_env_vars: ["CLOUDFLARE_API_TOKEN"],
  },
  {
    name: "Twilio", icon: "📱", key_url: "https://console.twilio.com",
    env_patterns: ["TWILIO_"],
    config_files: [],
    expected_env_vars: ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN"],
  },
  {
    name: "MongoDB", icon: "🍃", key_url: "https://cloud.mongodb.com",
    env_patterns: ["MONGODB_", "MONGO_"],
    config_files: [],
    expected_env_vars: ["MONGODB_URI"],
  },
];
