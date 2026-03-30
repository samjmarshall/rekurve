/** Valid form data for each step */
export const validFormSteps = {
  step1: {
    email: "", // Use from TestUser
    firstName: "",
    lastName: "",
    phone: "",
  },
  step2: {
    company: "",
    companySize: "11-20",
    industry: "Technology",
    location: "Brisbane",
  },
  step3: {
    challenges: ["Lead qualification taking too long"],
  },
  step4: {
    goals: "Automate lead research",
    timeline: "1-3 months",
    currentMrr: "$10k-$50k",
  },
};

/** Invalid data for validation testing */
export const invalidFormData = {
  email: {
    empty: "",
    noAt: "invalid-email",
    noDomain: "test@",
    noTld: "test@example",
  },
  phone: {
    tooShort: "123",
    letters: "abc123def",
  },
};

/** Company size options (matches form select) */
export const companySizeOptions = [
  "1-5",
  "6-10",
  "11-20",
  "21-50",
  "51-100",
  "100+",
] as const;

/** Industry options (matches form select) */
export const industryOptions = [
  "Technology",
  "Finance",
  "Healthcare",
  "E-commerce",
  "Professional Services",
  "Other",
] as const;

/** Timeline options (matches form select) */
export const timelineOptions = [
  "Immediately",
  "1-3 months",
  "3-6 months",
  "6+ months",
] as const;
