// Venture Stage Milestones Configuration
// Single source of truth for all stage milestones, evidence requirements, and badges

export const VENTURE_STAGES = [
  "Ideation",
  "Prototype",
  "MVP",
  "Validation",
  "Funding Readiness",
  "Scale",
] as const;

export type VentureStage = typeof VENTURE_STAGES[number];

export interface MilestoneDefinition {
  title: string;
  description: string;
  is_required: boolean;
  evidenceHint: string;
  difficulty: "Easy" | "Medium" | "Hard";
  estimatedTime: string;
  healthImpact: string;
}

export interface StageConfig {
  stage: VentureStage;
  sequence: number;
  badge: string;
  badgeIcon: string;
  color: string; // tailwind color class
  description: string;
  milestones: MilestoneDefinition[];
  advancementEvidence: string[]; // what is needed to submit for next stage
}

export const STAGE_CONFIG: StageConfig[] = [
  {
    stage: "Ideation",
    sequence: 1,
    badge: "Idea Explorer",
    badgeIcon: "💡",
    color: "blue",
    description: "Concept and problem definition stage",
    milestones: [
      { title: "Define Problem Statement", description: "Document the core problem your startup solves", is_required: true, evidenceHint: "Upload a problem statement document or share a link", difficulty: "Medium", estimatedTime: "2 Days", healthImpact: "+10 pts" },
      { title: "Identify Target Customer Segment", description: "Define your primary customer segment", is_required: true, evidenceHint: "Upload customer persona document or research notes", difficulty: "Medium", estimatedTime: "3 Days", healthImpact: "+10 pts" },
      { title: "Research Existing Solutions", description: "Conduct competitive analysis of existing solutions", is_required: true, evidenceHint: "Upload competitive analysis document", difficulty: "Easy", estimatedTime: "1 Day", healthImpact: "+5 pts" },
      { title: "Prepare Initial Solution Concept", description: "Develop your initial solution concept", is_required: true, evidenceHint: "Upload concept document, sketch or presentation", difficulty: "Hard", estimatedTime: "1 Week", healthImpact: "+15 pts" },
      { title: "Complete First Mentor Discussion", description: "Conduct at least one structured session with your assigned mentor", is_required: true, evidenceHint: "Share meeting notes or a summary of your discussion", difficulty: "Easy", estimatedTime: "1 Hour", healthImpact: "+10 pts" },
      { title: "Attend RTIH Orientation", description: "Complete the RTIH incubation orientation session", is_required: false, evidenceHint: "Share attendance certificate or session screenshot", difficulty: "Easy", estimatedTime: "2 Hours", healthImpact: "+5 pts" },
      { title: "Join Founder Community", description: "Join the RTIH founder community channels", is_required: false, evidenceHint: "Share your profile link or community screenshot", difficulty: "Easy", estimatedTime: "10 Mins", healthImpact: "+5 pts" },
      { title: "Complete Entrepreneur Assessment", description: "Complete the RTIH entrepreneur readiness assessment", is_required: false, evidenceHint: "Share your assessment results", difficulty: "Medium", estimatedTime: "1 Hour", healthImpact: "+10 pts" },
    ],
    advancementEvidence: ["Prototype Images", "Prototype Video", "Technical Feasibility Description", "Feature Summary"],
  },
  {
    stage: "Prototype",
    sequence: 2,
    badge: "Builder",
    badgeIcon: "🔧",
    color: "purple",
    description: "Building and testing initial prototype",
    milestones: [
      { title: "Create Wireframes", description: "Design wireframes or mockups of your product", is_required: true, evidenceHint: "Upload wireframe images or Figma/design link", difficulty: "Medium", estimatedTime: "1 Week", healthImpact: "+10 pts" },
      { title: "Build Prototype", description: "Build a working prototype of your solution", is_required: true, evidenceHint: "Share prototype link, images, or video walkthrough", difficulty: "Hard", estimatedTime: "2-4 Weeks", healthImpact: "+20 pts" },
      { title: "Upload Prototype Demonstration", description: "Record and upload a demo of your prototype", is_required: true, evidenceHint: "Share video link (YouTube, Drive, Loom)", difficulty: "Easy", estimatedTime: "2 Hours", healthImpact: "+5 pts" },
      { title: "Complete Technical Feasibility Review", description: "Have your prototype technically reviewed by your mentor", is_required: true, evidenceHint: "Share technical review notes from your mentor session", difficulty: "Medium", estimatedTime: "1 Day", healthImpact: "+10 pts" },
      { title: "Complete Mentor Prototype Review", description: "Get formal prototype feedback from your mentor", is_required: true, evidenceHint: "Share mentor feedback document or session notes", difficulty: "Medium", estimatedTime: "1 Day", healthImpact: "+10 pts" },
      { title: "Attend Demo Session", description: "Present your prototype at a RTIH demo session", is_required: false, evidenceHint: "Share demo session screenshot or recording", difficulty: "Medium", estimatedTime: "1 Day", healthImpact: "+5 pts" },
      { title: "Gather Peer Feedback", description: "Collect feedback from other RTIH founders", is_required: false, evidenceHint: "Upload feedback summary or survey results", difficulty: "Medium", estimatedTime: "1 Week", healthImpact: "+5 pts" },
      { title: "Create Product Roadmap", description: "Document your product development roadmap", is_required: false, evidenceHint: "Upload roadmap document or presentation", difficulty: "Hard", estimatedTime: "3 Days", healthImpact: "+10 pts" },
    ],
    advancementEvidence: ["MVP Link / APK / Website", "MVP Demo Video", "User Testing Evidence", "Product Description"],
  },
  {
    stage: "MVP",
    sequence: 3,
    badge: "Product Creator",
    badgeIcon: "🚀",
    color: "green",
    description: "Minimum viable product launched to users",
    milestones: [
      { title: "Develop MVP", description: "Build your minimum viable product", is_required: true, evidenceHint: "Share MVP link, APK, or demo URL", difficulty: "Hard", estimatedTime: "4-8 Weeks", healthImpact: "+25 pts" },
      { title: "Deploy MVP", description: "Deploy your MVP to production/live environment", is_required: true, evidenceHint: "Share the live URL or deployment proof", difficulty: "Medium", estimatedTime: "2 Days", healthImpact: "+10 pts" },
      { title: "Onboard First Users", description: "Onboard at least 5 real users to your MVP", is_required: true, evidenceHint: "Upload user onboarding data or screenshots", difficulty: "Hard", estimatedTime: "1-2 Weeks", healthImpact: "+20 pts" },
      { title: "Collect Initial Feedback", description: "Collect structured feedback from initial users", is_required: true, evidenceHint: "Upload feedback forms, survey results, or interview notes", difficulty: "Medium", estimatedTime: "1 Week", healthImpact: "+10 pts" },
      { title: "Complete Product Iteration", description: "Implement at least one iteration based on user feedback", is_required: true, evidenceHint: "Upload before/after changelog or updated demo", difficulty: "Hard", estimatedTime: "1-2 Weeks", healthImpact: "+15 pts" },
      { title: "Create Landing Page", description: "Build a public landing page for your product", is_required: false, evidenceHint: "Share landing page URL", difficulty: "Easy", estimatedTime: "2 Days", healthImpact: "+5 pts" },
      { title: "Launch Social Presence", description: "Create social media profiles for your startup", is_required: false, evidenceHint: "Share social media profile links", difficulty: "Easy", estimatedTime: "1 Day", healthImpact: "+5 pts" },
      { title: "Complete Venture Profile", description: "Complete 100% of your RTIH venture profile", is_required: false, evidenceHint: "Share your completed profile screenshot", difficulty: "Easy", estimatedTime: "1 Hour", healthImpact: "+5 pts" },
    ],
    advancementEvidence: ["Customer Interviews", "User Feedback Report", "Validation Report", "Pilot Deployment Evidence"],
  },
  {
    stage: "Validation",
    sequence: 4,
    badge: "Market Validator",
    badgeIcon: "✅",
    color: "yellow",
    description: "Market and customer validation",
    milestones: [
      { title: "Conduct Customer Interviews", description: "Conduct at least 10 structured customer interviews", is_required: true, evidenceHint: "Upload interview recordings, transcripts, or summary report", difficulty: "Hard", estimatedTime: "2-3 Weeks", healthImpact: "+15 pts" },
      { title: "Acquire First Pilot User", description: "Onboard at least one paying or committed pilot user/organization", is_required: true, evidenceHint: "Share LOI, MoU, or pilot agreement document", difficulty: "Hard", estimatedTime: "1-2 Months", healthImpact: "+25 pts" },
      { title: "Collect User Feedback Report", description: "Compile a structured user feedback report", is_required: true, evidenceHint: "Upload feedback report document", difficulty: "Medium", estimatedTime: "1 Week", healthImpact: "+10 pts" },
      { title: "Implement Product Improvements", description: "Implement product improvements based on validation feedback", is_required: true, evidenceHint: "Upload product changelog, updated demo, or release notes", difficulty: "Hard", estimatedTime: "2-4 Weeks", healthImpact: "+15 pts" },
      { title: "Complete Validation Assessment", description: "Complete the RTIH market validation assessment with your mentor", is_required: true, evidenceHint: "Upload validation assessment results or mentor sign-off", difficulty: "Medium", estimatedTime: "2 Days", healthImpact: "+10 pts" },
      { title: "Obtain Letter of Intent", description: "Secure at least one Letter of Intent from a potential customer", is_required: false, evidenceHint: "Upload signed LOI document", difficulty: "Medium", estimatedTime: "2-4 Weeks", healthImpact: "+10 pts" },
      { title: "Join Market Access Program", description: "Join the RTIH market access or acceleration program", is_required: false, evidenceHint: "Upload acceptance letter or program screenshot", difficulty: "Medium", estimatedTime: "1 Week", healthImpact: "+10 pts" },
      { title: "Attend Customer Discovery Workshop", description: "Participate in a customer discovery workshop", is_required: false, evidenceHint: "Share attendance certificate or workshop notes", difficulty: "Easy", estimatedTime: "1 Day", healthImpact: "+5 pts" },
    ],
    advancementEvidence: ["Pitch Deck", "Business Model Canvas", "Revenue Model", "Market Validation Summary", "Go-To-Market Plan"],
  },
  {
    stage: "Funding Readiness",
    sequence: 5,
    badge: "Investment Ready",
    badgeIcon: "💰",
    color: "orange",
    description: "Preparing for investment",
    milestones: [
      { title: "Prepare Pitch Deck", description: "Create a comprehensive investor pitch deck", is_required: true, evidenceHint: "Upload pitch deck (PDF or link)", difficulty: "Hard", estimatedTime: "1-2 Weeks", healthImpact: "+15 pts" },
      { title: "Complete Business Model Canvas", description: "Document your full business model canvas", is_required: true, evidenceHint: "Upload completed BMC document", difficulty: "Medium", estimatedTime: "2 Days", healthImpact: "+10 pts" },
      { title: "Define Revenue Model", description: "Clearly define and document your revenue model", is_required: true, evidenceHint: "Upload revenue model document or financial summary", difficulty: "Medium", estimatedTime: "1 Week", healthImpact: "+10 pts" },
      { title: "Prepare Financial Projections", description: "Prepare 3-year financial projections", is_required: true, evidenceHint: "Upload financial projection spreadsheet or document", difficulty: "Hard", estimatedTime: "2 Weeks", healthImpact: "+20 pts" },
      { title: "Complete Funding Readiness Review", description: "Complete the RTIH investment readiness review with your mentor", is_required: true, evidenceHint: "Upload review assessment or mentor sign-off", difficulty: "Medium", estimatedTime: "3 Days", healthImpact: "+15 pts" },
      { title: "Submit Grant Application", description: "Submit at least one startup grant application", is_required: false, evidenceHint: "Upload application confirmation or submission screenshot", difficulty: "Medium", estimatedTime: "1 Week", healthImpact: "+10 pts" },
      { title: "Attend Investor Networking Session", description: "Attend at least one RTIH investor networking event", is_required: false, evidenceHint: "Share attendance confirmation or event screenshot", difficulty: "Easy", estimatedTime: "1 Day", healthImpact: "+5 pts" },
      { title: "Complete Startup Registration", description: "Complete formal startup/company registration", is_required: false, evidenceHint: "Upload registration certificate", difficulty: "Medium", estimatedTime: "2-4 Weeks", healthImpact: "+10 pts" },
    ],
    advancementEvidence: ["Revenue Evidence", "Customer Metrics", "Team Information", "Growth Plan", "Partnership Information"],
  },
  {
    stage: "Scale",
    sequence: 6,
    badge: "Scale Champion",
    badgeIcon: "🏆",
    color: "red",
    description: "Revenue growth and market expansion",
    milestones: [
      { title: "Acquire First Paying Customer", description: "Close your first revenue-generating customer", is_required: true, evidenceHint: "Upload invoice, payment proof, or customer contract", difficulty: "Hard", estimatedTime: "1-3 Months", healthImpact: "+25 pts" },
      { title: "Achieve Revenue Milestone", description: "Achieve your first significant revenue milestone", is_required: true, evidenceHint: "Upload revenue statement or financial summary", difficulty: "Hard", estimatedTime: "3-6 Months", healthImpact: "+25 pts" },
      { title: "Expand Team", description: "Hire at least 2 full-time team members", is_required: true, evidenceHint: "Upload team profiles, offer letters, or org chart", difficulty: "Medium", estimatedTime: "1-2 Months", healthImpact: "+15 pts" },
      { title: "Secure Strategic Partnership", description: "Close at least one strategic business partnership", is_required: true, evidenceHint: "Upload partnership agreement or MoU", difficulty: "Hard", estimatedTime: "2-3 Months", healthImpact: "+20 pts" },
      { title: "Complete Scale Assessment", description: "Complete the RTIH scale assessment with your mentor", is_required: true, evidenceHint: "Upload scale review report or mentor sign-off", difficulty: "Medium", estimatedTime: "1 Week", healthImpact: "+15 pts" },
      { title: "Enter New Market", description: "Expand into a new geographic or vertical market", is_required: false, evidenceHint: "Upload market entry evidence or press release", difficulty: "Hard", estimatedTime: "3-6 Months", healthImpact: "+15 pts" },
      { title: "Create Jobs", description: "Document employment creation in the ecosystem", is_required: false, evidenceHint: "Upload employment records or HR documentation", difficulty: "Medium", estimatedTime: "2-3 Months", healthImpact: "+10 pts" },
      { title: "Secure External Funding", description: "Close a funding round (angel, seed, or VC)", is_required: false, evidenceHint: "Upload term sheet, investment agreement, or announcement", difficulty: "Hard", estimatedTime: "3-9 Months", healthImpact: "+25 pts" },
    ],
    advancementEvidence: [],
  },
];

