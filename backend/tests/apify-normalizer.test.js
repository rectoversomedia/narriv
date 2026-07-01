import { normalizeDatasetItem, parseDateOrNull } from "../src/modules/ingestion/apify-normalizer.js";

describe("Apify dataset normalizer", () => {
  it("normalizes TikTok flattened actor output into signal-ready fields", () => {
    const [item] = normalizeDatasetItem({
      id: "7543693751290481942",
      text: "ootd #viral",
      textLanguage: "en",
      createTime: 1756403075,
      "authorMeta.name": "gretalynnhihi",
      "authorMeta.avatar": "https://example.com/avatar.jpg",
      "videoMeta.coverUrl": "https://example.com/cover.jpg",
      webVideoUrl: "https://www.tiktok.com/@gretalynnhihi/video/7543693751290481942",
      diggCount: 23400,
      shareCount: 145,
      playCount: 145900,
      commentCount: 46,
      searchQuery: "ootd",
    });

    expect(item).toMatchObject({
      id: "7543693751290481942",
      text: "ootd #viral",
      title: "ootd #viral",
      author: "gretalynnhihi",
      url: "https://www.tiktok.com/@gretalynnhihi/video/7543693751290481942",
      language: "en",
    });
    expect(item.publishedDate).toBe("2025-08-28T17:44:35.000Z");
    expect(item.actorMetadata).toMatchObject({
      language: "en",
      searchQuery: "ootd",
      sourceUrl: "https://www.tiktok.com/@gretalynnhihi/video/7543693751290481942",
      engagement: {
        likes: 23400,
        replies: 46,
        shares: 145,
        views: 145900,
      },
    });
    expect(item.actorMetadata.mediaUrls).toEqual([
      "https://example.com/cover.jpg",
      "https://example.com/avatar.jpg",
    ]);
  });

  it("preserves Twitter place and language hints for region metadata", () => {
    const [item] = normalizeDatasetItem({
      type: "tweet",
      id: "1728108619189874825",
      twitterUrl: "https://twitter.com/elonmusk/status/1728108619189874825",
      text: "More than 10 per human on average",
      createdAt: "Fri Nov 24 17:49:36 +0000 2023",
      lang: "en",
      place: {
        name: "Jakarta",
        full_name: "Jakarta, Indonesia",
        country: "Indonesia",
      },
      author: {
        userName: "elonmusk",
        name: "Elon Musk",
      },
      likeCount: 104121,
      replyCount: 6526,
      retweetCount: 11311,
      quoteCount: 2915,
    });

    expect(item).toMatchObject({
      platform: "tweet",
      author: "Elon Musk",
      url: "https://twitter.com/elonmusk/status/1728108619189874825",
      language: "en",
      region: "Jakarta",
    });
    expect(item.actorMetadata.locationHint).toMatchObject({
      label: "Jakarta",
      source: "platform_place",
      country: "Indonesia",
      rawPlace: {
        name: "Jakarta",
        full_name: "Jakarta, Indonesia",
        country: "Indonesia",
      },
    });
    expect(item.actorMetadata.engagement).toMatchObject({
      likes: 104121,
      replies: 6526,
      retweets: 11311,
      quotes: 2915,
    });
  });

  it("normalizes ecommerce and podcast location or nested data fields", () => {
    const [commerceItem] = normalizeDatasetItem({
      item_id: "sku-1",
      product_name: "Sepatu Lokal",
      product_url: "https://tokopedia.com/item/sku-1",
      shop_name: "Toko Jakarta",
      shop_city: "Jakarta Barat",
      sold_count: 82,
      rating_star: 4.8,
    });
    const [podcastItem] = normalizeDatasetItem({
      keyword: "tech",
      data: {
        title: "Tech Podcast Indonesia",
        creator: "Narriv Audio",
        playlistUrl: "https://music.youtube.com/playlist?list=abc",
        channelUrl: "https://music.youtube.com/channel/def",
        thumbnails: [{ url: "https://example.com/thumb.jpg" }],
      },
      scrapedAt: "2025-02-09T13:52:48.526Z",
    });

    expect(commerceItem).toMatchObject({
      id: "sku-1",
      title: "Sepatu Lokal",
      author: "Toko Jakarta",
      url: "https://tokopedia.com/item/sku-1",
      region: "Jakarta Barat",
    });
    expect(commerceItem.actorMetadata).toMatchObject({
      locationHint: {
        label: "Jakarta Barat",
        city: "Jakarta Barat",
      },
      engagement: {
        sold: 82,
        rating: 4.8,
      },
    });
    expect(podcastItem).toMatchObject({
      title: "Tech Podcast Indonesia",
      author: "Narriv Audio",
      url: "https://music.youtube.com/playlist?list=abc",
      publishedDate: "2025-02-09T13:52:48.526Z",
    });
    expect(podcastItem.actorMetadata.mediaUrls).toEqual(["https://example.com/thumb.jpg"]);
  });

  it("flattens Google organic results and safely handles invalid dates", () => {
    const results = normalizeDatasetItem({
      searchQuery: { query: "narriv forum lokal" },
      organicResults: [{
        position: 1,
        title: "Narriv Forum",
        url: "https://example.com/forum",
        description: "Forum result",
        source: "Example",
        date: "not a valid date",
      }],
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 1,
      title: "Narriv Forum",
      platform: "google-search",
      _searchQuery: "narriv forum lokal",
    });
    expect(results[0].actorMetadata.searchQuery).toBe("narriv forum lokal");
    expect(parseDateOrNull(results[0].publishedDate)).toBeNull();
  });
});
