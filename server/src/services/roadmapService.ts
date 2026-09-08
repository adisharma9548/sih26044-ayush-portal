export interface RoadmapModule {
  title: string;
  topics: string[];
  moduleUrl: string;
}

export interface RoadmapGuidance {
  skill: string;
  roadmapTitle: string;
  roadmapSlug: string;
  roadmapUrl: string;
  description: string;
  difficulty: string;
  estimatedHours: string;
  credit: string;
  creditUrl: string;
  modules: RoadmapModule[];
}

export interface RoadmapEntry {
  slug: string;
  title: string;
  url: string;
  keywords: string[];
  description: string;
  difficulty: string;
  estimatedHours: string;
  modules: RoadmapModule[];
}

const ROADMAP_REGISTRY: RoadmapEntry[] = [
  {
    slug: 'data-structures-and-algorithms',
    title: 'Data Structures & Algorithms Roadmap',
    url: 'https://roadmap.sh/datastructures-and-algorithms',
    keywords: [
      'data structures',
      'algorithms',
      'dsa',
      'binary search',
      'trees',
      'graphs',
      'dynamic programming',
      'sorting',
      'complexity',
      'big-o',
      'recursion',
      'computational logic',
    ],
    description: 'Step by step guide to mastering foundational data structures, algorithmic complexity, tree/graph traversal, and asymptotic optimization.',
    difficulty: 'Beginner to Advanced',
    estimatedHours: '40-60 Hours',
    modules: [
      {
        title: 'Asymptotic Analysis & Big-O Notation',
        topics: ['Time and Space Complexity', 'Best/Average/Worst Case', 'Amortized Analysis'],
        moduleUrl: 'https://roadmap.sh/datastructures-and-algorithms',
      },
      {
        title: 'Core Linear Data Structures',
        topics: ['Arrays & Dynamic Sizing', 'Singly & Doubly Linked Lists', 'Stacks, Queues & Deques'],
        moduleUrl: 'https://roadmap.sh/datastructures-and-algorithms',
      },
      {
        title: 'Hierarchical & Graph Structures',
        topics: ['Binary Search Trees (AVL, Red-Black)', 'Heaps & Priority Queues', 'BFS & DFS Graph Traversals', 'Shortest Path (Dijkstra)'],
        moduleUrl: 'https://roadmap.sh/datastructures-and-algorithms',
      },
      {
        title: 'Advanced Algorithmic Paradigms',
        topics: ['Divide and Conquer', 'Greedy Algorithms', 'Dynamic Programming Memoization & Tabulation'],
        moduleUrl: 'https://roadmap.sh/datastructures-and-algorithms',
      },
    ],
  },
  {
    slug: 'backend',
    title: 'Backend Developer Roadmap',
    url: 'https://roadmap.sh/backend',
    keywords: [
      'backend',
      'server',
      'api',
      'rest',
      'restful',
      'http',
      'web architecture',
      'microservices',
      'authentication',
      'jwt',
      'oauth',
      'caching',
      'express',
      'node',
    ],
    description: 'Comprehensive roadmap for backend architecture, REST/GraphQL APIs, relational and non-relational database design, authentication, and caching.',
    difficulty: 'Intermediate',
    estimatedHours: '50-70 Hours',
    modules: [
      {
        title: 'Internet & Web Protocols',
        topics: ['How the Internet Works', 'HTTP/HTTPS Methods & Status Codes', 'DNS, SSL/TLS, & CORS Headers'],
        moduleUrl: 'https://roadmap.sh/backend',
      },
      {
        title: 'API Design & Architectural Patterns',
        topics: ['RESTful API Conventions', 'JSON Request/Response Validation', 'Microservices vs Monolithic Architecture', 'Rate Limiting & Throttling'],
        moduleUrl: 'https://roadmap.sh/backend',
      },
      {
        title: 'Relational & NoSQL Databases',
        topics: ['ACID Transactions & Normalization', 'PostgreSQL & MongoDB Schemas', 'Indexes & Query Optimization', 'ORMs & ODMs (Mongoose, Prisma)'],
        moduleUrl: 'https://roadmap.sh/backend',
      },
      {
        title: 'Authentication & Security Best Practices',
        topics: ['JWT Token Issuance & Refresh Rotation', 'Bcrypt Password Hashing', 'OWASP Top 10 API Security Mitigation'],
        moduleUrl: 'https://roadmap.sh/backend',
      },
    ],
  },
  {
    slug: 'devops',
    title: 'DevOps & Cloud Engineer Roadmap',
    url: 'https://roadmap.sh/devops',
    keywords: [
      'devops',
      'cloud',
      'docker',
      'container',
      'kubernetes',
      'ci/cd',
      'pipeline',
      'aws',
      'gcp',
      'infrastructure',
      'automation',
      'scalable',
      'linux',
    ],
    description: 'Definitive guide to containerization, automated CI/CD deployment pipelines, cloud hosting, infrastructure as code, and site reliability engineering.',
    difficulty: 'Intermediate to Advanced',
    estimatedHours: '60-80 Hours',
    modules: [
      {
        title: 'Linux Fundamentals & Bash Scripting',
        topics: ['Process Management & Systemd', 'File Permissions & Shell Scripting', 'Network Troubleshooting (cURL, netstat)'],
        moduleUrl: 'https://roadmap.sh/devops',
      },
      {
        title: 'Containerization with Docker',
        topics: ['Docker Engine & Multi-stage Builds', 'Container Networking & Volume Mounting', 'Docker Compose Orchestration'],
        moduleUrl: 'https://roadmap.sh/devops',
      },
      {
        title: 'CI/CD Pipelines & Automation',
        topics: ['GitHub Actions Workflows', 'Automated Testing Gates', 'Artifact Versioning & Image Registries'],
        moduleUrl: 'https://roadmap.sh/devops',
      },
      {
        title: 'Cloud Orchestration & Monitoring',
        topics: ['Kubernetes Pods, Deployments & Services', 'Cloud Providers (AWS/GCP/Azure)', 'Logging & Telemetry (Prometheus, Grafana)'],
        moduleUrl: 'https://roadmap.sh/devops',
      },
    ],
  },
  {
    slug: 'ai-data-scientist',
    title: 'AI & Data Scientist Roadmap',
    url: 'https://roadmap.sh/ai-data-scientist',
    keywords: [
      'machine learning',
      'deep learning',
      'ai',
      'data science',
      'neural networks',
      'pytorch',
      'tensorflow',
      'statistics',
      'gradient',
      'regression',
      'nlp',
      'computer vision',
    ],
    description: 'Curriculum covering mathematics, Python data stack, supervised/unsupervised machine learning, deep neural architectures, and model deployment.',
    difficulty: 'Intermediate to Advanced',
    estimatedHours: '60-90 Hours',
    modules: [
      {
        title: 'Applied Mathematics & Statistics',
        topics: ['Linear Algebra & Matrix Operations', 'Multivariate Calculus & Gradients', 'Probability Distributions & Hypothesis Testing'],
        moduleUrl: 'https://roadmap.sh/ai-data-scientist',
      },
      {
        title: 'Data Wrangling & Exploratory Analysis',
        topics: ['NumPy Vectorization & Pandas DataFrames', 'Feature Engineering & Outlier Detection', 'Data Visualization (Matplotlib, Seaborn)'],
        moduleUrl: 'https://roadmap.sh/ai-data-scientist',
      },
      {
        title: 'Classical Machine Learning',
        topics: ['Supervised Models (Linear/Logistic, SVM, Random Forest)', 'Unsupervised Clustering (K-Means, PCA)', 'Cross-Validation & Hyperparameter Tuning'],
        moduleUrl: 'https://roadmap.sh/ai-data-scientist',
      },
      {
        title: 'Deep Learning & Neural Networks',
        topics: ['Backpropagation & Vanishing Gradient Mitigation', 'PyTorch / TensorFlow Model Training', 'Transfer Learning & LLM Fine-Tuning'],
        moduleUrl: 'https://roadmap.sh/ai-data-scientist',
      },
    ],
  },
  {
    slug: 'cyber-security',
    title: 'Cyber Security Roadmap',
    url: 'https://roadmap.sh/cyber-security',
    keywords: [
      'cybersecurity',
      'security',
      'threat',
      'vulnerability',
      'owasp',
      'sql injection',
      'xss',
      'penetration testing',
      'encryption',
      'cryptography',
      'defense',
    ],
    description: 'Roadmap for application security, network protection, OWASP Top 10 mitigation, vulnerability auditing, and zero-trust architectures.',
    difficulty: 'Intermediate to Advanced',
    estimatedHours: '50-70 Hours',
    modules: [
      {
        title: 'Network Security & Protocols',
        topics: ['TCP/IP Stack, Firewalls & VPNs', 'DNS Security & TLS Handshakes', 'Port Scanning & Packet Inspection (Wireshark)'],
        moduleUrl: 'https://roadmap.sh/cyber-security',
      },
      {
        title: 'Application Security (OWASP Top 10)',
        topics: ['SQL Injection & Parameterized Statements', 'Cross-Site Scripting (XSS) & CSRF Defense', 'Broken Object Level Authorization (BOLA)'],
        moduleUrl: 'https://roadmap.sh/cyber-security',
      },
      {
        title: 'Cryptography & Identity Governance',
        topics: ['Symmetric & Asymmetric Encryption (AES, RSA)', 'HMAC Signatures & Salted Hashing', 'Role-Based Access Control (RBAC) & OAuth2'],
        moduleUrl: 'https://roadmap.sh/cyber-security',
      },
      {
        title: 'Vulnerability Management & Defense',
        topics: ['Static & Dynamic Code Analysis (SAST/DAST)', 'Penetration Testing Methodology', 'Incident Response & Audit Logging'],
        moduleUrl: 'https://roadmap.sh/cyber-security',
      },
    ],
  },
  {
    slug: 'computer-science',
    title: 'Computer Science Core Roadmap',
    url: 'https://roadmap.sh/computer-science',
    keywords: [
      'computer science',
      'cs',
      'operating systems',
      'memory',
      'concurrency',
      'threads',
      'networking',
      'assembly',
      'hardware',
      'embedded',
      'iot',
      'microcontroller',
    ],
    description: 'Comprehensive computer science syllabus covering operating systems, processes, memory management, low-level architecture, and distributed networks.',
    difficulty: 'Intermediate',
    estimatedHours: '45-65 Hours',
    modules: [
      {
        title: 'Computer Architecture & Digital Logic',
        topics: ['CPU Execution Cycles & Registers', 'Cache Hierarchies (L1/L2/L3)', 'Digital Logic Gates & Binary Arithmetic'],
        moduleUrl: 'https://roadmap.sh/computer-science',
      },
      {
        title: 'Operating Systems & Concurrency',
        topics: ['Processes, Threads & Context Switching', 'CPU Scheduling Algorithms', 'Deadlocks, Semaphores & Mutexes'],
        moduleUrl: 'https://roadmap.sh/computer-science',
      },
      {
        title: 'Memory Management & Virtual Memory',
        topics: ['Paging, Segmentation & TLB', 'Heap vs Stack Memory Allocation', 'Garbage Collection & Pointer Safety'],
        moduleUrl: 'https://roadmap.sh/computer-science',
      },
      {
        title: 'Computer Networks & Distributed Systems',
        topics: ['OSI & TCP/IP 7-Layer Models', 'Socket Programming & RPC Protocols', 'Consensus Algorithms & Network Partitions'],
        moduleUrl: 'https://roadmap.sh/computer-science',
      },
    ],
  },
  {
    slug: 'system-design',
    title: 'System Design Roadmap',
    url: 'https://roadmap.sh/system-design',
    keywords: [
      'system design',
      'scalability',
      'high availability',
      'load balancing',
      'sharding',
      'replication',
      'message queue',
      'kafka',
      'caching',
      'redis',
    ],
    description: 'Architectural principles for designing large-scale, fault-tolerant, high-throughput distributed systems and data pipelines.',
    difficulty: 'Advanced',
    estimatedHours: '40-60 Hours',
    modules: [
      {
        title: 'Foundational System Design Concepts',
        topics: ['Horizontal vs Vertical Scaling', 'Load Balancers (Nginx, HAProxy)', 'CAP Theorem & PACELC Trade-offs'],
        moduleUrl: 'https://roadmap.sh/system-design',
      },
      {
        title: 'Database Scaling & Partitioning',
        topics: ['Database Sharding & Read Replicas', 'Consistent Hashing Algorithms', 'Write-Ahead Logging & Replication Lag'],
        moduleUrl: 'https://roadmap.sh/system-design',
      },
      {
        title: 'Caching Strategies & Content Delivery',
        topics: ['Redis Cache-Aside, Write-Through & Write-Back', 'Eviction Policies (LRU, LFU)', 'CDN Edge Caching'],
        moduleUrl: 'https://roadmap.sh/system-design',
      },
      {
        title: 'Asynchronous Processing & Message Brokers',
        topics: ['Message Queues (RabbitMQ, Apache Kafka)', 'Pub/Sub Architectures', 'Idempotency & Exactly-Once Semantics'],
        moduleUrl: 'https://roadmap.sh/system-design',
      },
    ],
  },
  {
    slug: 'full-stack',
    title: 'Full Stack Developer Roadmap',
    url: 'https://roadmap.sh/full-stack',
    keywords: [
      'full stack',
      'fullstack',
      'frontend',
      'react',
      'typescript',
      'javascript',
      'html',
      'css',
      'client',
      'web',
    ],
    description: 'End-to-end curriculum encompassing frontend UI engineering, responsive design, state management, REST APIs, and database deployment.',
    difficulty: 'Beginner to Intermediate',
    estimatedHours: '60-80 Hours',
    modules: [
      {
        title: 'Modern Frontend Fundamentals',
        topics: ['HTML5 Semantic Markup & CSS3 Layouts', 'Responsive Flexbox & Grid Systems', 'Modern JavaScript (ES6+) & TypeScript Types'],
        moduleUrl: 'https://roadmap.sh/full-stack',
      },
      {
        title: 'Component Architectures with React',
        topics: ['Component Lifecycle & React Hooks', 'State Management (Zustand, Redux)', 'Client-side Routing & Protected Views'],
        moduleUrl: 'https://roadmap.sh/full-stack',
      },
      {
        title: 'Full-Stack Integration & APIs',
        topics: ['Consuming RESTful Endpoints with Fetch/Axios', 'JWT Token Storage & Interceptors', 'Forms, Validation & User Feedback'],
        moduleUrl: 'https://roadmap.sh/full-stack',
      },
      {
        title: 'Build Tools & Production Bundling',
        topics: ['Vite & Webpack Compilation', 'Tailwind CSS Utility Styling', 'Deploying on Cloud Platforms (Vercel, Render)'],
        moduleUrl: 'https://roadmap.sh/full-stack',
      },
    ],
  },
];

