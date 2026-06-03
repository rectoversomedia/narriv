/**
 * Action plan templates by industry and strategy type.
 * Each template provides a structured starting point for AI generation.
 */

const TEMPLATES = {
    fintech: {
        pr_response: {
            name: "Fintech PR Response",
            steps: [
                { phase: "Immediate (0-2h)", actions: ["Brief legal team", "Prepare holding statement", "Notify compliance"] },
                { phase: "Short-term (2-24h)", actions: ["Issue public statement", "Brief customer support", "Update FAQ"] },
                { phase: "Follow-up (24-72h)", actions: ["Publish detailed response", "Monitor sentiment", "Stakeholder update"] },
            ],
            key_messages: ["Security is our top priority", "We are working to resolve this", "Customers will be updated"],
            channels: ["Press release", "Social media", "Email to customers", "In-app notification"],
        },
        content_strategy: {
            name: "Fintech Content Strategy",
            steps: [
                { phase: "Day 1-3", actions: ["Publish FAQ article", "Social media carousel", "Email blast"] },
                { phase: "Day 4-7", actions: ["Blog post with details", "Video explainer", "Community Q&A"] },
                { phase: "Week 2", actions: ["Follow-up newsletter", "Customer testimonial", "Progress report"] },
            ],
            content_pillars: ["Transparency", "Education", "Reassurance"],
            formats: ["FAQ", "Explainer video", "Infographic", "Email sequence"],
        },
        crisis_response: {
            name: "Fintech Crisis Response",
            steps: [
                { phase: "Immediate (0-1h)", actions: ["Activate crisis team", "Assess scope", "Prepare holding statement"] },
                { phase: "Hour 1-4", actions: ["Issue public statement", "Brief regulators", "Notify affected users"] },
                { phase: "Hour 4-24", actions: ["Detailed incident report", "Remediation plan", "Media brief"] },
                { phase: "Day 2-7", actions: ["Recovery monitoring", "Customer compensation", "Process improvement"] },
            ],
            severity_levels: ["Payment disruption", "Data breach", "Service outage", "Regulatory issue"],
        },
        influencer_strategy: {
            name: "Fintech Influencer Strategy",
            steps: [
                { phase: "Preparation", actions: ["Identify fintech influencers", "Prepare briefing kit", "Legal review"] },
                { phase: "Outreach", actions: ["Personal outreach", "Share verified facts", "Offer exclusive briefing"] },
                { phase: "Content", actions: ["Co-create content", "Monitor performance", "Amplify reach"] },
            ],
            target_profiles: ["Fintech reviewers", "Finance educators", "Tech journalists"],
        },
        social_response: {
            name: "Fintech Social Response",
            steps: [
                { phase: "Monitor (0-30min)", actions: ["Set up keyword alerts", "Track mention velocity", "Identify key conversations"] },
                { phase: "Respond (30min-2h)", actions: ["Reply to top concerns", "Pin official statement", "Update bio/status"] },
                { phase: "Engage (2-24h)", actions: ["Host Twitter/X Space", "Instagram Story updates", "Community management"] },
            ],
            platform_focus: ["X/Twitter", "LinkedIn", "Reddit"],
        },
        stakeholder_update: {
            name: "Fintech Stakeholder Update",
            steps: [
                { phase: "Immediate", actions: ["Brief board members", "Notify key investors", "Internal all-hands"] },
                { phase: "Same day", actions: ["Regulatory notification", "Partner communication", "Customer advisory"] },
                { phase: "Follow-up", actions: ["Detailed impact report", "Recovery timeline", "Prevention measures"] },
            ],
            segments: ["Board", "Investors", "Regulators", "Partners", "Employees", "Customers"],
        },
        data_driven: {
            name: "Fintech Data-Driven Plan",
            steps: [
                { phase: "Analysis", actions: ["Quantify impact scope", "Identify affected segments", "Benchmark against peers"] },
                { phase: "Action", actions: ["Prioritize high-impact fixes", "Allocate resources", "Set KPIs"] },
                { phase: "Monitor", actions: ["Daily metrics review", "Weekly stakeholder report", "Monthly post-mortem"] },
            ],
            kpis: ["Transaction success rate", "Customer satisfaction score", "Response time", "Resolution rate"],
        },
    },
    ecommerce: {
        pr_response: {
            name: "E-commerce PR Response",
            steps: [
                { phase: "Immediate", actions: ["Acknowledge issue publicly", "Activate support surge", "Brief partnerships"] },
                { phase: "Short-term", actions: ["Publish resolution timeline", "Offer affected users remediation", "Monitor reviews"] },
                { phase: "Follow-up", actions: ["Share improvement plan", "Customer appreciation campaign", "Process documentation"] },
            ],
            key_messages: ["We value your trust", "Immediate action taken", "Long-term fix in progress"],
        },
        crisis_response: {
            name: "E-commerce Crisis Response",
            steps: [
                { phase: "0-1h", actions: ["Isolate affected systems", "Notify payment processor", "Alert customer support"] },
                { phase: "1-4h", actions: ["Public acknowledgment", "Affected user notification", "Alternative options"] },
                { phase: "4-24h", actions: ["Detailed incident report", "Compensation plan", "System restore"] },
                { phase: "Day 2-7", actions: ["Post-mortem", "Security audit", "Process improvements"] },
            ],
            severity_levels: ["Payment failure", "Data breach", "Inventory issue", "Delivery disruption"],
        },
    },
    healthcare: {
        pr_response: {
            name: "Healthcare PR Response",
            steps: [
                { phase: "Immediate", actions: ["Notify compliance officer", "Prepare regulatory statement", "Brief medical team"] },
                { phase: "Short-term", actions: ["Issue patient communication", "Update public health advisory", "Media preparation"] },
                { phase: "Follow-up", actions: ["Detailed incident report", "Patient support hotline", "Process improvement plan"] },
            ],
            key_messages: ["Patient safety is paramount", "Regulatory compliance maintained", "Transparent communication"],
        },
        crisis_response: {
            name: "Healthcare Crisis Response",
            steps: [
                { phase: "0-1h", actions: ["Activate incident command", "Notify regulatory bodies", "Patient safety assessment"] },
                { phase: "1-4h", actions: ["Public health notification", "Staff communication", "Patient notification"] },
                { phase: "4-24h", actions: ["Detailed investigation", "Regulatory filing", "Public update"] },
                { phase: "Day 2-7", actions: ["Root cause analysis", "Corrective action plan", "Compliance review"] },
            ],
            severity_levels: ["Patient safety", "Data breach", "Compliance violation", "Service disruption"],
        },
    },
    saas: {
        pr_response: {
            name: "SaaS PR Response",
            steps: [
                { phase: "Immediate", actions: ["Status page update", "Customer notification", "Support team briefing"] },
                { phase: "Short-term", actions: ["Detailed incident report", "SLA credit consideration", "API status update"] },
                { phase: "Follow-up", actions: ["Post-mortem publication", "Architecture improvement", "Customer webinar"] },
            ],
            key_messages: ["Transparency first", "SLA commitment", "Continuous improvement"],
        },
        crisis_response: {
            name: "SaaS Crisis Response",
            steps: [
                { phase: "0-1h", actions: ["Activate incident response", "Update status page", "Notify enterprise customers"] },
                { phase: "1-4h", actions: ["Root cause identification", "Workaround deployment", "Communication cadence"] },
                { phase: "4-24h", actions: ["Full resolution", "Detailed post-mortem", "Prevention measures"] },
            ],
            severity_levels: ["Service outage", "Data breach", "Performance degradation", "Integration failure"],
        },
    },
};

