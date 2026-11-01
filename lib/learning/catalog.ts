// Course catalog: categories -> subcategories -> suggested topics, each category taught by an AI professor
// with its own lesson blueprint. Kept in code (versioned, no DB round trip); move to tables when an admin UI
// needs to edit it. Plain data only, so it is safe to import from client components.

export type Professor = {
  id: string
  name: string
  title: string
  /** Shown to learners. Personas are AI tutors, never presented as real people. */
  bio: string
  /** Prompt-only: how this professor teaches. */
  style: string
  initials: string
  /** Tailwind classes for the avatar circle. */
  avatarClass: string
}

export type Subcategory = { id: string; name: string; topics: string[] }

export type Category = {
  id: string
  name: string
  icon: string
  group: "tech" | "non_tech"
  description: string
  professorId: string
  /** Prompt-only: what lessons in this track must emphasise. */
  blueprint: string
  subcategories: Subcategory[]
}

export const PROFESSORS: Record<string, Professor> = {
  arjun: {
    id: "arjun",
    name: "Prof. Arjun Mehta",
    title: "AI professor · Coding & Software",
    bio: "Teaches programming the way senior engineers learn it: small runnable steps, real code, and habits that scale.",
    style:
      "Calm, practical senior engineer. Builds intuition with tiny runnable examples, then grows them. Reads code line by line, points out bugs before they happen, and ties every idea to how it is used at work.",
    initials: "AM",
    avatarClass: "bg-blue-600 text-white",
  },
  kavya: {
    id: "kavya",
    name: "Prof. Kavya Iyer",
    title: "AI professor · IT & Cloud",
    bio: "Explains infrastructure from the ground up: what happens on the wire, in the server and in the cloud console.",
    style:
      "Systems thinker. Draws the path a request takes, names each component, and explains failure modes and security implications. Uses commands and configuration snippets the learner can try.",
    initials: "KI",
    avatarClass: "bg-sky-600 text-white",
  },
  rohan: {
    id: "rohan",
    name: "Dr. Rohan Verma",
    title: "AI professor · AI & Data",
    bio: "Makes data and machine learning concrete: real datasets, honest metrics, and the maths only where it helps.",
    style:
      "Curious researcher. Starts from a question about data, shows the numbers, then the method. Explains the intuition before formulas, warns about leakage, bias and over-fitting, and always checks results.",
    initials: "RV",
    avatarClass: "bg-violet-600 text-white",
  },
  meera: {
    id: "meera",
    name: "Dr. Meera Nair",
    title: "AI professor · Science",
    bio: "Connects scientific ideas to everyday observations, experiments and the history of how we found out.",
    style:
      "Warm lab scientist. Begins with an everyday observation or experiment, builds the model step by step, uses units and correct terminology, and separates established facts from open questions.",
    initials: "MN",
    avatarClass: "bg-emerald-600 text-white",
  },
  vikram: {
    id: "vikram",
    name: "Prof. Vikram Rao",
    title: "AI professor · Mathematics",
    bio: "Shows why the maths works, not just how to apply it, with careful worked examples.",
    style:
      "Patient and precise. States the idea in words, then symbols, then a worked example with every step justified. Encourages estimation and checking answers, and shows where students usually slip.",
    initials: "VR",
    avatarClass: "bg-indigo-600 text-white",
  },
  neha: {
    id: "neha",
    name: "Prof. Neha Kapoor",
    title: "AI professor · Business & Finance",
    bio: "Teaches business through real decisions, numbers and case studies, with an Indian market lens where useful.",
    style:
      "Case-method teacher. Opens with a business situation, asks what the learner would do, then introduces the framework and the numbers. Uses rupee examples and Indian companies where relevant.",
    initials: "NK",
    avatarClass: "bg-amber-600 text-white",
  },
  ishaan: {
    id: "ishaan",
    name: "Prof. Ishaan Das",
    title: "AI professor · Design & Creative",
    bio: "Trains your eye: principles first, then critique of real work, then making your own.",
    style:
      "Studio mentor. Describes visual examples vividly, names the principle at work, critiques good and bad versions side by side, and ends with a small creative brief.",
    initials: "ID",
    avatarClass: "bg-pink-600 text-white",
  },
  sara: {
    id: "sara",
    name: "Prof. Sara Thomas",
    title: "AI professor · Languages & Communication",
    bio: "Builds confident communication with model phrases, practice dialogues and gentle correction.",
    style:
      "Encouraging coach. Gives model sentences and short dialogues, explains why they work, highlights common mistakes made by Indian English speakers kindly, and sets speaking or writing practice.",
    initials: "ST",
    avatarClass: "bg-rose-600 text-white",
  },
  aditya: {
    id: "aditya",
    name: "Prof. Aditya Kulkarni",
    title: "AI professor · Exam Prep",
    bio: "Focuses on concepts that score: exam patterns, shortcuts that are safe, and timed practice.",
    style:
      "Exam strategist. Links each concept to how it is examined, teaches a reliable method before shortcuts, solves exam-style questions step by step, and flags traps and time-savers.",
    initials: "AK",
    avatarClass: "bg-orange-600 text-white",
  },
}

