Berikut aktor apify yang akan aku gunakan dalam project kali ini serta format JSONnya

- **apidojo/twitter-scraper-lite** - Twitter/X

```json
{
  "includeSearchTerms": false,
  "maxItems": 1000,
  "searchTerms": ["apify"],
  "sort": "Latest"
}
```

_Output Example_

```json
{
  "type": "tweet",
  "id": "1728108619189874825",
  "url": "https://x.com/elonmusk/status/1728108619189874825",
  "twitterUrl": "https://twitter.com/elonmusk/status/1728108619189874825",
  "text": "More than 10 per human on average",
  "retweetCount": 11311,
  "replyCount": 6526,
  "likeCount": 104121,
  "quoteCount": 2915,
  "createdAt": "Fri Nov 24 17:49:36 +0000 2023",
  "lang": "en",
  "quoteId": "1728107610631729415",
  "bookmarkCount": 702,
  "isReply": false,
  "card": {},
  "place": {},
  "source:": "Twitter for Android",
  "author": {
    "type": "user",
    "userName": "elonmusk",
    "url": "https://x.com/elonmusk",
    "twitterUrl": "https://twitter.com/elonmusk",
    "id": "44196397",
    "name": "Elon Musk",
    "isVerified": true,
    "isBlueVerified": true,
    "verifiedType": "business",
    "profilePicture": "https://pbs.twimg.com/profile_images/1683325380441128960/yRsRRjGO_normal.jpg",
    "followers": 172669889,
    "following": 538
  },
  "isRetweet": false,
  "isQuote": true,
  "article": {
    "id": "2023439310499033089",
    "title": "Human 3.0 – A Map To Reach The Top 1%",
    "previewText": "As corny as this may sound, I've always wanted to become an absolute unit of an individual.\nNot just having a nice and muscular body, but to be fully developed in every domain of life.\nI wanted to",
    "coverImage": "https://pbs.twimg.com/media/HBUzlGwbcAUboWU.jpg",
    "firstPublishedAt": "2026-02-17T15:19:19.000Z",
    "modifiedAt": "2026-02-17T15:19:19.000Z",
    "contentState": {
      "blocks": [
        {
          "text": "As corny as this may sound, I've always wanted to become an absolute unit of an individual.",
          "type": "unstyled"
        },
        {
          "text": "Not just having a nice and muscular body, but to be fully developed in every domain of life.",
          "type": "unstyled"
        },
        {
          "text": "I wanted to become multidimensionally jacked. I wanted to max out all of my stats. I didn't want to be an NPC. I wanted to be a level 100 player. All areas of the map unlocked. Maxed out physicality, intellect, and professions. Bank overflowing with gold. I wanted to do it all. Mind, body, spirit, relationships, money.",
          "type": "unstyled"
        },
        {
          "text": "This desire has drastically influenced my life.",
          "type": "unstyled"
        },
        {
          "text": "As a teenager, I became obsessed with fitness. Then, I wanted to absorb as much knowledge as possible. Then I wanted to be free, so I failed at various business models until I finally made one work. I've had various spiritual and philosophical stints that I believe have helped me see “superficial pursuits” like money and fitness in a completely different light than the average person.",
          "type": "unstyled"
        }
      ],
      "media": [
        "https://pbs.twimg.com/media/HBS03csaQfAAS2XG.jpg",
        "https://pbs.twimg.com/media/HBS0p4jaAsAAlVJq.jpg",
        "https://pbs.twimg.com/media/HBS0hdea8aAA3BNH.jpg",
        "https://pbs.twimg.com/media/HBS0t9sbacAUW8wX.jpg",
        "https://pbs.twimg.com/media/HBS0x6abacAUYi4G.jpg"
      ]
    }
  }
}
```

_Input Parameter JSON_

| Field              | Type    | Description                                                                                                                                                                                                                                    | Default value |
| ------------------ | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| startUrls          | array   | Twitter (X) URLs. Paste the URLs and get the results immediately. Tweet, Article, Profile, Search or List URLs are supported.                                                                                                                  | []            |
| searchTerms        | array   | Search terms you want to search from Twitter (X). You can refer to this documentation.                                                                                                                                                         | []            |
| twitterHandles     | array   | Twitter handles that you want to search on Twitter (X)                                                                                                                                                                                         | []            |
| conversationIds    | array   | Conversation IDs that you want to search on Twitter (X)                                                                                                                                                                                        | []            |
| tweetLanguage      | String  | Restricts tweets to the given language, given by an ISO 639-1 code.                                                                                                                                                                            | null          |
| maxItems           | number  | Maximum number of items that you want to receive as output                                                                                                                                                                                     | Infinity      |
| onlyVerifiedUsers  | Boolean | If selected, only returns tweets by users who are verified.                                                                                                                                                                                    | false         |
| onlyTwitterBlue    | Boolean | If selected, only returns tweets by users who are Twitter Blue subscribers.                                                                                                                                                                    | false         |
| onlyImage          | Boolean | If selected, only returns tweets that contain images.                                                                                                                                                                                          | false         |
| onlyVideo          | Boolean | If selected, only returns tweets that contain videos.                                                                                                                                                                                          | false         |
| onlyQuote          | Boolean | If selected, only returns tweets that are quotes.                                                                                                                                                                                              | false         |
| author             | String  | Returns tweets sent by the given user. It should be a Twitter (X) Handle.                                                                                                                                                                      | null          |
| inReplyTo          | String  | Returns tweets that are replies to the given user. It should be a Twitter (X) Handle.                                                                                                                                                          | null          |
| mentioning         | String  | Returns tweets mentioning the given user. It should be a Twitter (X) Handle.                                                                                                                                                                   | null          |
| geotaggedNear      | String  | Returns tweets sent near the given location.                                                                                                                                                                                                   | null          |
| withinRadius       | String  | Returns tweets sent within the given radius of the given location.                                                                                                                                                                             | null          |
| geocode            | String  | Returns tweets sent by users located within a given radius of the given latitude/longitude.                                                                                                                                                    | null          |
| placeObjectId      | String  | Returns tweets tagged with the given place.                                                                                                                                                                                                    | null          |
| minimumRetweets    | Number  | Returns tweets with at least the given number of retweets.                                                                                                                                                                                     | null          |
| minimumFavorites   | Number  | Returns tweets with at least the given number of favorites.                                                                                                                                                                                    | null          |
| minimumReplies     | Number  | Returns tweets with at least the given number of replies.                                                                                                                                                                                      | null          |
| start              | String  | Returns tweets sent after the given date. Only works with searchTerms — does not apply to startUrls or twitterHandles. If you want to filter by date, the best way is to use Twitter queries.                                                  | null          |
| end                | String  | Returns tweets sent before the given date. Only works with searchTerms — does not apply to startUrls or twitterHandles. If you want to filter by date, the best way is to use Twitter queries.                                                 | null          |
| includeSearchTerms | Boolean | If selected, a field will be added to each tweets about the search term that was used to find it.                                                                                                                                              | false         |
| customMapFunction  | String  | Function that takes each of the objects as argument and returns data that will be mapped by the function itself. This function is not intended for filtering, please don't use it for filtering purposes or you will get banned automatically. | null          |

- **clockworks/tiktok-scraper** - TikTok

```json
{
  "commentsPerPost": 0,
  "excludePinnedPosts": false,
  "hashtags": ["fyp"],
  "maxFollowersPerProfile": 0,
  "maxFollowingPerProfile": 0,
  "maxRepliesPerComment": 0,
  "proxyCountryCode": "None",
  "resultsPerPage": 100,
  "scrapeRelatedVideos": false,
  "shouldDownloadAvatars": false,
  "shouldDownloadCovers": false,
  "shouldDownloadMusicCovers": false,
  "shouldDownloadSlideshowImages": false,
  "shouldDownloadVideos": false,
  "topLevelCommentsPerPost": 0
}
```

`Another input JSON example`

```json
{
  "excludePinnedPosts": false,
  "hashtags": ["bananas"],
  "proxyCountryCode": "None",
  "resultsPerPage": 3,
  "scrapeRelatedVideos": false,
  "shouldDownloadAvatars": false,
  "shouldDownloadCovers": false,
  "shouldDownloadMusicCovers": false,
  "shouldDownloadSlideshowImages": false,
  "shouldDownloadSubtitles": false,
  "shouldDownloadVideos": false,
  "profileScrapeSections": ["videos"],
  "profileSorting": "latest",
  "searchSection": "",
  "maxProfilesPerQuery": 10
}
```

`Output Example JSON`

```json
{
  "authorMeta.avatar": "https://p16-common-sign-useastred.tiktokcdn-eu.com/tos-useast2a-avt-0068-euttp/61a7494d9eda0eb86828eead52022359~tplv-tiktokx-cropcenter:720:720.jpeg?dr=10399&refresh_token=a65e63ff&x-expires=1755694800&x-signature=XOOMwKmEYLBn69h5QqvfQ1AIWJA%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=no1a",
  "authorMeta.name": "bruniela_",
  "text": "🤣🤣🤣🤣🤣 #comeramabanana ",
  "diggCount": 5344,
  "shareCount": 701,
  "playCount": 55700,
  "commentCount": 24,
  "collectCount": 291,
  "videoMeta.duration": 16,
  "musicMeta.musicName": "som original",
  "musicMeta.musicAuthor": "fox_rus0",
  "musicMeta.musicOriginal": true,
  "createTimeISO": "2025-08-02T18:45:03.000Z",
  "webVideoUrl": "https://www.tiktok.com/@bruniela_/video/7534061113365859586"
}
```

Scraped TikTok search queries
The structure of each search query looks like this:

```json
{
    "id": "7543693751290481942",
    "text": "ootd ☁️☁️\n\n#foruyou #fürdich #outfit #fit #viralvideos ",
    "textLanguage": "en",
    "createTime": 1756403075,
    "createTimeISO": "2025-08-28T17:44:35.000Z",
    "isAd": false,
    "authorMeta": {
      "id": "6733984297591636998",
      "name": "gretalynnhihi",
      "profileUrl": "https://www.tiktok.com/@gretalynnhihi",
      "nickName": "Greta Lynn",
      "verified": false,
      "signature": "hellouu\nfashion | beauty | lifestyle",
      "bioLink": null,
      "originalAvatarUrl": "https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/3b43a9f163774c65e26adaec1f967e47~tplv-tiktokx-cropcenter:720:720.jpeg?dr=14579&refresh_token=fcabb4ab&x-expires=1756886400&x-signature=d8CUReHcX4aowTaVF0IEyBjmR%2FU%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=my",
      "avatar": "https://p16-sign-va.tiktokcdn.com/tos-maliva-avt-0068/3b43a9f163774c65e26adaec1f967e47~tplv-tiktokx-cropcenter:720:720.jpeg?dr=14579&refresh_token=fcabb4ab&x-expires=1756886400&x-signature=d8CUReHcX4aowTaVF0IEyBjmR%2FU%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=my",
      "privateAccount": false,
      "following": 269,
      "friends": 0,
      "fans": 51200,
      "heart": 3000000,
      "video": 259,
      "digg": 194800
    },
    "musicMeta": {
      "musicName": "original sound",
      "musicAuthor": "WYA ADRIAN | DJ",
      "musicOriginal": true,
      "playUrl": "https://v16-webapp-prime.tiktok.com/video/tos/alisg/tos-alisg-v-27dcd7/ooAABQ65hGAfoXtbJMFsDAveXADIAI8mOQfK7e/?a=1988&bti=ODszNWYuMDE6&ch=0&cr=0&dr=0&er=0&lr=default&cd=0%7C0%7C0%7C0&br=250&bt=125&ds=5&ft=GNDpcInz7ThIGk1KXq8Zmo&mime_type=audio_mpeg&qs=13&rc=am9zb3U5cnd3NDMzODU8NEBpam9zb3U5cnd3NDMzODU8NEBzLXNgMmRrLXJhLS1kMS1zYSNzLXNgMmRrLXJhLS1kMS1zcw%3D%3D&btag=e00048000&expire=1756719062&l=20250901163023662894E4DEC436DB346D&ply_type=3&policy=3&signature=38ed21c64984e54c193163a1082b1510&tk=0",
      "coverMediumUrl": "https://p16-sign-sg.tiktokcdn.com/tos-alisg-avt-0068/10da069b962f021877c87e22cd0a822d~tplv-tiktokx-cropcenter:720:720.jpeg?dr=14579&refresh_token=9e5b092f&x-expires=1756886400&x-signature=wG3JIjPN95oTAjFu11TJXQvbiQ4%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=my",
      "originalCoverMediumUrl": "https://p16-sign-sg.tiktokcdn.com/tos-alisg-avt-0068/10da069b962f021877c87e22cd0a822d~tplv-tiktokx-cropcenter:720:720.jpeg?dr=14579&refresh_token=9e5b092f&x-expires=1756886400&x-signature=wG3JIjPN95oTAjFu11TJXQvbiQ4%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=my",
      "musicId": "7529403355681147665"
    },
    "webVideoUrl": "https://www.tiktok.com/@gretalynnhihi/video/7543693751290481942",
    "mediaUrls": [],
    "videoMeta": {
      "height": 1024,
      "width": 576,
      "duration": 15,
      "coverUrl": "https://p16-pu-sign-no.tiktokcdn-eu.com/tos-no1a-p-0037-no/oYBpoCBE0YVCIgAE5AiiVAwanII7vSLAqBYBl~tplv-tiktokx-origin.image?dr=14575&x-expires=1756886400&x-signature=Y20ebi0TvRDw0ssEvFXKTAUIAxc%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my",
      "originalCoverUrl": "https://p16-pu-sign-no.tiktokcdn-eu.com/tos-no1a-p-0037-no/oYBpoCBE0YVCIgAE5AiiVAwanII7vSLAqBYBl~tplv-tiktokx-origin.image?dr=14575&x-expires=1756886400&x-signature=Y20ebi0TvRDw0ssEvFXKTAUIAxc%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=my",
      "definition": "540p",
      "format": "mp4"
    },
    "diggCount": 23400,
    "shareCount": 145,
    "playCount": 145900,
    "collectCount": 1637,
    "commentCount": 46,
    "mentions": [],
    "detailedMentions": [],
    "hashtags": [
      {
        "id": "4982299",
        "name": "foruyou",
        "title": "",
        "cover": ""
      }
    ],
    "effectStickers": [],
    "isSlideshow": false,
    "isPinned": false,
    "searchQuery": "ootd"
  },
```

Scraped TikTok profiles
The structure of each TikTok profile looks like this:

```json
{
    "id": "7535448384170331414",
    "text": "",
    "textLanguage": "un",
    "createTime": 1754483302,
    "createTimeISO": "2025-08-06T12:28:22.000Z",
    "isAd": false,
    "authorMeta": {
      "id": "7002169437214213125",
      "name": "shaiie_foeva",
      "profileUrl": "https://www.tiktok.com/@shaiie_foeva",
      "nickName": "Shaiie_Foeva",
      "verified": false,
      "signature": "SHOP THE E-BOOK OUT NOW",
      "bioLink": "https://fkrtrz-v0.myshopify.com/collections/all",
      "originalAvatarUrl": "https://p16-common-sign-va.tiktokcdn-us.com/tos-maliva-avt-0068/a76fbd25290f391d7ad8b61fe5fa99e8~tplv-tiktokx-cropcenter:720:720.jpeg?dr=9640&refresh_token=985e467d&x-expires=1756886400&x-signature=NeHTiZJsr7cp6ijWQkiNso544Zg%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=f20df69d&idc=useast5",
      "avatar": "https://p16-common-sign-va.tiktokcdn-us.com/tos-maliva-avt-0068/a76fbd25290f391d7ad8b61fe5fa99e8~tplv-tiktokx-cropcenter:720:720.jpeg?dr=9640&refresh_token=985e467d&x-expires=1756886400&x-signature=NeHTiZJsr7cp6ijWQkiNso544Zg%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=f20df69d&idc=useast5",
      "commerceUserInfo": {
        "commerceUser": false
      },
      "privateAccount": false,
      "roomId": "",
      "ttSeller": false,
      "following": 0,
      "friends": 0,
      "fans": 2200000,
      "heart": 126000000,
      "video": 1036,
      "digg": 143
    },
    "musicMeta": {
      "musicName": "original sound - Shaiie_Foeva",
      "musicOriginal": false,
      "coverMediumUrl": "",
      "originalCoverMediumUrl": "",
      "musicId": "0"
    },
    "webVideoUrl": "https://www.tiktok.com/@shaiie_foeva/video/7535448384170331414",
    "mediaUrls": [],
    "videoMeta": {
      "height": 0,
      "width": 0,
      "duration": 0,
      "coverUrl": "https://p16-pu-sign-no.tiktokcdn-eu.com/tos-no1a-i-photomode-no/cead98ba6871473581e3b54fd7d4928d~tplv-photomode-image.jpeg?dr=10375&x-expires=1756886400&x-signature=PJ6XcL7snSio5PVn4c4y87AvDP8%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=9b759fb9&idc=no1a&ftpl=1",
      "originalCoverUrl": "https://p16-pu-sign-no.tiktokcdn-eu.com/tos-no1a-i-photomode-no/cead98ba6871473581e3b54fd7d4928d~tplv-photomode-image.jpeg?dr=10375&x-expires=1756886400&x-signature=PJ6XcL7snSio5PVn4c4y87AvDP8%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=9b759fb9&idc=no1a&ftpl=1"
    },
    "diggCount": 3951,
    "shareCount": 38,
    "playCount": 348100,
    "collectCount": 105,
    "commentCount": 111,
    "mentions": [],
    "detailedMentions": [],
    "hashtags": [],
    "effectStickers": [
      {
        "ID": "1286923318",
        "name": "Green Screen",
        "stickerStats": {
          "useCount": 0
        }
      }
    ],
    "isSlideshow": true,
    "slideshowImageLinks": [
      {
        "tiktokLink": "https://p16-pu-sign-no.tiktokcdn-eu.com/tos-no1a-i-photomode-no/cead98ba6871473581e3b54fd7d4928d~tplv-photomode-image.jpeg?dr=10375&x-expires=1756886400&x-signature=PJ6XcL7snSio5PVn4c4y87AvDP8%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=9b759fb9&idc=no1a&ftpl=1",
        "downloadLink": "https://p16-pu-sign-no.tiktokcdn-eu.com/tos-no1a-i-photomode-no/cead98ba6871473581e3b54fd7d4928d~tplv-photomode-image.jpeg?dr=10375&x-expires=1756886400&x-signature=PJ6XcL7snSio5PVn4c4y87AvDP8%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=9b759fb9&idc=no1a&ftpl=1"
      }
    ],
    "isPinned": true,
    "isSponsored": false,
    "input": "shaiie_foeva",
    "fromProfileSection": "videos"
  },
```

When you use the Followers and following profiles add-on, you get also this:

```json
{
  "connectedTo": {
    "id": "7002169437214213125",
    "name": "shaiie_foeva",
    "profileUrl": "https://www.tiktok.com/@shaiie_foeva",
    "nickName": "Shaiie_Foeva",
    "verified": false,
    "signature": "SHOP THE E-BOOK OUT NOW",
    "bioLink": "https://fkrtrz-v0.myshopify.com/collections/all",
    "originalAvatarUrl": "https://p16-pu-sign-no.tiktokcdn-eu.com/tos-no1a-avt-0068c001-no/a76fbd25290f391d7ad8b61fe5fa99e8~tplv-tiktokx-cropcenter:720:720.jpeg?dr=10399&refresh_token=8fe904c4&x-expires=1756886400&x-signature=6%2BIU4BT7Xgt0N5x7ZcrOun%2BI%2BOs%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=f20df69d&idc=no1a",
    "avatar": "https://p16-pu-sign-no.tiktokcdn-eu.com/tos-no1a-avt-0068c001-no/a76fbd25290f391d7ad8b61fe5fa99e8~tplv-tiktokx-cropcenter:720:720.jpeg?dr=10399&refresh_token=8fe904c4&x-expires=1756886400&x-signature=6%2BIU4BT7Xgt0N5x7ZcrOun%2BI%2BOs%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=f20df69d&idc=no1a",
    "commerceUserInfo": {
      "commerceUser": false
    },
    "privateAccount": false,
    "roomId": "",
    "ttSeller": false,
    "following": 0,
    "friends": 0,
    "fans": 2200000,
    "heart": 126000000,
    "video": 1036,
    "digg": 143
  },
  "connectionType": "follower",
  "connectionDescription": "anthonnytabach12 is a follower of shaiie_foeva"
}
```

Scraped TikTok video URLs
The structure of each video URL looks like this:

```json
{
    "id": "7533731959172861206",
    "text": "",
    "textLanguage": "un",
    "createTime": 1754083665,
    "createTimeISO": "2025-08-01T21:27:45.000Z",
    "locationCreated": "GB",
    "isAd": false,
    "authorMeta": {
      "id": "7002169437214213125",
      "name": "shaiie_foeva",
      "profileUrl": "https://www.tiktok.com/@shaiie_foeva",
      "nickName": "Shaiie_Foeva",
      "verified": false,
      "signature": "SHOP THE E-BOOK OUT NOW",
      "bioLink": "https://fkrtrz-v0.myshopify.com/collections/all",
      "originalAvatarUrl": "https://p16-pu-sign-no.tiktokcdn-eu.com/tos-no1a-avt-0068c001-no/a76fbd25290f391d7ad8b61fe5fa99e8~tplv-tiktokx-cropcenter:720:720.jpeg?dr=10399&refresh_token=8fe904c4&x-expires=1756886400&x-signature=6%2BIU4BT7Xgt0N5x7ZcrOun%2BI%2BOs%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=no1a",
      "avatar": "https://p16-pu-sign-no.tiktokcdn-eu.com/tos-no1a-avt-0068c001-no/a76fbd25290f391d7ad8b61fe5fa99e8~tplv-tiktokx-cropcenter:720:720.jpeg?dr=10399&refresh_token=8fe904c4&x-expires=1756886400&x-signature=6%2BIU4BT7Xgt0N5x7ZcrOun%2BI%2BOs%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=no1a",
      "privateAccount": false,
      "roomId": "",
      "ttSeller": false,
      "following": 0,
      "friends": 0,
      "fans": 2200000,
      "heart": 126000000,
      "video": 1036,
      "digg": 143,
      "commerceUserInfo": {
        "commerceUser": false
      }
    },
    "musicMeta": {
      "musicName": "original sound",
      "musicAuthor": "Shaiie_Foeva",
      "musicOriginal": true,
      "playUrl": "https://v16m.tiktokcdn-us.com/affaffc8161ba7cf237d6a76a848f2c3/68b5aeb4/video/tos/no1a/tos-no1a-v-2370-no/o8IMeA0AQE7AIqXARcrE7Ym8CKeTDnoGaILegz/?a=1233&bti=ODszNWYuMDE6&ch=0&cr=0&dr=0&er=0&lr=default&cd=0%7C0%7C0%7C0&br=250&bt=125&ds=5&ft=GSDrKInz7ThNbk1KXq8Zmo&mime_type=audio_mpeg&qs=13&rc=anR1ZHk5cm5tNTMzbzU8NUBpanR1ZHk5cm5tNTMzbzU8NUBzbS5kMmRzLzNhLS1kMTFzYSNzbS5kMmRzLzNhLS1kMTFzcw%3D%3D&vvpl=1&l=202509010832109DA1069212B8B50032D4&btag=e00050000",
      "coverMediumUrl": "https://p16-common-sign-no.tiktokcdn-us.com/tos-no1a-avt-0068c001-no/a76fbd25290f391d7ad8b61fe5fa99e8~tplv-tiktokx-cropcenter:720:720.jpeg?dr=9640&refresh_token=cec345e5&x-expires=1756886400&x-signature=8VL5b49uYMv3HPTXq5LPcNLlx0U%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5",
      "originalCoverMediumUrl": "https://p16-common-sign-no.tiktokcdn-us.com/tos-no1a-avt-0068c001-no/a76fbd25290f391d7ad8b61fe5fa99e8~tplv-tiktokx-cropcenter:720:720.jpeg?dr=9640&refresh_token=cec345e5&x-expires=1756886400&x-signature=8VL5b49uYMv3HPTXq5LPcNLlx0U%3D&t=4d5b0474&ps=13740610&shp=a5d48078&shcp=81f88b70&idc=useast5",
      "musicId": "7533731952105392918"
    },
    "webVideoUrl": "https://www.tiktok.com/@shaiie_foeva/video/7533731959172861206",
    "mediaUrls": [],
    "videoMeta": {
      "height": 1024,
      "width": 576,
      "duration": 74,
      "coverUrl": "https://p16-common-sign-no.tiktokcdn-us.com/tos-no1a-p-0037-no/oUIRDkoATOwuGrtNDFEI5jF2j0BBqgfeEMEJ2V~tplv-tiktokx-origin.image?dr=9636&x-expires=1756886400&x-signature=iO442BQBu6RpBX8qAj5wAfWg0tA%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=useast5",
      "originalCoverUrl": "https://p16-common-sign-no.tiktokcdn-us.com/tos-no1a-p-0037-no/oUIRDkoATOwuGrtNDFEI5jF2j0BBqgfeEMEJ2V~tplv-tiktokx-origin.image?dr=9636&x-expires=1756886400&x-signature=iO442BQBu6RpBX8qAj5wAfWg0tA%3D&t=4d5b0474&ps=13740610&shp=81f88b70&shcp=43f4a2f9&idc=useast5",
      "definition": "540p",
      "format": "mp4",
      "subtitleLinks": [
        {
          "language": "kor-KR",
          "downloadLink": "https://v16m-webapp.tiktokcdn-us.com/8f5a52f5d0320b9592c0a3af90aaedc3/68b7fd54/video/tos/useast5/tos-useast5-v-0068c799-tx/3db5dadedd20436ab0dda7dfeb98857e/?a=1988&bti=ODszNWYuMDE6&ch=0&cr=3&dr=0&lr=all&cd=0%7C0%7C0%7C&cv=1&br=11970&bt=5985&ds=4&ft=4KLMeMzm8Zmo0sgHfI4jVKYidpWrKsd.&mime_type=video_mp4&qs=13&rc=anM7Z3g5cnRtNTMzbzczNUBpanM7Z3g5cnRtNTMzbzczNUBqZWlrMmRzLjNhLS1kMTFzYSNqZWlrMmRzLjNhLS1kMTFzcw%3D%3D&l=202509010832109DA1069212B8B50032D4&btag=e00050000",
          "tiktokLink": "https://v16m-webapp.tiktokcdn-us.com/8f5a52f5d0320b9592c0a3af90aaedc3/68b7fd54/video/tos/useast5/tos-useast5-v-0068c799-tx/3db5dadedd20436ab0dda7dfeb98857e/?a=1988&bti=ODszNWYuMDE6&ch=0&cr=3&dr=0&lr=all&cd=0%7C0%7C0%7C&cv=1&br=11970&bt=5985&ds=4&ft=4KLMeMzm8Zmo0sgHfI4jVKYidpWrKsd.&mime_type=video_mp4&qs=13&rc=anM7Z3g5cnRtNTMzbzczNUBpanM7Z3g5cnRtNTMzbzczNUBqZWlrMmRzLjNhLS1kMTFzYSNqZWlrMmRzLjNhLS1kMTFzcw%3D%3D&l=202509010832109DA1069212B8B50032D4&btag=e00050000",
          "source": "MT",
          "sourceUnabbreviated": "machine translation",
          "version": "4"
        }
      ],
    "diggCount": 25900,
    "shareCount": 352,
    "playCount": 573900,
    "collectCount": 1356,
    "commentCount": 346,
    "mentions": [],
    "detailedMentions": [],
    "hashtags": [],
    "effectStickers": [
      {
        "name": "Green Screen",
        "ID": "308867"
      }
    ],
    "isSlideshow": false,
    "isPinned": false,
    "isSponsored": false,
    "submittedVideoUrl": "https://www.tiktok.com/@shaiie_foeva/video/7533731959172861206"
  }
```

- **apify/instagram-scraper** - Instagram

```json
{
  "addParentData": false,
  "directUrls": ["https://www.instagram.com/humansofny/"],
  "resultsLimit": 100,
  "resultsType": "posts",
  "searchLimit": 10,
  "searchType": "hashtag"
}
```

📸 Posts and carousels
Posts and carousels from a profile, hashtag, or place. Note: you can extract posts from a known list of profiles, or you can discover posts by hashtags and places.

Supported URL inputs:

https://www.instagram.com/natgeo/ (profile)
https://www.instagram.com/197622247/ (profile ID)
https://www.instagram.com/p/DLNsnpUTdVS/ (post)
https://www.instagram.com/explore/tags/crossfit/ (hashtag)
https://www.instagram.com/explore/locations/7538318/copenhagen/ (place)
Posts data sample

````json
{
"inputUrl": "https://www.instagram.com/p/DZxvMgyH8yR/",
"id": "3923124318436838545",
"type": "Image",
"shortCode": "DZxvMgyH8yR",
"caption": "In the Democratic Republic of the Congo, photographer @carstenpeter followed a team of scientists into the crater of Mount Nyiragongo, where they crossed the cooled surface of a lava lake that reached nearly 1,800°F (982°C). In 2021, an eruption sent a river of lava to the outskirts of nearby Goma, home to 1.5 million people.\n\nHead to the link in bio to uncover more iconic stories and images like this in our Nat Geo archive.",
"hashtags": [],
"mentions": ["carstenpeter"],
"url": "https://www.instagram.com/p/DZxvMgyH8yR/",
"commentsCount": 110,
"firstComment": "runnin up that hill",
"latestComments": [
{
"id": "18185100808388160",
"text": "runnin up that hill",
"ownerUsername": "liljuliff",
"timestamp": "2026-06-22T08:05:38.000Z",
"likesCount": 1
},
{
"id": "18107281966978531",
"text": "is bro in creative mode",
"ownerUsername": "csukitch",
"timestamp": "2026-06-22T07:57:01.000Z",
"likesCount": 0
}
],
"dimensionsHeight": 718,
"dimensionsWidth": 1080,
"displayUrl": "https://scontent.cdninstagram.com/.../722859170_n.jpg",
"images": [],
"alt": null,
"likesCount": 55952,
"timestamp": "2026-06-20T10:00:04.000Z",
"childPosts": [],
"ownerFullName": "National Geographic",
"ownerUsername": "natgeo",
"ownerId": "787132",
"isCommentsDisabled": false
}

🎞️ Reels
Reels from a profile, hashtag, or reel page. Note: you can extract reels from a known list of profiles, or you can discover reels by hashtags and places.

Supported URL inputs:

https://www.instagram.com/natgeo/ (profile)
https://www.instagram.com/humansofny/reels/ (reels section)
https://www.instagram.com/reel/CigMSGeD4Hd/ (single reel)
https://www.instagram.com/reels/CigMSGeD4Hd/ (plural form)
https://www.instagram.com/explore/tags/crossfit/ (hashtag)
Or a search query:

searchType: "hashtag", e.g. "travel" or "travel, fitness"
Reels data sample

{
"id": "3913028191006298064",
"type": "Video",
"shortCode": "DZN3mhZBQ_Q",
"caption": "The universe is full of clues hidden in light, and Webb has tools to find them.\n\nIn this video, learn about some of the most exciting discoveries Webb has made through spectroscopy, from mapping carbon dioxide on Jupiter's moon Europa, to characterizing the earliest known galaxies, to measuring cloud cover on a distant exoplanet.",
"hashtags": [],
"mentions": [],
"url": "https://www.instagram.com/p/DZN3mhZBQ_Q/",
"commentsCount": 92,
"dimensionsHeight": 1920,
"dimensionsWidth": 1080,
"images": ["https://scontent.cdninstagram.com/.../715570175_n.jpg"],
"videoUrl": "https://scontent.cdninstagram.com/.../AQNAWZ3Z8McL43Do9rcY6i8PMk.mp4",
"likesCount": 11481,
"timestamp": "2026-06-05T19:58:30.000Z",
"ownerFullName": "NASA Webb Telescope",
"ownerUsername": "nasawebb",
"ownerId": "549313808",
"isPinned": true,
"productType": "clips",
"videoDuration": 228,
"inputUrl": "https://www.instagram.com/nasawebb/reels/",
"firstComment": "hi :)",
"latestComments": [
{
"id": "18103001009006012",
"text": "hi :)",
"ownerUsername": "lina.mov1",
"timestamp": "2026-06-18T06:36:30.000Z",
"likesCount": 1
}
],
"displayUrl": "https://scontent.cdninstagram.com/.../715570175_n.jpg",
"audioUrl": "https://scontent.cdninstagram.com/.../AQPKnYITuQNYL1nTDTxgShU8ZT.mp4",
"alt": null,
"videoViewCount": 41365,
"videoPlayCount": 241820,
"childPosts": [],
"musicInfo": {
"artist_name": "nasawebb",
"song_name": "Original audio",
"uses_original_audio": true,
"should_mute_audio": false,
"should_mute_audio_reason": "",
"audio_id": "27237433435884969"
},
"isCommentsDisabled": false
}

💬 Comments
Comments from a single post or reel. Search queries are not supported for comments; only direct post or reel URLs.

Supported URL inputs:

https://www.instagram.com/p/DN8-GjPkgjS/ (post, shortCode)
https://www.instagram.com/p/3369450800358839406/ (post, ID)
https://www.instagram.com/reel/CigMSGeD4Hd/ (reel, shortCode)
https://www.instagram.com/reel/3515099125383817606/ (reel, ID)
Comments data sample