export const STAGE_BADGES: Record<VentureStage, { name: string; icon: string; color: string }> = {
  Ideation: { name: "Idea Explorer", icon: "💡", color: "blue" },
  Prototype: { name: "Builder", icon: "🔧", color: "purple" },
  MVP: { name: "Product Creator", icon: "🚀", color: "green" },
  Validation: { name: "Market Validator", icon: "✅", color: "yellow" },
  "Funding Readiness": { name: "Investment Ready", icon: "💰", color: "orange" },
  Scale: { name: "Scale Champion", icon: "🏆", color: "red" },
};

// Registration evidence requirements per claimed stage
export const REGISTRATION_EVIDENCE: Record<VentureStage, { label: string; hint: string; required: boolean }[]> = {
  Ideation: [
    { label: "Problem Statement", hint: "Upload your problem statement (PDF, DOC) or provide link", required: true },
    { label: "Solution Description", hint: "Describe your proposed solution", required: true },
    { label: "Founder Information", hint: "Provide information about the founder(s)", required: true },
    { label: "Target Customer Segment", hint: "Upload customer persona or market description", required: false },
  ],
  Prototype: [
    { label: "Prototype Images", hint: "Upload photos or screenshots of your prototype", required: true },
    { label: "Prototype Video", hint: "Link to a short demo video of your prototype", required: true },
    { label: "Technical Feasibility Description", hint: "Explain the technical feasibility", required: false },
    { label: "Feature Summary", hint: "List key features of your prototype", required: false },
  ],
  MVP: [
    { label: "MVP Link / APK / Website", hint: "Share the live link or APK download", required: true },
    { label: "MVP Demo Video", hint: "Link to MVP walkthrough video", required: true },
    { label: "User Testing Evidence", hint: "Upload user testing results or screenshots", required: false },
    { label: "Product Description", hint: "Describe what your MVP does", required: false },
  ],
  Validation: [
    { label: "Customer Validation Evidence", hint: "Upload customer interviews or testimonials", required: true },
    { label: "User Feedback Report", hint: "Upload structured feedback document", required: true },
    { label: "Pilot Deployment Evidence", hint: "Proof of pilot deployment or usage", required: false },
    { label: "MVP Link", hint: "Share the live MVP URL", required: false },
    { label: "Pitch Deck", hint: "Upload your pitch deck", required: false },
  ],
  "Funding Readiness": [
    { label: "Pitch Deck", hint: "Upload your investor pitch deck", required: true },
    { label: "Business Model Canvas", hint: "Upload completed BMC", required: true },
    { label: "Revenue Model", hint: "Describe your revenue model", required: true },
    { label: "Financial Projections", hint: "Upload 3-year financial projections", required: false },
    { label: "Go-To-Market Plan", hint: "Upload GTM strategy document", required: false },
  ],
  Scale: [
    { label: "Revenue Evidence", hint: "Upload revenue statements or invoices", required: true },
    { label: "Customer Metrics", hint: "Upload customer acquisition and retention data", required: true },
    { label: "Team Information", hint: "Upload org chart or team profiles", required: false },
    { label: "Growth Metrics", hint: "Upload growth charts or analytics screenshots", required: false },
    { label: "Partnership Details", hint: "Upload partnership agreements or MOUs", required: false },
  ],
};