const CREDIT_TEXT = 'Curriculum guidance & developer learning paths provided by roadmap.sh (Open-source community roadmaps under CC BY-SA 4.0). All credit and rights belong to roadmap.sh and its contributors.';
const CREDIT_URL = 'https://roadmap.sh';

/**
 * Searches and maps a lagging skill or course topic to a canonical roadmap.sh pathway.
 */
export const findRoadmapForSkill = (skill: string): RoadmapGuidance => {
  const normalized = skill.toLowerCase().trim();

  // 1. Keyword search in database
  let bestMatch: RoadmapEntry | null = null;
  let highestScore = 0;

  for (const entry of ROADMAP_REGISTRY) {
    let score = 0;
    if (normalized.includes(entry.slug) || entry.title.toLowerCase().includes(normalized)) {
      score += 10;
    }
    for (const kw of entry.keywords) {
      if (normalized.includes(kw)) {
        score += 5;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = entry;
    }
  }

  // If match found with confidence
  if (bestMatch && highestScore > 0) {
    return {
      skill,
      roadmapTitle: bestMatch.title,
      roadmapSlug: bestMatch.slug,
      roadmapUrl: bestMatch.url,
      description: bestMatch.description,
      difficulty: bestMatch.difficulty,
      estimatedHours: bestMatch.estimatedHours,
      credit: CREDIT_TEXT,
      creditUrl: CREDIT_URL,
      modules: bestMatch.modules,
    };
  }

  // Fallback to DSA or Full-Stack depending on keywords
  const fallbackEntry = normalized.includes('data') || normalized.includes('algorithm') || normalized.includes('logic')
    ? ROADMAP_REGISTRY[0]
    : normalized.includes('cloud') || normalized.includes('deploy') || normalized.includes('docker')
    ? ROADMAP_REGISTRY[2]
    : ROADMAP_REGISTRY[1]; // Backend by default

  return {
    skill,
    roadmapTitle: fallbackEntry.title,
    roadmapSlug: fallbackEntry.slug,
    roadmapUrl: fallbackEntry.url,
    description: `Targeted learning path on ${fallbackEntry.title} to bridge competency gaps in ${skill}.`,
    difficulty: fallbackEntry.difficulty,
    estimatedHours: fallbackEntry.estimatedHours,
    credit: CREDIT_TEXT,
    creditUrl: CREDIT_URL,
    modules: fallbackEntry.modules,
  };
};

/**
 * Maps an array of lagging skills/courses to roadmap.sh pathways.
 * Deduplicates roadmaps while linking each lagging skill.
 */
export const searchRoadmapsForLaggingSkills = async (
  laggingSkills: string[],
  degree?: string
): Promise<RoadmapGuidance[]> => {
  if (!laggingSkills || laggingSkills.length === 0) {
    return [
      findRoadmapForSkill(degree?.toLowerCase().includes('computer') ? 'Computer Science' : 'Backend & Web Architecture'),
    ];
  }

  const results: RoadmapGuidance[] = [];
  const seenRoadmaps = new Set<string>();

  for (const skill of laggingSkills) {
    const guidance = findRoadmapForSkill(skill);
    if (!seenRoadmaps.has(guidance.roadmapSlug)) {
      seenRoadmaps.add(guidance.roadmapSlug);
      results.push(guidance);
    }
  }

  if (results.length === 0) {
    results.push(findRoadmapForSkill('Full-Stack Web Architecture'));
  }

  return results;
};