/**
 * Get template for a specific industry and strategy type.
 * Falls back to fintech if industry not found.
 */
export function getTemplate(industry, strategyType) {
    const normalizedIndustry = (industry || "fintech").toLowerCase().replace(/\s+/g, "_");
    const industryTemplates = TEMPLATES[normalizedIndustry] || TEMPLATES.fintech;
    return industryTemplates[strategyType] || null;
}

/**
 * Get all available industries.
 */
export function getAvailableIndustries() {
    return Object.keys(TEMPLATES);
}

/**
 * Get all available strategy types for an industry.
 */
export function getIndustryStrategies(industry) {
    const normalizedIndustry = (industry || "fintech").toLowerCase().replace(/\s+/g, "_");
    const industryTemplates = TEMPLATES[normalizedIndustry] || TEMPLATES.fintech;
    return Object.keys(industryTemplates);
}

/**
 * Build template context string to enhance AI prompts.
 */
export function buildTemplateContext(industry, strategyType) {
    const template = getTemplate(industry, strategyType);
    if (!template) return "";

    const lines = [];
    lines.push(`INDUSTRY TEMPLATE: ${template.name}`);
    lines.push("");

    if (template.steps) {
        lines.push("RECOMMENDED PHASES:");
        template.steps.forEach((step) => {
            lines.push(`  ${step.phase}:`);
            step.actions.forEach((action) => lines.push(`    - ${action}`));
        });
    }

    if (template.key_messages) {
        lines.push(`\nKEY MESSAGES: ${template.key_messages.join(", ")}`);
    }
    if (template.content_pillars) {
        lines.push(`CONTENT PILLARS: ${template.content_pillars.join(", ")}`);
    }
    if (template.channels) {
        lines.push(`CHANNELS: ${template.channels.join(", ")}`);
    }
    if (template.target_profiles) {
        lines.push(`TARGET PROFILES: ${template.target_profiles.join(", ")}`);
    }
    if (template.platform_focus) {
        lines.push(`PLATFORM FOCUS: ${template.platform_focus.join(", ")}`);
    }
    if (template.segments) {
        lines.push(`STAKEHOLDER SEGMENTS: ${template.segments.join(", ")}`);
    }
    if (template.kpis) {
        lines.push(`KEY KPIs: ${template.kpis.join(", ")}`);
    }
    if (template.severity_levels) {
        lines.push(`SEVERITY LEVELS: ${template.severity_levels.join(", ")}`);
    }
    if (template.formats) {
        lines.push(`CONTENT FORMATS: ${template.formats.join(", ")}`);
    }

    lines.push("");
    lines.push("Use this template as a starting point. Adapt it to the specific context provided.");

    return lines.join("\n");
}
