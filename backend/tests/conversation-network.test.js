import { jest } from '@jest/globals';
import { createMemoryDb } from './helpers/memory-db.js';
import { supabaseModuleFor } from './helpers/fake-supabase.js';

jest.unstable_mockModule('../src/lib/supabase.js', () => supabaseModuleFor(createMemoryDb()));
const { buildNetwork, commentSentiment, detectCoordination, normalizeText } = await import('../src/lib/conversation-network.js');
const { parseTelegramPage, telegramChannels } = await import('../src/modules/ingestion/telegram.service.js');
const { videoIdOf } = await import('../src/modules/network/youtube-comments.service.js');

const at = (m) => new Date(Date.parse('2026-11-18T10:00:00Z') + m * 60000).toISOString();
const c = (id, author, signal, text, extra = {}) => ({ external_id: id, author_id: author, author_name: author.toUpperCase(), signal_id: signal, text, like_count: 0, published_at: at(0), sentiment: commentSentiment(text), ...extra });

describe('conversation network', () => {
  it('reads tone from informal comments', () => {
    expect(commentSentiment('aplikasinya lemot banget, kecewa')).toBe('negative');
    expect(commentSentiment('Mantap, terima kasih Mandiri')).toBe('positive');
    expect(commentSentiment('kapan rilis?')).toBe('neutral');
  });

  it('groups accounts into camps by the videos they gather around and who they reply to', () => {
    const comments = [
      c('1', 'a', 'v1', 'kecewa layanannya lemot'), c('2', 'b', 'v1', 'iya parah', { reply_to_author_id: 'a', reply_to_author_name: 'A' }),
      c('3', 'c', 'v1', 'setuju kecewa', { reply_to_author_id: 'a', reply_to_author_name: 'A' }), c('4', 'a', 'v1', 'lambat sekali'),
      c('5', 'x', 'v2', 'mantap ATM emasnya'), c('6', 'y', 'v2', 'keren, terima kasih'), c('7', 'z', 'v2', 'bagus', { reply_to_author_id: 'x', reply_to_author_name: 'X' }),
    ];
    const videos = [{ id: 'v1', title: 'Keluhan Livin', author: 'Kanal A', url: 'u1' }, { id: 'v2', title: 'ATM Emas', author: 'Kanal B', url: 'u2' }];
    const net = buildNetwork(comments, videos);
    expect(net.stats).toMatchObject({ accounts: 6, comments: 7, replies: 3, videos: 2 });
    expect(net.camps).toHaveLength(2);
    const tones = net.camps.map((k) => k.tone).sort();
    expect(tones).toEqual(['negative', 'positive']);
    expect(net.topAccounts[0]).toMatchObject({ name: 'A', repliesReceived: 2 });
    expect(net.edges.some((e) => e.kind === 'reply' && e.source === 'acc:b' && e.target === 'acc:a')).toBe(true);
    expect(net.nodes.some((n) => n.kind === 'video' && n.label === 'ATM Emas')).toBe(true);
  });

  it('flags the same text from several accounts close together, and posting bursts', () => {
    const same = 'Bank ini paling aman dan terpercaya, pindah sekarang juga!';
    const comments = [
      c('1', 'p', 'v1', same, { published_at: at(0) }), c('2', 'q', 'v2', `${same} `, { published_at: at(5) }), c('3', 'r', 'v3', same.toUpperCase(), { published_at: at(12) }),
      c('4', 's', 'v1', same, { published_at: at(60 * 30) }),
      ...[1, 2, 3, 4, 5, 6].map((i) => c(`b${i}`, 'busy', `v${(i % 3) + 1}`, `komentar ${i}`, { published_at: at(i * 10) })),
    ];
    const found = detectCoordination(comments);
    const sameText = found.find((f) => f.kind === 'same_text');
    expect(sameText).toBeUndefined(); // 4 accounts, but spread over 30 hours
    const close = detectCoordination(comments.slice(0, 3));
    expect(close[0]).toMatchObject({ kind: 'same_text', accountCount: 3, spanMinutes: 12 });
    expect(found.find((f) => f.kind === 'burst')).toMatchObject({ account: 'BUSY', posts: 6, videos: 3 });
    expect(normalizeText('Halo @budi! cek https://x.co/a')).toBe('halo cek');
  });
});

describe('free social sources', () => {
  it('parses a public Telegram channel page', () => {
    const html = `<div class="tgme_widget_message_wrap js-widget_message_wrap"><div class="tgme_widget_message" data-post="cnbcid/123">
      <div class="tgme_widget_message_text js-message_text" dir="auto">Bank Mandiri catat laba &amp; kredit naik<br/>Selengkapnya</div>
      <span class="tgme_widget_message_views">12.5K</span><time datetime="2026-11-18T04:13:35+00:00" class="time">04:13</time></div></div>`;
    expect(parseTelegramPage(html)).toEqual([{ post: 'cnbcid/123', text: 'Bank Mandiri catat laba & kredit naik\nSelengkapnya', publishedAt: '2026-11-18T04:13:35+00:00', views: 12500 }]);
    expect(telegramChannels({ telegramChannels: ['@KompasTV', 'https://t.me/s/infobmkg', 'x'] })).toEqual(expect.arrayContaining(['kompastv', 'infobmkg']));
  });

  it('finds the video id of a stored YouTube record', () => {
    expect(videoIdOf({ url: 'https://www.youtube.com/watch?v=d2vzGAUmw8Q' })).toBe('d2vzGAUmw8Q');
    expect(videoIdOf({ url: 'https://news.example/a' })).toBeNull();
  });
});
