/
├── 📁 .config/  
│   └── 🟡 Development configs  
│       • npm / Firebase CLI settings  
│       • Local tooling (ESLint, Prettier helpers)  
│       • Ensures dev machines behave consistently  
│
├── 📁 .github/  
│   └── 🔧 GitHub automation  
│       • CI workflows  
│       • Issue/PR templates  
│       • Codeowner rules  
│       • Branch protections  
│
├── 📁 apmaster/  
│   └── 🏛️ Legacy TypeScript app  
│       • Older app logic prior to Next.js migration  
│       • Useful for reference / backwards compatibility  
│       • Not used in production, but kept for history  
│
├── 📁 attached_assets/  
│   └── 🖼️ Developer reference assets  
│       • Raw screenshots, HTML dumps  
│       • Cracked AP scraping references  
│       • Test ZIPs, example question structures  
│       • Used by onboarding interns to learn the pipeline  
│
├── 📁 client/  
│   ├── 📁 public/  
│   │   └── 🖼️ Static client assets  
│   │       • Logos, icons, favicon, manifest.json  
│   │       • Served *directly* to browser  
│   │
│   └── 📁 src/  
│       ├── 📁 components/  
│       │   ├── 📁 quiz/  
│       │   │   └── 🧩 Quiz engine UI  
│       │   │       • QuestionCard – main question renderer  
│       │   │       • EnhancedQuestionPalette – floating palette  
│       │   │       • Review/Submit dialogs  
│       │   │       • FullLengthQuiz, PracticeQuiz implementations  
│       │   │       • This folder = **heart of the AP Master platform**  
│       │   │
│       │   ├── 📁 sections/  
│       │   │   └── 🎨 Landing page sections  
│       │   │       • Hero  
│       │   │       • Features  
│       │   │       • Testimonials  
│       │   │       • Footer  
│       │   │       Used for marketing + onboarding  
│       │   │
│       │   ├── 📁 ui/  
│       │   │   └── 🎨 Reusable UI components (shadcn-based)  
│       │   │       • Buttons  
│       │   │       • Cards  
│       │   │       • Dialogs  
│       │   │       • Inputs  
│       │   │       All styling is **atomic + consistent**  
│       │   │
│       │   └── 📄 auth-error-boundary.tsx  
│       │       └── 🔐 Catches Firebase auth failures  
│       │           • Prevents app crashes  
│       │           • Shows user-friendly fallback screens  
│       │
│       ├── 📁 contexts/  
│       │   └── 🧠 Global state providers  
│       │       • Authentication  
│       │       • User object / subject progress  
│       │       • React Query provider  
│       │       The “backbone” of shared app logic  
│       │
│       ├── 📁 hooks/  
│       │   └── 🧩 Custom logic hooks  
│       │       • useMobile – detects screen size  
│       │       • useToast – global toast system  
│       │       • Generally logic not tied to UI  
│       │
│       ├── 📁 lib/  
│       │   ├── 📁 hooks/  
│       │   │   └── (More modular hook organization)  
│       │   │
│       │   └── 📁 types/  
│       │       └── 🧠 Shared TypeScript types  
│       │           • Question types  
│       │           • Block types  
│       │           • Subject metadata  
│       │
│       ├── 📁 pages/  
│       │   └── 🗺️ Next.js pages:  
│       │       • /dashboard  
│       │       • /study  
│       │       • /quiz  
│       │       • /full-length-history  
│       │       • /login, /signup  
│       │       Responsible for routing + page-level layout  
│       │
│       ├── 📁 subjects/  
│       │   ├── 📁 biology/  
│       │   ├── 📁 calculus/  
│       │   ├── 📁 common/  
│       │   ├── 📁 computer-science-principles/  
│       │   ├── 📁 macroeconomics/  
│       │   ├── 📁 microeconomics/  
│       │   └── 📄 index.ts  
│       │       └── 📚 Subject metadata system  
│       │           • Unit names  
│       │           • Section codes  
│       │           • Lesson organization  
│       │           • Drives dashboard + study page  
│       │
│       ├── 📄 App.tsx  
│       │   └── Root application  
│       │       • Auth provider  
│       │       • Query client  
│       │       • Routing  
│       │
│       ├── 🎨 index.css  
│       │   └── Tailwind + global CSS  
│       │
│       └── 📄 main.tsx  
│           └── Vite entry point  
│
├── 📁 components/  
│   └── ⚠️ Legacy shared UI components  
│       • Should be migrated to client/src/components  
│
├── 📁 dataconnect/  
│   └── 🔥 Firebase DataConnect schemas  
│       • Written by developers  
│       • Used to generate Firestore SDK  
│
├── 📁 dataconnect-generated/  
│   └── ⚙️ Auto-generated code  
│       • Do NOT touch  
│       • Compiled Firestore connectors  
│
├── 📁 lib/  
│   └── 🔥 Server utilities  
│       • Shared database helpers  
│       • Shared validators  
│       • Used across API routes  
│
├── 📁 pages/  
│   ├── 📁 admin/  
│   │   └── 🧮 Admin dashboard pages  
│   │       • Question manager  
│   │       • Import tool  
│   │       • Bulk operations  
│   │
│   ├── 📁 api/  
│   │   ├── 📁 admin/  
│   │   │   └── 🔥 Question admin APIs  
│   │   │       • import-questions  
│   │   │       • edit/delete question  
│   │   │       • query questions  
│   │   │
│   │   ├── 📁 user/  
│   │   │   └── 🔥 User APIs  
│   │   │       • /me  
│   │   │       • /profile  
│   │   │       • /subjects  
│   │   │       • /unit-progress  
│   │   │       • /full-length-test  
│   │   │       • /save-exam-state  
│   │   │       • /get-exam-state  
│   │   │       • /delete-exam-state  
│   │   │
│   │   └── 📁 waitlist/  
│   │       └── 📨 Waitlist endpoints (public)  
│   │
│   └── 🗂️ Legacy page files  
│
├── 📁 server/  
│   ├── 🔥 firebase-admin.ts  
│   │   └── Admin SDK initialization  
│   ├── 🔥 db.ts  
│   │   └── Firestore helpers + retry logic  
│   ├── 🔥 db-health-monitor.ts  
│   ├── 🔥 db-retry-handler.ts  
│   ├── 🔥 storage.ts  
│   │   └── Cloud Storage uploads for question images  
│   ├── 🔥 routes.ts  
│   ├── 🔥 vite.ts  
│   └── 🔥 index.ts  
│       └── Express server entry point  
│
├── 📁 shared/  
│   └── 🧠 Shared types across backend + frontend  
│
├── 📁 utils/  
│   └── ⚙️ Global utility functions  
│
└── 📁 Config files  
    ├── 📄 next.config.js (Next.js rewrites & build settings)  
    ├── 📄 vite.config.ts (Vite dev + alias config)  
    ├── 🎨 tailwind.config.ts (Theme, colors, shadows)  
    ├── 📄 tsconfig.json (Strict TS compiler settings + path aliases)  
    ├── 📄 package.json (Dependencies, scripts)  
    ├── 🔒 firestore.rules (Database security)  
    └── 🔒 storage.rules (Storage bucket security)  
