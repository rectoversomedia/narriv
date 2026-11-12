/**
 * Privacy mode: records are served without the identity of the people who posted them. Applied where records are
 * read, so turning the mode off later brings nothing back that was destroyed, and turning it on covers older records.
 *
 * - News and web articles keep their publisher: a media outlet is not a private person.
 * - Social posts lose their author and their link (a post URL names the account), and @handles in the text are
 *   replaced. Names written in running text are not detected; the AI reasons stored for CVE never name accounts.
 */
const PUBLISHER_PLATFORMS = new Set(["news", "web", "rss", "google_news"]);
const HANDLE = /(^|[^\w@])@[A-Za-z0-9_.]{2,30}/g;

export const HIDDEN_ACCOUNT = { en: "Public account", id: "Akun publik" };

export function maskHandles(text) {
    return typeof text === "string" ? text.replace(HANDLE, "$1@•••") : text;
}

/** One record as served in privacy mode. `lang` picks the placeholder for the hidden author. */
export function maskSignal(row, lang = "id") {
    if (!row || PUBLISHER_PLATFORMS.has(String(row.platform || "").toLowerCase())) return row;
    return {
        ...row,
        author: HIDDEN_ACCOUNT[lang === "en" ? "en" : "id"],
        url: null,
        source_url: null,
        title: maskHandles(row.title),
        content: maskHandles(row.content),
        privacyMasked: true,
    };
}
