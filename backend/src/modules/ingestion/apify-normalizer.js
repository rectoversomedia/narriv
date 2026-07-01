import crypto from "crypto";

function normalizeText(value) {
    return String(value || "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

export function buildDeterministicDocHash({ workspaceId, sourceId, sourceType, item }) {
    const canonical = {
        workspaceId: normalizeText(workspaceId),
        sourceId: normalizeText(sourceId),
        sourceType: normalizeText(sourceType),
        url: normalizeText(item.url),
        title: normalizeText(item.title),
        content: normalizeText(item.text || item.description || item.snippet || item.title),
        author: normalizeText(item.author),
        publishedDate: normalizeText(item.publishedDate),
    };

    return crypto.createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

function firstValue(...values) {
    return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function fieldValue(object, path) {
    if (!object || !path) return undefined;
    if (object[path] !== undefined && object[path] !== null) return object[path];
    return path.split(".").reduce((current, key) => {
        if (current === undefined || current === null) return undefined;
        return current[key];
    }, object);
}

function normalizeSocialAuthor(value) {
    if (!value) return null;
    if (typeof value === "string") return value;
    return firstValue(value.name, value.userName, value.username, value.nickName, value.fullName, value.id) || null;
}

function normalizePublishedDate(value) {
    if (!value) return null;
    if (typeof value === "number") {
        const timestamp = value > 1000000000000 ? value : value * 1000;
        return new Date(timestamp).toISOString();
    }
    return value;
}

export function parseDateOrNull(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function compactObject(value) {
    return Object.fromEntries(
        Object.entries(value).filter(([, entry]) => {
            if (entry === undefined || entry === null) return false;
            if (Array.isArray(entry)) return entry.length > 0;
            if (typeof entry === "object") return Object.keys(entry).length > 0;
            return String(entry).trim() !== "";
        })
    );
}

function normalizeLocationHint(item) {
    const place = item.place && typeof item.place === "object" && Object.keys(item.place).length > 0 ? item.place : null;
    const coordinates = firstValue(
        item.coordinates,
        item.geo,
        item.geocode,
        item.location?.coordinates,
        place?.coordinates,
        place?.bounding_box,
        item.location_latitude && item.location_longitude ? { lat: item.location_latitude, lng: item.location_longitude } : null,
        item.latitude && item.longitude ? { lat: item.latitude, lng: item.longitude } : null
    );
    const label = firstValue(
        item.location,
        item.locationName,
        item.location_name,
        item.locationCreated,
        fieldValue(item, "locationCreated"),
        item.channelLocation,
        fieldValue(item, "channelLocation"),
        item.shop_city,
        fieldValue(item, "shop_city"),
        item.shop?.location,
        item.seller?.location,
        item.location_city,
        item.location_address,
        place?.name,
        place?.full_name,
        place?.country,
        item.country,
        item.countryCode,
        item.proxyCountry,
        fieldValue(item, "countryCode"),
        fieldValue(item, "proxyCountry")
    );
    const source = firstValue(
        coordinates ? "coordinates" : null,
        place ? "platform_place" : null,
        item.locationCreated ? "tiktok_location_created" : null,
        item.channelLocation ? "youtube_channel_location" : null,
        item.shop_city || item.shop?.location || item.location ? "commerce_seller_location" : null,
        item.country || item.countryCode || item.proxyCountry ? "country_hint" : null
    );

    return compactObject({
        label: typeof label === "object" ? firstValue(label.name, label.full_name, label.city, label.country) : label,
        coordinates,
        source,
        rawPlace: place,
        country: firstValue(item.locationCreated, item.country, item.countryCode, item.proxyCountry, place?.country),
        city: firstValue(item.location_city, item.shop_city, item.shop?.location, item.location),
        address: firstValue(item.location_address),
    });
}

function normalizeMediaUrls(item) {
    const candidates = [
        item.image,
        item.imageUrl,
        item.image_url,
        item.displayUrl,
        item.thumbnailUrl,
        item.coverImage,
        item.videoMeta?.coverUrl,
        item.videoMeta?.originalCoverUrl,
        item.authorMeta?.avatar,
        fieldValue(item, "videoMeta.coverUrl"),
        fieldValue(item, "videoMeta.originalCoverUrl"),
        fieldValue(item, "authorMeta.avatar"),
        item.coverArt?.sources?.[0]?.url,
        item.data?.thumbnails?.[0]?.url,
    ].filter(Boolean);
    if (Array.isArray(item.mediaUrls)) candidates.push(...item.mediaUrls);
    if (Array.isArray(item.images)) candidates.push(...item.images);
    if (Array.isArray(item.carousel_media)) candidates.push(...item.carousel_media);
    return [...new Set(candidates.map(String))];
}

function normalizeEngagement(item) {
    return compactObject({
        likes: firstValue(item.likeCount, item.likesCount, item.diggCount),
        replies: firstValue(item.replyCount, item.commentCount, item.commentsCount),
        shares: firstValue(item.shareCount),
        retweets: firstValue(item.retweetCount),
        quotes: firstValue(item.quoteCount),
        bookmarks: firstValue(item.bookmarkCount, item.collectCount),
        views: firstValue(item.viewCount, item.playCount, item.views),
        rating: firstValue(item.rating, item.rating_star, item.rating?.averageRating),
        sold: firstValue(item.sold, item.sold_count, item.soldCount),
    });
}

function normalizeActorMetadata(item) {
    const locationHint = normalizeLocationHint(item);
    return compactObject({
        language: firstValue(item.lang, item.textLanguage, item.language, item.languageCode, fieldValue(item, "textLanguage")),
        locationHint,
        mediaUrls: normalizeMediaUrls(item),
        engagement: normalizeEngagement(item),
        searchQuery: firstValue(item.searchQuery, item._searchQuery, item.query, item.keyword),
        hashtags: item.hashtags,
        mentions: item.mentions,
        category: firstValue(item.category, item.category_name, item.productType, item.mediaType),
        sourceUrl: firstValue(item.url, item.twitterUrl, item.webVideoUrl, item.product_url, item.playlistUrl, item.channelUrl, item.inputUrl, fieldValue(item, "data.playlistUrl"), fieldValue(item, "data.channelUrl")),
        rawActorType: firstValue(item.type, item.product_type, item.mediaType),
    });
}

export function normalizeDatasetItem(item) {
    if (Array.isArray(item.organicResults) && item.organicResults.length > 0) {
        return item.organicResults.map((result) => ({
            id: result.id || result.position || result.url,
            title: result.title,
            url: result.url,
            text: result.description || result.snippet || result.title,
            description: result.description || result.snippet,
            author: result.source || null,
            publishedDate: result.date || null,
            platform: "google-search",
            _searchQuery: item.searchQuery?.query || item.query || "",
            actorMetadata: normalizeActorMetadata({ ...result, _searchQuery: item.searchQuery?.query || item.query || "" }),
        }));
    }

    const nestedData = item.data && typeof item.data === "object" ? item.data : {};
    const title = firstValue(
        item.title,
        item.pageTitle,
        item.name,
        item.fullName,
        item.videoTitle,
        item.caption,
        item.text,
        fieldValue(item, "text"),
        item.media_name,
        item.product_name,
        nestedData.title
    );
    const text = firstValue(
        item.text,
        fieldValue(item, "text"),
        item.full_text,
        item.caption,
        item.description,
        item.snippet,
        item.content,
        item.body,
        item.transcript,
        item.htmlDescription,
        nestedData.description,
        item.title
    );
    const url = firstValue(
        item.url,
        item.link,
        item.permalink,
        item.postUrl,
        item.videoUrl,
        item.webVideoUrl,
        item.twitterUrl,
        item.product_url,
        fieldValue(item, "product_url"),
        item.playlistUrl,
        item.channelUrl,
        item.displayUrl,
        item.inputUrl,
        nestedData.playlistUrl,
        nestedData.channelUrl
    );
    const author = firstValue(
        normalizeSocialAuthor(item.author),
        normalizeSocialAuthor(item.authorMeta),
        normalizeSocialAuthor({ name: fieldValue(item, "authorMeta.name") }),
        normalizeSocialAuthor(item.publisher),
        item.username,
        item.ownerUsername,
        item.userName,
        item.channelName,
        item.profileName,
        item.creator,
        item.shop_name,
        fieldValue(item, "shop_name"),
        item.shop?.name,
        nestedData.creator
    );
    const publishedDate = normalizePublishedDate(firstValue(
        item.publishedDate,
        item.published_at,
        item.timestamp,
        item.date,
        item.createdAt,
        item.createTimeISO,
        fieldValue(item, "createTimeISO"),
        item.createTime,
        item.takenAt,
        item.creationDate,
        item.publishedAt,
        item.releaseDate?.isoString,
        item.scrapedAt
    ));
    const id = firstValue(item.id, item.postId, item.tweetId, item.videoId, item.shortCode, item.product_id, item.item_id, item.uri, nestedData.playlistId, url);
    const actorMetadata = normalizeActorMetadata({ ...item, ...nestedData });
    const locationHint = actorMetadata.locationHint || {};

    return [{
        ...item,
        id,
        title,
        text,
        url,
        author,
        publishedDate,
        platform: firstValue(item.platform, item.source, item["source:"], item.type, item.media_name, item.mediaType),
        language: actorMetadata.language,
        region: locationHint.label || locationHint.city || locationHint.country || null,
        actorMetadata,
    }];
}
