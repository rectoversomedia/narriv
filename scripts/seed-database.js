/**
 * seed-database.js
 * Seeds the Narriv database with demo data for testing
 *
 * Run: node scripts/seed-database.js
 */

import crypto from "crypto";
import bcrypt from "bcrypt";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load env from backend
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "../backend/.env") });

const SUPABASE_URL = process.env.SUPABASE_URL || "https://kbwhixaiudhhqduvlqal.supabase.co";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error("❌ SUPABASE_SERVICE_KEY is required");
  console.error("Make sure backend/.env has SUPABASE_SERVICE_KEY set");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const BCRYPT_SALT_ROUNDS = 12;

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function seed() {
  console.log("🌱 Starting database seed...\n");

  // Demo user password: DemoPass123!
  const demoPassword = await bcrypt.hash("DemoPass123!", BCRYPT_SALT_ROUNDS);

  // Create demo workspace
  console.log("📦 Creating workspace...");
  const workspaceId = crypto.randomUUID();
  const { error: wsError } = await supabase.from("workspaces").upsert({
    id: workspaceId,
    name: "Narriv Demo Workspace",
    slug: "demo-workspace",
    settings: { timezone: "Asia/Jakarta", language: "id" },
  }, { onConflict: "id" });

  if (wsError) {
    console.error("   ❌ Workspace error:", wsError.message);
  } else {
    console.log("   ✅ Workspace created");
  }

  // Create workspace settings
  const { error: wsSettingsError } = await supabase.from("workspace_settings").upsert({
    workspace_id: workspaceId,
    brand_name: "Narriv",
    industry: "Technology",
    timezone: "Asia/Jakarta",
    language: "id",
  }, { onConflict: "workspace_id" });

  if (wsSettingsError) {
    console.error("   ⚠️  Workspace settings error:", wsSettingsError.message);
  } else {
    console.log("   ✅ Workspace settings created");
  }

  // Create notification settings
  const { error: notifError } = await supabase.from("workspace_notification_settings").upsert({
    workspace_id: workspaceId,
    email_enabled: true,
    whatsapp_enabled: false,
    escalation_notifications: true,
    reminder_notifications: true,
  }, { onConflict: "workspace_id" });

  if (notifError) {
    console.error("   ⚠️  Notification settings error:", notifError.message);
  } else {
    console.log("   ✅ Notification settings created");
  }

  // Create demo user
  console.log("\n👤 Creating demo user...");
  const demoUserId = crypto.randomUUID();
  const { error: userError } = await supabase.from("users").upsert({
    id: demoUserId,
    email: "demo@narriv.test",
    name: "Demo User",
    password: demoPassword,
    email_verified: true,
    provider: "password",
  }, { onConflict: "email" });

  if (userError) {
    console.error("   ❌ User error:", userError.message);
  } else {
    console.log("   ✅ Demo user created (email: demo@narriv.test)");
  }

  // Create workspace member link
  const { error: memberError } = await supabase.from("workspace_members").upsert({
    workspace_id: workspaceId,
    user_id: demoUserId,
    role: "owner",
  }, { onConflict: "workspace_id,user_id" });

  if (memberError) {
    console.error("   ⚠️  Workspace member error:", memberError.message);
  } else {
    console.log("   ✅ User linked to workspace");
  }

  // Create second demo user
  console.log("\n👤 Creating second demo user...");
  const demoUser2Id = crypto.randomUUID();
  const { error: user2Error } = await supabase.from("users").upsert({
    id: demoUser2Id,
    email: "admin@narriv.test",
    name: "Admin User",
    password: demoPassword,
    email_verified: true,
    provider: "password",
  }, { onConflict: "email" });

  if (user2Error) {
    console.error("   ❌ User 2 error:", user2Error.message);
  } else {
    console.log("   ✅ Admin user created (email: admin@narriv.test)");
  }

  const { error: member2Error } = await supabase.from("workspace_members").upsert({
    workspace_id: workspaceId,
    user_id: demoUser2Id,
    role: "admin",
  }, { onConflict: "workspace_id,user_id" });

  if (member2Error) {
    console.error("   ⚠️  Admin workspace member error:", member2Error.message);
  } else {
    console.log("   ✅ Admin linked to workspace");
  }

  // Create sources
  console.log("\n📡 Creating data sources...");
  const sources = [
    { name: "Twitter/X Indonesia", type: "twitter", category: "social", platform: "twitter" },
    { name: "Facebook Indonesia", type: "facebook", category: "social", platform: "facebook" },
    { name: "Instagram", type: "instagram", category: "social", platform: "instagram" },
    { name: "Online News", type: "news", category: "news", platform: "news" },
    { name: "YouTube", type: "youtube", category: "video", platform: "youtube" },
  ];

  for (const source of sources) {
    const sourceId = crypto.randomUUID();
    const { error } = await supabase.from("sources").upsert({
      id: sourceId,
      workspace_id: workspaceId,
      name: source.name,
      type: source.type,
      category: source.category,
      is_active: true,
      last_sync_at: new Date().toISOString(),
      last_status: "success",
      config: { platform: source.platform },
    }, { onConflict: "id" });

    if (error) {
      console.error(`   ⚠️  Source ${source.name} error:`, error.message);
    } else {
      console.log(`   ✅ Source: ${source.name}`);
    }
    await sleep(100);
  }

  // Create sample signals
  console.log("\n📊 Creating sample signals...");
  const sentiments = ["positive", "negative", "neutral", "mixed"];
  const platforms = ["twitter", "facebook", "instagram", "news", "youtube"];
  const severities = ["low", "medium", "high", "critical"];
  const topics = [["technology", "ai"], ["politics", "election"], ["economy", "market"], ["health", "vaccine"], ["sports", "football"]];

  for (let i = 0; i < 50; i++) {
    const signalId = crypto.randomUUID();
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const publishedAt = new Date(Date.now() - (daysAgo * 24 + hoursAgo) * 60 * 60 * 1000);

    const topics_set = topics[Math.floor(Math.random() * topics.length)];
    const sentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
    const platform = platforms[Math.floor(Math.random() * platforms.length)];

    const titles = [
      `Signal ${i + 1}: ${topics_set[0].charAt(0).toUpperCase() + topics_set[0].slice(1)} discussion trending`,
      `New developments in ${topics_set[0]} sector`,
      `Community reacts to ${topics_set[1]} news`,
      `${topics_set[0].charAt(0).toUpperCase() + topics_set[0].slice(1)} ${topics_set[1]} shows momentum`,
      `Analysis: ${topics_set[0]} market outlook`,
    ];

    const { error } = await supabase.from("signals").insert({
      id: signalId,
      workspace_id: workspaceId,
      title: titles[Math.floor(Math.random() * titles.length)],
      content: `This is sample content for signal ${i + 1}. It contains relevant information about ${topics_set.join(" and ")} that users would want to monitor.`,
      platform: platform,
      sentiment: sentiment,
      sentiment_score: (Math.random() * 0.5 + 0.25).toFixed(2),
      severity: severities[Math.floor(Math.random() * severities.length)],
      region: "Indonesia",
      language: "id",
      topics: topics_set,
      published_at: publishedAt.toISOString(),
      captured_at: new Date().toISOString(),
    });

    if (error) {
      console.log(`   ⚠️  Signal ${i + 1} error: ${error.message}`);
    } else if ((i + 1) % 10 === 0) {
      console.log(`   ✅ Created ${i + 1} signals...`);
    }
  }

  // Create sample alerts
  console.log("\n🚨 Creating sample alerts...");
  const alertTypes = ["anomaly", "trend", "risk", "opportunity", "breaking"];
  const alertStatuses = ["new", "acknowledged", "investigating", "resolved"];
  const alertSeverities = ["low", "medium", "high", "critical"];

  for (let i = 0; i < 15; i++) {
    const alertId = crypto.randomUUID();
    const daysAgo = Math.floor(Math.random() * 7);
    const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    const alertType = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const severity = alertSeverities[Math.floor(Math.random() * alertSeverities.length)];
    const status = alertStatuses[Math.floor(Math.random() * alertStatuses.length)];

    const titles = [
      `Unusual ${alertType} detected in social mentions`,
      `Spike in ${alertType} activity`,
      `Critical ${severity} ${alertType} alert`,
      `New ${alertType} pattern identified`,
      `Priority ${alertType} requires attention`,
    ];

    const { error } = await supabase.from("alerts").insert({
      id: alertId,
      workspace_id: workspaceId,
      title: titles[Math.floor(Math.random() * titles.length)],
      description: `Automated alert generated from signal monitoring. Severity: ${severity}`,
      type: alertType,
      severity: severity,
      status: status,
      source: platforms[Math.floor(Math.random() * platforms.length)],
      created_at: createdAt.toISOString(),
    });

    if (error) {
      console.log(`   ⚠️  Alert ${i + 1} error: ${error.message}`);
    }
  }
  console.log("   ✅ Sample alerts created");

  // Create sample narrative clusters
  console.log("\n🧠 Creating narrative clusters...");
  const clusters = [
    { title: "AI Regulation Debate", priority: "high", velocity: 85.5, signal_count: 12 },
    { title: "Election 2024 Impact", priority: "critical", velocity: 92.3, signal_count: 24 },
    { title: "Crypto Market Volatility", priority: "medium", velocity: 65.0, signal_count: 8 },
    { title: "Climate Policy Discussion", priority: "high", velocity: 78.2, signal_count: 15 },
    { title: "Tech Layoffs Wave", priority: "medium", velocity: 71.8, signal_count: 10 },
  ];

  for (const cluster of clusters) {
    const clusterId = crypto.randomUUID();
    const { error } = await supabase.from("narrative_clusters").insert({
      id: clusterId,
      workspace_id: workspaceId,
      title: cluster.title,
      description: `Narrative cluster tracking ${cluster.title.toLowerCase()} related discussions`,
      priority: cluster.priority,
      velocity: cluster.velocity,
      signal_count: cluster.signal_count,
      impact: cluster.priority === "critical" ? "high" : "medium",
      lifecycle: "active",
      keywords: cluster.title.toLowerCase().split(" "),
    });

    if (error) {
      console.log(`   ⚠️  Cluster "${cluster.title}" error: ${error.message}`);
    } else {
      console.log(`   ✅ Cluster: ${cluster.title}`);
    }
    await sleep(100);
  }

  // Create sample action plans
  console.log("\n📋 Creating action plans...");
  const plans = [
    { title: "Develop AI Response Strategy", status: "in_progress", priority: "high" },
    { title: "Monitor Election Coverage", status: "pending", priority: "critical" },
    { title: "Create Crisis Communication", status: "completed", priority: "high" },
    { title: "Weekly Report Generation", status: "in_progress", priority: "medium" },
    { title: "Social Media Response Plan", status: "pending", priority: "medium" },
  ];

  for (const plan of plans) {
    const planId = crypto.randomUUID();
    const { error } = await supabase.from("action_plans").insert({
      id: planId,
      workspace_id: workspaceId,
      title: plan.title,
      description: `Action plan for ${plan.title.toLowerCase()}`,
      type: "response",
      priority: plan.priority,
      status: plan.status,
      created_by: demoUserId,
      assigned_to: plan.status === "in_progress" ? demoUserId : null,
    });

    if (error) {
      console.log(`   ⚠️  Plan "${plan.title}" error: ${error.message}`);
    } else {
      console.log(`   ✅ Plan: ${plan.title}`);
    }
    await sleep(100);
  }

  // Create escalation matrices
  console.log("\n⚡ Creating escalation matrices...");
  const levels = [
    { level: "1", sla_minutes: 15, sort_order: 1 },
    { level: "2", sla_minutes: 30, sort_order: 2 },
    { level: "3", sla_minutes: 60, sort_order: 3 },
    { level: "4", sla_minutes: 240, sort_order: 4 },
  ];

  for (const level of levels) {
    const { error } = await supabase.from("escalation_matrices").upsert({
      workspace_id: workspaceId,
      level: level.level,
      sla_minutes: level.sla_minutes,
      is_active: true,
      sort_order: level.sort_order,
    }, { onConflict: "workspace_id,level" });

    if (error) {
      console.log(`   ⚠️  Level ${level.level} error: ${error.message}`);
    } else {
      console.log(`   ✅ Level ${level.level}: ${level.sla_minutes} minutes SLA`);
    }
  }

  console.log("\n🎉 Database seeding complete!");
  console.log("\n📝 Demo Credentials:");
  console.log("   Email: demo@narriv.test");
  console.log("   Password: DemoPass123!");
  console.log("\n   Email: admin@narriv.test");
  console.log("   Password: DemoPass123!");
}

seed().catch(console.error);
