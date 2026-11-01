// Ready-made courses: hand-written syllabi learners can start in one tap (no AI planning call).
// Lessons are still written by the AI professor the first time each one is opened, for that learner.
// Starting one counts as creating a course (same monthly allowance), via app_create_course.

export type CatalogLesson = { title: string; objective: string; est_minutes: number }
export type CatalogModule = { title: string; summary: string; lessons: CatalogLesson[] }
export type CatalogCourse = {
  slug: string
  category: string
  subcategory: string
  title: string
  /** One or two sentences for cards and search results. */
  summary: string
  level: "beginner" | "intermediate" | "advanced"
  estimated_weeks: number
  /** What the learner can do afterwards (3-4 bullets on the course page). */
  outcomes: string[]
  /** Who it's for, one sentence. */
  audience: string
  /** The professor's welcome, first person. */
  welcome: string
  modules: CatalogModule[]
}

const L = (title: string, objective: string, est_minutes = 30): CatalogLesson => ({ title, objective, est_minutes })

export const CATALOG: CatalogCourse[] = [
  {
    slug: "python-fundamentals",
    category: "coding",
    subcategory: "python",
    title: "Python Fundamentals",
    summary: "Learn to program from zero with Python: variables, decisions, loops, functions and files, ending with small programs you build yourself.",
    level: "beginner",
    estimated_weeks: 4,
    audience: "Complete beginners, college students and anyone who wants a first programming language.",
    outcomes: [
      "Write and run Python programs that take input and make decisions",
      "Use lists, dictionaries and loops to work with real data",
      "Organise code into functions and read and write files",
      "Build three small projects, from a quiz game to an expense tracker",
    ],
    welcome:
      "Welcome! Python is the friendliest first language there is, and by the end of this course you'll be writing programs that solve real problems. We'll go one small step at a time, and you'll type and run code in every lesson.",
    modules: [
      {
        title: "Getting started",
        summary: "Set up Python and write your first programs.",
        lessons: [
          L("What programming is and why Python", "Explain what a program is and run your first Python line.", 20),
          L("Variables, numbers and text", "Store values in variables and work with numbers and strings."),
          L("Input, output and string formatting", "Write programs that ask questions and print neat answers with f-strings."),
        ],
      },
      {
        title: "Making decisions and repeating",
        summary: "Control the flow of a program.",
        lessons: [
          L("Booleans and if/elif/else", "Make a program choose between actions using conditions."),
          L("while loops", "Repeat work until a condition changes, and avoid infinite loops."),
          L("for loops and range", "Loop over numbers and sequences to automate repetitive tasks."),
          L("Project: number guessing game", "Combine input, conditions and loops into a complete game.", 40),
        ],
      },
      {
        title: "Working with collections",
        summary: "Lists, tuples, dictionaries and sets.",
        lessons: [
          L("Lists and list operations", "Create, change, slice and sort lists."),
          L("Dictionaries", "Store and look up data by key, and loop over keys and values."),
          L("Tuples, sets and choosing a collection", "Pick the right collection type for a task."),
          L("Project: quiz game with a question bank", "Build a quiz that stores questions in a list of dictionaries.", 40),
        ],
      },
      {
        title: "Functions, files and errors",
        summary: "Write reusable code and work with files.",
        lessons: [
          L("Defining functions", "Write functions with parameters and return values."),
          L("Reading and writing files", "Save program data to a text or CSV file and load it back."),
          L("Handling errors with try/except", "Catch common errors so programs fail gracefully."),
          L("Modules and the standard library", "Import and use modules such as random, math and datetime."),
          L("Project: personal expense tracker", "Build a menu-driven app that saves expenses to a file.", 45),
        ],
      },
    ],
  },
  {
    slug: "web-development-basics",
    category: "coding",
    subcategory: "web-dev",
    title: "HTML, CSS & JavaScript from Scratch",
    summary: "Build and publish your own web pages: structure with HTML, style with CSS and make them interactive with JavaScript.",
    level: "beginner",
    estimated_weeks: 5,
    audience: "Beginners who want to build websites, or students preparing for front-end roles.",
    outcomes: [
      "Structure pages with semantic HTML and accessible forms",
      "Lay out responsive pages with Flexbox and Grid",
      "Add interactivity with JavaScript and the DOM",
      "Publish a personal portfolio site",
    ],
    welcome:
      "Welcome! Every website you use is built from the three tools in this course. We'll build real pages from the first lesson, and by the end you'll have your own portfolio live on the internet.",
    modules: [
      {
        title: "HTML: the structure",
        summary: "Write the content and structure of a page.",
        lessons: [
          L("How the web works", "Describe what happens between typing a URL and seeing a page.", 20),
          L("HTML elements and page structure", "Write a valid HTML page with headings, paragraphs, links and images."),
          L("Lists, tables and semantic tags", "Choose semantic elements like header, nav, main and article."),
          L("Forms and accessibility basics", "Build a labelled form that works with a keyboard and screen reader."),
        ],
      },
      {
        title: "CSS: the style",
        summary: "Make pages look good on every screen.",
        lessons: [
          L("Selectors, colours and typography", "Style text and colours with CSS selectors."),
          L("The box model and spacing", "Control size, padding, borders and margins."),
          L("Flexbox layouts", "Arrange items in rows and columns with Flexbox."),
          L("CSS Grid", "Build two-dimensional page layouts with Grid."),
          L("Responsive design and media queries", "Make a page adapt from phone to desktop."),
        ],
      },
      {
        title: "JavaScript: the behaviour",
        summary: "Program the browser.",
        lessons: [
          L("JavaScript basics: variables, types and functions", "Write and run JavaScript in the browser."),
          L("Arrays, objects and loops", "Store and process lists of data in JavaScript."),
          L("The DOM and events", "Change a page when the user clicks or types."),
          L("Fetching data from an API", "Load data from a public API with fetch and show it on the page.", 40),
        ],
      },
      {
        title: "Putting it together",
        summary: "Ship a real site.",
        lessons: [
          L("Project: a to-do list app", "Build a to-do app that saves items in localStorage.", 45),
          L("Project: your portfolio site", "Design and build a responsive personal portfolio.", 45),
          L("Publishing your site", "Put your site online for free with GitHub Pages or a similar host."),
        ],
      },
    ],
  },
  {
    slug: "dsa-for-placements",
    category: "coding",
    subcategory: "dsa",
    title: "DSA for Placements",
    summary: "The data structures and algorithms asked in campus placements and coding rounds, with the patterns to solve new problems.",
    level: "intermediate",
    estimated_weeks: 8,
    audience: "Students preparing for placements and coding interviews who already know one programming language.",
    outcomes: [
      "Analyse time and space complexity with Big-O",
      "Solve array, string, linked list, stack and queue problems",
      "Use trees, graphs, recursion and dynamic programming patterns",
      "Approach an unseen interview problem step by step",
    ],
    welcome:
      "Welcome! Placement rounds reward patterns, not memorised answers. In this course we'll learn the core data structures and, more importantly, how to recognise which pattern a new problem needs.",
    modules: [
      {
        title: "Foundations",
        summary: "How to measure and approach problems.",
        lessons: [
          L("Big-O: time and space complexity", "Estimate the complexity of loops and nested loops."),
          L("How to approach a coding problem", "Use a repeatable method: understand, examples, brute force, optimise, test."),
          L("Recursion basics", "Write recursive solutions and trace the call stack."),
        ],
      },
      {
        title: "Arrays and strings",
        summary: "The most common interview topics.",
        lessons: [
          L("Two pointers", "Solve pair and partition problems with two pointers."),
          L("Sliding window", "Solve subarray and substring problems in linear time."),
          L("Hashing with maps and sets", "Use hash maps to count, group and look up in O(1)."),
          L("Prefix sums and sorting tricks", "Answer range queries and simplify problems by sorting."),
          L("Binary search and its variations", "Apply binary search to sorted arrays and answer spaces."),
        ],
      },
      {
        title: "Linear data structures",
        summary: "Linked lists, stacks and queues.",
        lessons: [
          L("Linked lists", "Reverse, merge and detect cycles in linked lists."),
          L("Stacks and monotonic stacks", "Solve bracket matching and next-greater-element problems."),
          L("Queues, deques and heaps", "Use queues and priority queues for scheduling and top-k problems."),
        ],
      },
      {
        title: "Trees and graphs",
        summary: "Non-linear structures and traversals.",
        lessons: [
          L("Binary trees and traversals", "Traverse trees in pre-, in-, post- and level order."),
          L("Binary search trees", "Insert, search and validate a BST."),
          L("Graphs: BFS and DFS", "Represent graphs and explore them with BFS and DFS."),
          L("Shortest paths and topological sort", "Apply Dijkstra's algorithm and topological ordering."),
        ],
      },
      {
        title: "Dynamic programming and greedy",
        summary: "Optimisation patterns.",
        lessons: [
          L("From recursion to memoisation", "Turn an exponential recursive solution into DP."),
          L("Classic 1D and 2D DP problems", "Solve knapsack, LCS and grid path problems."),
          L("Greedy algorithms", "Recognise when a greedy choice is safe and prove it informally."),
          L("Mock interview round", "Solve two timed problems and explain your approach aloud.", 45),
        ],
      },
    ],
  },
  {
    slug: "git-and-github",
    category: "coding",
    subcategory: "devops",
    title: "Git & GitHub Workflow",
    summary: "Track your code, work in branches and collaborate on GitHub the way professional teams do.",
    level: "beginner",
    estimated_weeks: 2,
    audience: "Anyone who writes code and wants to stop losing work or start collaborating.",
    outcomes: [
      "Track changes with commits and read the history",
      "Work safely in branches and resolve merge conflicts",
      "Collaborate through pull requests and code review on GitHub",
    ],
    welcome:
      "Welcome! Git feels confusing until you see the simple model underneath. Once you have it, you'll never lose work again, and you'll be ready to collaborate with any team.",
    modules: [
      {
        title: "Git on your computer",
        summary: "The core model and everyday commands.",
        lessons: [
          L("Why version control", "Explain what Git does and set it up.", 20),
          L("Commits, staging and history", "Make commits and read the log and diffs."),
          L("Undoing things safely", "Restore files, amend commits and revert changes without losing work."),
        ],
      },
      {
        title: "Branches",
        summary: "Work on several things at once.",
        lessons: [
          L("Branching and switching", "Create branches for features and switch between them."),
          L("Merging and merge conflicts", "Merge branches and resolve a conflict by hand."),
          L("Rebasing basics", "Use rebase to keep a clean history, and know when not to."),
        ],
      },
      {
        title: "GitHub and teamwork",
        summary: "Remotes, pull requests and reviews.",
        lessons: [
          L("Remotes: push, pull and clone", "Connect a local repository to GitHub."),
          L("Pull requests and code review", "Open a pull request and respond to review comments."),
          L("Forks and open-source contributions", "Contribute to a project you don't own."),
          L("Project: a team workflow end to end", "Run a feature branch through review to merge.", 40),
        ],
      },
    ],
  },
  {
    slug: "sql-from-zero",
    category: "it-cloud",
    subcategory: "databases",
    title: "SQL from Zero",
    summary: "Query, combine and summarise data with SQL, the language behind almost every app and analytics team.",
    level: "beginner",
    estimated_weeks: 4,
    audience: "Beginners, analysts and developers who need to work with databases.",
    outcomes: [
      "Write SELECT queries with filters, sorting and aggregates",
      "Combine tables with joins and subqueries",
      "Design simple tables with keys and constraints",
      "Answer real business questions from a sample database",
    ],
    welcome:
      "Welcome! SQL is one of the most useful skills you can learn: a few lines can answer questions that would take hours in a spreadsheet. We'll practise on one realistic shop database throughout the course.",
    modules: [
      {
        title: "Querying one table",
        summary: "SELECT, WHERE and ORDER BY.",
        lessons: [
          L("Databases, tables and rows", "Explain how relational databases store data.", 20),
          L("SELECT and WHERE", "Retrieve and filter rows from a table."),
          L("Sorting, limits and text matching", "Sort results and search text with LIKE."),
          L("NULL values and conditional logic", "Handle missing values and use CASE expressions."),
        ],
      },
      {
        title: "Summarising data",
        summary: "Aggregates and grouping.",
        lessons: [
          L("COUNT, SUM, AVG, MIN and MAX", "Summarise a table with aggregate functions."),
          L("GROUP BY and HAVING", "Calculate totals per group and filter groups."),
          L("Dates and times", "Group and filter by day, month and year."),
        ],
      },
      {
        title: "Combining tables",
        summary: "Joins and subqueries.",
        lessons: [
          L("Inner joins", "Combine related rows from two tables."),
          L("Left joins and finding missing data", "Keep unmatched rows and find customers with no orders."),
          L("Subqueries and CTEs", "Break a complex question into steps with WITH."),
          L("Window functions", "Rank rows and compute running totals."),
        ],
      },
      {
        title: "Designing and changing data",
        summary: "Tables, keys and safe updates.",
        lessons: [
          L("Creating tables, keys and constraints", "Design tables with primary and foreign keys."),
          L("INSERT, UPDATE and DELETE safely", "Change data without accidentally changing everything."),
          L("Indexes and query speed", "Explain how indexes make queries faster."),
          L("Project: answer 10 business questions", "Use everything so far to analyse the shop database.", 45),
        ],
      },
    ],
  },
  {
    slug: "cybersecurity-fundamentals",
    category: "it-cloud",
    subcategory: "security",
    title: "Cybersecurity Fundamentals",
    summary: "How attacks work and how to defend against them: networks, passwords, phishing, web security and safe habits.",
    level: "beginner",
    estimated_weeks: 4,
    audience: "Students and professionals starting in IT or security, and anyone who wants to stay safe online.",
    outcomes: [
      "Explain the CIA triad, common threats and how attacks unfold",
      "Protect accounts with strong authentication and spot phishing",
      "Understand network and web security basics, including the OWASP Top 10",
      "Respond sensibly to a security incident",
    ],
    welcome:
      "Welcome! Security is about thinking like a defender. We'll learn how common attacks work so you can recognise and stop them, always on systems you own or have permission to test.",
    modules: [
      {
        title: "Security basics",
        summary: "The language of security.",
        lessons: [
          L("The CIA triad and risk", "Explain confidentiality, integrity, availability and risk."),
          L("Threats, vulnerabilities and attackers", "Classify common threats and attacker motives."),
          L("Laws, ethics and responsible disclosure", "Know what is legal to test and how to report issues."),
        ],
      },
      {
        title: "Protecting people and accounts",
        summary: "The most common attacks target people.",
        lessons: [
          L("Passwords, password managers and 2FA", "Set up strong authentication for important accounts."),
          L("Phishing and social engineering", "Recognise phishing emails, messages and calls."),
          L("Malware and ransomware", "Explain how malware spreads and how backups defend against ransomware."),
        ],
      },
      {
        title: "Networks and encryption",
        summary: "How data is protected in transit.",
        lessons: [
          L("Network basics for security", "Describe ports, protocols and firewalls."),
          L("Encryption, hashing and HTTPS", "Explain how HTTPS keeps browsing private."),
          L("Wi-Fi and VPN security", "Use public Wi-Fi more safely and know what a VPN does and doesn't do."),
        ],
      },
      {
        title: "Web security and response",
        summary: "Applications and incidents.",
        lessons: [
          L("The OWASP Top 10", "Describe the most common web application risks."),
          L("Injection and cross-site scripting", "Explain SQL injection and XSS and how developers prevent them."),
          L("Incident response basics", "Follow the steps to contain and recover from an incident."),
          L("Careers and certifications in security", "Map out a path into a security role.", 20),
        ],
      },
    ],
  },
  {
    slug: "data-analysis-excel-sql",
    category: "ai-data",
    subcategory: "data-analysis",
    title: "Data Analysis with Excel and SQL",
    summary: "Clean, analyse and present data the way analysts do every day, using Excel and SQL on realistic business data.",
    level: "beginner",
    estimated_weeks: 5,
    audience: "Aspiring data analysts and professionals who work with spreadsheets.",
    outcomes: [
      "Clean messy data and build pivot tables",
      "Use lookups and formulas to combine data",
      "Answer analysis questions with SQL",
      "Present findings in clear charts and a short report",
    ],
    welcome:
      "Welcome! Analysts turn messy data into decisions. We'll follow one sales dataset from raw export to a clear report, learning Excel and SQL techniques as we need them.",
    modules: [
      {
        title: "Thinking like an analyst",
        summary: "Questions before tools.",
        lessons: [
          L("What data analysts do", "Describe the analysis process from question to decision.", 20),
          L("Types of data and good questions", "Turn a vague request into measurable questions."),
        ],
      },
      {
        title: "Excel for analysis",
        summary: "Formulas, cleaning and pivots.",
        lessons: [
          L("Cleaning data in Excel", "Fix duplicates, blanks, text case and inconsistent dates."),
          L("Essential formulas", "Use IF, SUMIFS, COUNTIFS and text functions."),
          L("Lookups: XLOOKUP and VLOOKUP", "Combine data from two sheets with lookups."),
          L("Pivot tables", "Summarise thousands of rows in seconds with a pivot table."),
        ],
      },
      {
        title: "SQL for analysis",
        summary: "Query data at scale.",
        lessons: [
          L("SQL queries for analysts", "Filter, group and sort data with SQL."),
          L("Joins for analysis", "Combine orders, customers and products tables."),
          L("Cohorts and trends with SQL", "Calculate month-over-month growth and retention."),
        ],
      },
      {
        title: "Presenting insights",
        summary: "Charts and storytelling.",
        lessons: [
          L("Choosing the right chart", "Match the chart type to the question."),
          L("Building a simple dashboard", "Combine key numbers and charts on one page."),
          L("Project: sales analysis report", "Analyse the sales dataset and write a one-page report.", 50),
        ],
      },
    ],
  },
  {
    slug: "machine-learning-fundamentals",
    category: "ai-data",
    subcategory: "ml",
    title: "Machine Learning Fundamentals",
    summary: "Understand and build machine learning models with Python and scikit-learn, from linear regression to model evaluation.",
    level: "intermediate",
    estimated_weeks: 6,
    audience: "Learners comfortable with basic Python who want to understand how ML really works.",
    outcomes: [
      "Explain supervised and unsupervised learning with examples",
      "Train regression, classification and clustering models in scikit-learn",
      "Evaluate models properly and avoid overfitting and data leakage",
      "Complete an end-to-end ML project",
    ],
    welcome:
      "Welcome! Machine learning is less magic than it looks: it's finding patterns in data and checking honestly whether they hold. We'll build intuition first, then code every idea in Python.",
    modules: [
      {
        title: "The big picture",
        summary: "What ML is and how projects work.",
        lessons: [
          L("What machine learning is", "Distinguish ML from rule-based programming with examples.", 25),
          L("The ML workflow", "List the steps from data collection to deployment."),
          L("Working with data in pandas", "Load, explore and clean a dataset with pandas."),
        ],
      },
      {
        title: "Supervised learning",
        summary: "Learning from labelled examples.",
        lessons: [
          L("Linear regression", "Train a model to predict a number and interpret its coefficients."),
          L("Logistic regression and classification", "Predict categories and read probabilities."),
          L("Decision trees and random forests", "Train tree-based models and explain their decisions."),
          L("Feature engineering", "Encode categories, scale features and create useful new ones."),
        ],
      },
      {
        title: "Evaluating models",
        summary: "Measure honestly.",
        lessons: [
          L("Train/test split and cross-validation", "Estimate how a model will perform on new data."),
          L("Metrics: accuracy, precision, recall and RMSE", "Choose the right metric for the problem."),
          L("Overfitting, regularisation and tuning", "Detect overfitting and tune hyperparameters."),
        ],
      },
      {
        title: "Beyond the basics",
        summary: "Unsupervised learning and responsible ML.",
        lessons: [
          L("Clustering with k-means", "Group similar data points without labels."),
          L("Bias, fairness and data leakage", "Spot common ways ML projects go wrong."),
          L("Project: predict house prices end to end", "Build, evaluate and explain a complete model.", 50),
        ],
      },
    ],
  },
  {
    slug: "generative-ai-and-prompting",
    category: "ai-data",
    subcategory: "genai",
    title: "How LLMs Work & Prompt Engineering",
    summary: "Understand what large language models are, why they make mistakes, and how to write prompts that get reliable results.",
    level: "beginner",
    estimated_weeks: 3,
    audience: "Students and professionals who use AI tools and want better, safer results.",
    outcomes: [
      "Explain tokens, training and why LLMs hallucinate",
      "Write clear prompts with context, examples and structure",
      "Use AI for study, writing and coding while checking its work",
      "Understand the basics of building an app on an LLM API",
    ],
    welcome:
      "Welcome! AI assistants are powerful but easy to misuse. We'll look under the hood just enough to understand their strengths and limits, then practise prompting techniques you can use every day.",
    modules: [
      {
        title: "How LLMs work",
        summary: "Just enough theory.",
        lessons: [
          L("What a language model is", "Explain next-token prediction in plain words.", 25),
          L("Tokens, context windows and temperature", "Describe how input length and settings affect answers."),
          L("Training, fine-tuning and hallucinations", "Explain why models make confident mistakes."),
        ],
      },
      {
        title: "Prompting techniques",
        summary: "Get better answers.",
        lessons: [
          L("Clear instructions and context", "Rewrite a vague prompt into a precise one."),
          L("Examples and output formats", "Use examples and formats like tables or JSON."),
          L("Step-by-step reasoning and self-checks", "Ask for reasoning and verification on hard tasks."),
          L("Prompting for code", "Get useful code from AI and review it properly."),
        ],
      },
      {
        title: "Using AI responsibly",
        summary: "Accuracy, privacy and building.",
        lessons: [
          L("Checking facts and sources", "Verify AI answers before relying on them."),
          L("Privacy, safety and academic honesty", "Decide what not to share with AI tools and how to use them honestly."),
          L("Building with an LLM API", "Describe how an app sends prompts to a model and handles replies."),
          L("Project: your personal prompt library", "Create reusable prompts for your study or work tasks.", 40),
        ],
      },
    ],
  },
  {
    slug: "algebra-foundations",
    category: "math",
    subcategory: "algebra",
    title: "Algebra Foundations",
    summary: "Build confidence with expressions, equations, inequalities and graphs: the base for all higher maths.",
    level: "beginner",
    estimated_weeks: 5,
    audience: "School and college students, and adults refreshing their maths.",
    outcomes: [
      "Simplify expressions and solve linear equations",
      "Solve inequalities and simultaneous equations",
      "Work with exponents, polynomials and factorisation",
      "Solve quadratic equations and read graphs",
    ],
    welcome:
      "Welcome! Algebra is just arithmetic with a few unknowns. We'll take each idea slowly, work every example in full and practise until it feels natural.",
    modules: [
      {
        title: "Expressions",
        summary: "The language of algebra.",
        lessons: [
          L("Variables and expressions", "Translate word statements into algebraic expressions."),
          L("Simplifying and expanding", "Collect like terms and expand brackets."),
          L("Exponents and their rules", "Apply the laws of exponents, including negative and zero powers."),
        ],
      },
      {
        title: "Equations and inequalities",
        summary: "Finding the unknown.",
        lessons: [
          L("Solving linear equations", "Solve one-variable equations step by step and check the answer."),
          L("Word problems", "Set up and solve equations from real situations."),
          L("Linear inequalities", "Solve inequalities and show solutions on a number line."),
          L("Simultaneous equations", "Solve two equations by substitution and elimination."),
        ],
      },
      {
        title: "Polynomials",
        summary: "Factorising and quadratics.",
        lessons: [
          L("Polynomials and their operations", "Add, subtract and multiply polynomials."),
          L("Factorisation", "Factorise using common factors, identities and grouping."),
          L("Quadratic equations", "Solve quadratics by factorising and by the formula."),
        ],
      },
      {
        title: "Functions and graphs",
        summary: "Seeing algebra.",
        lessons: [
          L("Coordinates and straight-line graphs", "Plot lines and find slope and intercept."),
          L("Functions", "Use function notation and find domain and range."),
          L("Graphs of quadratics", "Sketch parabolas and find their vertex and roots."),
        ],
      },
    ],
  },
  {
    slug: "mechanics-first-principles",
    category: "science",
    subcategory: "physics",
    title: "Mechanics from First Principles",
    summary: "Motion, forces, energy and momentum explained from everyday observations, with worked problems at each step.",
    level: "beginner",
    estimated_weeks: 5,
    audience: "Class 11–12 and first-year students, and curious learners.",
    outcomes: [
      "Describe motion with graphs and the equations of motion",
      "Apply Newton's laws to solve force problems",
      "Use work, energy and power to analyse systems",
      "Apply conservation of momentum to collisions",
    ],
    welcome:
      "Welcome! Mechanics explains why a ball flies, why a car brakes and why satellites stay up. We'll start from what you can see and build each law with clear reasoning and worked problems.",
    modules: [
      {
        title: "Describing motion",
        summary: "Kinematics.",
        lessons: [
          L("Units, vectors and scalars", "Use SI units and tell vectors from scalars."),
          L("Displacement, velocity and acceleration", "Calculate these quantities and read motion graphs."),
          L("Equations of motion", "Solve uniform-acceleration problems with the SUVAT equations."),
          L("Projectile motion", "Analyse horizontal and vertical motion separately."),
        ],
      },
      {
        title: "Forces",
        summary: "Newton's laws.",
        lessons: [
          L("Newton's first and second laws", "Draw free-body diagrams and apply F = ma."),
          L("Newton's third law and friction", "Identify action-reaction pairs and friction forces."),
          L("Circular motion", "Explain centripetal force and solve circular motion problems."),
        ],
      },
      {
        title: "Energy",
        summary: "Work, energy and power.",
        lessons: [
          L("Work and kinetic energy", "Use the work-energy theorem."),
          L("Potential energy and conservation of energy", "Solve problems with energy conservation."),
          L("Power and efficiency", "Calculate power and efficiency of machines."),
        ],
      },
      {
        title: "Momentum and gravity",
        summary: "Collisions and orbits.",
        lessons: [
          L("Momentum and impulse", "Relate force, time and change in momentum."),
          L("Collisions", "Apply conservation of momentum to elastic and inelastic collisions."),
          L("Gravitation and orbits", "Use Newton's law of gravitation to explain orbits."),
        ],
      },
    ],
  },
  {
    slug: "personal-finance-basics",
    category: "business",
    subcategory: "personal-finance",
    title: "Personal Finance: Budgeting, Saving and Investing",
    summary: "Take control of your money in India: budgets, emergency funds, insurance, mutual funds, stocks and taxes, explained simply.",
    level: "beginner",
    estimated_weeks: 3,
    audience: "Students and young professionals managing their own money for the first time.",
    outcomes: [
      "Build a monthly budget and an emergency fund",
      "Understand insurance, debt and credit scores",
      "Compare FDs, mutual funds, index funds and stocks",
      "Know the basics of income tax for salaried people",
    ],
    welcome:
      "Welcome! Nobody teaches us money at school, so let's fix that. We'll cover the principles that work for most people, with ₹ examples. I'll teach the ideas; for decisions about your own situation, speak to a qualified adviser.",
    modules: [
      {
        title: "Managing money",
        summary: "Budgets and savings.",
        lessons: [
          L("Your money picture", "List income, expenses, assets and liabilities.", 25),
          L("Budgeting that works", "Create a monthly budget with the 50/30/20 idea."),
          L("Emergency fund and goals", "Plan an emergency fund and short- and long-term goals."),
        ],
      },
      {
        title: "Protecting yourself",
        summary: "Debt, credit and insurance.",
        lessons: [
          L("Loans, credit cards and interest", "Calculate the real cost of debt and EMIs."),
          L("Credit scores", "Explain what affects a CIBIL score and how to improve it."),
          L("Health and term insurance", "Explain why insurance comes before investing."),
        ],
      },
      {
        title: "Investing basics",
        summary: "Grow your money.",
        lessons: [
          L("Compounding, inflation and risk", "Show how compounding and inflation affect savings."),
          L("FDs, PPF and debt options", "Compare common low-risk options."),
          L("Mutual funds and SIPs", "Explain how mutual funds and SIPs work and what expense ratios mean."),
          L("Index funds and stocks", "Describe how the stock market works and why diversification matters."),
        ],
      },
      {
        title: "Taxes and planning",
        summary: "Keep more of what you earn.",
        lessons: [
          L("Income tax basics for salaried people", "Read a payslip and compare the old and new regimes."),
          L("Avoiding scams", "Spot common investment and loan scams."),
          L("Project: your one-page money plan", "Write a personal budget, savings and investing plan.", 40),
        ],
      },
    ],
  },
  {
    slug: "ui-ux-fundamentals",
    category: "design",
    subcategory: "ui-ux",
    title: "UI/UX Fundamentals",
    summary: "Design apps and websites people find easy and pleasant to use, from user research to wireframes, visual design and testing.",
    level: "beginner",
    estimated_weeks: 4,
    audience: "Aspiring designers, developers and product people.",
    outcomes: [
      "Understand users through simple research",
      "Turn ideas into user flows and wireframes",
      "Apply layout, typography and colour principles",
      "Test designs with users and improve them",
    ],
    welcome:
      "Welcome! Good design isn't decoration; it's making things easy to use. We'll learn the process designers follow and practise it on one small app from idea to tested design.",
    modules: [
      {
        title: "Understanding users",
        summary: "UX starts with people.",
        lessons: [
          L("What UI and UX mean", "Tell UI from UX with real examples.", 20),
          L("User research basics", "Plan and run a short user interview."),
          L("Personas and problem statements", "Turn research into a clear problem to solve."),
        ],
      },
      {
        title: "Structure and flows",
        summary: "From idea to wireframe.",
        lessons: [
          L("User flows and information architecture", "Map the steps users take to reach a goal."),
          L("Wireframing", "Sketch low-fidelity screens for a flow."),
          L("Usability heuristics", "Review a design against Nielsen's heuristics."),
        ],
      },
      {
        title: "Visual design",
        summary: "Make it clear and attractive.",
        lessons: [
          L("Layout, spacing and hierarchy", "Use grids and spacing to guide attention."),
          L("Typography", "Pick and pair fonts and set readable text."),
          L("Colour and accessibility", "Choose colours with enough contrast for everyone."),
          L("Components and design systems", "Reuse buttons, inputs and cards consistently."),
        ],
      },
      {
        title: "Prototype and test",
        summary: "Learn from real users.",
        lessons: [
          L("Prototyping in Figma", "Link screens into a clickable prototype."),
          L("Usability testing", "Run a test and turn findings into improvements."),
          L("Project: design a small app", "Take one app idea from research to tested prototype.", 50),
        ],
      },
    ],
  },
  {
    slug: "spoken-english-professionals",
    category: "languages",
    subcategory: "english",
    title: "Spoken English for Professionals",
    summary: "Speak clearly and confidently at work: introductions, meetings, phone calls, presentations and small talk.",
    level: "beginner",
    estimated_weeks: 4,
    audience: "Students and professionals who want to speak English more fluently at work.",
    outcomes: [
      "Introduce yourself and make small talk naturally",
      "Take part in meetings and calls with useful phrases",
      "Avoid common grammar and pronunciation mistakes",
      "Give a short, clear presentation",
    ],
    welcome:
      "Welcome! Fluency comes from practice, not perfection. Each lesson gives you phrases you can use the same day, explains the common mistakes kindly, and ends with something to say out loud.",
    modules: [
      {
        title: "Everyday professional English",
        summary: "First impressions.",
        lessons: [
          L("Introducing yourself", "Introduce yourself and your work in 30 seconds.", 25),
          L("Small talk that feels natural", "Start and keep up short workplace conversations.", 25),
          L("Common grammar mistakes in speech", "Fix the mistakes Indian speakers make most often."),
        ],
      },
      {
        title: "Meetings and calls",
        summary: "Speak up with confidence.",
        lessons: [
          L("Phone and video calls", "Open, manage and close a call politely."),
          L("Giving opinions and disagreeing politely", "Share views and disagree without sounding rude."),
          L("Asking questions and clarifying", "Ask for repetition and clarification with confidence."),
        ],
      },
      {
        title: "Clear and confident speech",
        summary: "Sound natural.",
        lessons: [
          L("Pronunciation and word stress", "Pronounce commonly mispronounced words clearly."),
          L("Speaking at the right pace", "Use pauses and pace to sound confident."),
          L("Building vocabulary for work", "Learn and use 30 high-value workplace words."),
        ],
      },
      {
        title: "Presenting",
        summary: "Talk to a group.",
        lessons: [
          L("Structuring a short presentation", "Organise a 3-minute talk with a clear opening and close."),
          L("Handling questions", "Answer questions, including ones you can't answer yet."),
          L("Project: your 3-minute talk", "Prepare and rehearse a short talk about your work or studies.", 40),
        ],
      },
    ],
  },
  {
    slug: "quantitative-aptitude",
    category: "exam-prep",
    subcategory: "aptitude",
    title: "Quantitative Aptitude for Placements",
    summary: "The maths topics in placement and competitive exam aptitude tests, with fast methods and exam-style practice.",
    level: "beginner",
    estimated_weeks: 5,
    audience: "Students preparing for campus placements, bank exams and other aptitude tests.",
    outcomes: [
      "Solve percentages, ratios, profit and loss problems quickly",
      "Handle time and work, speed and distance questions",
      "Answer permutation, combination and probability questions",
      "Interpret data tables and charts under time pressure",
    ],
    welcome:
      "Welcome! Aptitude tests reward speed and accuracy. For each topic I'll teach a reliable method first, then shortcuts that are safe to use, and we'll practise with exam-style questions.",
    modules: [
      {
        title: "Number skills",
        summary: "The base for everything else.",
        lessons: [
          L("Number system and divisibility", "Use divisibility rules, HCF and LCM."),
          L("Fast calculation techniques", "Multiply, square and estimate quickly."),
          L("Percentages", "Solve percentage change and successive percentage problems."),
        ],
      },
      {
        title: "Commercial maths",
        summary: "Money and ratios.",
        lessons: [
          L("Ratio, proportion and mixtures", "Solve ratio and alligation problems."),
          L("Profit, loss and discount", "Calculate profit, loss and discounts correctly."),
          L("Simple and compound interest", "Compare simple and compound interest quickly."),
          L("Averages", "Solve average and weighted average problems."),
        ],
      },
      {
        title: "Time, work and motion",
        summary: "Classic word problems.",
        lessons: [
          L("Time and work", "Solve work and pipes-and-cisterns problems."),
          L("Speed, time and distance", "Solve relative speed, train and boat problems."),
        ],
      },
      {
        title: "Counting, probability and data",
        summary: "Advanced topics.",
        lessons: [
          L("Permutations and combinations", "Count arrangements and selections."),
          L("Probability", "Solve probability questions with dice, cards and coins."),
          L("Data interpretation", "Read tables, bar charts and pie charts quickly."),
          L("Full mock test and strategy", "Attempt a timed mock and plan which questions to skip.", 50),
        ],
      },
    ],
  },
]

export function getCatalogCourse(slug: string) {
  return CATALOG.find((c) => c.slug === slug) ?? null
}

export const lessonCount = (c: CatalogCourse) => c.modules.reduce((n, m) => n + m.lessons.length, 0)
export const totalMinutes = (c: CatalogCourse) => c.modules.reduce((n, m) => n + m.lessons.reduce((s, l) => s + l.est_minutes, 0), 0)
