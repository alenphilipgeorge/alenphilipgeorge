// The stack shown in the README's tools card, grouped as it is drawn.
// Each entry is [label, simple-icons slug, colour]. The chip takes the brand
// colour simple-icons records for the slug unless a colour is given; a null
// slug draws a coloured dot instead of a mark, so it always needs one.
export const TOOLS = [
  ["Languages", [["Python", "python"], ["TypeScript", "typescript"], ["JavaScript", "javascript"], ["SQL", null, "#00758F"]]],
  [
    "AI and agents",
    [
      ["LangGraph", "langgraph"], ["LangChain", "langchain"], ["LangSmith", null, "#2A9D8F"], ["Claude", "claude"], ["OpenAI", null, "#10A37F"],
      ["Gemini", "googlegemini"], ["Vertex AI", null, "#4285F4"], ["OpenRouter", "openrouter"], ["Vercel AI SDK", "vercel"],
      ["Hugging Face", "huggingface"], ["ElevenLabs", "elevenlabs"], ["LiveKit", "livekit"], ["Modal", "modal"],
      ["Browserbase", null, "#F03603"], ["Stagehand", null, "#F03603"], ["Firecrawl", null, "#FF4C00"], ["Claude Code", "claudecode"],
    ],
  ],
  [
    "Backend",
    [
      ["Node.js", "nodedotjs"], ["NestJS", "nestjs"], ["FastAPI", "fastapi"], ["Temporal", "temporal"], ["BullMQ", null, "#E0234E"],
      ["Prisma", "prisma"], ["Pydantic", "pydantic"], ["Socket.IO", "socketdotio"], ["Pusher", "pusher"], ["Swagger", "swagger"],
      ["Zod", "zod"], ["Pino", "pino"], ["pandas", "pandas"], ["Jinja", "jinja"],
    ],
  ],
  [
    "Frontend",
    [
      ["Next.js", "nextdotjs"], ["React", "react"], ["Tailwind CSS", "tailwindcss"], ["shadcn/ui", "shadcnui"], ["Radix UI", "radixui"],
      ["TanStack Query", "reactquery"], ["Zustand", null, "#C08A5B"], ["Motion", null, "#FFF312"], ["Tiptap", null, "#8B5CF6"], ["Recharts", null, "#22B5BF"],
    ],
  ],
  [
    "Data",
    [["PostgreSQL", "postgresql"], ["Redis", "redis"], ["BigQuery", "googlebigquery"], ["Cloud Storage", "googlecloudstorage"], ["Datastream", null, "#4285F4"]],
  ],
  [
    "Cloud and infrastructure",
    [
      ["Google Cloud", "googlecloud"], ["Cloud Run", null, "#4285F4"], ["Cloud SQL", null, "#4285F4"], ["Kubernetes", "kubernetes"], ["Docker", "docker"],
      ["Terraform", "terraform"], ["Cloudflare", "cloudflare"], ["Secret Manager", null, "#34A853"], ["Cloud Scheduler", null, "#FBBC04"],
    ],
  ],
  [
    "Delivery and observability",
    [
      ["GitHub Actions", "githubactions"], ["Turborepo", "turborepo"], ["pnpm", "pnpm"], ["uv", "uv"], ["Ruff", "ruff"],
      ["Sentry", "sentry"], ["PostHog", "posthog", "#F54E00"], ["Mixpanel", "mixpanel"], ["Linear", "linear"],
    ],
  ],
  ["Testing", [["Jest", "jest"], ["Vitest", "vitest"], ["Pytest", "pytest"], ["Playwright", null, "#2EAD33"]]],
  [
    "Messaging and integrations",
    [
      ["WhatsApp", "whatsapp"], ["Gupshup", null, "#F26522"], ["Slack", null, "#E01E5A"], ["Resend", "resend"], ["MSG91", null, "#3D7BF7"],
      ["Juspay", null, "#1F6FEB"], ["GeeLark", null, "#5B6CFF"],
    ],
  ],
];