/** Used for courses created before categories existed. */
export const DEFAULT_PROFESSOR: Professor = {
  id: "nxtai",
  name: "NxtAI Professor",
  title: "AI professor",
  bio: "Your NxtAI tutor.",
  style: "Clear, friendly and practical university lecturer.",
  initials: "N",
  avatarClass: "bg-primary text-primary-foreground",
}

export const CATEGORIES: Category[] = [
  {
    id: "coding",
    name: "Coding & Software",
    icon: "💻",
    group: "tech",
    description: "Programming, web and app development, DSA",
    professorId: "arjun",
    blueprint:
      "Every concept gets a short code example in a fenced block with the language named; walk through it line by line. Include a 'predict the output' or 'spot the bug' checkpoint. Prefer runnable, modern, idiomatic code.",
    subcategories: [
      { id: "web-dev", name: "Web development", topics: ["HTML, CSS & JavaScript from scratch", "React for beginners", "Build a full-stack app with Next.js"] },
      { id: "python", name: "Python", topics: ["Python fundamentals", "Automate tasks with Python", "Object-oriented Python"] },
      { id: "dsa", name: "Data structures & algorithms", topics: ["DSA for placements", "Recursion and dynamic programming", "Graphs and trees"] },
      { id: "mobile", name: "Mobile apps", topics: ["Android with Kotlin", "Cross-platform apps with Flutter", "React Native basics"] },
      { id: "devops", name: "DevOps", topics: ["Git and GitHub workflow", "Docker for developers", "CI/CD pipelines"] },
    ],
  },
  {
    id: "it-cloud",
    name: "IT & Cloud",
    icon: "🖥️",
    group: "tech",
    description: "Networking, cloud, security, Linux, databases",
    professorId: "kavya",
    blueprint:
      "Explain how components connect and the path data takes. Include commands or config snippets in fenced blocks, a troubleshooting scenario, and security best practices. Never teach attacking systems you do not own.",
    subcategories: [
      { id: "networking", name: "Networking", topics: ["Networking fundamentals (CCNA level)", "How the internet works", "DNS, HTTP and TLS explained"] },
      { id: "cloud", name: "Cloud (AWS / Azure)", topics: ["AWS Cloud Practitioner", "Deploy a web app on AWS", "Azure fundamentals"] },
      { id: "security", name: "Cybersecurity", topics: ["Cybersecurity fundamentals", "Web application security (OWASP Top 10)", "Secure your own accounts and devices"] },
      { id: "linux", name: "Linux", topics: ["Linux command line basics", "Linux system administration", "Shell scripting"] },
      { id: "databases", name: "Databases", topics: ["SQL from zero", "Database design and normalisation", "PostgreSQL in practice"] },
    ],
  },
  {
    id: "ai-data",
    name: "AI & Data",
    icon: "🤖",
    group: "tech",
    description: "Data analysis, machine learning, GenAI, statistics",
    professorId: "rohan",
    blueprint:
      "Ground ideas in a small concrete dataset or example. Show code (Python, pandas, scikit-learn) where useful, explain intuition before formulas, and discuss evaluation, bias and common pitfalls.",
    subcategories: [
      { id: "data-analysis", name: "Data analysis", topics: ["Data analysis with Excel and SQL", "Pandas for data analysis", "Dashboards with Power BI"] },
      { id: "ml", name: "Machine learning", topics: ["Machine learning fundamentals", "Build your first ML model", "Model evaluation and tuning"] },
      { id: "genai", name: "Generative AI & LLMs", topics: ["How LLMs work", "Prompt engineering", "Build apps with LLM APIs"] },
      { id: "statistics", name: "Statistics", topics: ["Statistics for data science", "Probability basics", "A/B testing"] },
    ],
  },
  {
    id: "science",
    name: "Science",
    icon: "🔬",
    group: "non_tech",
    description: "Physics, chemistry, biology, environment",
    professorId: "meera",
    blueprint:
      "Start from an observation or simple experiment. Use correct units, terminology and formulas (written in plain text or LaTeX-style inline). Describe what a diagram would show in words. Separate established facts from open questions.",
    subcategories: [
      { id: "physics", name: "Physics", topics: ["Mechanics from first principles", "Electricity and magnetism", "Waves, light and sound"] },
      { id: "chemistry", name: "Chemistry", topics: ["Atoms, bonding and the periodic table", "Organic chemistry basics", "Chemical reactions and equations"] },
      { id: "biology", name: "Biology", topics: ["Cell biology", "Human body systems", "Genetics and evolution"] },
      { id: "environment", name: "Environmental science", topics: ["Climate change explained", "Ecology and ecosystems", "Energy and sustainability"] },
    ],
  },
  {
    id: "math",
    name: "Mathematics",
    icon: "➗",
    group: "non_tech",
    description: "Algebra, calculus, probability, discrete maths",
    professorId: "vikram",
    blueprint:
      "State each idea in words, then notation, then a fully worked example with every step justified. Include a practice problem checkpoint with the answer explained. Show how to check an answer.",
    subcategories: [
      { id: "algebra", name: "Algebra", topics: ["Algebra foundations", "Linear algebra for beginners", "Functions and graphs"] },
      { id: "calculus", name: "Calculus", topics: ["Differential calculus", "Integral calculus", "Calculus for engineers"] },
      { id: "probability", name: "Probability", topics: ["Probability from scratch", "Combinatorics", "Probability distributions"] },
      { id: "discrete", name: "Discrete maths", topics: ["Logic and proofs", "Sets, relations and functions", "Graph theory basics"] },
    ],
  },
  {
    id: "business",
    name: "Business & Finance",
    icon: "📈",
    group: "non_tech",
    description: "Marketing, accounting, personal finance, startups",
    professorId: "neha",
    blueprint:
      "Open with a short realistic business case. Introduce the framework or formula, work the numbers (₹ where natural), and end with a decision exercise. Avoid giving personalised financial advice; teach principles.",
    subcategories: [
      { id: "marketing", name: "Marketing", topics: ["Digital marketing fundamentals", "SEO and content marketing", "Brand building"] },
      { id: "accounting", name: "Accounting", topics: ["Accounting basics", "Reading financial statements", "GST basics for small businesses"] },
      { id: "personal-finance", name: "Personal finance", topics: ["Budgeting and saving", "Investing basics: stocks and mutual funds", "Taxes for salaried employees"] },
      { id: "entrepreneurship", name: "Entrepreneurship", topics: ["Start a startup", "Product-market fit", "Pitching to investors"] },
    ],
  },
  {
    id: "design",
    name: "Design & Creative",
    icon: "🎨",
    group: "non_tech",
    description: "UI/UX, graphic design, video, writing",
    professorId: "ishaan",
    blueprint:
      "Describe visual examples concretely (layout, colour, type) and compare a weak and a strong version. Name the principle at work. End with a small creative brief the learner can complete.",
    subcategories: [
      { id: "ui-ux", name: "UI/UX design", topics: ["UI/UX fundamentals", "Design in Figma", "User research basics"] },
      { id: "graphic", name: "Graphic design", topics: ["Graphic design principles", "Typography", "Colour theory"] },
      { id: "video", name: "Video", topics: ["Video editing basics", "YouTube content creation", "Storytelling for video"] },
      { id: "writing", name: "Writing", topics: ["Creative writing", "Copywriting", "Technical writing"] },
    ],
  },
  {
    id: "languages",
    name: "Languages & Communication",
    icon: "🗣️",
    group: "non_tech",
    description: "English, public speaking, interview skills",
    professorId: "sara",
    blueprint:
      "Give model phrases and short dialogues, explain why they work, correct common mistakes kindly, and finish with a speaking or writing practice task.",
    subcategories: [
      { id: "english", name: "English", topics: ["Spoken English for professionals", "English grammar essentials", "Business email writing"] },
      { id: "public-speaking", name: "Public speaking", topics: ["Public speaking confidence", "Presentation skills", "Storytelling"] },
      { id: "interviews", name: "Interview skills", topics: ["HR interview preparation", "Group discussions", "Behavioural interviews (STAR method)"] },
    ],
  },
  {
    id: "exam-prep",
    name: "Exam Prep",
    icon: "🎓",
    group: "non_tech",
    description: "JEE/NEET basics, GATE, placement aptitude",
    professorId: "aditya",
    blueprint:
      "Tie each concept to how it is examined. Teach a reliable method, then safe shortcuts. Solve exam-style questions step by step and flag common traps and time-savers.",
    subcategories: [
      { id: "jee-neet", name: "JEE / NEET basics", topics: ["JEE physics foundations", "NEET biology foundations", "JEE maths foundations"] },
      { id: "gate", name: "GATE", topics: ["GATE CS: operating systems", "GATE CS: computer networks", "GATE engineering mathematics"] },
      { id: "aptitude", name: "Placement aptitude", topics: ["Quantitative aptitude", "Logical reasoning", "Verbal ability"] },
    ],
  },
]

export const GROUP_LABELS: Record<Category["group"], string> = { tech: "Tech", non_tech: "Non-tech" }

export function getCategory(id: string | null | undefined) {
  return CATEGORIES.find((c) => c.id === id) ?? null
}

export function getSubcategory(categoryId: string | null | undefined, subId: string | null | undefined) {
  return getCategory(categoryId)?.subcategories.find((s) => s.id === subId) ?? null
}

export function getProfessor(id: string | null | undefined): Professor {
  return (id && PROFESSORS[id]) || DEFAULT_PROFESSOR
}

export function professorForCategory(categoryId: string | null | undefined): Professor {
  return getProfessor(getCategory(categoryId)?.professorId)
}
