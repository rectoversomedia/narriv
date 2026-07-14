import { getRequestConfig } from "next-intl/server";
// @ts-ignore - next-intl v3 type mismatch with JSON imports
import en from "@/messages/en.json";
// @ts-ignore - next-intl v3 type mismatch with JSON imports
import id from "@/messages/id.json";

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale || "en";
  // @ts-ignore - type assertion for v3 compatibility
  const messages = locale === "id" ? id : en;
  return {
    locale,
    messages,
  };
});