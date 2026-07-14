import { getRequestConfig } from "next-intl/server";
import en from "@/messages/en.json";
import id from "@/messages/id.json";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale || "en";
  const messages = (locale === "id" ? id : en) as unknown as Record<string, string>;
  return {
    locale,
    messages,
  };
});