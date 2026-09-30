// Single skill vocabulary for the whole system: the resume parser extracts
// with it AND the matcher scores with it. Two lists previously drifted apart
// (parser knew 80 skills, matcher checked 17) and real overlaps were missed.

export const SKILL_VOCABULARY = [
  "python", "java", "javascript", "typescript", "c++", "c#", "go", "golang", "rust", "kotlin", "swift", "php", "ruby", "sql",
  "react", "next.js", "nextjs", "angular", "vue", "vue.js", "html", "css", "tailwind", "tailwindcss", "bootstrap", "redux",
  "node.js", "nodejs", "node", "express", "express.js", "django", "flask", "fastapi", "spring", "spring boot", ".net",
  "mongodb", "postgresql", "postgres", "mysql", "redis", "elasticsearch", "firebase", "supabase", "prisma",
  "pandas", "numpy", "scikit-learn", "sklearn", "tensorflow", "pytorch", "keras", "excel", "tableau", "power bi",
  "git", "github", "docker", "kubernetes", "aws", "gcp", "azure", "jenkins", "ci/cd", "linux", "figma", "jira", "postman",
  "dsa", "data structures", "algorithms", "oops", "oop", "dbms", "operating systems", "computer networks",
  "roadmap", "prd", "user stories", "a/b testing", "wireframing", "product analytics", "stakeholder",
  "machine learning", "deep learning", "nlp", "computer vision", "rest api", "rest apis", "graphql", "microservices", "api", "apis",
];

export const SKILL_CANONICAL: Record<string, string> = {
  nodejs: "Node", "node.js": "Node", node: "Node",
  nextjs: "Next.js", "next.js": "Next.js",
  "express.js": "Express", postgres: "PostgreSQL", postgresql: "PostgreSQL",
  "power bi": "Power BI", "a/b testing": "A/B testing",
  "spring boot": "Spring Boot", "vue.js": "Vue", dsa: "DSA",
  oops: "OOP", oop: "OOP", dbms: "DBMS",
  "operating systems": "OS", "computer networks": "Networking",
  "data structures": "DSA", "rest apis": "REST APIs", "rest api": "REST APIs",
  api: "REST APIs", apis: "REST APIs",
  prd: "PRD", "user stories": "User Stories", roadmap: "Roadmapping",
  golang: "Go", "scikit-learn": "scikit-learn", sklearn: "scikit-learn",
  tailwindcss: "Tailwind", tailwind: "Tailwind", "ci/cd": "CI/CD",
  sql: "SQL", html: "HTML", css: "CSS", aws: "AWS", gcp: "GCP", azure: "Azure",
  github: "GitHub", javascript: "JavaScript", typescript: "TypeScript",
  mongodb: "MongoDB", mysql: "MySQL", graphql: "GraphQL", linux: "Linux",
  docker: "Docker", kubernetes: "Kubernetes", python: "Python", java: "Java",
  "c++": "C++", "c#": "C#", react: "React", django: "Django", flask: "Flask",
};

function esc(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Normalize a skill phrase to a comparison key: "REST APIs" → "api",
// "Node.js" → "node", "CI/CD" → "cicd".
export function skillKey(s: string): string {
  const k = s.toLowerCase().replace(/[^a-z0-9+#/ ]/g, " ").replace(/\s+/g, " ").trim();
  const alias: Record<string, string> = {
    "node js": "node", nodejs: "node", "next js": "next", nextjs: "next",
    "rest apis": "api", "rest api": "api", apis: "api",
    postgres: "postgresql", "scikit learn": "sklearn",
    "power bi": "powerbi", "ci cd": "cicd", "c plus plus": "c++",
  };
  return alias[k] ?? k.replace(/ /g, "");
}

export function canonicalSkill(skill: string): string {
  const k = skill.toLowerCase();
  if (SKILL_CANONICAL[k]) return SKILL_CANONICAL[k];
  return skill.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Vocabulary terms present in free text (word-boundary aware).
export function skillsInText(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const skill of SKILL_VOCABULARY) {
    if (new RegExp(`(?<![\\w+#./-])${esc(skill.toLowerCase())}(?![\\w+#./-])`, "i").test(lower)) {
      found.add(skillKey(skill));
    }
  }
  return Array.from(found);
}

// Overlap between job text and the candidate's skill list, compared by key
// so "REST APIs" (profile) matches "api"/"APIs" (job text) and vice versa.
export function skillOverlap(jobText: string, candidateSkills: string[]): string[] {
  const jobKeys = new Set(skillsInText(jobText));
  const out: string[] = [];
  for (const c of candidateSkills) {
    const k = skillKey(c);
    if (jobKeys.has(k) && !out.includes(c)) out.push(c);
  }
  // Deterministic order: vocabulary order, not input order.
  const order = new Map(SKILL_VOCABULARY.map((s, i) => [skillKey(s), i] as [string, number]));
  return out.sort((a, b) => (order.get(skillKey(a)) ?? 999) - (order.get(skillKey(b)) ?? 999));
}
