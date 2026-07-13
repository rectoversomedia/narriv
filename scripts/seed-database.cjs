#!/usr/bin/env node
/**
 * seed-database.js - Seeds Narriv database with demo data
 * Run: node scripts/seed-database.cjs
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function seed() {
  console.log('🌱 Seeding database...\n');

  const demoPassword = await bcrypt.hash('DemoPass123!', 12);
  const workspaceId = crypto.randomUUID();

  // Workspace
  console.log('📦 Workspace...');
  await supabase.from('workspaces').upsert({
    id: workspaceId,
    name: 'Narriv Demo Workspace',
    slug: 'demo-workspace',
    settings: { timezone: 'Asia/Jakarta', language: 'id' },
  }, { onConflict: 'id' });
  await supabase.from('workspace_settings').upsert({
    workspace_id: workspaceId,
    brand_name: 'Narriv',
    industry: 'Technology',
    timezone: 'Asia/Jakarta',
  }, { onConflict: 'workspace_id' });
  console.log('   ✅ Done');

  // Demo user (using user_profiles table)
  console.log('👤 Demo user...');
  const { data: existingDemo } = await supabase.from('user_profiles').select('id').eq('email', 'demo@narriv.test').single();

  if (existingDemo) {
    await supabase.from('user_profiles').update({ password: demoPassword, email_verified: true }).eq('email', 'demo@narriv.test');
  } else {
    await supabase.from('user_profiles').insert({
      id: crypto.randomUUID(),
      email: 'demo@narriv.test',
      name: 'Demo User',
      password: demoPassword,
      email_verified: true,
      provider: 'password',
    });
  }

  const { data: demoUserData } = await supabase.from('user_profiles').select('id').eq('email', 'demo@narriv.test').single();
  if (demoUserData) {
    await supabase.from('workspace_members').upsert({
      workspace_id: workspaceId,
      user_id: demoUserData.id,
      role: 'owner',
    }, { onConflict: 'workspace_id,user_id' });
  }
  console.log('   ✅ Done');

  // Admin user
  console.log('👤 Admin user...');
  const { data: existingAdmin } = await supabase.from('user_profiles').select('id').eq('email', 'admin@narriv.test').single();

  if (existingAdmin) {
    await supabase.from('user_profiles').update({ password: demoPassword, email_verified: true }).eq('email', 'admin@narriv.test');
  } else {
    await supabase.from('user_profiles').insert({
      id: crypto.randomUUID(),
      email: 'admin@narriv.test',
      name: 'Admin User',
      password: demoPassword,
      email_verified: true,
      provider: 'password',
    });
  }

  const { data: adminUserData } = await supabase.from('user_profiles').select('id').eq('email', 'admin@narriv.test').single();
  if (adminUserData) {
    await supabase.from('workspace_members').upsert({
      workspace_id: workspaceId,
      user_id: adminUserData.id,
      role: 'admin',
    }, { onConflict: 'workspace_id,user_id' });
  }
  console.log('   ✅ Done');

  // Sources
  console.log('📡 Sources...');
  const sources = [
    { name: 'Twitter/X Indonesia', type: 'twitter', platform: 'twitter' },
    { name: 'Facebook Indonesia', type: 'facebook', platform: 'facebook' },
    { name: 'Instagram', type: 'instagram', platform: 'instagram' },
    { name: 'Online News', type: 'news', platform: 'news' },
    { name: 'YouTube', type: 'youtube', platform: 'youtube' },
  ];
  for (const s of sources) {
    await supabase.from('sources').upsert({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      name: s.name,
      type: s.type,
      category: s.type,
      is_active: true,
      last_sync_at: new Date().toISOString(),
      last_status: 'success',
      config: { platform: s.platform },
    });
  }
  console.log('   ✅ Done');

  // Signals (30 samples)
  console.log('📊 Signals...');
  const sentiments = ['positive', 'negative', 'neutral', 'mixed'];
  const platforms = ['twitter', 'facebook', 'news', 'youtube'];
  const topics = [
    ['technology', 'ai'], ['politics', 'election'], ['economy', 'market'],
    ['health', 'vaccine'], ['sports', 'football']
  ];

  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const publishedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    const topic = topics[Math.floor(Math.random() * topics.length)];
    await supabase.from('signals').insert({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      title: `Signal ${i + 1}: ${topic[0]} discussion trending`,
      content: `Sample content about ${topic.join(' and ')}`,
      platform: platforms[Math.floor(Math.random() * platforms.length)],
      sentiment: sentiments[Math.floor(Math.random() * sentiments.length)],
      sentiment_score: (Math.random() * 0.5 + 0.25).toFixed(2),
      severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      region: 'Indonesia',
      language: 'id',
      topics: topic,
      published_at: publishedAt.toISOString(),
    });
  }
  console.log('   ✅ Done');

  // Alerts (10 samples)
  console.log('🚨 Alerts...');
  const alertTypes = ['anomaly', 'trend', 'risk'];
  for (let i = 0; i < 10; i++) {
    await supabase.from('alerts').insert({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      title: `${alertTypes[i % 3]} detected in signal monitoring`,
      description: `Severity: ${['low', 'medium', 'high'][i % 3]}`,
      type: alertTypes[i % 3],
      severity: ['low', 'medium', 'high', 'critical'][i % 4],
      status: ['new', 'acknowledged', 'investigating'][i % 3],
      source: platforms[i % 4],
      created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
  console.log('   ✅ Done');

  // Narrative clusters
  console.log('🧠 Clusters...');
  const clusters = [
    { title: 'AI Regulation Debate', priority: 'high', velocity: 85.5 },
    { title: 'Election 2024 Impact', priority: 'critical', velocity: 92.3 },
    { title: 'Crypto Market Volatility', priority: 'medium', velocity: 65.0 },
  ];
  for (const c of clusters) {
    await supabase.from('narrative_clusters').insert({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      title: c.title,
      priority: c.priority,
      velocity: c.velocity,
      signal_count: Math.floor(Math.random() * 20) + 5,
      impact: c.priority === 'critical' ? 'high' : 'medium',
      lifecycle: 'active',
    });
  }
  console.log('   ✅ Done');

  // Action plans
  console.log('📋 Action Plans...');
  const plans = [
    { title: 'Develop AI Response Strategy', status: 'in_progress', priority: 'high' },
    { title: 'Monitor Election Coverage', status: 'pending', priority: 'critical' },
    { title: 'Weekly Report Generation', status: 'in_progress', priority: 'medium' },
  ];

  const demoUserId = (await supabase.from('user_profiles').select('id').eq('email', 'demo@narriv.test').single())?.data?.id;

  for (const p of plans) {
    await supabase.from('action_plans').insert({
      id: crypto.randomUUID(),
      workspace_id: workspaceId,
      title: p.title,
      type: 'response',
      priority: p.priority,
      status: p.status,
      created_by: demoUserId,
    });
  }
  console.log('   ✅ Done');

  console.log('\n🎉 Seeding complete!');
  console.log('\n📝 Demo Credentials:');
  console.log('   Email: demo@narriv.test');
  console.log('   Password: DemoPass123!');
  console.log('   Email: admin@narriv.test');
  console.log('   Password: DemoPass123!');
}

seed().catch(console.error);