{
"postUrl": "https://www.instagram.com/p/DZ5T2XPllXv/",
"commentUrl": "https://www.instagram.com/p/DZ5T2XPllXv/c/18093536360613690",
"id": "18093536360613690",
"text": "We love you NASA 💙🌎🌊",
"ownerUsername": "mavideniz5521__",
"ownerProfilePicUrl": "https://scontent-ord5-3.cdninstagram.com/v/t51.2885-19/410567170_365154746196531_3259133934415110146_n.jpg?stp=dst-jpg_s150x150_tt6&_nc_cat=107&ccb=7-5&_nc_sid=f7ccc5&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=9sOZurNh10wQ7kNvwH2lslG&_nc_oc=Adq1_pie8-u-2EtJYEl_qHGdbHVPEViwwdaNVTeRuVtcy0yVD-YcEBgzf7WOYwalh7E&_nc_zt=24&_nc_ht=scontent-ord5-3.cdninstagram.com&_nc_ss=7ca8c&oh=00_Af_b-N0KUNf3uoWohP_2OjEfMwIGWeIIz9ADUutHKCs-Bg&oe=6A42E2E1",
"timestamp": "2026-06-22T17:24:20.000Z",
"repliesCount": null,
"replies": null,
"likesCount": 4,
"owner": {
"username": "mavideniz5521__",
"profile_pic_url": "https://scontent-ord5-3.cdninstagram.com/v/t51.2885-19/410567170_365154746196531_3259133934415110146_n.jpg?stp=dst-jpg_s150x150_tt6&_nc_cat=107&ccb=7-5&_nc_sid=f7ccc5&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=9sOZurNh10wQ7kNvwH2lslG&_nc_oc=Adq1_pie8-u-2EtJYEl_qHGdbHVPEViwwdaNVTeRuVtcy0yVD-YcEBgzf7WOYwalh7E&_nc_zt=24&_nc_ht=scontent-ord5-3.cdninstagram.com&_nc_ss=7ca8c&oh=00_Af_b-N0KUNf3uoWohP_2OjEfMwIGWeIIz9ADUutHKCs-Bg&oe=6A42E2E1",
"is_verified": false,
"id": "51071346237",
"fbid_v2": "17841450947133918",
"full_name": null,
"is_mentionable": null,
"is_private": null,
"profile_pic_id": null,
"latest_reel_media": null
}
},
{
"postUrl": "https://www.instagram.com/p/DZ5T2XPllXv/",
"commentUrl": "https://www.instagram.com/p/DZ5T2XPllXv/c/18077796728279537",
"id": "18077796728279537",
"text": "",
"ownerUsername": "_.chun_chun_maru._",
"ownerProfilePicUrl": "https://scontent-ord5-3.cdninstagram.com/v/t51.82787-19/726890359_18104011688095194_4173193513048581478_n.jpg?stp=dst-jpg_s150x150_tt6&_nc_cat=110&ccb=7-5&_nc_sid=f7ccc5&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=931kF_84KW0Q7kNvwHbqKVS&_nc_oc=AdozP0GFEU6uuF4FSGkA2UDIP66AFkSTgAkYspRYNcO-UkG5TPcuJOey5PziWM8LT5s&_nc_zt=24&_nc_ht=scontent-ord5-3.cdninstagram.com&_nc_gid=WLZ1_bwBtUL2keja-Fk0pQ&_nc_ss=7ca8c&oh=00_Af-A4YjociKUQQgaHfcRx9rGPnqDu-SfoZPcF39IufFARA&oe=6A42EBDB",
"timestamp": "2026-06-22T17:23:24.000Z",
"repliesCount": null,
"replies": null,
"likesCount": 220,
"owner": {
"username": "_.chun_chun_maru._",
"profile_pic_url": "https://scontent-ord5-3.cdninstagram.com/v/t51.82787-19/726890359_18104011688095194_4173193513048581478_n.jpg?stp=dst-jpg_s150x150_tt6&_nc_cat=110&ccb=7-5&_nc_sid=f7ccc5&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=931kF_84KW0Q7kNvwHbqKVS&_nc_oc=AdozP0GFEU6uuF4FSGkA2UDIP66AFkSTgAkYspRYNcO-UkG5TPcuJOey5PziWM8LT5s&_nc_zt=24&_nc_ht=scontent-ord5-3.cdninstagram.com&_nc_gid=WLZ1_bwBtUL2keja-Fk0pQ&_nc_ss=7ca8c&oh=00_Af-A4YjociKUQQgaHfcRx9rGPnqDu-SfoZPcF39IufFARA&oe=6A42EBDB",
"is_verified": false,
"id": "32824791193",
"fbid_v2": "17841432855813098",
"full_name": null,
"is_mentionable": null,
"is_private": null,
"profile_pic_id": null,
"latest_reel_media": null
},
"media": {
"first_party_cdn_proxied_images": {
"fixed_height": {
"url": "https://cdn.fbsbx.com/v/t59.2708-21/540281769_1516894573012379_4776510866004392932_n.gif?_nc_cat=101&ccb=1-7&_nc_sid=9dcd69&_nc_ohc=iFOxjs_ckzoQ7kNvwEQgcdT&_nc_oc=AdqKXbOItAjaB9JcMhqx7MtzZOYpbYGT9SPmNuZg_VADfaE-CxwSLGtgXMkMJt3ahZc&_nc_zt=7&_nc_ht=cdn.fbsbx.com&_nc_gid=WLZ1_bwBtUL2keja-Fk0pQ&_nc_ss=7ca8c&oh=03_Q7cD5gH7HrMkFlEK3VsYFNCeWhC8U-5B14403q6m_ejHgqPJWw&oe=6A3EE756"
}
},
"images": {
"fixed_height": {
"url": "https://static.cdninstagram.com/rsrc.php/v4/yr/r/xg_5YoVlvjp.gif"
}
},
"id": "1570703541415172"
}
},
{
"postUrl": "https://www.instagram.com/p/DZ5T2XPllXv/",
"commentUrl": "https://www.instagram.com/p/DZ5T2XPllXv/c/18119325979762265",
"id": "18119325979762265",
"text": "Anda el diablo, 😂😂",
"ownerUsername": "mr_ventura.j",
"ownerProfilePicUrl": "https://scontent-ord5-2.cdninstagram.com/v/t51.2885-19/482946673_610886311778265_2668206524915634709_n.jpg?stp=dst-jpg_s150x150_tt6&_nc_cat=104&ccb=7-5&_nc_sid=f7ccc5&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy44MjguQzMifQ%3D%3D&_nc_ohc=FIVuIcZTqkQQ7kNvwGW3APs&_nc_oc=AdrhdG57pw80dCHmaTX-MRdvfLX5iYJJ8oPnsao0wFImBqMfQn7RGFOY_shbwu7YrFI&_nc_zt=24&_nc_ht=scontent-ord5-2.cdninstagram.com&_nc_ss=7ca8c&oh=00_Af8niwMDCab4KfDLxkew8K3RP6dtHNLKaB4XWb7LQFvacw&oe=6A430456",
"timestamp": "2026-06-22T17:21:43.000Z",
"repliesCount": null,
"replies": null,
"likesCount": 3,
"owner": {
"username": "mr_ventura.j",
"profile_pic_url": "https://scontent-ord5-2.cdninstagram.com/v/t51.2885-19/482946673_610886311778265_2668206524915634709_n.jpg?stp=dst-jpg_s150x150_tt6&_nc_cat=104&ccb=7-5&_nc_sid=f7ccc5&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy44MjguQzMifQ%3D%3D&_nc_ohc=FIVuIcZTqkQQ7kNvwGW3APs&_nc_oc=AdrhdG57pw80dCHmaTX-MRdvfLX5iYJJ8oPnsao0wFImBqMfQn7RGFOY_shbwu7YrFI&_nc_zt=24&_nc_ht=scontent-ord5-2.cdninstagram.com&_nc_ss=7ca8c&oh=00_Af8niwMDCab4KfDLxkew8K3RP6dtHNLKaB4XWb7LQFvacw&oe=6A430456",
"is_verified": false,
"id": "4298523042",
"fbid_v2": "17841404171287315",
"full_name": null,
"is_mentionable": null,
"is_private": null,
"profile_pic_id": null,
"latest_reel_media": null
}
},
{
"postUrl": "https://www.instagram.com/p/DZ5T2XPllXv/",
"commentUrl": "https://www.instagram.com/p/DZ5T2XPllXv/c/18080756183267307",
"id": "18080756183267307",
"text": "Infinite space and yet we don’t know half of our ocean. Stop wasting resources for wondrous shit",
"ownerUsername": "idlehandsoraidolshands",
"ownerProfilePicUrl": "https://scontent-ord5-1.cdninstagram.com/v/t51.82787-19/589085310_18161660818396753_1518200406298839070_n.jpg?stp=dst-jpg_s150x150_tt6&_nc_cat=111&ccb=7-5&_nc_sid=f7ccc5&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=d00l4vlIpGgQ7kNvwEBivSj&_nc_oc=AdozkM1zr_i2jPZsH2WSUT1OLakC7nzhCKKuD0_E7z9muVqYIAoAS_D-cPoPdPT9yTs&_nc_zt=24&_nc_ht=scontent-ord5-1.cdninstagram.com&_nc_gid=WLZ1_bwBtUL2keja-Fk0pQ&_nc_ss=7ca8c&oh=00_Af-kGNEr1yj0T3kYro6HAF02e-2djfXgIZhezmZaJqxM3w&oe=6A42F8B1",
"timestamp": "2026-06-22T17:21:19.000Z",
"repliesCount": null,
"replies": null,
"likesCount": 1,
"owner": {
"username": "idlehandsoraidolshands",
"profile_pic_url": "https://scontent-ord5-1.cdninstagram.com/v/t51.82787-19/589085310_18161660818396753_1518200406298839070_n.jpg?stp=dst-jpg_s150x150_tt6&_nc_cat=111&ccb=7-5&_nc_sid=f7ccc5&efg=eyJ2ZW5jb2RlX3RhZyI6InByb2ZpbGVfcGljLnd3dy4xMDgwLkMzIn0%3D&_nc_ohc=d00l4vlIpGgQ7kNvwEBivSj&_nc_oc=AdozkM1zr_i2jPZsH2WSUT1OLakC7nzhCKKuD0_E7z9muVqYIAoAS_D-cPoPdPT9yTs&_nc_zt=24&_nc_ht=scontent-ord5-1.cdninstagram.com&_nc_gid=WLZ1_bwBtUL2keja-Fk0pQ&_nc_ss=7ca8c&oh=00_Af-kGNEr1yj0T3kYro6HAF02e-2djfXgIZhezmZaJqxM3w&oe=6A42F8B1",
"is_verified": false,
"id": "11823308752",
"fbid_v2": "17841411902567913",
"full_name": null,
"is_mentionable": null,
"is_private": null,
"profile_pic_id": null,
"latest_reel_media": null
}

👤 Profile details
Profile metadata: bio, followers, posts count, verified status.

Supported URL inputs:

https://www.instagram.com/nike/ (username)
https://www.instagram.com/13460080/ (profile ID)
https://www.instagram.com/humansofny/reels/ (reels section)
Profile data sample

{
"inputUrl": "https://www.instagram.com/humansofny/",
"id": "242598499",
"username": "humansofny",
"url": "https://www.instagram.com/humansofny",
"fullName": "Humans of New York",
"biography": "New York City, one story at a time.\nCreated by Brandon Stanton\nDear New York available wherever books are sold.",
"externalUrls": [
{
"title": "Join HONY's Patreon",
"url": "https://bit.ly/4tX4uZt",
"link_type": "external"
}
],
"externalUrl": "https://bit.ly/4tX4uZt",
"followersCount": 12613771,
"followsCount": 738,
"highlightReelCount": 1,
"isBusinessAccount": false,
"joinedRecently": false,
"businessCategoryName": null,
"private": false,
"verified": true,
"profilePicUrl": "https://scontent.cdninstagram.com/.../488057622_n.jpg",
"profilePicUrlHD": "https://scontent.cdninstagram.com/.../488057622_n.jpg",
"igtvVideoCount": 0,
"postsCount": 5863,
"fbid": "17841401154973790",
"latestPosts": [
{
"id": "3741054891297971261",
"type": "Video",
"shortCode": "DPq5ZpJDZw9",
"caption": "Dear New York closes on October 19th. It's been the honor and joy of my life to see this take flight...",
"hashtags": [],
"mentions": [],
"url": "https://www.instagram.com/p/DPq5ZpJDZw9/",
"commentsCount": 942,
"dimensionsHeight": 1136,
"dimensionsWidth": 640,
"displayUrl": "https://scontent.cdninstagram.com/.../562558918_n.jpg",
"videoUrl": "https://scontent.cdninstagram.com/.../AQOZS_IaHCgcUdg7VqoJnQrUb7g.mp4",
"likesCount": 106869,
"videoViewCount": 1024817,
"timestamp": "2025-10-11T13:27:07.000Z",
"ownerUsername": "humansofny",
"ownerId": "242598499",
"productType": "clips",
"isPinned": true,
"isCommentsDisabled": false
}
]
}

📍 Place details
Location metadata: name, coordinates, category, post count.

Supported URL inputs:

https://www.instagram.com/explore/locations/7538318/copenhagen/ (with slug)
https://www.instagram.com/explore/locations/7538318/ (ID only)
Place details sample

{
"inputUrl": "https://www.instagram.com/explore/locations/218622660/lucerna-music-bar/",
"name": "Lucerna Music Bar",
"phone": "",
"category": "Live Music Venue",
"media_count": 41997,
"price_range": 0,
"lat": 50.081113650673,
"lng": 14.425622825572,
"slug": "lucerna-music-bar",
"location_id": "218622660",
"location_address": "Vodičkova 36",
"location_city": "",
"location_zip": "110 00",
"ig_business": {
"profile": {
"profile_pic_url": "https://scontent.cdninstagram.com/.../711514083_n.jpg",
"username": "lucernamusicbar",
"id": "571745390"
}
},
"posts": [
{
"code": "DOyoz3eDwda",
"id": "3725219327902680922_2428242588",
"taken_at": 1758300771,
"product_type": "carousel_container",
"username": "rikafiorentina_ride",
"caption": "getting ready for #ridePRG #INTERPLAYeurope2025\n3 May 2025\nLucerna Music Bar, Prague 🇨🇿\n#rikafiorentina_ride",
"like_count": 1,
"comment_count": 0,
"location": "Lucerna Music Bar",
"carousel_media": [
"https://scontent.cdninstagram.com/.../551088079_n.jpg",
"https://scontent.cdninstagram.com/.../550191647_n.jpg",
"https://scontent.cdninstagram.com/.../551959801_n.jpg"
]
}
],
"hours": {
"status": ""
}
}

🏷️ Mentions
Posts where a profile is tagged. Requires a known profile URL or ID.

Supported URL inputs:

https://www.instagram.com/nike/ (profile)
https://www.instagram.com/197622247/ (profile ID)
https://www.instagram.com/humansofny/reels/ (profile reels section)
Mentions data sample

{
"inputUrl": "https://www.instagram.com/humansofny/reels/",
"id": "3924787795441061311",
"type": "Sidecar",
"shortCode": "DZ3pbSeDY2_",
"caption": "Infinitely grateful to the @humansofny community for helping @stephen_james_campbell start his new life...",
"hashtags": ["gratefulthankfulblessed", "summersolsticeblessings"],
"mentions": ["humansofny", "stephen_james_campbell"],
"url": "https://www.instagram.com/p/DZ3pbSeDY2_/",
"commentsCount": 1,
"likesCount": 14,
"videoPlayCount": 0,
"timestamp": "2026-06-22T01:19:46.000Z",
"displayUrl": "https://scontent.cdninstagram.com/.../730022154_n.jpg",
"carouselImageCount": 20,
"carouselImages": [
"https://scontent.cdninstagram.com/.../730022154_n.jpg",
"https://scontent.cdninstagram.com/.../730083595_n.jpg",
"https://scontent.cdninstagram.com/.../729128221_n.jpg"
],
"ownerFullName": "Jordan Moody",
"ownerUsername": "dexawild",
"ownerId": "6521170568",
"productType": "carousel_container",
"taggedUsers": ["humansofny", "stephen_james_campbell"],
"music": { "title": "Follow The Sun", "artist": "Xavier Rudd" }
}

#️⃣ Hashtag details
Hashtag metadata: name, post count, related tags, reach tiers.

Supported URL input:

https://www.instagram.com/explore/tags/crossfit/ (hashtag)
Hashtag details sample

{
"searchSource": "instagram",
"name": "fathersday",
"postsCount": 21310000,
"url": "https://www.instagram.com/explore/tags/fathersday",
"id": "fathersday",
"posts": "21.31 M",
"postsPerDay": "—",
"difficulty": "",
"related": [
{ "hash": "#giftideas", "info": "51.58 m" },
{ "hash": "#gifts", "info": "45.95 m" },
{ "hash": "#mothersday", "info": "41.33 m" },
{ "hash": "#anniversary", "info": "30.9 m" },
{ "hash": "#happymothersday", "info": "16.07 m" },
{ "hash": "#giftsforher", "info": "12.35 m" },
{ "hash": "#birthdaygift", "info": "10.44 m" },
{ "hash": "#happyfathersday", "info": "10.14 m" },
{ "hash": "#giftsforhim", "info": "6.48 m" }
],
"frequent": [
{ "hash": "#fathersday", "info": "21.31 m" },
{ "hash": "#happyfathersday", "info": "10.14 m" },
{ "hash": "#fathersdaygifts", "info": "2.25 m" },
{ "hash": "#fathersdaygift", "info": "1.01 m" }
],
"average": [{ "hash": "#fathersdaygiftideas", "info": "529.04 k" }],
"rare": [{ "hash": "#fathersdaycard", "info": "93.89 k" }],
"relatedFrequent": [
{ "hash": "#love", "info": "2.15 g" },
{ "hash": "#dad", "info": "28.71 m" },
{ "hash": "#family", "info": "475.12 m" },
{ "hash": "#mothersday", "info": "41.33 m" },
{ "hash": "#daddy", "info": "18.72 m" },
{ "hash": "#instagood", "info": "2.02 g" },
{ "hash": "#gift", "info": "91.25 m" },
{ "hash": "#birthday", "info": "177.31 m" },
{ "hash": "#giftideas", "info": "51.58 m" }
],
"relatedAverage": [{ "hash": "#vatertag", "info": "656.9 k" }],
"relatedRare": [{ "hash": "#dietsantai", "info": "42.03 k" }]
}

💈 Place search
Discover Instagram places by keyword. Useful for small business discovery: the search query works best when it combines a city and a local business type, e.g. vintage shop copenhagen.

Search query format:

Set searchType to "place"
Set search to one or more keywords (comma-separated for multiple)
Place search data sample

[
{
"searchTerm": "vintage shop copenhagen",
"searchSource": "google",
"inputUrl": "https://www.instagram.com/explore/locations/1016004479/fn92/",
"name": "FN92",
"phone": "+45 22 48 56 86",
"category": "Clothing store",
"media_count": 9,
"price_range": 3,
"lat": 55.71375,
"lng": 12.56804,
"slug": "fn92",
"location_id": "1016004479",
"location_address": "Bryggervangen 76",
"location_city": "",
"location_zip": "2100",
"ig_business": { "profile": null },
"hours": { "status": "" }
},
{
"searchTerm": "vintage shop copenhagen",
"searchSource": "google",
"inputUrl": "https://www.instagram.com/explore/locations/334251990081960/jerome-vintage/",
"name": "JEROME VINTAGE",
"phone": "",
"category": "Vintage Store",
"media_count": 582,
"price_range": 0,
"lat": 55.67437,
"lng": 12.54993,
"slug": "jerome-vintage",
"location_id": "334251990081960",
"location_address": "Vesterbrogade 36",
"location_city": "",
"location_zip": "1620",
"ig_business": {
"profile": {
"profile_pic_url": "https://scontent.cdninstagram.com/.../350941664_n.jpg",
"username": "jerome_vintage",
"id": "1401828165"
}
},
"hours": { "status": "Closed" }
},
{
"searchTerm": "vintage shop copenhagen",
"searchSource": "google",
"inputUrl": "https://www.instagram.com/explore/locations/318767455/robb-copenhagen-shop/",
"name": "Robb Copenhagen (Shop)",
"phone": "",
"category": "Local business",
"media_count": 100,
"price_range": 0,
"lat": 55.67264,
"lng": 12.55788,
"slug": "robb-copenhagen-shop",
"location_id": "318767455",
"location_address": "Vesterbrogade 35",
"location_city": "",
"location_zip": "1654",
"ig_business": { "profile": null },
"posts": [
{
"code": "vqBeQcAJg5",
"id": "858505156247984185_506605037",
"taken_at": 1416561811,
"product_type": "feed",
"username": "robbcopenhagen",
"caption": "A few vintage BARBAR left // perfect gift 250,- remember we ship to other countries as well 🐘🐘 #robbcopenhagen #fashion #store #vesterbrogade35 #babarbar #vintage @robbcopenhagen",
"like_count": 4,
"comment_count": 0,
"location": "Robb Copenhagen (Shop)",
"image": "https://scontent.cdninstagram.com/.../632287548_n.jpg"
}
],
"hours": { "status": "" }
}
]

👥 Profile search
Discover Instagram profiles by keyword. Returns matching users along with their recent posts.

Search query format:

Set searchType to "profile"
Set search to one or more keywords, e.g. "nike" or "nike, adidas" (comma-separated for multiple)
Profile search data sample

[
{
"id": "3924506097334912938",
"shortCode": "DZ2pYCqgIeq",
"type": "Sidecar",
"ownerUsername": "nikesportswear",
"ownerFullName": "Nike Sportswear",
"caption": "Bring the love.\n\n@arynasabalenka on set with Nike Court.\n\nAll Love collection available June 22.",
"url": "https://www.instagram.com/p/DZ2pYCqgIeq/",
"likesCount": 39779,
"commentsCount": 135,
"timestamp": "2026-06-21T16:00:05.000Z",
"taggedUsers": ["arynasabalenka"],
"carouselImageCount": 5,
"images": [
"https://scontent.cdninstagram.com/.../729869204_n.jpg",
"https://scontent.cdninstagram.com/.../729359762_n.jpg"
]
},
{
"id": "3925170511466021648",
"shortCode": "DZ5AciixUMQ",
"type": "Video",
"ownerUsername": "nike",
"caption": "Time for liftoff @erling and @channingtatum",
"url": "https://www.instagram.com/p/DZ5AciixUMQ/",
"likesCount": 10720,
"commentsCount": 64,
"videoViewCount": 83809,
"videoPlayCount": 506507,
"videoDuration": 44.75,
"timestamp": "2026-06-22T14:01:05.000Z",
"taggedUsers": ["nikefootball", "erling", "channingtatum"],
"displayUrl": "https://scontent.cdninstagram.com/.../729747056_n.jpg",
"videoUrl": "https://scontent.cdninstagram.com/.../AQPNH7ACF2tBTf.mp4",
"music": "Original audio - nike"
},
{
"id": "3912183471120209303",
"shortCode": "DZK3iOsRlWX",
"type": "Video",
"ownerUsername": "nike",
"caption": "It was all going to plan until instincts took over…\n\nRip The Script",
"url": "https://www.instagram.com/p/DZK3iOsRlWX/",
"likesCount": 2487337,
"commentsCount": 54939,
"videoViewCount": 14401109,
"videoPlayCount": 59671075,
"videoDuration": 359.75,
"timestamp": "2026-06-04T15:59:27.000Z",
"isPinned": true,
"taggedUsers": ["nikefootball"],
"displayUrl": "https://scontent.cdninstagram.com/.../717154541_n.jpg",
"videoUrl": "https://scontent.cdninstagram.com/.../AQNKUhlPLvsO.mp4",
"music": "Original audio - nike"
}
]

👁️ Hashtag search
Discover related hashtags by keyword. Useful for finding adjacent or less-saturated tags around a topic.

Search query format:

Set searchType to "hashtag"
Set search to one or more keywords, e.g. "travel" or "travel, fitness" (comma-separated for multiple)
Hashtag search data sample

[
{
"searchTerm": "fathersday",
"searchSource": "google",
"name": "raddad",
"postsCount": 0,
"url": "https://www.instagram.com/explore/tags/raddad",
"id": "raddad"
},
{
"searchTerm": "fathersday",
"searchSource": "google",
"name": "campdads",
"postsCount": 117,
"url": "https://www.instagram.com/explore/tags/campdads",
"id": "campdads",
"posts": "117",
"postsPerDay": "—",
"difficulty": "",
"related": [],
"average": [],
"rare": []
},
{
"searchTerm": "fathersday",
"searchSource": "google",
"name": "happyfather",
"postsCount": 25209000,
"url": "https://www.instagram.com/explore/tags/happyfather",
"id": "happyfather",
"posts": "252.09 K",
"postsPerDay": "—",
"difficulty": "",
"related": [{ "hash": "#happyfathersday", "info": "10.14 m" }],
"average": [{ "hash": "#happyfatherday", "info": "283.05 k" }],
"rare": [{ "hash": "#happyfathersdaydad", "info": "59.63 k" }],
"relatedFrequent": [
{ "hash": "#happy", "info": "737.91 m" },
{ "hash": "#father", "info": "46.02 m" },
{ "hash": "#love", "info": "2.15 g" }
],
"relatedAverage": [{ "hash": "#dadsday", "info": "386.01 k" }],
"relatedRare": [{ "hash": "#holidayphoto", "info": "74.76 k" }]
}
]

Notes and exceptions
URL type drives output schema. Hashtag, location, audio, and explore URLs return their respective metadata even when paired with another content mode.
URLs take priority over search queries; they can't be combined.
Multiple search words are allowed; you just need to comma-separate them.
Profile IDs are interchangeable with usernames anywhere a profile URL is accepted.
_u and profilecard segments are stripped automatically, so instagram.com/_u/natgeo/profilecard/ works as a profile URL.
Story URLs (instagram.com/stories/emiliavizcarra/) are reduced to the username before scraping.
Share URLs (instagram.com/share/BAC6cDeb_-) are resolved to the canonical post URL via a redirect.
Location URLs accept the ID alone, without the trailing slug: instagram.com/explore/locations/7538318/ is valid.
Date filters use UTC.
Not supported: numeric post IDs in URL form (instagram.com/p/3369450800358839406/) for posts, reels, mentions, and details modes. Use the shortCode form. (This format works for comments.)

- **automation-lab/threads-scraper** - Threads

```json
{
  "includeProfile": true,
  "maxPosts": 5,
  "mode": "profile",
  "searchQueries": ["artificial intelligence"],
  "usernames": ["zuck"]
}
````

Scrape Meta Threads posts, profiles, and search results without a Threads login or API key. Extract post text, engagement metrics (likes, reply counts, reposts, quotes), media URLs, and user profile data from public Threads accounts, then export results as JSON, CSV, Excel, or via API.

What does Threads Scraper do?
This actor scrapes Meta's Threads platform (threads.com) in three modes:

Profile mode — extract user profile data: username, full name, bio, follower count, verified status, profile picture
Posts mode — extract posts from any public user: text content, like counts, reply counts, repost counts, quote counts, media (photos, videos, carousels), hashtags, mentions, timestamps
Search mode — search Threads by keyword and extract matching posts with full engagement data
Use this with a brand monitoring stack
Threads Scraper works well as the emerging-social layer in a custom Apify brand-monitoring stack. Pair it with:

Reddit Scraper for community discussions, product feedback, and crisis signals
Twitter/X Scraper for social search, campaign hashtags, and public profile monitoring
G2 Reviews & Products Scraper for B2B review intelligence and competitor sentiment
Trustpilot Scraper for consumer review monitoring
Google News Scraper for media coverage and PR alerts
Website Change Monitor for competitor pricing, changelog, and landing-page changes
Together these actors form a custom brand-monitoring pipeline on Apify: social conversations, review sites, news coverage, and owned-web changes in one workflow.

Why use this scraper instead of others?
No login required — works on public profiles and search without any Threads or Instagram account.
Full engagement data — likes, reply counts, repost counts, AND quote counts. Most competitors miss quote counts.
Media extraction — photo URLs, video URLs with dimensions, carousel support, audio detection.
Structured output — hashtags, mentions, and URLs parsed from post text into separate arrays. Ready for analysis.
Search support — keyword search across all of Threads, not just individual profiles.
Profile + posts combined — get user metadata alongside their posts in a single run.
Pay per result — transparent per-post and per-profile pricing. No monthly subscription.
Who is it for?
Marketing and brand teams — monitor brand mentions, track competitor activity, and analyze content engagement trends on Threads
Agencies and PR teams — research influencers, track campaign performance, and monitor public statements from key figures
Academic researchers — collect public social media data for sentiment analysis, NLP studies, and platform migration research
Data engineers — build automated pipelines that feed Threads data into dashboards, data warehouses, or AI/ML workflows
Use cases
Marketing and brand teams
Social listening — monitor brand mentions and competitor activity on Threads
Trend analysis — search for trending topics and measure conversation volume
Content research — study what types of posts get the most engagement in your niche
Agencies and PR teams
Influencer research — analyze engagement rates, posting frequency, and content themes
Campaign tracking — monitor influencer posts and engagement during sponsored campaigns
Journalist tools — track public statements from politicians, celebrities, and executives
Research and data teams
Academic research — collect public social media data for sentiment analysis and NLP studies
Platform migration analysis — track how creators and audiences are growing on Threads vs other platforms
How to scrape Threads
Go to the Threads Scraper page on Apify Store.
Click Try for free.
Choose a scraping mode: profile, posts, or search.
Enter usernames (for profile/posts mode) or search keywords (for search mode).
Set the maximum number of posts to extract.
Click Start and wait for the results.
Download data as JSON, CSV, Excel, or connect via API.
Input
Field Type Description Default
mode string Scraping mode: profile, posts, or search posts
usernames string[] Threads usernames to scrape (without @) ["zuck"]
searchQueries string[] Keywords to search for (search mode only) ["artificial intelligence"]
maxPosts integer Maximum posts per username or search query (1–200) 20
postedAfter string Optional ISO date/RFC3339 timestamp. Include posts published at or after this time (inclusive) —
postedBefore string Optional ISO date/RFC3339 timestamp. Include posts published before this time (exclusive) —
includeProfile boolean Include profile metadata in posts mode true
Input example
{
"mode": "posts",
"usernames": ["zuck", "mosseri"],
"maxPosts": 20,
"includeProfile": true
}

Monthly reporting date filter example
Use postedAfter and postedBefore to collect only posts in a reporting window. postedAfter is inclusive and postedBefore is exclusive, so this example returns May 2026 posts and stops paginating after older posts are reached:

{
"mode": "posts",
"usernames": ["zuck"],
"maxPosts": 100,
"postedAfter": "2026-05-01T00:00:00Z",
"postedBefore": "2026-06-01T00:00:00Z",
"includeProfile": false
}

The same fields work in search mode for timestamped post results. Leave both fields unset to preserve the default behavior and return the newest posts up to maxPosts.

Output
Profile output
{
"type": "profile",
"username": "zuck",
"fullName": "Mark Zuckerberg",
"biography": "I build stuff",
"followerCount": 5439932,
"isVerified": true,
"profilePicUrl": "https://scontent.cdninstagram.com/...",
"url": "https://www.threads.com/@zuck",
"userId": "314216",
"scrapedAt": "2026-03-05T22:33:31.392Z"
}

Post output
{
"type": "post",
"postId": "3779672204356238698",
"code": "DR0F9gkEj1q",
"username": "zuck",
"fullName": "Mark Zuckerberg",
"isVerified": true,
"text": "Inspired by all of you who started \"dear threads algo\" requests...",
"likeCount": 4969,
"replyCount": 1034,
"repostCount": 372,
"quoteCount": 277,
"mediaType": "text",
"media": [],
"hashtags": [],
"mentions": [],
"urls": [],
"isReply": false,
"isRepost": false,
"repostedFrom": null,
"timestamp": 1764792059,
"date": "2025-12-03T20:00:59.000Z",
"url": "https://www.threads.com/t/DR0F9gkEj1q",
"scrapedAt": "2026-03-05T22:36:51.325Z"
}

How much does it cost to scrape Threads?
This actor uses pay-per-event pricing:

Event Cost Description

| Start $0.01                                                                                                                  | One-time charge per run    |
| ---------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Profile                                                                                                                      | $0.005 Per profile scraped |
| Post $0.003                                                                                                                  | Per post extracted         |
| A typical run scraping 20 posts from one user costs approximately $0.075 ($0.01 start + $0.005 profile + 20 × $0.003 posts). |

For high-volume runs (maxPosts set very high or includeProfile across many users), set Maximum charge per run in the run settings to cap spend. Threads scraping checks the PPE cap during processing, and stops gracefully once the limit is hit.

API usage
Node.js
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: 'YOUR_API_TOKEN' });

const run = await client.actor('automation-lab/threads-scraper').call({
mode: 'posts',
usernames: ['zuck'],
maxPosts: 10,
includeProfile: true,
});

const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(items);

- **apify/google-search-scraper** - Google Search

```json
{
  "chatGptSearch": {
    "enableChatGpt": false
  },
  "copilotSearch": {
    "enableCopilot": false
  },
  "disableGoogleSearchResults": false,
  "focusOnPaidAds": false,
  "forceExactMatch": false,
  "geminiSearch": {
    "enableGemini": false
  },
  "includeIcons": false,
  "includeUnfilteredResults": false,
  "maxPagesPerQuery": 1,
  "maximumLeadsEnrichmentRecords": 0,
  "mobileResults": false,
  "perplexitySearch": {
    "enablePerplexity": false,
    "returnImages": false,
    "returnRelatedQuestions": false
  },
  "queries": "What are the top 5 CRM tools",
  "saveHtml": false,
  "saveHtmlToKeyValueStore": true,
  "verifyLeadsEnrichmentEmails": false
}
```

Example input for scraping Google Search search term
To get Google search data by search term, enter the search term and a number of Google pages to scrape. Using search terms, you can:

Scrape by multiple keywords in parallel by adding more search terms and separating them by a new line
Say how many results you want to see per each Google page (10-100)
Determine the country of search (domain), language, and UULE location parameter
Google Search Results Scraper input
Here's its equivalent in JSON:

{
"countryCode": "us",
"customDataFunction": "async ({ input, $, request, response, html }) => {\\\\n  return {\\\\n    pageTitle: $('title').text(),\\\\n };\\\\n};",
"includeUnfilteredResults": false,
"languageCode": "en",
"maxPagesPerQuery": 2,
"mobileResults": false,
"queries": "hotels in Seattle \\n hotels in New York",
"saveHtml": false,
"saveHtmlToKeyValueStore": false,
"maxConcurrency": 10
}

Scrape Google Search results by URL
To input URLs instead, simply replace queries with full URLs:

"queries": "<https://www.google.com/search?q=hotels+in+Seattle> \\n <https://www.google.com/search?q=hotels+in+New+York>",

⬆️ Output
The scraper stores its result in the default dataset associated with the scraper run, from which you can export it to various formats, such as JSON, XML, CSV, or Excel.

For each Google Search results page, the dataset will contain a single record, which looks as follows. Note that the output preview will be organized in table and tabs for viewing convenience:

Google Search Results Scraper output
Here’s the equivalent of the same scraped data but in JSON. Bear in mind that some fields have example values:

[
{
"searchQuery": {
"term": "Hotels in Seattle",
"url": "http://www.google.com/search?q=Hotels+in+Seattle&num=5",
"device": "DESKTOP",
"page": 1,
"type": "SEARCH",
"domain": "google.com",
"countryCode": "US",
"languageCode": null,
"locationUule": null
},
"resultsTotal": null,
"relatedQueries": [
{
"title": "Airbnb",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Airbnb&stick=H4sIAAAAAAAAAOMwVOLWz9U3MDQozC2uKvjFyLCBheEVCy8XsugrFh4uLhDfOL3QxMgAwQVKF1m8YuHi4gBx06tKcuByecZV6clVcK5RdnlVeckrFm4uThDXsqDSsAguWVlRlWxYBZc0MU02T3rFwsnFDuJlW1QtYmVzzCxKyku6xSbJsHtRx08W1_2GGy2NN24Se7yd_Zf739q0GSsXcYgFpOYX5KQqJOYU5ysUpyYWJWcopOUXreBgBABeO2g95gAAAA&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQs9oBKAB6BAglEAo"
},
{
"title": "Expedia Group",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Expedia+Group&stick=H4sIAAAAAAAAAOMwVOLSz9U3ME4vNDEy-MXIsIGF4RULLxc3SNDQoDC3uKrgFQsPF5IiBBcoXWTxioWLiwPETa8qyYHL5RlXpSdXwblG2eVV5SWvWLi5OEFcy4JKwyK4ZGVFVbJhFVzSxDTZPOkVCycXO4iXbVG1iJXXtaIgNSUzUcG9KL-04BabJMPuRR0_WVz3G260NN64SezxdvZf7n9r02asXMQhFpCaX5CTqpCYU5yvUJyaWJScoZCWX7SCgxEARw2QBewAAAA&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQs9oBKAB6BAglEA8"
},
{
"title": "Vrbo",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Vrbo&stick=H4sIAAAAAAAAAOMwVOLSz9U3MDYozC2y-MXIsIGF4RULLxc3SNAQKFhcVfCKhYcLoii90MTIAMEF63nFwsXFAeKmV5XkwOXyjKvSk6vgXKPs8qryklcs3FycIK5lQaVhEVyysqIq2bAKLmlimmye9IqFk4sdxMu2qFrEyhJWlJR_i02SYfeijp8srvsNN1oab9wk9ng7-y_3v7VpM1Yu4hALSM0vyElVSMwpzlcoTk0sSs5QSMsvWsHBCACk6JiV4wAAAA&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQs9oBKAB6BAglEBQ"
},
{
"title": "Southwest Airlines",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Southwest+Airlines&stick=H4sIAAAAAAAAAOMwVOLQz9U3SK8qyfnFyLCBheEVCy8XN0jI0KAwt7iq4BULDxcXiG-cXmhiZIDgAqWLLF6xcHHBDYDL5RlXpSdXwblG2eVV5SWvWLi5OEFcy4JKwyK4ZGVFVbJhFVzSxDTZPOkVCycXO4iXbVG1iFUoOL-0JKM8tbhEwTGzKCczL7X4Fpskw-5FHT9ZXPcbbrQ03rhJ7PF29l_uf2vTZqxcxCEWkJpfkJOqkJhTnK9QnJpYlJyhkJZftIKDEQCjBkmc7wAAAA&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQs9oBKAB6BAglEBk"
},
{
"title": "trivago",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=trivago&stick=H4sIAAAAAAAAAOMwVOLSz9U3yDOuSk-u-sXIsIGF4RULLxc3SNDQoDC3uKrgFQsPF1iRcXqhiZEBgguULrJ4xcLFxQHipleV5MDlIObBuUbZ5VXlJa9YuLk4QVzLgkrDIrhkZUVVsmEVXNLENNk86RULJxc7iJdtUbWIlb2kKLMsMT3_Fpskw-5FHT9ZXPcbbrQ03rhJ7PF29l_uf2vTZqxcxCEWkJpfkJOqkJhTnK9QnJpYlJyhkJZftIKDEQArWf7U5gAAAA&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQs9oBKAB6BAglEB4"
},
{
"title": "KAYAK",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=KAYAK&stick=H4sIAAAAAAAAAOMwVOLSz9U3MMouryov-cXIsIGF4RULLxc3SNDQoDC3uKrgFQsPF1iRcXqhiZEBgguULrJ4xcLFxQHipleV5MDl8oyr0pOr4FyI8a9YuLk4QVzLgkrDIrhkZUVVsmEVXNLENNk86RULJxc7iJdtUbWIldXbMdLR-xabJMPuRR0_WVz3G260NN64SezxdvZf7n9r02asXMQhFpCaX5CTqpCYU5yvUJyaWJScoZCWX7SCgxEA3hWrWOQAAAA&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQs9oBKAB6BAglECM"
},
{
"title": "Hotels in seattle downtown",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Hotels+in+seattle+downtown&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQ1QJ6BAg7EAE"
},
{
"title": "Best hotels in seattle",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Best+hotels+in+seattle&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQ1QJ6BAg6EAE"
},
{
"title": "Hotels in Seattle Washington near Airport",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Hotels+in+Seattle+Washington+near+Airport&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQ1QJ6BAg9EAE"
},
{
"title": "Cheap hotels in seattle",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Cheap+hotels+in+seattle&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQ1QJ6BAg8EAE"
},
{
"title": "Hotels in seattle luxury",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Hotels+in+seattle+luxury&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQ1QJ6BAg_EAE"
},
{
"title": "hotels in seattle, washington near cruise port",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=hotels+in+seattle,+washington+near+cruise+port&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQ1QJ6BAgrEAE"
},
{
"title": "Boutique hotels Seattle",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Boutique+hotels+Seattle&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQ1QJ6BAgoEAE"
},
{
"title": "Best hotels in Seattle Downtown",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Best+hotels+in+Seattle+Downtown&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQ1QJ6BAgnEAE"
},
{
"title": "Hotels in seattle downtown",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Hotels+in+seattle+downtown&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQ1QJ6BAg7EAE"
},
{
"title": "Best hotels in seattle",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Best+hotels+in+seattle&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQ1QJ6BAg6EAE"
},
{
"title": "Hotels in Seattle Washington near Airport",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Hotels+in+Seattle+Washington+near+Airport&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQ1QJ6BAg9EAE"
},
{
"title": "Cheap hotels in seattle",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Cheap+hotels+in+seattle&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQ1QJ6BAg8EAE"
},
{
"title": "Hotels in seattle luxury",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Hotels+in+seattle+luxury&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQ1QJ6BAg_EAE"
},
{
"title": "hotels in seattle, washington near cruise port",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=hotels+in+seattle,+washington+near+cruise+port&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQ1QJ6BAgrEAE"
},
{
"title": "Boutique hotels Seattle",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Boutique+hotels+Seattle&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQ1QJ6BAgoEAE"
},
{
"title": "Best hotels in Seattle Downtown",
"url": "https://www.google.com/search?num=5&sca_esv=49b6c55cfef21711&hl=en&q=Best+hotels+in+Seattle+Downtown&sa=X&ved=2ahUKEwiEk-Li5qWPAxXzrokEHTUEOVcQ1QJ6BAgnEAE"
}
],
"paidResults": [],
"paidProducts": [],
"organicResults": [
{
"title": "Downtown Seattle Hotel | Luxury Waterfront Hotel Rooms",
"url": "https://www.edgewaterhotel.com/",
"displayedUrl": "https://www.edgewaterhotel.com",
"description": "The Edgewater Hotel is laden with a rich musical past and surrounded by breathtaking views of the Olympic Mountains, Elliott Bay and the sparkling city.",
"emphasizedKeywords": ["The Edgewater Hotel"],
"siteLinks": [],
"productInfo": {},
"type": "organic",
"position": 1
},
{
"title": "Top 10 Hotels in Seattle, WA",
"url": "https://www.hotels.com/de1481165/hotels-seattle-washington/",
"displayedUrl": "https://www.hotels.com › ... › Hotels in Washington",
"description": "Flexible booking options on most hotels. Compare 2963 hotels in Seattle using 47993 real guest reviews. Pay what you see with upfront pricing on all hotels.",
"emphasizedKeywords": ["Compare 2963 hotels in Seattle"],
"siteLinks": [],
"productInfo": {},
"type": "organic",
"position": 2
},
{
"title": "Hotels in Seattle, WA",
"url": "https://www.marriott.com/en-us/destinations/united-states/washington/seattle.mi",
"displayedUrl": "https://www.marriott.com › united-states › washington",
"description": "Marriott Bonvoy's hotels in Seattle provide the ideal starting point for your exploration, ensuring you are always close to the best the city has to offer.",
"emphasizedKeywords": ["Marriott Bonvoy's hotels in Seattle"],
"siteLinks": [],
"productInfo": {},
"type": "organic",
"position": 3
}
],
"peopleAlsoAsk": [],
"aiModeResult": {
"engine": "AI Mode",
"provider": "Google",
"text": "You can find many hotel options in Seattle, from high-end downtown hotels to budget-friendly hostels. Some options, like Hampton Inn & Suites, offer free amenities, while others focus on prime locations near major attractions. The best area to stay often depends on your budget and what you want to see. Downtown Seattle Known for being walkable and close to attractions, Downtown Seattle is home to a wide range of hotels. The Paramount Hotel: A 3-star hotel with a prime location for exploring downtown attractions like Pike Place Market and the Space Needle. Reviewers mention its modern rooms and friendly staff.Hyatt Regency Seattle: A 4-star hotel located downtown, receiving high marks for being an exceptional place to stay.Mayflower Park Hotel: Another downtown 4-star option, with travelers highlighting its excellent breakfast and beautiful dining room.Green Tortoise Hostel Seattle: For budget-conscious travelers, this highly-rated hostel is located directly across from Pike Place Market and offers free breakfast. Hampton Inn & Suites Seattle-Downtown4.1(1.6K)3-star hotel700 5th Ave NThe Paramount Hotel4.5(2.4K)3-star hotel724 Pine StHyatt Regency Seattle4.6(3.8K)4-star hotel808 Howell StMayflower Park Hotel4.4(1.4K)3-star hotel405 Olive WyGreen Tortoise Hostel Seattle4.5(2.3K)2-star hotel105B Pike StSee moreBelltown and South Lake Union These trendy neighborhoods offer a mix of boutique hotels and serviced apartments. The Ace Hotel (Belltown): A popular mid-range option.Hotel Ändra (Belltown): A cool boutique hotel.CitizenM South Lake Union: This location of a popular hotel chain is a great option for modern stays. Hôtel Ändra Seattle - MGallery Collection4.5(1.3K) · $$$$4-star hotel2000 4th AvecitizenM Seattle South Lake Union hotel4.3(1K)4-star hotel201 Westlake Ave NSeattle Center and Queen Anne This area is convenient for accessing attractions like the Space Needle, MoPOP, and Climate Pledge Arena. Hampton Inn & Suites Seattle-Downtown: Located in the Seattle Center area, this 3-star hotel offers free hot breakfast and is within walking distance of many tourist spots.Mediterranean Inn (near Seattle Center): A mid-range hotel that is consistently well-reviewed for its location and comfort. Northgate Located north of the downtown core, this area is a good option if you want to be near the University of Washington or other northern attractions. Hampton Inn & Suites by Hilton Seattle/Northgate: A 2-star hotel offering an indoor pool and free breakfast. Reviewers praise the friendly staff and find it a good value, especially if you plan to use the light rail to get downtown. Which Seattle hotels have the best views?Any hotels in Seattle known for unique architecture?Elaborate on the price ranges for hotels in different Seattle neighborhoods",
"sources": [
{
"title": "Where To Stay In Seattle: A Complete Guide For First Timers",
"url": "https://wheatlesswanderlust.com/where-to-stay-in-seattle/",
"description": "Here are some cool places to stay in Belltown that caught our eye. * The Ace Hotel: A Great Mid-Range Option (Where We've Stayed) * Hotel Ändra: A Cool Boutique...",
"imageUrl": "data:image/png;base64,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"
},
{
"title": "Top 10 Hotels in Seattle, WA from $93 - Fully Refundable Options - Expedia",
"url": "https://www.expedia.com/Seattle-Hotels.d178307.Travel-Guide-Hotels",
"description": "Compare 4,566 hotels, room rates, hotel reviews and availability. Most hotels are fully refundable. * The Belltown Inn. The Belltown Inn. The Belltown Inn. The ...",
"imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAD90lEQVRogc2av28cRRTHP+/t+mgogoA6sZyN7QBOfEiEGAokfkkYRBRBhXAQLTSYBEj4B1AICZKBhiCBJbqAUsRUFEggxSDl5JjICXc55ISCAhLSpFnfzlDsnuNz7rx7tz/uvtIWdzs783kzb9/MvB1hk8zVR8VaOwK8ArwIjAPbAN1cNmcZ4BawApwDziDyp7Pzgt1YSDb+CGrle4FDwFvALsAphjVWAfAH8Bkw73iV280b6wYEtfIDwEfADDBUNGFC+cDXwDHHq9yAyICo5z8F3mTTqAygLPAlMOt4ldtNv56JrkGHh5DxDeB1AAlqZQ84C+zuI1QvugS8rITRZrTPML1oHDjoAi/QRbQRBcnb0SwYE1vKAaZdunAdEbhcV36vCsbGl+9FpSEYG7aMDZskHbXbJZykYqUKv1SUD06VqP8luY2CCDx4n2X2UIPXphtx7WxTEsywqnB+SXnvZIna9fzgAayFv/8VTs27VK8pujVdzO2oxOJF5cgnYc87BSwoHIV/bgrVVYkN7FviqMKvyyF87Xox8E1ZYK0RX87tdEMVlq4o7xwvUV0VVKERpAdTBc3QBTsaAKE/PjcV8PxUNo01O+X8xeyGsqMBxsDeMcPkeHxATiSF35aVHxcdrM1uLokdAZtBvFeFxSXlyIkS1WvZvku5v5aqsLicDzzkbEAS+LQjnJsBSeADA7t2WPZNmJ6XJrkYkBh+u+Xjd332jJoki7f2baVDbVNhN/CHfR7bY7ApAl2mBnQL//iECXMPadpM9/iGinqA79VtWtpNX0X/4CEDA/oJDykNUOkvPKQwQBWurArvn+wfPKQZAYFLNaXWR3hI6UKdlgFFwUMOE1mR8JDSgCGXu9xnbEdx8BCzH4Bw49F2X2BhatIwd8xf37uKwMM7LaPDxcBDjAGqsFJXTn/n4q/d+d9aeHZ/wIGnAw4807pRtpZUa5tutfUICKzUhW8XnJYRaEQ9/tJTQW45oqTbzlgXAnCdu10oz+RWYML04iOeCfMrW6jo716xakax47M+3nYb+y7FGpBTDretmvAnDvvsmzCJtptKzIq8FIVKkdbrnqHs3Mi2gU8YxYwL/Afc37ZiA09MGuY+9PHX7qQpLfDQiF0PsWklwGj38AC3JKiVfwae7Fi5hB81NiurcCkSZutEwkRal/PHTy6wAOynw1caa8FmkBPtJGthb5T96xI+AH5Q4AzhR+S+yZqeRvMy8L06XuUq8DmwFvPAIMkHvnC8Sr3p3d9EV5FRs1dZQtZ5iOaB6OzBUeArQusGVT5wGjjaPC/R7rDHDPA2g3fYowrM0emwx3rJalkQRoBXgWkG47jNAmGwqTtepcXN/wc7PMQyfEwyGgAAAABJRU5ErkJggg=="
},
{
"title": "Green Tortoise Hostel Seattle",
"url": "https://www.google.com/viewer/place?mid=/g/1td7sx3h",
"description": "Low-key hostel offering basic dorms & private rooms, plus a full communal kitchen & free Wi-Fi.",
"imageUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAMAAAD04JH5AAAAqFBMVEVHcEzxzAMvwDUpiff/xAkLuG7/YDH9TFb/SEsNu2MIr48IqaL/tgvgywIKo7X/cClDwST/gSD/kxcUl9XNyQEije4bkuK4yAGjxgJXwhhpww98xAmPxQQuh/zcek34hyr/UUAho6shkOX/T0D/SUUTuWTswwcVvFoMtXb4vgnzywXtxghzxBIdvFL+xgUvhv/+zgj/RkARvFv/UTgdvkkJtH3/pRAOncZK6lhHAAAAL3RSTlMA/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/q4TLpcyXs5aWHPPorqaS7SD1/Vt9HkAAAiMSURBVHicvVkJW+JKECQEEZTbmxUSiAK6Dw2y4v//Z29meo6eI3EmASoruvsFqrq6upO4jUYVzJOXNM2ybNfZkT/khzR9eZlX+qhwvKTZrgCd9CU5LXlSTE6toC9ExOnYi8kJO+0GAX3JTqBhXs4OCjr8G0F63F4kJc7vJDtQAy6PaQOl3/OjqPWcfYcUXF4eR0KSEWLK7GLH9evsTMERJMyzPSucvxSETziwQ/yArOZ2SPeAkha4HFAWXF6mNeiT9r4N9G72DhoBRQ/UwgKCygORcv4yCzpFBmBUM2GetdumAqt8JMJ0H2vIKvAn7TYIaOseuBywZ8CwoEIb0nZbKGASIAZm9+UKNBJg0ocPZDpst4dKAnfAYYFQYhjgQBrCnw2Hil7rwa6z7yBiNITlBoQpGDJwC7iEHdOAHOjI7zj/BRGg8F9Jw7FLwR5t5P0OsWMP7AGowD+mwApwDnAGOm4LjsE/HGIFOAfGMHaMISx0wJ8/GysHZBT1JliDoG1BpwP+/G+TCVcwxk0wRsHKQAdnwPbAn381GU+khKEtQetAR0Wg+DoQxp9MJroDaBJkCqz7An0L2Ar8+eeHCcfYHgUVA87PnkYoyDNK2RoIuCX5OEwOQD8BD8aOUWCDkFrPQQlT4ViEAfyrAwF3oMSDfeEt90tmZyCAP2H8B9wEbSeCB+V320lqKAi5Jfw4AHgb9FngHmS/XtfnGY5ACP+qd+jZCmAniiZ4XdSTavU3egRSAvJA9SD1/ai0Cv8b8PfAgYO5EHzLByTh/EmvZ1kgo8gQ8mmNeSg/M0BJmBxEDISE4PvawEeipNVqSQmaCawJ4zSUPxRvrR49tC4cVBNOzk8NEAKUC0LC5OT8xAAO4YGm4O3k/I1c8MsoYAmn51/lrVwo0MeR8p/h938fUoAWBZDw9/T8SU4FSA+4hAMoOEMAGu+EPVcW6ONwBv4Go89dbTj0VmfgJx3Ic94F1Qcu4Qz8ZAYEWsgFMOEMCaQzoKGF03AO/oZOrgQQD86RgMbfPLcsEBrOwY8iwEeBsbOX97MIeHM5ABac+L8/OEx+iGHu24HPGlg4BbRkN7w6UEfAkn5A4nIAbPBaAsGsMXzRbzP6AdYQKA1e1+E6DjABK6cAqsFvCEOqZl/4n+kHvBcJyP0uxHUc+CwX4LcFPOvHf1Fe0A+w1oCE3x6u5QBN2UehAL8roSeVIwGfsAiKBfjtwVoOCAHRaQXE+o/IDLqJ3OQUfrfjtRxYlrbgbAKKPDhyBuwI/uZARQGx/hUjckuDEODwIKo4hq46i0EFOBcRU1RxEcVQd2zU7TSBjqF7FUfkqLSKseNIRAFAQKT3IBJH+MUoRi8x4tY8MAWszNKliKi2A9YPpgY66X+d5IQ+igJvSGIe/BgbUN4C+gEJ45NNiHLJH4XfksXG1JXOIBfQQAao4hmCbkpj1H0jAkif8Xf2CZEsm6uQEvrBDpgZKKQGsHtCtghajD2KFH8/6vf7Prtw9jsKhYCAFa8ebBDFMwXHeTRbai3CYM8FdAxE73ONnuAoAmYmrwQ8GTWg+BZKH6fv94/y+4lC/k9+woeRfkl/e3t7BP7FZ+Ek8jNWuapduU/4iYIjWDDT5hJfpWb8jCSS3Vf0lJ3gob6AmMJYDvDDUpziLp6w3z481P4lzRLoxYFlLMQ570JBX+MnCgjqCpjFHNx7pEWek3B63X3gf/ivHv8itvAJYmQECPqKXTYf6B8fH+rl8A6A2KUTS3XWSmVPdZ/REzzX+XX98k5CN4Ec+DzOf6vX/0gVPD8+1xBwf393D/T0UOTkmOHz3tXqkc0X9M/P1WNwc08VCBFSA9OxxCfOFbm0n/FT/PlTVcHshipgMBvB7wUk3oj5Rvo4PeGvqmB5AwAF9+CBkDDTz01E83n3H4X9lH46nVZRsPz5AXquQEiARiyMs99Q9cD/KMqnCp7CFRD+Hy5BdOJOReHOPD0xh0+UT+t/ogjlHwwGQsENmHAnRyKOl9Yb3nn1qHwqYErLpwpGo9cQ/s1gwBUIDcoDGgTHW6D9jw+YntXPHBgRBf5tWFwD/0DQKw/AAdsAsg4N/8EAzk/oR6Nm09OEzTWBVPBz8yMVCAnOtwn3Ufww/ahJFKw9JGyvrq+FgoHqgWgCVeAygGyjB8wv65+C/4y/+auE+eaKgfAjBTgHNIoFb15Z08cHYAQOUPxr/vu3NWdY4nX9/Q30hgU/N7gLhe8X3f/zbOZP1E/5KTav1jXydUPYGa6kBpUDPI4zFzdX8Kzzu+qn+CJ/vtab7faVYrvZrC8IED3nvzY8gC6UdDDR5u8JAvg0Qg4IAV8M3a8u4ILDZQHeSFRCYQMoVnj8MT+nb3J6IQEUXICAb3pI/ithAZpF6kBJAyj+UwF8mlr1N3UDqALuAPcAFFhBxG0o5ycKXPWPDHoi4B/QfxXQcwUDXYEHf6Mh8mfV7zBAZOBCxUCm4BorkOugNAAc06kK4AgFoGnVb4WQp+BKpUDwcwvcK9ClQPlfFgAZwpJBuEYe+PETBU94AZgB0BXIEHZRDK6+sQVyH/nykyRiA0T9vAVKQhc3oViBHAV/fqZALICRnQCzBciBC7wLxDICBSH85JqqNUB2wOAXc6jvApUCPAlh/OSmxhlAFAGNvsgBdU3wmT8D+gJomvWbGTBSgHYB7UI4PcHWNYGq/i8zg4S/K3ugWbCpxE9ub6wNaCZQCwG34BtLYAoq2C9NKODv2i24QMtAuyJULZ9jLa/CRgKsCFiTwAy4qlE+YLFGBqgbEaVAG0QzBEFPM79IcBvw5XSAj+JR6IUE8yLkMoAr4GN4NHqGrXYVwi1wbcOL703t3ltYbJABsAmlA8aNic8DVDUN23V5F6gFm1Oxc7wKEbILSsLa8cByEswX5GlkvV532RWpu15vNtvXak3/H84+6dS9svPfAAAAAElFTkSuQmCC"
},
{
"title": "Where Should I Stay in Seattle? (An Unofficial Seattle Accommodation ...",
"url": "https://totallyseattle.com/where-should-i-stay-in-seattle-an-unofficial-seattle-accommodation-guide/",
"description": "Recommended hotels in Downtown Seattle: * Four Seasons Hotel. * Fairmont Olympic Hotel. * The Alexis Hotel. * The Inn at the Market. Staying in Seattle's Bellto...",
"imageUrl": "data:image/png;base64,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"
}
],
"query": "Hotels in Seattle",
"kvsHtmlUrl": "https://api.apify.com/v2/key-value-stores/CzC2EqsvcNUUhWsSH/records/Hotels-in-Seattle_522be799a1919512562f544878e95f5e5ecfa59da52aeda4bcc768a3f9afacd2.html?signature=1PWgT4hZ9FTMZ9sBjH55k",
"url": "http://www.google.com/search?q=Hotels+in+Seattle&num=5"
}
}
]

You can download the results directly from the platform using a button or from the Get dataset items API endpoint:

<https://api.apify.com/v2/datasets/[DATASET_ID]/items?format=[FORMAT]>

where [DATASET_ID] is the ID of the dataset and [FORMAT]can be csv, html, xlsx, xml, rss or json.

Frequently asked questions
How to get one search result per row
Simply choose the Export view for Organic results and/or Paid results, it automatically spreads each result into a separate row. For API access, you can add &view=paid_results or &view=organic_results to the URL and with the API client, you can do the same using the view field.

An organic result is represented using the following format:

{
"searchQuery": {
"term": "laptop",
"device": "DESKTOP",
"page": 1,
"type": "SEARCH",
"domain": "google.com",
"countryCode": "US",
"languageCode": "en",
"locationUule": null
},
"type": "organic",
"position": 1,
"title": "Laptops & Notebook Computers - Best Buy",
"url": "<https://www.bestbuy.com/site/computers-pcs/laptop-computers/abcat0502000.c?id=abcat0502000>",
"displayedUrl": "<https://www.bestbuy.com> › Computers & Tablets",
"description": "Shop Best Buy for laptops. Work & play from anywhere with a notebook computer. We can help you find the best laptop for your specific needs in store and online.",
"emphasizedKeywords": "laptops | laptop",
"productInfo": {}
}

A paid result has an adPosition field instead of position and "type": "paid". Paid result position is calculated separately from the organic results.

When using a tabular format such as csv or xls, you'll get a table where each row contains just one organic result. For more details about exporting and formatting the dataset records, please see the documentation for the Get dataset items API endpoint.

- **streamers/youtube-scraper** - YouTube

```json
{
  "downloadSubtitles": false,
  "hasCC": false,
  "hasLocation": false,
  "hasSubtitles": false,
  "is360": false,
  "is3D": false,
  "is4K": false,
  "isBought": false,
  "isHD": false,
  "isHDR": false,
  "isLive": false,
  "isVR180": false,
  "maxResultStreams": 0,
  "maxResults": 10,
  "maxResultsShorts": 0,
  "preferAutoGeneratedSubtitles": false,
  "saveSubsToKVS": false,
  "searchQueries": ["Crawlee"]
}
```

⬆️ Output example
The scraped results will be shown as a dataset which you can find in the Storage tab. Note that the output is organized as a table for viewing convenience, but it doesn’t show all the fields:

YouTube Scraper output
You can preview all the fields and download the file with YouTube data in various formats (JSON, CSV, Excel, and more). Here’s a few JSON examples of different YouTube scraping cases:

💁‍♂️ Channel info
{
"id": "HV6OlMPn5sI",
"title": "Raimu - The Spirit Within 🍃 [lofi hip hop/relaxing beats]",
"duration": "29:54",
"channelName": "Lofi Girl",
"channelUrl": "<https://www.youtube.com/channel/UCSJ4gkVC6NrvII8umztf0Ow>",
"date": "10 months ago",
"url": "<https://www.youtube.com/watch?v=HV6OlMPn5sI>",
"viewCount": 410458,
"fromYTUrl": "<https://www.youtube.com/@LofiGirl/videos>",
"channelDescription": "\\"That girl studying by the window non-stop\\"\\n\\n🎧 | Listen on Spotify, Apple music and more\\n→ <https://bit.ly/lofigirl-playlists\\n\\n💬> | Join the Lofi Girl community \\n→ <https://bit.ly/lofigirl-discord\\n→> <https://bit.ly/lofigirl-reddit\\n\\n🌎> | Lofi Girl on all social media\\n→ <https://bit.ly/lofigirl-sociaI>",
"channelDescriptionLinks": [
{
"text": "Discord",
"url": "<https://discord.com/invite/hUKvJnw>"
},

],
"channelJoinedDate": "Mar 18, 2015",
"channelLocation": "France",
"channelTotalVideos": 409,
"channelTotalViews": "1,710,167,563",
"numberOfSubscribers": 13100000,
"isMonetized": true,
"inputChannelUrl": "<https://www.youtube.com/@LofiGirl/about>"
}

📹 A single video
{
"title": "Stromae - Santé (Live From The Tonight Show Starring Jimmy Fallon)",
"id": "CW7gfrTlr0Y",
"url": "<https://www.youtube.com/watch?v=CW7gfrTlr0Y>",
"thumbnailUrl": "<https://i.ytimg.com/vi/CW7gfrTlr0Y/maxresdefault.jpg>",
"viewCount": 35582192,
"date": "2021-12-21",
"likes": 512238,
"location": null,
"channelName": "StromaeVEVO",
"channelUrl": "<http://www.youtube.com/@StromaeVEVO>",
"numberOfSubscribers": 6930000,
"duration": "00:03:17",
"commentsCount": 14,
"text": "Stromae - Santé (Live From The Tonight Show Starring Jimmy Fallon on NBC)\\nListen to \\"La solassitude\\" here: <https://stromae.lnk.to/la-solassitude\\nOrder> my new album \\"Multitude\\" here: <https://stromae.lnk.to/multitudeID\\n--\\nhttps://www.stromae.com/fr/\\nhttps://www.tiktok.com/@stromae\\nhttps://www.facebook.com/stromae\\nhttps://www.instagram.com/stromae\\nhttps://twitter.com/stromae\\n> ",
"descriptionLinks": [
{
"url": "<https://stromae.lnk.to/la-solassitude>",
"text": "<https://stromae.lnk.to/la-solassitude>"
},

],
"subtitles": null,
"comments": null,
"isMonetized": true,
"commentsTurnedOff": false
}

🎧 YouTube playlist
{
"id": "CdgDLaxe2Q4",
"title": "Lecture 4 | String Theory and M-Theory",
"duration": "1:23:37",
"channelName": "Stanford",
"channelUrl": "<https://www.youtube.com/@stanford>",
"date": "12 years ago",
"url": "<https://www.youtube.com/watch?v=CdgDLaxe2Q4&list=PL6i60qoDQhQGaGbbg-4aSwXJvxOqO6o5e&index=100>",
"viewCount": 106000,
"fromYTUrl": "<https://www.youtube.com/playlist?list=PL6i60qoDQhQGaGbbg-4aSwXJvxOqO6o5e>"
},

🔎 YouTube search results
{
"id": "CwRMBKk8St0",
"title": "LET'S ARGUE: Beyoncé Fails the Bechdel Test!",
"duration": "13:48",
"channelName": "fantano",
"channelUrl": "<https://www.youtube.com/@fantano>",
"date": "5 years ago",
"url": "<https://www.youtube.com/watch?v=CwRMBKk8St0>",
"viewCount": 635379,
"fromYTUrl": "<https://www.youtube.com/results?search_query=bechdel+test>"
},

YouTube subtitles
"subtitles": [
{
"srtUrl": "https://api.apify.com/v2/key-value-stores/WBeaA5MIHCBAR79Jy/records/subtitles_YmVqWiFEohY_en_auto_generated",
"type": "auto_generated",
"language": "en",
"srt": "1\n00:00:0,320 --> 00:00:4,960\nEver feel like you've been chasing the\n\n2\n00:00:1,990 --> 00:00:4,960\n \n\n3\n00:00:2,000 --> 00:00:6,960\nwrong AI path? Look, I get it. I wasted\n\n4\n00:00:4,950 --> 00:00:6,960\n \n\n5\n00:00:4,960 --> 00:00:9,440\nmonths jumping from one trend to the\n\n6\n00:00:6,950 --> 00:00:9,440\n \n\n7\n00:00:6,960 --> 00:00:11,440\nnext, following outdated advice that\n\n8\n00:00:9,430 --> 00:00:11,440\n \n\n9\n00:00:9,440 --> 00:00:14,719\npromised quick results, but only left me\n\n10\n00:00:11,430 --> 00:00:14,719\n \n\n11\n00:00:11,440 --> 00:00:16,320\nstuck. In 2025, AI isn't about just\n\n12\n00:00:14,709 --> 00:00:16,320\n \n\n13\n00:00:14,719 --> 00:00:18,000\nlearning the basics. It's about\n\n14\n00:00:16,310 --> 00:00:18,000\n \n\n15\n00:00:16,320 --> 00:00:20,000\nmastering the skills companies are\n\n16\n00:00:17,990 --> 00:00:20,000\n \n\n17\n00:00:18,000 --> 00:00:22,240\ncrying out for right now. If I had to\n\n18\n00:00:19,990 --> 00:00:22,240\n \n\n19\n00:00:20,000 --> 00:00:24,960\nstart my AI journey over, I'd do it\n\n20\n00:00:22,230 --> 00:00:24,960\n \n\n21\n00:00:22,240 --> 00:00:26,640\ndifferently. I'd skip the fluff and dive\n\n22\n00:00:24,950 --> 00:00:26,640\n \n\n23\n00:00:24,960 --> 00:00:28,640\nstraight into what works in today's\n\n24\n00:00:26,630 --> 00:00:28,640\n \n\n25\n00:00:26,640 --> 00:00:31,480\nworld. And in this video, I'm sharing\n\n26\n00:00:28,630 --> 00:00:31,480\n \n\n27\n00:00:28,640 --> 00:00:34,239\nexactly how I'd learn AI from scratch in\n\n28\n00:00:31,470 --> 00:00:34,239\n \n\n29\n00:00:31,480 --> 00:00:36,160\n2025. No gimmicks, just actionable\n\"
}
]

- **apify/facebook-posts-scraper** - Facebook

```json
{
  "captionText": false,
  "resultsLimit": 20,
  "startUrls": [
    {
      "url": "https://www.facebook.com/humansofnewyork/"
    }
  ]
}
```

What Facebook posts data can I extract?
With this Facebook post API, you can download Facebook posts and extract comprehensive data from any public page or profile. Use this post scraper to analyze engagement patterns, track content performance, and monitor posting trends:

📝 Post text and caption 🔗 Post URL and page/profile URL
🕐 Timestamp and publish date 👍 Number of likes, reactions, and shares
💬 Comments count and top comments 👥 Author name and profile ID
🆔 Post ID and Facebook ID 📊 Engagement metrics breakdown
🖼 Media URLs and thumbnails 🎥 Video URLs and transcripts
🔗 External links in posts 📱 Page or profile details
🔢 Reaction breakdowns (like, love, haha, etc.) 📢 Number of Facebook shares per post
📣 Whether the page runs ads 🆔 Page ID in Meta Ads Library
🔄 Whether post is shared from another page 🎬 Whether the post is a video
How do I use Facebook Posts Scraper?
Facebook Posts Scraper was designed to be easy to start with even if you've never extracted data from the web before. Here's how you can use this Facebook post extractor to crawl Facebook posts:

Create a free Apify account using your email.
Open Facebook Posts Scraper.
Add one or more Facebook page/profile URLs to scrape posts from.
Choose optional filters: time frame (custom date range), include video transcripts, or number of posts to scrape.
Click "Start" and wait for the data to be extracted.
Download your data in JSON, XML, CSV, Excel, or HTML.
For a step-by-step guide on scraping Facebook posts, follow our Facebook Posts Scraper tutorial 📝.

➡️ Input
The input for Facebook Posts Scraper should be Facebook page or profile URLs such as https://www.facebook.com/pagename/. You can insert the URLs one by one, paste a prepared list, or set the input via API. You can also set optional filters like time frame (custom date range) to download Facebook posts from specific periods, enable video transcripts, or limit the number of posts.

Facebook posts scraping input
Click on the input tab for a full explanation of an input example in JSON.

⬅️ Output
The results will be wrapped into a dataset which you can find in the Output tab. Here's an excerpt from the dataset you'd get when scraping Facebook posts:

Facebook posts scraping output
📘 Example of extracted Facebook post data
You can choose in which format to download your Facebook data: JSON, JSONL, Excel spreadsheet, HTML table, CSV, or XML. Here's what a typical post output looks like:

[
{
"facebookUrl": "https://www.facebook.com/cern",
"postId": "1315686150601111",
"pageName": "cern",
"url": "https://www.facebook.com/cern/posts/pfbid02tCuZQNXY4oegKgnTGU2pbxtZdrg9uZwuaSWdyZeaYuhb8hw8ZBZ51Go19Em86Uwvl",
"time": "2026-01-20T13:00:05.000Z",
"timestamp": 1768914005,
"user": {
"id": "100064792144187",
"name": "CERN",
"profileUrl": "https://www.facebook.com/100064792144187",
"profilePic": "https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-1/348216459_1300189730851164_4698791499509539689_n.jpg?stp=cp0_dst-jpg_s50x50_tt6&_nc_cat=110&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=Pj2Wg3o7ldwQ7kNvwGGPU3k&_nc_oc=AdnmAKKQ_2TQdVmfEq42BxQekAnn4xQbK__K1Ubul6MOYLHsqDraXyiOODvzedxgHR5vwR5V7ZcyS9aWAVxLWl3C&_nc_zt=24&_nc_ht=scontent-lga3-3.xx&_nc_gid=ypkFPlrkf_vAdug9n8GJ3A&oh=00_AfpFBtut5Iv6v0iQRPvSkPr_288dbS69vh9VJMeXUZ10Dw&oe=69755C03"
},
"collaborators": [],
"text": "What can you do with 380 million #Higgs bosons?\n\nWhat is the fate of the universe? Why is there more matter than #antimatter? What lurks beyond the #Standard Model? Valentina Cairo and Steven Lowette explore the physics reach of the High-Luminosity LHC (#HiLumiLHC) in the new issue of the #CERNCourier.\n\nRead more: https://cerncourier.com/a/what-can-you-do-with-380-million-higgs-bosons/",
"textReferences": [
{
"url": "https://l.facebook.com/l.php?u=https%3A%2F%2Fcerncourier.com%2Fa%2Fwhat-can-you-do-with-380-million-higgs-bosons%2F&h=AT1ryZGt8eZkjr8VtJvdF7O_ECl8TYUwlINEJeOpLm279O-2HQdm8K-7D3DWfVjUC51TaPwj5cEFs3_643kfe9GOO3GIdFwu5dpAzOZVghvf3X9taxjwOrhNvuVV-PiGoImW9axSWZvK5jRY0HVDBHNPGvLoBzrxwdZ1kzgke_XYMsmY&s=1",
"external_url": "https://cerncourier.com/a/what-can-you-do-with-380-million-higgs-bosons/",
"web_link": {
"__typename": "ExternalWebLink",
"url": "https://cerncourier.com/a/what-can-you-do-with-380-million-higgs-bosons/",
"fbclid": null,
"lynx_mode": "ASYNCLAZY"
},
"mobileUrl": "https://lm.facebook.com/l.php?u=https%3A%2F%2Fcerncourier.com%2Fa%2Fwhat-can-you-do-with-380-million-higgs-bosons%2F&h=AT3WZGDRRCD-VLBzxP7Fsf_Zjb1cS88KBZ2Gq4DWBZfVEKn4nPU5i4eS8DE14zBaY7SnAhVSKgXdmkyJS7QL5lyEMG5H3lCkeNOYsqh8t-HqvJyCau4Dv2J969HI0G44H160YV74sn5jKoxv30c6XOy2dMoApxcJcZtZsML-YiqAgthJ&s=1",
"id": "NjQyMTgzOTU5MjA4MTA3Omh0dHBzXGEvL2Nlcm5jb3VyaWVyLmNvbS9hL3doYXQtY2FuLXlvdS1kby13aXRoLTM4MC1taWxsaW9uLWhpZ2dzLWJvc29ucy86OkRlZmF1bHQ6OjoxMzE1Njg2MTUwNjAxMTEx"
},
{
"url": "https://www.facebook.com/hashtag/higgs?**eep**=6",
"mobileUrl": "https://m.facebook.com/hashtag/higgs",
"id": "277101575754961"
},
{
"url": "https://www.facebook.com/hashtag/antimatter?**eep**=6",
"mobileUrl": "https://m.facebook.com/hashtag/antimatter",
"id": "388710277894247"
},
{
"url": "https://www.facebook.com/hashtag/standard?**eep**=6",
"mobileUrl": "https://m.facebook.com/hashtag/standard",
"id": "218027618337364"
},
{
"url": "https://www.facebook.com/hashtag/hilumilhc?**eep**=6",
"mobileUrl": "https://m.facebook.com/hashtag/hilumilhc",
"id": "1404235909704964"
},
{
"url": "https://www.facebook.com/hashtag/cerncourier?**eep**=6",
"mobileUrl": "https://m.facebook.com/hashtag/cerncourier",
"id": "218164278307153"
}
],
"link": "https://cerncourier.com/a/what-can-you-do-with-380-million-higgs-bosons/",
"likes": 146,
"comments": 3,
"shares": 27,
"topReactionsCount": 4,
"media": [
{
"thumbnail": "https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/618970043_1315670090602717_8133399184917159433_n.jpg?stp=dst-jpg_s960x960_tt6&_nc_cat=1&ccb=1-7&_nc_sid=127cfc&_nc_ohc=T4WYOy4-rBwQ7kNvwE5nP9G&_nc_oc=AdkzQR48rCWiJpmKjbl9l8nfUvSEv23tImr9JzO_-y5mdq8R8Usmv0RmaO53tSClXcnmgFiygMHOEc6cjpHJ3cWO&_nc_zt=23&_nc_ht=scontent-lga3-3.xx&_nc_gid=ypkFPlrkf_vAdug9n8GJ3A&oh=00_Afq4rjFhoZmNdMyZZ9I3pmnEgtQl5mO5W8C21Yj2sQFrVQ&oe=69756C90",
"__typename": "Photo",
"__isMedia": "Photo",
"accent_color": "FF1A0534",
"photo_product_tags": [],
"photo_image": {
"uri": "https://scontent-lga3-3.xx.fbcdn.net/v/t39.30808-6/618970043_1315670090602717_8133399184917159433_n.jpg?stp=dst-jpg_s960x960_tt6&_nc_cat=1&ccb=1-7&_nc_sid=127cfc&_nc_ohc=T4WYOy4-rBwQ7kNvwE5nP9G&_nc_oc=AdkzQR48rCWiJpmKjbl9l8nfUvSEv23tImr9JzO_-y5mdq8R8Usmv0RmaO53tSClXcnmgFiygMHOEc6cjpHJ3cWO&_nc_zt=23&_nc_ht=scontent-lga3-3.xx&_nc_gid=ypkFPlrkf_vAdug9n8GJ3A&oh=00_Afq4rjFhoZmNdMyZZ9I3pmnEgtQl5mO5W8C21Yj2sQFrVQ&oe=69756C90",
"height": 540,
"width": 960
},
"url": "https://www.facebook.com/photo/?fbid=1315686073934452&set=a.636209511882115",
"id": "1315686073934452",
"feedback": {
"can_viewer_comment": false,
"id": "ZmVlZGJhY2s6MTMxNTY4NjE1MDYwMTExMQ=="
},
"ocrText": "May be an image of fireworks"
}
],
"feedbackId": "ZmVlZGJhY2s6MTMxNTY4NjE1MDYwMTExMQ==",
"reactionLikeCount": 135,
"reactionLoveCount": 8,
"reactionCareCount": 2,
"reactionWowCount": 1,
"topLevelUrl": "https://www.facebook.com/100064792144187/posts/1315686150601111",
"facebookId": "100064792144187",
"pageAdLibrary": {
"is_business_page_active": false,
"id": "169005736520113"
},
"inputUrl": "https://www.facebook.com/cern"
},
{
"facebookUrl": "https://www.facebook.com/OurWorldinData",
"postId": "1488978839895353",
"pageName": "OurWorldinData",
"url": "https://www.facebook.com/OurWorldinData/posts/pfbid0cgFatC8MEX6pPqnj6bPWS64bkptnQS5p8LivWR9PbJoJbeRg6fcFjqvf9d35e6iYl",
"time": "2026-01-20T11:17:58.000Z",
"timestamp": 1768907878,
"user": {
"id": "100063497546604",
"name": "Our World in Data",
"profileUrl": "https://www.facebook.com/100063497546604",
"profilePic": "https://scontent.fwbw1-1.fna.fbcdn.net/v/t39.30808-1/476307086_1193465699446670_8804202441996587127_n.jpg?stp=cp0_dst-jpg_s50x50_tt6&_nc_cat=110&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=ZGpr8DcwVY0Q7kNvwHzaC7d&_nc_oc=AdmGwCHVLWxxE6EnQCCzXLGzIeOeEXwOyd6hrfIWlRTXQ_7MtFNVmFsND5lm_Q3qFiQ&_nc_zt=24&_nc_ht=scontent.fwbw1-1.fna&_nc_gid=dg8rFwrg9E1em7VZFcstUw&oh=00_Afq3evsVu7EiclquNSCxjcw3ThSEzW2hJXemkOyEjZxNWg&oe=697574D3"
},
"collaborators": [],
"text": "Over 40,000 near-Earth asteroids have been detected since 1990—\n\nSince the late 20th century, astronomers and space agencies have taken steps to monitor the threat of large asteroids passing near Earth.\n\nThey set up international efforts to find these objects early, track their paths, and learn more about what they’re made of, so we’d have the best chance of spotting a real collision risk in time.\n\nAs the chart shows, more than 40,000 near-Earth asteroids have been discovered and tracked since 1990.\n\nNASA estimates that we’ve already found over 90% of near-Earth objects larger than 1 kilometer. These are the most dangerous ones, because an impact at that size could cause global-scale damage.\n\n(This Data Insight was written by Edouard Mathieu and Pablo Rosado.)\n\nExplore more interactive charts on space exploration and satellites: https://ourworldindata.org/search?topics=Space+Exploration+%26+Satellites\n\nSubscribe to our newsletter to receive Data Insights directly in your inbox: https://ourworldindata.org/subscribe",
"textReferences": [
{
"url": "https://l.facebook.com/l.php?u=https%3A%2F%2Fourworldindata.org%2Fsearch%3Ftopics%3DSpace%2BExploration%2B%2526%2BSatellites&h=AT3NPxyNmqS2JQy-DvT58TqeSLMsmfDLMrV4PTA2IG3Z0CU34gFYT_XCyyl1WSYL5hnYhbJ8vSMkKTIGeQVySnTmPIBPFVlxRDGUe0k5asfIJ60xJp2P2d6BRLs-fjqU3TXnbeVHmUQKARp3Z6-ydQBH9XwkaMJ3&s=1",
"external_url": "https://ourworldindata.org/search?topics=Space+Exploration+%26+Satellites",
"web_link": {
"__typename": "ExternalWebLink",
"url": "https://ourworldindata.org/search?topics=Space+Exploration+%26+Satellites",
"fbclid": null,
"lynx_mode": "ASYNCLAZY"
},
"mobileUrl": "https://lm.facebook.com/l.php?u=https%3A%2F%2Fourworldindata.org%2Fsearch%3Ftopics%3DSpace%2BExploration%2B%2526%2BSatellites&h=AT1N99KYEUlxP8PCcf-3qvEYm7AeLu0SBDTjLZ8dB6LidS7TU2ZayjGvsafq1ZmRnJZsFdFQQRtcNCywo8BLq_u7QXj2Uw43Ki4baM81PjZtaNMHqucYdNIDv-zT9E5DolF5hM6QpIzuo0tpDaWmG11JHVJddp5l&s=1",
"id": "NjQyMTgzOTU5MjA4MTA3Omh0dHBzXGEvL291cndvcmxkaW5kYXRhLm9yZy9zZWFyY2g/dG9waWNzPVNwYWNlK0V4cGxvcmF0aW9uKyUyNitTYXRlbGxpdGVzOjpEZWZhdWx0Ojo6MTQ4ODk3ODgzOTg5NTM1Mw=="
},
{
"url": "https://l.facebook.com/l.php?u=https%3A%2F%2Fourworldindata.org%2Fsubscribe&h=AT3yksEresnHU9OBj2Y-BKIgvYxj8aPk43bTyu2iqKQt0Z854MWqeFqL01Cl2pmhtOf13gw92KmgON1_NIBvAeVlWCcxkekOYfQWIpz-AOqay_Vd0orw4u9JGHYn_cE-hzVLsCWBVBNqyLppudh81pZwPX2fVruy&s=1",
"external_url": "https://ourworldindata.org/subscribe",
"web_link": {
"__typename": "ExternalWebLink",
"url": "https://ourworldindata.org/subscribe",
"fbclid": null,
"lynx_mode": "ASYNCLAZY"
},
"mobileUrl": "https://lm.facebook.com/l.php?u=https%3A%2F%2Fourworldindata.org%2Fsubscribe&h=AT1VYhjtXkApq3moVuZ-5QEeqYHwsgf873PIVoxZxfPI8BddSoNKhcvOE-3B6QRyJ83i8lQJwlxZbKGQiVTXxE3GcOXvGMbb4U14rzf4llPtSXaiDllYul2YdQvVIrhQVirUCK36ROqN8Y7xsYyXzGZM5kj214tx&s=1",
"id": "NjQyMTgzOTU5MjA4MTA3Omh0dHBzXGEvL291cndvcmxkaW5kYXRhLm9yZy9zdWJzY3JpYmU6OkRlZmF1bHQ6OjoxNDg4OTc4ODM5ODk1MzUz"
}
],
"link": "https://ourworldindata.org/search?topics=Space+Exploration+%26+Satellites",
"likes": 18,
"shares": 3,
"topReactionsCount": 2,
"media": [
{
"thumbnail": "https://scontent.fwbw1-1.fna.fbcdn.net/v/t39.30808-6/617842353_1488978829895354_7092179280408000991_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=110&ccb=1-7&_nc_sid=127cfc&_nc_ohc=3dhbP9jOwxIQ7kNvwF1Qzy6&_nc_oc=Adkc0EwoJPJVx-RKMGDlUZJAf_865JrqG1gVo6a3XiDQIG9IaW3QVZy_tqOaLHJKXuE&_nc_zt=23&_nc_ht=scontent.fwbw1-1.fna&_nc_gid=dg8rFwrg9E1em7VZFcstUw&oh=00_AfornpHQbUc5G5G6shAmqPTIIb2dJ7lb8Nn-Mrssv-LDXQ&oe=69754B62",
"__typename": "Photo",
"__isMedia": "Photo",
"accent_color": "FFFFFFFF",
"photo_product_tags": [],
"photo_image": {
"uri": "https://scontent.fwbw1-1.fna.fbcdn.net/v/t39.30808-6/617842353_1488978829895354_7092179280408000991_n.jpg?stp=dst-jpg_p526x296_tt6&_nc_cat=110&ccb=1-7&_nc_sid=127cfc&_nc_ohc=3dhbP9jOwxIQ7kNvwF1Qzy6&_nc_oc=Adkc0EwoJPJVx-RKMGDlUZJAf_865JrqG1gVo6a3XiDQIG9IaW3QVZy_tqOaLHJKXuE&_nc_zt=23&_nc_ht=scontent.fwbw1-1.fna&_nc_gid=dg8rFwrg9E1em7VZFcstUw&oh=00_AfornpHQbUc5G5G6shAmqPTIIb2dJ7lb8Nn-Mrssv-LDXQ&oe=69754B62",
"height": 526,
"width": 526
},
"url": "https://www.facebook.com/photo/?fbid=1488978826562021&set=a.542059731253940",
"id": "1488978826562021",
"feedback": {
"can_viewer_comment": false,
"id": "ZmVlZGJhY2s6MTQ4ODk3ODgzOTg5NTM1Mw=="
},
"ocrText": "Cumulative near-Earth asteroids discovered over time. Stacked area chart of cumulative discoveries from 1990 to 2025, showing three size categories: smaller than 140 meters; 140 meters to 1 kilometer; and larger than 1 kilometer. The y-axis runs from 0 to 40,000 cumulative asteroids. Discoveries rise slowly through the 1990s and 2000s, then accelerate sharply after about 2010 and especially after 2015. By 2025, roughly 40,000 near-Earth asteroids have been recorded, with the majority in the smaller-than-140-meters category, a substantial but smaller share in the 140 meters to 1 kilometer category, and a very small number larger than 1 kilometer. Data source: NASA Center for Near-Earth Object Studies (2026). License: CC BY."
}
],
"feedbackId": "ZmVlZGJhY2s6MTQ4ODk3ODgzOTg5NTM1Mw==",
"reactionLikeCount": 17,
"reactionHahaCount": 1,
"topLevelUrl": "https://www.facebook.com/100063497546604/posts/1488978839895353",
"facebookId": "100063497546604",
"pageAdLibrary": {
"is_business_page_active": false,
"id": "255848064618361"
},
"inputUrl": "https://www.facebook.com/OurWorldinData"
},
{
"facebookUrl": "https://www.facebook.com/bbcearth",
"postId": "1441693187314472",
"pageName": "bbcearth",
"url": "https://www.facebook.com/reel/895509256298494/",
"time": "2026-01-20T14:00:46.000Z",
"timestamp": 1768917646,
"user": {
"id": "100044214140223",
"name": "BBC Earth",
"profileUrl": "https://www.facebook.com/100044214140223",
"profilePic": "https://scontent-mia3-3.xx.fbcdn.net/v/t39.30808-1/378863511_857719969045133_4486636644081495495_n.jpg?stp=c191.191.1666.1666a_cp0_dst-jpg_s50x50_tt6&_nc_cat=1&ccb=1-7&_nc_sid=2d3e12&_nc_ohc=38S9Wsz6IisQ7kNvwEHjsej&_nc_oc=Adl754iSLl3lFILNqorjKKl9bvdbaRk5ifAe4-18BjgWlvvA1fmkDvFfFfwumHo4XUk&_nc_zt=24&_nc_ht=scontent-mia3-3.xx&_nc_gid=91OrvVvEtP9Zr9FHWiKYMA&oh=00_Afq23KotN4dC2MI0MrFoQOmIYUMiT8oZ6iRWNHZD5oZH2Q&oe=69757D3D"
},
"collaborators": [],
"text": "Like many animals, panda bears take pains to mark their territory. They may even perform an handstand or two.",
"likes": 147,
"comments": 2,
"shares": 3,
"topReactionsCount": 5,
"viewsCount": 309624,
"feedbackId": "ZmVlZGJhY2s6MTQ0MTY5MzE4NzMxNDQ3Mg==",
"reactionLikeCount": 112,
"reactionLoveCount": 29,
"reactionCareCount": 3,
"reactionHahaCount": 2,
"reactionWowCount": 1,
"topLevelUrl": "https://www.facebook.com/100044214140223/posts/1441693187314472",
"facebookId": "100044214140223",
"pageAdLibrary": {
"is_business_page_active": false,
"id": "118883634811868"
},
"inputUrl": "https://www.facebook.com/bbcearth"
}
]

- **apify/web-scraper** - Detik, Kompas, Tribun, Tempo

```json
{
  "breakpointLocation": "NONE",
  "browserLog": false,
  "closeCookieModals": false,
  "debugLog": false,
  "downloadCss": true,
  "downloadMedia": true,
  "excludes": [
    {
      "glob": "/**/*.{png,jpg,jpeg,pdf}"
    }
  ],
  "globs": [
    {
      "glob": "https://crawlee.dev/js/*/*"
    }
  ],
  "headless": true,
  "ignoreCorsAndCsp": false,
  "ignoreSslErrors": false,
  "injectJQuery": true,
  "keepUrlFragments": false,
  "linkSelector": "a[href]",
  "pageFunction": "// The function accepts a single argument: the \"context\" object.\n// For a complete list of its properties and functions,\n// see https://apify.com/apify/web-scraper#page-function \nasync function pageFunction(context) {\n    // This statement works as a breakpoint when you're trying to debug your code. Works only with Run mode: DEVELOPMENT!\n    // debugger; \n\n    // jQuery is handy for finding DOM elements and extracting data from them.\n    // To use it, make sure to enable the \"Inject jQuery\" option.\n    const $ = context.jQuery;\n    const pageTitle = $('title').first().text();\n    const h1 = $('h1').first().text();\n    const first_h2 = $('h2').first().text();\n    const random_text_from_the_page = $('p').first().text();\n\n\n    // Print some information to Actor log\n    context.log.info(`URL: ${context.request.url}, TITLE: ${pageTitle}`);\n\n    // Manually add a new page to the queue for scraping.\n   await context.enqueueRequest({ url: 'http://www.example.com' });\n\n    // Return an object with the data extracted from the page.\n    // It will be stored to the resulting dataset.\n    return {\n        url: context.request.url,\n        pageTitle,\n        h1,\n        first_h2,\n        random_text_from_the_page\n    };\n}",
  "postNavigationHooks": "// We need to return array of (possibly async) functions here.\n// The functions accept a single argument: the \"crawlingContext\" object.\n[\n    async (crawlingContext) => {\n        // ...\n    },\n]",
  "preNavigationHooks": "// We need to return array of (possibly async) functions here.\n// The functions accept two arguments: the \"crawlingContext\" object\n// and \"gotoOptions\".\n[\n    async (crawlingContext, gotoOptions) => {\n        // ...\n    },\n]\n",
  "proxyConfiguration": {
    "useApifyProxy": true
  },
  "respectRobotsTxtFile": true,
  "runMode": "DEVELOPMENT",
  "startUrls": [
    {
      "url": "https://crawlee.dev/js"
    }
  ],
  "useChrome": false,
  "waitUntil": ["networkidle2"]
}
```

Input configurations
On input, the Web Scraper Actor accepts a number of configuration settings. These can be entered either manually in the user interface in Apify Console, or programmatically in a JSON object using the Apify API.

For a complete list of input fields and their type, please see the input tab.

Run mode
Run mode allows you to switch between two modes of operation for Web Scraper.

PRODUCTION mode gives you full control and full performance. You should always switch Web Scraper to production mode once you're done making changes to your scraper.

When starting to develop your Scraper, you want to be able to inspect what's happening in the browser and debug your code. You can do that with the scraper's DEVELOPMENT mode. It allows you to directly control the browser using Chrome DevTools. Open the Live View tab to access the DevTools. It will also limit concurrency and prevent timeouts to improve your DevTools experience. Other debugging related options can be configured in the Advanced configuration section.

Start URLs
The Start URLs (startUrls) field represent the initial list of URLs of pages that the scraper will visit. You can either enter these URLs manually one by one, upload them in a CSV file or link URLs from the Google Sheets document. Each URL must start with either a http:// or https:// protocol prefix.

The scraper supports adding new URLs to scrape on the fly, either using the Link selector and Glob Patterns/Pseudo-URLs options or by calling await context.enqueueRequest() inside Page function.

Optionally, each URL can be associated with custom user data - a JSON object that can be referenced from your JavaScript code in Page function under context.request.userData. This is useful for determining which start URL is currently loaded, in order to perform some page-specific actions. For example, when crawling an online store, you might want to perform different actions on a page listing the products vs. a product detail page. For details, see our web scraping tutorial.

Link selector
The Link selector (linkSelector) field contains a CSS selector that is used to find links to other web pages, i.e. <a> elements with the href attribute.

On every page loaded, the scraper looks for all links matching Link selector, checks that the target URL matches one of the Glob Patterns/Pseudo-URLs, and if so then adds the URL to the request queue, so that it's loaded by the scraper later.

By default, new scrapers are created with the following selector that matches all links:

a[href]

If Link selector is empty, the page links are ignored, and the scraper only loads pages that were specified in Start URLs or that were manually added to the request queue by calling await context.enqueueRequest() in Page function.

Glob Patterns
The Glob Patterns (globs) field specifies which types of URLs found by Link selector should be added to the request queue.

A glob pattern is simply a string with wildcard characters.

For example, a glob pattern http://www.example.com/pages/**/* will match all the following URLs:

http://www.example.com/pages/deeper-level/page
http://www.example.com/pages/my-awesome-page
http://www.example.com/pages/something
Note that you don't need to use the Glob Patterns setting at all, because you can completely control which pages the scraper will access by calling await context.enqueueRequest() from the Page function.

Pseudo-URLs
The Pseudo-URLs (pseudoUrls) field specifies what kind of URLs found by Link selector should be added to the request queue.

A pseudo-URL is simply a URL with special directives enclosed in [] brackets. Currently, the only supported directive is [regexp], which defines a JavaScript-style regular expression to match against the URL.

For example, a pseudo-URL http://www.example.com/pages/[(\w|-)*] will match all the following URLs:

http://www.example.com/pages/
http://www.example.com/pages/my-awesome-page
http://www.example.com/pages/something
If either [ or ] is part of the normal query string, it must be encoded as [\x5B] or [\x5D], respectively. For example, the following pseudo-URL:

http://www.example.com/search?do[\x5B]load[\x5D]=1

will match the URL:

http://www.example.com/search?do[load]=1

Optionally, each pseudo-URL can be associated with user data that can be referenced from your Page function using context.request.label to determine which kind of page is currently loaded in the browser.

Note that you don't need to use the Pseudo-URLs setting at all, because you can completely control which pages the scraper will access by calling await context.enqueueRequest() from Page function.

Page function
The Page function (pageFunction) field contains a JavaScript function that is executed in the context of every page loaded in the Chromium browser. The purpose of this function is to extract data from the web page, manipulate the DOM by clicking elements, add new URLs to the request queue and otherwise control Web Scraper's operation.

Example:

async function pageFunction(context) {
// jQuery is handy for finding DOM elements and extracting data from them.
// To use it, make sure to enable the "Inject jQuery" option.
const $ = context.jQuery;
    const pageTitle = $('title').first().text();

    // Print some information to Actor log
    context.log.info(`URL: ${context.request.url}, TITLE: ${pageTitle}`);

    // Manually add a new page to the scraping queue.
    await context.enqueueRequest({ url: 'http://www.example.com' });

    // Return an object with the data extracted from the page.
    // It will be stored to the resulting dataset.
    return {
        url: context.request.url,
        pageTitle,
    };

}

The page function accepts a single argument, the context object, whose properties are listed in the table below. Since the function is executed in the context of the web page, it can access the DOM, e.g. using the window or document global variables.

The return value of the page function is an object (or an array of objects) representing the data extracted from the web page. The return value must be stringify-able to JSON, i.e. it can only contain basic types and no circular references. If you don't want to extract any data from the page and skip it in the clean results, simply return null or undefined.

The page function supports the JavaScript ES6 syntax and is asynchronous, which means you can use the await keyword to wait for background operations to finish. To learn more about async functions, see Mozilla documentation.

Properties of the context object:

customData: Object Contains the object provided in the Custom data (customData) input setting. This is useful for passing dynamic parameters to your Web Scraper using API.

enqueueRequest(request, [options]): AsyncFunction Adds a new URL to the request queue, if it wasn't already there. The request parameter is an object containing details of the request, with properties such as url, label, userData, headers etc. For the full list of the supported properties, see the
Request
object's constructor in Crawlee documentation. The optional options parameter is an object with additional options. Currently, it only supports the forefront boolean flag. If it's true, the request is added to the beginning of the queue. By default, requests are added to the end. Example:

await context.enqueueRequest({ url: 'https://www.example.com' });
await context.enqueueRequest(
{ url: 'https://www.example.com/first' },
{ forefront: true },
);

env: Object A map of all relevant values set by the Apify platform to the Actor run via the APIFY_ environment variables. For example, you can find here information such as Actor run ID, timeouts, Actor run memory, etc. For the full list of available values, see
ApifyEnv
interface in Apify SDK. Example:

console.log(`Actor run ID: ${context.env.actorRunId}`);

getValue(key): AsyncFunction Gets a value from the default key-value store associated with the Actor run. The key-value store is useful for persisting named data records, such as state objects, files, etc. The function is very similar to
Actor.getValue()
function in Apify SDK. To set the value, use the dual function context.setValue(key, value). Example:

const value = await context.getValue('my-key');
console.dir(value);

globalStore: Object Represents an in-memory store that can be used to share data across page function invocations, e.g. state variables, API responses or other data. The globalStore object has an equivalent interface as JavaScript's
Map
object, with a few important differences:

All functions of globalStore are async; use await when calling them.
Keys must be strings and values need to be JSON stringify-able.
forEach() function is not supported. Note that the stored data is not persisted. If the Actor run is restarted or migrated to another worker server, the content of globalStore is reset. Therefore, never depend on a specific value to be present in the store. Example:
let movies = await context.globalStore.get('cached-movies');
if (!movies) {
movies = await fetch('http://example.com/movies.json');
await context.globalStore.set('cached-movies', movies);
}
console.dir(movies);

input: Object An object containing the Actor run input, i.e. the Web Scraper's configuration. Each page function invocation gets a fresh copy of the input object, so changing its properties has no effect.

jQuery: Function A reference to the
jQuery
library, which is extremely useful for DOM traversing, manipulation, querying and data extraction. This field is only available if the Inject jQuery option is enabled. Typically, the jQuery function is registered under a global variable called $. However, the web page might use this global variable for something else. To avoid conflicts, the jQuery object is not registered globally and is only available through the context.jQuery property. Example:

const $ = context.jQuery;
const pageTitle = $('title').first().text();

log: Object An object containing logging functions, with the same interface as provided by the
Crawlee.utils.log
object in Crawlee. The log messages are written directly to the Actor run log, which is useful for monitoring and debugging. Note that log.debug() only prints messages to the log if the Enable debug log input setting is set. Example:

const log = context.log;
log.debug('Debug message', { hello: 'world!' });
log.info('Information message', { all: 'good' });
log.warning('Warning message');
log.error('Error message', { details: 'This is bad!' });
try {
throw new Error('Not good!');
} catch (e) {
log.exception(e, 'Exception occurred', {
details: 'This is really bad!',
});
}

request: Object An object containing information about the currently loaded web page, such as the URL, number of retries, a unique key, etc. Its properties are equivalent to the
Request
object in Crawlee.

response: Object An object containing information about the HTTP response from the web server. Currently, it only contains the status and headers properties. For example:

{
// HTTP status code
status: 200,

// HTTP headers
headers: {
'content-type': 'text/html; charset=utf-8',
'date': 'Wed, 06 Nov 2019 16:01:53 GMT',
'cache-control': 'no-cache',
'content-encoding': 'gzip',
},
}

saveSnapshot(): AsyncFunction Saves a screenshot and full HTML of the current page to the key-value store associated with the Actor run, under the SNAPSHOT-SCREENSHOT and SNAPSHOT-HTML keys, respectively. This feature is useful when debugging your scraper. Note that each snapshot overwrites the previous one and the saveSnapshot() calls are throttled to at most one call in two seconds, in order to avoid excess consumption of resources and slowdown of the Actor.

setValue(key, data, options): AsyncFunction Sets a value to the default key-value store associated with the Actor run. The key-value store is useful for persisting named data records, such as state objects, files, etc. The function is very similar to
KeyValueStore.setValue()
function in Crawlee. To get the value, use the dual function await context.getValue(key). Example:

await context.setValue('my-key', { hello: 'world' });

skipLinks(): AsyncFunction Calling this function ensures that page links from the current page will not be added to the request queue, even if they match the Link selector and/or Glob Patterns/Pseudo-URLs settings. This is useful to programmatically stop recursive crawling, e.g. if you know there are no more interesting links on the current page to follow.

waitFor(task, options): AsyncFunction A helper function that waits either a specific amount of time (in milliseconds), for an element specified using a CSS selector to appear in the DOM or for a provided function to return true. This is useful for extracting data from web pages with dynamic content, where the content might not be available at the time when the page function is called. The options parameter is an object with the following properties and default values:

{
// Maximum time to wait
timeoutMillis: 20000,

// How often to check if the condition changes
pollingIntervalMillis: 50,
}

Example:

// Wait for selector
await context.waitFor('.foo');
// Wait for 1 second
await context.waitFor(1000);
// Wait for predicate
await context.waitFor(() => !!document.querySelector('.foo'), {
timeoutMillis: 5000,
});

Proxy configuration
The Proxy configuration (proxyConfiguration) option enables you to set proxies that will be used by the scraper in order to prevent its detection by target websites. You can use both Apify Proxy and custom HTTP or SOCKS5 proxy servers.

Proxy is required to run the scraper. The following table lists the available options of the proxy configuration setting:

Apify Proxy (automatic) The scraper will load all web pages using Apify Proxy in the automatic mode. In this mode, the proxy uses all proxy groups that are available to the user, and for each new web page it automatically selects the proxy that hasn't been used in the longest time for the specific hostname, in order to reduce the chance of detection by the website. You can view the list of available proxy groups on the Proxy page in Apify Console.
Apify Proxy (selected groups) The scraper will load all web pages using Apify Proxy with specific groups of target proxy servers.
Custom proxies
The scraper will use a custom list of proxy servers. The proxies must be specified in the `scheme://user:password@host:port` format, multiple proxies should be separated by a space or new line. The URL scheme can be either `HTTP` or `SOCKS5`. User and password might be omitted, but the port must always be present.

Example:

http://bob:password@proxy1.example.com:8000
http://bob:password@proxy2.example.com:8000

The proxy configuration can be set programmatically when calling the Actor using the API by setting the proxyConfiguration field. It accepts a JSON object with the following structure:

{
// Indicates whether to use Apify Proxy or not.
"useApifyProxy": Boolean,

    // Array of Apify Proxy groups, only used if "useApifyProxy" is true.
    // If missing or null, Apify Proxy will use the automatic mode.
    "apifyProxyGroups": String[],

    // Array of custom proxy URLs, in "scheme://user:password@host:port" format.
    // If missing or null, custom proxies are not used.
    "proxyUrls": String[],

}

Logging into websites with Web Scraper
The Initial cookies field allows you to set cookies that will be used by the scraper to log into websites. Cookies are small text files that are stored on your computer by your web browser. Various websites use cookies to store information about your current session. By transferring this information to the scraper, it will be able to log into websites using your credentials. To learn more about logging into websites by transferring cookies, check out our tutorial.

Be aware that cookies usually have a limited lifespan and will expire after a certain period of time. This means that you will have to update the cookies periodically in order to keep the scraper logged in. Alternative approach is to make the scraper actively log in to the website in the Page function. For more info about this approach, check out our tutorial on logging into websites using Puppeteer.

The scraper expects the cookies in the Initial cookies field to be stored as separate JSON objects in a JSON array, see example below:

[
{
"name": " ga",
"value": "GA1.1.689972112. 1627459041",
"domain": ".apify.com",
"hostOnly": false,
"path": "/",
"secure": false,
"httpOnly": false,
"sameSite": "no_restriction",
"session": false,
"firstPartyDomain": "",
"expirationDate": 1695304183,
"storelId": "firefox-default",
"id": 1
}
]

Advanced configuration
Pre-navigation hooks
This is an array of functions that will be executed BEFORE the main pageFunction is run. A similar context object is passed into each of these functions as is passed into the pageFunction; however, a second "DirectNavigationOptions" object is also passed in.

The available options can be seen here:

preNavigationHooks: [
async (
{ id, request, session, proxyInfo },
{ timeout, waitUntil, referer },
) => {},
];

Unlike with playwright, puppeteer and cheerio scrapers, in web scraper we don't have the Actor object available in the hook parameters, as the hook is executed inside the browser.

Check out the docs for Pre-navigation hooks and the PuppeteerHook type for more info regarding the objects passed into these functions.

Post-navigation hooks
An array of functions that will be executed AFTER the main pageFunction is run. The only available parameter is the CrawlingContext object.

postNavigationHooks: [
async ({ id, request, session, proxyInfo, response }) => {},
],

Unlike with playwright, puppeteer and cheerio scrapers, in web scraper we don't have the Actor object available in the hook parameters, as the hook is executed inside the browser.

Check out the docs for Post-navigation hooks and the PuppeteerHook type for more info regarding the objects passed into these functions.

Insert breakpoint
This property has no effect if Run mode is set to PRODUCTION. When set to DEVELOPMENT it inserts a breakpoint at the selected location in every page the scraper visits. Execution of code stops at the breakpoint until manually resumed in the DevTools window accessible via Live View tab or Container URL. Additional breakpoints can be added by adding debugger; statements within your Page function.

Debug log
When set to true, debug messages will be included in the log. Use context.log.debug('message') to log your own debug messages.

Browser log
When set to true, console messages from the browser will be included in the Actor's log. This may result in the log being flooded by error messages, warnings and other messages of little value (especially with a high concurrency).

Custom data
Since the input UI is fixed, it does not support adding of other fields that may be needed for all specific use cases. If you need to pass arbitrary data to the scraper, use the Custom data input field within Advanced configuration and its contents will be available under the customData context key as an object within the pageFunction.

Custom names
With the final three options in the Advanced configuration, you can set custom names for the following:

Dataset
Key-value store
Request queue
Leave the storage unnamed if you only want the data within it to be persisted on the Apify platform for a number of days corresponding to your plan (after which it will expire). Named storages are retained indefinitely. Additionally, using a named storage allows you to share it across multiple runs (e.g. instead of having 10 different unnamed datasets for 10 different runs, all the data from all 10 runs can be accumulated into a single named dataset). Learn more here.

Results
All scraping results returned by Page function are stored in the default dataset associated with the Actor run, and can be saved in several different formats, such as JSON, XML, CSV or Excel. For each object returned by Page function, Web Scraper pushes one record into the dataset, and extends it with metadata such as the URL of the web page where the results come from.

For example, if your page function returned the following object:

{
message: 'Hello world!',
}

The full object stored in the dataset will look as follows (in JSON format, including the metadata fields #error and #debug):

{
"message": "Hello world!",
"#error": false,
"#debug": {
"requestId": "fvwscO2UJLdr10B",
"url": "https://www.example.com/",
"loadedUrl": "https://www.example.com/",
"method": "GET",
"retryCount": 0,
"errorMessages": null,
"statusCode": 200
}
}

To download the results, call the Get dataset items API endpoint:

https://api.apify.com/v2/datasets/[DATASET_ID]/items?format=json

where [DATASET_ID] is the ID of the Actor's run dataset, in which you can find the Run object returned when starting the Actor. Alternatively, you'll find the download links for the results in Apify Console.

To skip the #error and #debug metadata fields from the results and not include empty result records, simply add the clean=true query parameter to the API URL, or select the Clean items option when downloading the dataset in Apify Console.

To get the results in other formats, set the format query parameter to xml, xlsx, csv, html, etc. For more information, see Datasets in documentation or the Get dataset items endpoint in Apify API reference.

Additional resources

- **apify/web-scraper** - Kaskus & forum lokal

```json
{
  "breakpointLocation": "NONE",
  "browserLog": false,
  "closeCookieModals": false,
  "debugLog": false,
  "downloadCss": true,
  "downloadMedia": true,
  "excludes": [
    {
      "glob": "/**/*.{png,jpg,jpeg,pdf}"
    }
  ],
  "globs": [
    {
      "glob": "https://crawlee.dev/js/*/*"
    }
  ],
  "headless": true,
  "ignoreCorsAndCsp": false,
  "ignoreSslErrors": false,
  "injectJQuery": true,
  "keepUrlFragments": false,
  "linkSelector": "a[href]",
  "pageFunction": "// The function accepts a single argument: the \"context\" object.\n// For a complete list of its properties and functions,\n// see https://apify.com/apify/web-scraper#page-function \nasync function pageFunction(context) {\n    // This statement works as a breakpoint when you're trying to debug your code. Works only with Run mode: DEVELOPMENT!\n    // debugger; \n\n    // jQuery is handy for finding DOM elements and extracting data from them.\n    // To use it, make sure to enable the \"Inject jQuery\" option.\n    const $ = context.jQuery;\n    const pageTitle = $('title').first().text();\n    const h1 = $('h1').first().text();\n    const first_h2 = $('h2').first().text();\n    const random_text_from_the_page = $('p').first().text();\n\n\n    // Print some information to Actor log\n    context.log.info(`URL: ${context.request.url}, TITLE: ${pageTitle}`);\n\n    // Manually add a new page to the queue for scraping.\n   await context.enqueueRequest({ url: 'http://www.example.com' });\n\n    // Return an object with the data extracted from the page.\n    // It will be stored to the resulting dataset.\n    return {\n        url: context.request.url,\n        pageTitle,\n        h1,\n        first_h2,\n        random_text_from_the_page\n    };\n}",
  "postNavigationHooks": "// We need to return array of (possibly async) functions here.\n// The functions accept a single argument: the \"crawlingContext\" object.\n[\n    async (crawlingContext) => {\n        // ...\n    },\n]",
  "preNavigationHooks": "// We need to return array of (possibly async) functions here.\n// The functions accept two arguments: the \"crawlingContext\" object\n// and \"gotoOptions\".\n[\n    async (crawlingContext, gotoOptions) => {\n        // ...\n    },\n]\n",
  "proxyConfiguration": {
    "useApifyProxy": true
  },
  "respectRobotsTxtFile": true,
  "runMode": "DEVELOPMENT",
  "startUrls": [
    {
      "url": "https://crawlee.dev/js"
    }
  ],
  "useChrome": false,
  "waitUntil": ["networkidle2"]
}
```

- **shahidirfan/tokopedia-search-scraper** - Tokopedia

```json
{
  "keyword": "game",
  "max_pages": 10,
  "results_wanted": 20,
  "startUrl": "https://www.tokopedia.com/search?st=&q=game&srp_component_id=02.01.00.00&srp_page_id=&srp_page_title=&navsource="
}
```

Features
Scrapes Tokopedia search products by keyword or direct search URL
Supports pagination with results_wanted and max_pages limits
Captures product, price, rating, sold text, shop, and category data
Deduplicates results across pages
Returns clean dataset output ready for API or export workflows
Use Cases
Product and price monitoring
Competitor assortment research
Marketplace trend tracking by keyword
Seller and category benchmarking
Input data for dashboards or BI tools
Input Parameters
Field Type Default Description
startUrl string Tokopedia game search URL Tokopedia search URL to start from
keyword string game Search keyword; overrides q from startUrl when provided
results_wanted integer 20 Maximum number of products to save
max_pages integer 10 Maximum number of result pages to visit
proxyConfiguration object { "useApifyProxy": false } Optional proxy settings
Output Data
Field Type Description
keyword string Search keyword used
page integer Page number
position integer Product position in overall sequence
product_id string Product identifier
title string Product title
product_url string Product page URL
image_url string Product image URL
price string Display price
price_number number Numeric price
original_price string Original price if available
discount_percentage number Discount percentage if available
rating number Product rating
sold_count string Sold text from listing
shop_name string Seller name
shop_url string Seller URL
shop_city string Seller city/region
category_name string Category name
is_ad boolean Ad indicator
fetched_at string ISO timestamp
Usage Examples
Example 1: Basic keyword scrape
{
"keyword": "game",
"results_wanted": 20,
"max_pages": 3
}

Example 2: Start from a specific search URL
{
"startUrl": "https://www.tokopedia.com/search?st=&q=keyboard",
"results_wanted": 50,
"max_pages": 5
}

Sample Output
{
"keyword": "game",
"page": 1,
"position": 1,
"product_id": "1755362829",
"title": "Sticker Pack Capcom Character Game Megaman Ryu Ken Stiker Laptop Vinyl - Pack A, Doff",
"product_url": "https://www.tokopedia.com/sutikki/sticker-pack-capcom-character-game-megaman-ryu-ken-stiker-laptop-vinyl-pack-a-glossy",
"image_url": "https://p16-images-sign-sg.tokopedia-static.net/...jpeg",
"price": "Rp25.000",
"price_number": 25000,
"discount_percentage": 0,
"shop_name": "Sutikki",
"shop_url": "https://www.tokopedia.com/sutikki",
"shop_city": "Jakarta Selatan",
"category_name": "Komputer & Laptop",
"is_ad": false,
"fetched_at": "2026-03-04T07:00:00.000Z"
}

Tips
Keep results_wanted close to your real need for faster runs.
Use max_pages as a safety cap when running broad keywords.
Page size, sort order, and safe search are configured internally for stable output.
If response quality drops, enable a proxy configuration.

- **xtracto/shopee-scraper** - Shopee

```json
{
  "category": "/Laptop-cat.11044364.11044440",
  "country": "id",
  "delay": 1,
  "fetchDetail": false,
  "itemId": 11089699432,
  "keyword": "laptop gaming",
  "maxProducts": 40,
  "mode": "keyword",
  "shop": "rasyidjaya_computer",
  "shopId": 196846900,
  "sort": "relevancy",
  "url": "https://shopee.co.id/search?keyword=laptop"
}
```

Why Use This Actor?
Shopee does not provide a public API. Most scraping solutions rely on full browser automation (Playwright/Puppeteer), which is slow, expensive, and fragile. This actor works without launching a browser at all, making it:

Fast - lightweight HTTP requests instead of rendering a full browser
Cost-efficient - lower compute unit consumption
Stable - no dependency on browser fingerprinting or JS rendering pipelines
Supported Countries
Code Domain
id shopee.co.id (Indonesia)
sg shopee.sg (Singapore)
my shopee.com.my (Malaysia)
th shopee.co.th (Thailand)
ph shopee.ph (Philippines)
vn shopee.vn (Vietnam)
br shopee.com.br (Brazil)
tw shopee.tw (Taiwan)
mx shopee.com.mx (Mexico)
co shopee.com.co (Colombia)
cl shopee.cl (Chile)
Where the request comes from matters
Shopee shows different amounts of product information depending on the country your request comes from. To get the richest data (description, brand, full specifications, all variants, image gallery), requests must originate inside the country you are scraping.

When you run this actor on Apify Cloud, it automatically uses an Apify Residential Proxy in the selected country for id, sg, my, th, ph — no setup needed. Local runs from a mismatched IP, and all SPA-only countries (vn, br, tw, mx, co, cl), fall back to a lighter data set (title, price, primary image, rating, sold count, seller info).

What you get per country × mode
Country keyword category shop detail (Apify Cloud) fetchDetail: true (Apify Cloud)
id ✅ ✅ ✅ ✅ Full ✅ Full
sg ✅ ✅ ✅ ✅ Full ✅ Full
my ✅ ✅ ✅ ✅ Full ✅ Full
th ✅ ✅ ✅ ✅ Full ✅ Full
ph ✅ ✅ ✅ ✅ Full ✅ Full
vn ✅ ✅ ✅ ⚠️ Light ⚠️ Light
br ✅ ✅ ✅ ⚠️ Light ⚠️ Light
tw ✅ ✅ ✅ ⚠️ Light ⚠️ Light
mx ✅ (60–70% have a price) ✅ ✅ ⚠️ Light ⚠️ Light
co ✅ ❌ Not available ✅ ⚠️ Light ⚠️ Light
cl ✅ ❌ Not available ✅ ⚠️ Light ⚠️ Light
Legend:

✅ Full = title + price range + description + brand + all variants + attributes + tier variations + categories + full image gallery + seller info. Only the exact displayed price may be null (Shopee hides it from the detail data); price_min / price_max are returned for most products.
⚠️ Light = title + price + primary image + rating + sold count + seller info. Description, brand, variants, attributes, tier variations, breadcrumb, and image gallery are not returned.
❌ Not available = the mode is rejected with a clear error message in the run log. Use keyword or shop mode for these regions instead.
Use Cases
Price monitoring - track price changes across products or categories over time
Competitor research - analyze competitor shop listings, pricing tiers, and discount strategies
Market research - discover bestselling products in a category or keyword segment
Product catalog extraction - pull product titles, images, attributes, and variants from a shop or search result
Lead generation - collect seller info (shop name, location, rating, follower count, response rate)
Input
Field Type Required Description
country select No (default: id) Shopee regional domain to scrape
mode select Yes Scraping mode (see below)
keyword string mode=keyword Search term, e.g. "laptop gaming"
url string mode=url Any Shopee URL - product, search, category, or shop page
shopId integer mode=detail Seller's numeric shop ID
itemId integer mode=detail Product's numeric item ID
category string mode=category Category slug, e.g. /Laptop-cat.11044364.11044440
shop string mode=shop Shop username or numeric shop ID
sort select No (default: relevancy) Sort order for search/category results
maxProducts integer No (default: 40) Maximum products to return
minPrice integer No Minimum price filter in local currency (keyword mode only)
maxPrice integer No Maximum price filter in local currency (keyword mode only)
fetchDetail boolean No (default: false) If true, each product card in keyword/category/shop/url modes is enriched with full detail data (variants, stock, images, attributes, seller info). Slower — each product requires 2 additional HTTP requests. Recommended for ≤ 20 products.
delay number No (default: 1.0) Delay in seconds between requests
Modes Explained
keyword - Search by keyword
Searches Shopee for a keyword and returns product cards (name, price, discount, images, IDs, location).

Note: Results are capped at ~40 products per sort variant. To get more products, increase maxProducts - the actor will automatically cycle through additional sort orders (sales, newest, price_asc, price_desc) to surface more unique results.

url - Auto-detect from any Shopee URL
Paste any Shopee URL and the actor auto-detects whether it's a product page, search result, category, or shop listing. Country is also auto-detected from the URL domain, so you can paste a shopee.sg URL even when the country input is set to id.

detail - Product detail by Shop ID + Item ID
Fetches full detail for a single product: description, all attributes, variants (names + stock availability), seller info, breadcrumb, and pricing when available. You need the Shop ID and Item ID, which can both be found in the product URL:

https://shopee.co.id/Product-Name-i.{SHOP_ID}.{ITEM_ID}
↑ ↑

category - Browse a category page
Provide a category slug (e.g. /Laptop-cat.11044364.11044440) or a full category URL. Returns up to maxProducts product cards from that category.

shop - Fetch a shop's product listing
Provide a shop username (e.g. rasyidjaya_computer) or a numeric shop ID. Returns product cards from that shop's storefront.

fetchDetail — Rich Enrichment Mode
By default, modes keyword, category, shop, and url return lightweight ProductCard data (name, price, discount, rating, image URL). This is fast and suitable for large-scale discovery.

Set fetchDetail: true to enrich each card with full ProductDetail: description, brand, all variant names, stock, full image gallery, product attributes, seller info, breadcrumb, and more.

Speed & Cost
Mode fetchDetail ~Time for 40 products Requests
keyword false ~40–60 sec ~2
keyword true ~6–10 min ~82
detail — ~5–10 sec 2
Each enriched product requires 2 HTTP requests (SSR + Googlebot JSON-LD). With the default 1 second delay and residential proxy latency on Apify cloud, expect ~8–12 seconds per product.

Recommendation: Use fetchDetail: false for discovery (large keyword/category runs), then feed interesting shopId + itemId pairs into mode=detail runs for full data. Or use the dedicated Shopee Product Detail actor.

What fetchDetail Adds
Field ProductCard ProductDetail (fetchDetail=true)
name / title ✓ ✓
price, discount_pct ✓ ✓
rating, sold_count ✓ ✓
image_url (1 image) ✓ ✓
description ✗ ✓
brand, brand_id ✗ ✓
images[] (all) ✗ ✓
models[] (variants) ✗ ✓
tier_variations[] ✗ ✓
attributes[] ✗ ✓
stock, historical_sold ✗ ✓
price_min, price_max ✗ ✓
availability ✗ ✓
shop{} (seller detail) ✗ ✓
breadcrumb[] ✗ ✓
Example — fetchDetail enabled
Input:

{
"country": "id",
"mode": "keyword",
"keyword": "laptop gaming",
"maxProducts": 5,
"fetchDetail": true
}

Output (one item, enriched):

{
"shop_id": 196846900,
"item_id": 11089699432,
"title": "Laptop Lenovo Thinkpad X1 Carbon 6th Intel Core i5",
"currency": "IDR",
"description": "Laptop bekas berkualitas...",
"brand": "Lenovo",
"price": 3570000.0,
"price_min": 3200000.0,
"price_max": 8370000.0,
"discount_pct": null,
"availability": "InStock",
"stock": 31,
"rating_star": 4.87,
"total_ratings": 55,
"images": ["https://down-id.img.susercontent.com/file/..."],
"models": [
{ "model_id": 227787022248, "name": "i5 Gen8 16GB/256GB", "price": null, "stock": null, "has_stock": true }
],
"attributes": [
{ "name": "Ukuran Layar", "value": "14 inci" }
],
"shop": {
"name": "RASYIDJAYA COMPUTER",
"rating_star": 4.84,
"item_count": 120,
"follower_count": 2248
}
}

Sample Input & Output
Example 1 - Keyword Search
Input:

{
"country": "id",
"mode": "keyword",
"keyword": "laptop gaming",
"sort": "sales",
"maxProducts": 40
}

Output (one item):

{
"shop_id": 12345678,
"item_id": 98765432100,
"name": "Laptop Gaming ASUS ROG Strix G15 Ryzen 7 16GB 512GB RTX3060",
"url": "https://shopee.co.id/Laptop-Gaming-ASUS-ROG-i.12345678.98765432100",
"image_url": "https://down-id.img.susercontent.com/file/id-11134207-xxx",
"price": 14999000,
"original_price": 17500000,
"discount_pct": 14,
"rating": 4.9,
"rating_count": 312,
"sold_count": 1200,
"location": "Jakarta Barat",
"is_mall": false,
"currency": "IDR"
}

Example 2 - Product Detail
Input:

{
"country": "id",
"mode": "detail",
"shopId": 196846900,
"itemId": 11089699432
}

Output:

{
"shop_id": 196846900,
"item_id": 11089699432,
"title": "Laptop Lenovo Thinkpad X1 Carbon 6th Intel Core i5 Gen8 Ram 16gb Ssd 256gb Bergaransi",
"currency": "IDR",
"brand": "Lenovo",
"condition": 4,
"price": 3570000.0,
"price_min": 3200000.0,
"price_max": 8370000.0,
"availability": "InStock",
"rating_star": 4.87,
"total_ratings": 55,
"stock": 31,
"is_hide_stock": false,
"images": [
"https://down-id.img.susercontent.com/file/id-11134207-7ra0n-xxx"
],
"attributes": [
{ "name": "Ukuran Layar", "value": "14 inci" },
{ "name": "Sistem Operasi", "value": "Windows" }
],
"models": [
{
"model_id": 227787022248,
"name": "Carbon 6th i5 Gen8,RAM 16GB/256GB SSD",
"price": null,
"stock": null,
"has_stock": true
}
],
"tier_variations": [],
"breadcrumb": [
{ "position": 1, "name": "Shopee", "url": "https://shopee.co.id" },
{ "position": 2, "name": "Komputer & Aksesoris" },
{ "position": 3, "name": "Laptop" }
],
"shop": {
"shopid": 196846900,
"name": "RASYIDJAYA COMPUTER",
"username": "rasyidjaya_computer",
"location": "KOTA BANDUNG",
"rating_star": 4.84,
"item_count": 120,
"follower_count": 2248,
"response_rate": 98
}
}

Example 3 - URL Auto-detect
Input:

{
"mode": "url",
"url": "https://shopee.co.id/search?keyword=mouse+wireless",
"maxProducts": 20
}

Returns the same format as keyword search. Country is auto-detected from the URL.

Known Limitations
Per-variant prices and stock are hidden by Shopee. For products with multiple variants (size, color, spec), each variant entry will have price: null and stock: null. You receive an overall price range (price_min / price_max) for most products, plus a single aggregate stock value.

The exact displayed price is hidden in detail mode. Shopee removes it from the data served to crawlers. You usually still receive price_min and price_max. If you need the exact price, scrape the product through keyword / category / shop mode first — the product card always carries a price.

"Sold count" is missing for most products. Shopee hides this number. The actor recovers it on a best-effort basis from visible page text, succeeding for roughly 30–50% of products. Many products will return null for sold_count / sold.

Keyword search returns around 40 products per page. The actor rotates through different sort orders (sales, newest, price low, price high) to surface more unique items, but the total can fall short of maxProducts for narrow queries.

Tip — to collect more varied results, run several related keywords instead of one broad term. For example, rather than only laptop, run separate runs for laptop, laptop gaming, laptop bekas, laptop asus, notebook, etc., then merge the datasets. Each keyword surfaces a different slice of Shopee's catalog, so combining them gives far broader coverage than a single search.

Category pages have only one page of results in category mode. Deeper navigation is not available through public access.

category mode is not available for Colombia (co) and Chile (cl). These regions do not expose category pages publicly. Use keyword or shop mode for those countries.

Detail richness depends on where the request comes from. Full product information (description, brand, all variants, attributes, image gallery) is only returned when the request originates inside the target country. On Apify Cloud this is handled automatically for id/sg/my/th/ph via residential proxy. From outside, or for vn/br/tw/mx/co/cl, you receive a lighter data set with title, price, primary image, rating, sold count, and seller info only.

Flash sale and voucher prices are not available. These require an authenticated browser session and cannot be obtained through public access.

- News

* **nadpra/indonews** - Berita Indonesia

```json
{
  "endDate": "2026-06-18",
  "keywords": "prabowo subianto",
  "limit": 50,
  "page": 1,
  "sortBy": "time",
  "startDate": "2026-06-02"
}
```

IndoNews Crawler – Indonesian Online News Aggregator
What does IndoNews Crawler do?
IndoNews Crawler automatically crawls, enriches, and summarizes news articles from major Indonesian media outlets: Detik, Kompas, CNN, Tempo, Beritasatu, Antara, etc. It provides sentiment, category, and emotion analysis with the latest news updates to help you understand current issues, trends, and media sentiment in Indonesia.

This actor can extract:

Article titles
Publication timestamps
Media source names
Sentiment and emotion labels
Full text of the article
Category or topic classification
Why scrape Indonesian news?
Online news is a key source of real-time public sentiment and issue tracking in Indonesia. IndoNews Crawler aggregates thousands of articles daily and helps organizations monitor, research, or analyze them at scale.

Here are some use cases:

Media monitoring
Public relations (PR) monitoring
Market and economic intelligence
Political and policy analysis
AI training datasets
Academic and research projects
Automation and API access
Live Demo to try quickly IndoNews Website. Other Apify Actors Indonesian News Trending Topics Collector.

Example use cases
The IndoNews Crawler – Indonesian Online News Aggregator can be used in many industries that rely on timely news intelligence and large-scale text datasets.

Media monitoring
Track how topics, organizations, or public figures are mentioned across Indonesian media.
Example keywords input: (prabowo, jokowi, pilpres) !rumor

Use cases:

Monitor political coverage
Track brand mentions in national media
Identify trending public issues
Public relations (PR) monitoring
PR teams can track sentiment and media narratives around their brand, products, or executives.

Example keywords input: startup indonesia, pendanaan startup

The actor provides:

sentiment analysis
emotion detection
media source identification
This helps detect potential PR crises early.

Market and economic intelligence
Companies and analysts can monitor macroeconomic and business news.

Example keywords input: harga minyak dunia, inflasi indonesia, suku bunga bank indonesia

Use cases:

economic trend monitoring
commodity news tracking
financial market sentiment analysis
Political and policy analysis
Researchers and analysts can track political narratives across Indonesian media.

Example keywords input: (kebijakan pemerintah, regulasi digital, uu ite) !hoaks

Possible insights:

policy debate trends
political sentiment shifts
government narrative tracking
AI training datasets
The crawler generates structured news data that can be used as a corpus for machine learning.

Each article includes:

title
category
sentiment
emotion
full article text
publication date
This makes the dataset suitable for:

NLP model training
sentiment classification
topic modeling
news recommendation systems
Academic and research projects
Universities and research institutions can use the dataset for:

media studies
political communication analysis
sentiment analysis research
misinformation detection
The actor supports date range filtering, allowing historical media analysis.

Automation and API access
The actor can be integrated directly into automated workflows using the Apify API.

This allows you to:

schedule daily news monitoring
export datasets to analytics pipelines
connect with BI tools
build AI pipelines
Example workflow:

Daily Run → Dataset → Data Warehouse → Dashboard / AI Model
💡 Tip: Many users run the actor daily with keyword monitoring to build a continuously updated news intelligence database.

How to use IndoNews Crawler
Scraping Indonesian online news with IndoNews Crawler is easy. Follow these simple steps to start collecting data in minutes.

Click Try for free on the actor’s Apify page.
Enter your search keywords, date range, and optional pagination parameters.
Click Run.
Once the run finishes, preview or download your data from the Dataset tab.
Input parameters
The actor supports several input parameters that allow you to filter news results by keywords, date range, and pagination.

Parameter Type Required Default Description
keywords string Yes – Search query used to filter news articles. Supports logical operators such as AND (space), OR (comma), and NOT (!).
startDate string (YYYY-MM-DD) No 7 days before Start date for filtering articles based on publication date.
endDate string (YYYY-MM-DD) No Today End date for filtering articles based on publication date.
limit integer No 50 Maximum number of articles returned per page.
page integer No 1 Page number used for pagination.
sortBy string No 'time' Output is sorted by: time or relevance.
Keywords query syntax
The keywords parameter supports simple logical operators.

Operator Symbol Example Meaning
AND space teknologi ai Both keywords must appear
OR comma , ekonomi, bisnis Either keyword may appear
NOT ! politik !korupsi Exclude articles containing the keyword
Example complex keywords input: (teknologi artificial intelligence, harga minyak dunia) !gibran

Meaning:

Articles about AI technology, OR
Global oil prices
Excluding articles mentioning gibran
Pagination behavior
The actor supports pagination for large datasets.

Example:

Page Limit Results Returned
1 100 Articles 1–100
2 100 Articles 101–200
3 100 Articles 201–300
Output
The actor outputs structured data containing enriched and analyzed articles with sentiment, emotion, and category classification.

Example results
Here is a sample of the data this actor produces:

{
"title": "Otoritas Pasar Modal Salurkan Rp 3,96 Miliar untuk Pemulihan Bencana Banjir di Sumatera",
"media_name": "Kompas",
"published_at": "2026-02-23T20:40:00",
"url": "https://money.kompas.com/read/2026/02/23/204000726/otoritas-pasar-modal-salurkan-rp-3-96-miliar-untuk-pemulihan-bencana-banjir-di",
"image": "https://asset.kompas.com/crops/dCQpeGZO7ZSP5DKBk8BWrrXAKnU=/0x0:721x481/1200x800/data/photo/2026/01/02/695769417a808.jpg",
"emotion": "Joy",
"sentiment": "Positive",
"category": "Finance",
"content": "JAKARTA, KOMPAS.com - Otoritas pasar modal Indonesia menyalurkan donasi sebesar Rp 3,96 miliar untuk mendukung percepatan pemulihan pasca bencana banjir dan longsor di Sumatera..."
}

- Forums

* **apify/web-scraper** - Kaskus & forum lokal

```json
{
  "breakpointLocation": "NONE",
  "browserLog": false,
  "closeCookieModals": false,
  "debugLog": false,
  "downloadCss": true,
  "downloadMedia": true,
  "excludes": [
    {
      "glob": "/**/*.{png,jpg,jpeg,pdf}"
    }
  ],
  "globs": [
    {
      "glob": "https://crawlee.dev/js/*/*"
    }
  ],
  "headless": true,
  "ignoreCorsAndCsp": false,
  "ignoreSslErrors": false,
  "injectJQuery": true,
  "keepUrlFragments": false,
  "linkSelector": "a[href]",
  "pageFunction": "// The function accepts a single argument: the \"context\" object.\n// For a complete list of its properties and functions,\n// see https://apify.com/apify/web-scraper#page-function \nasync function pageFunction(context) {\n    // This statement works as a breakpoint when you're trying to debug your code. Works only with Run mode: DEVELOPMENT!\n    // debugger; \n\n    // jQuery is handy for finding DOM elements and extracting data from them.\n    // To use it, make sure to enable the \"Inject jQuery\" option.\n    const $ = context.jQuery;\n    const pageTitle = $('title').first().text();\n    const h1 = $('h1').first().text();\n    const first_h2 = $('h2').first().text();\n    const random_text_from_the_page = $('p').first().text();\n\n\n    // Print some information to Actor log\n    context.log.info(`URL: ${context.request.url}, TITLE: ${pageTitle}`);\n\n    // Manually add a new page to the queue for scraping.\n   await context.enqueueRequest({ url: 'http://www.example.com' });\n\n    // Return an object with the data extracted from the page.\n    // It will be stored to the resulting dataset.\n    return {\n        url: context.request.url,\n        pageTitle,\n        h1,\n        first_h2,\n        random_text_from_the_page\n    };\n}",
  "postNavigationHooks": "// We need to return array of (possibly async) functions here.\n// The functions accept a single argument: the \"crawlingContext\" object.\n[\n    async (crawlingContext) => {\n        // ...\n    },\n]",
  "preNavigationHooks": "// We need to return array of (possibly async) functions here.\n// The functions accept two arguments: the \"crawlingContext\" object\n// and \"gotoOptions\".\n[\n    async (crawlingContext, gotoOptions) => {\n        // ...\n    },\n]\n",
  "proxyConfiguration": {
    "useApifyProxy": true
  },
  "respectRobotsTxtFile": true,
  "runMode": "DEVELOPMENT",
  "startUrls": [
    {
      "url": "https://crawlee.dev/js"
    }
  ],
  "useChrome": false,
  "waitUntil": ["networkidle2"]
}
```

- **apify/google-search-scraper** - Google Search Untuk forum lokal

```json
{
  "chatGptSearch": {
    "enableChatGpt": false
  },
  "copilotSearch": {
    "enableCopilot": false
  },
  "disableGoogleSearchResults": false,
  "focusOnPaidAds": false,
  "forceExactMatch": false,
  "geminiSearch": {
    "enableGemini": false
  },
  "includeIcons": false,
  "includeUnfilteredResults": false,
  "maxPagesPerQuery": 1,
  "maximumLeadsEnrichmentRecords": 0,
  "mobileResults": false,
  "perplexitySearch": {
    "enablePerplexity": false,
    "returnImages": false,
    "returnRelatedQuestions": false
  },
  "queries": "What are the top 5 CRM tools",
  "saveHtml": false,
  "saveHtmlToKeyValueStore": true,
  "verifyLeadsEnrichmentEmails": false
}
```

- Podcast

* **apiharvest/spotify-podcasts-search-and-scraper** - Spotify Podcast

```json
{
  "keyword": ["tech podcast", "comedy podcast"],
  "podcasts_fetchDetails": true,
  "podcasts_get_limit": 50,
  "podcasts_get_offset": 0,
  "podcasts_includeRecommended": true,
  "podcasts_search_limit": 30,
  "podcasts_search_offset": 0,
  "proxyCountry": "ID",
  "spotifyUris": [
    "spotify:show:0UetHF8bYSGBtDsjVl4GDv",
    "https://open.spotify.com/show/1jMAdj6UyWokbPSj8ZZWrl"
  ]
}
```

How Does This Spotify Podcasts Scraper Work?
This Spotify podcasts scraper operates in two modes that are auto-detected from your input:

Mode 1: Search Spotify Podcasts by Keyword
Enter keywords and the Spotify podcasts scraper searches Spotify's show catalog. Search by show name, topic, publisher, or any keyword.

Example keywords: "true crime", "technology", "comedy", "business", "health", "Joe Rogan"

Mode 2: Scrape Specific Spotify Podcasts by URI or URL
Paste Spotify show URIs or URLs directly. The Spotify podcasts scraper accepts URI format (spotify:show:ABC123) and URL format (https://open.spotify.com/show/ABC123).

Auto-Detection
The Spotify podcasts scraper automatically detects the mode:

Fill Search Keywords → Spotify podcasts search mode activates
Fill Spotify Show URIs / URLs → Spotify podcast details mode activates
Fill both → Runs search first, then fetches podcast details
Recommended Shows
The Spotify podcasts scraper can optionally fetch recommended shows — Spotify's algorithm-generated podcast suggestions. Enable Include Recommended Shows to discover related Spotify podcasts.

Input Configuration
Field Mode Description Default
Search Keywords Search Keywords to search Spotify podcasts. —
Spotify Show URIs / URLs Details spotify:show:ID or https://open.spotify.com/show/ID —
Proxy Country Both Residential proxy country. US recommended. US
Search Offset Search Starting position for search pagination. 0
Search Limit Search Maximum Spotify podcasts per keyword. 30
Fetch Full Podcast Details Search Enrich Spotify podcast search results with complete metadata. OFF
Episode List Offset Details Starting position for the Spotify podcast episode list. 0
Episode List Limit Details Maximum episodes to return from each Spotify podcast. 50
Include Recommended Shows Details Fetch similar Spotify podcast recommendations. OFF
Understanding Filters & Toggles
Toggle / Filter Default What Happens When ON What You Miss When OFF
Fetch Full Podcast Details OFF Each search result is enriched with complete metadata: full episode listings (paginated), star ratings, topics, trailer URI, publisher data, and content classifications. You only get basic search data — podcast name, publisher, image, and URI. No episodes, no ratings, no topics.
Include Recommended Shows OFF Fetches recommended show suggestions from Spotify. Gives you related podcasts listeners also enjoy. No recommendation data returned.
Episode Offset 0 Start position in the episode list. Use for paginating shows with many episodes. —
Episode Limit 50 Max episodes to return from each podcast. —
Search Limit 10 Controls how many podcast results you get per keyword. —
Search Offset 0 Skip results for pagination. —
💡 Tip: When using Podcast URIs/URLs (Get Details mode), full details are always fetched automatically — the Fetch Full Podcast Details toggle only applies to Search mode.

Note: Spotify's podcast search API does not support numberOfTopResults. This is a Spotify API limitation.

Output Data Format
Search Result Example
{
"query": "true crime",
"uri": "spotify:show:ABC123",
"name": "Serial",
"publisher": "Serial Productions",
"description": "Serial is a podcast from the creators of This American Life...",
"coverArt": {"sources": [{"url": "https://i.scdn.co/image/..."}]},
"mediaType": "PODCAST"
}

Full Detail Example
{
"uri": "spotify:show:ABC123",
"name": "Serial",
"description": "Serial is a podcast from the creators of This American Life, hosted by Sarah Koenig...",
"htmlDescription": "<p>Serial is a podcast...</p>",
"publisher": {"name": "Serial Productions & The New York Times"},
"coverArt": {"sources": [{"url": "https://i.scdn.co/image/...", "width": 640}]},
"rating": {"averageRating": 4.7, "totalRatings": 85000},
"topics": {"items": [{"title": "True Crime"}, {"title": "News"}]},
"trailerUri": "spotify:episode:trailer123",
"episodes": {
"totalCount": 42,
"items": [
{
"name": "S01 Episode 01: The Alibi",
"uri": "spotify:episode:...",
"description": "It's Baltimore, 1999...",
"duration": {"totalMilliseconds": 3360000},
"releaseDate": {"isoString": "2014-10-03T00:00:00Z"},
"isPlayable": true
}
]
},
"recommendedShows": [
{"name": "Undisclosed", "uri": "spotify:show:...", "publisher": "Undisclosed"},
{"name": "Crime Junkie", "uri": "spotify:show:...", "publisher": "audiochuck"}
]
}

The Spotify podcasts scraper returns rich show-level data with full episode listings, ratings, topics, and recommendations.

Step-by-Step Tutorial
How to Search Spotify Podcasts
Go to the Spotify Podcasts Scraper actor page
Enter keywords like "comedy", "tech news", "self improvement"
Set Proxy Country to US
(Optional) Enable Fetch Full Podcast Details for episode listings
Click Start and download results
How to Scrape Specific Spotify Podcasts
Copy Spotify show URIs or URLs
Paste into the Spotify Show URIs / URLs field
Set Episode List Limit to control how many episodes per Spotify podcast
(Optional) Enable Include Recommended Shows for discovery
Click Start

- **easyapi/youtube-music-podcast-scraper** - YouTube Music Podcast

```json
{
  "keywords": ["Tech"],
  "maxItems": 50
}
```

YouTube Music Podcast Playlist Scraper 🎧
Powerful scraper that extracts podcast playlist information from YouTube Music based on your keywords. Get comprehensive data about podcast playlists including titles, creators, thumbnails, and more!

🎯 Use Cases
Discover podcast playlists by specific topics or keywords
Research podcast content trends
Build podcast recommendation systems
Track podcast creators and their content
Analyze podcast playlist metadata
✨ Features
🔍 Search by multiple keywords
📊 Get detailed playlist information
🖼️ Multiple thumbnail sizes included
🔗 Direct links to playlists and channels
⚡ Fast and efficient scraping
🤖 Stealth scraping with anti-detection
📱 Mobile-friendly user agent rotation
🔢 Output Dataset
Each record contains:

Keyword used for search
Playlist title
Creator name
Thumbnail URLs in various sizes
Playlist ID
Creator channel ID
Direct URLs to playlist and channel
Timestamp of when data was scraped
💡 Input Parameters
keywords (Array): List of keywords to search for podcast playlists
maxItems (Number): Maximum number of results to collect per keyword
🚀 Tips
Use specific keywords for better results
Adjust maxItems based on your needs
Results are automatically saved to your dataset
Each run creates a new dataset with fresh results
💪 Limitations
Respects YouTube Music's rate limits
Maximum 1000 results per keyword
Some playlists might not be accessible in all regions
Input Example
A full explanation of an input example in JSON.

{
"keywords": [
"love"
],
"maxItems": 70
}

Output sample
The results will be wrapped into a dataset which you can always find in the Storage tab. Here's an excerpt from the data you'd get if you apply the input parameters above:

And here is the same data but in JSON. You can choose in which format to download your data.

```json
[
{
"keyword": "love",
"data": {
"title": "From Rewatch with Love",
"creator": "LoadingReadyRun",
"thumbnails": [
{
"url": "https://i.ytimg.com/pl_c/PLV_qemO0oathZWE6xVp94GSevMTcrurPt/studio_square_thumbnail.jpg?sqp=CLDmor0G-oaymwEICDwQPCAASFqi85f_AwYIu5LLtAY&rs=AMzJL3kx1ruA40K2CouInqFZVqCY02uwAA",
"width": 60,
"height": 60
},
{
"url": "https://i.ytimg.com/pl_c/PLV_qemO0oathZWE6xVp94GSevMTcrurPt/studio_square_thumbnail.jpg?sqp=CLDmor0G-oaymwEICHgQeCAASFqi85f_AwYIu5LLtAY&rs=AMzJL3l0OBRQ_8KuAfADHizV5xuU7ktlxw",
"width": 120,
"height": 120
},
{
"url": "https://i.ytimg.com/pl_c/PLV_qemO0oathZWE6xVp94GSevMTcrurPt/studio_square_thumbnail.jpg?sqp=CLDmor0G-oaymwEKCOIBEOIBIABIWqLzl_8DBgi7ksu0Bg&rs=AMzJL3nhMrWIDiTCYcR0-ZaLfzmo0rI4zA",
"width": 226,
"height": 226
},
{
"url": "https://i.ytimg.com/pl_c/PLV_qemO0oathZWE6xVp94GSevMTcrurPt/studio_square_thumbnail.jpg?sqp=CLDmor0G-oaymwEKCKAEEKAEIABIWqLzl_8DBgi7ksu0Bg&rs=AMzJL3lmsEnx5JQ_swZzO5dnEEs5Ln7NIQ",
"width": 544,
"height": 544
}
],
"playlistId": "PLV_qemO0oathZWE6xVp94GSevMTcrurPt",
"creatorChannelId": "UCwjN2uVdL9A0i3gaIHKFzuA",
"type": "playlist",
"playlistUrl": "https://music.youtube.com/playlist?list=PLV_qemO0oathZWE6xVp94GSevMTcrurPt",
"channelUrl": "https://music.youtube.com/channel/UCwjN2uVdL9A0i3gaIHKFzuA"
},
"scrapedAt": "2025-02-09T13:52:48.526Z"
},
...
]
```
