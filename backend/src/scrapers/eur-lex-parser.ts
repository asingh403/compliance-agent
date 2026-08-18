import { createHash } from "node:crypto";
import type { CheerioAPI } from "cheerio";
import type { LegalStandard, NormalizedClause } from "../domain/legal-clause.js";

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim();

const contentHash = (title: string, text: string) =>
  `sha256:${createHash("sha256").update(`${title}\n${text}`, "utf8").digest("hex")}`;

export const parseEurLexArticles = (
  $: CheerioAPI,
  standard: LegalStandard,
  sourceUrl: string,
  retrievedAt = new Date(),
): NormalizedClause[] => {
  const clauses: NormalizedClause[] = [];

  $("div.eli-subdivision[id^='art_']").each((_index, element) => {
    const article = $(element);
    const heading = normalizeWhitespace(article.children(".oj-ti-art").first().text());
    if (!/^Article\s+\d+[a-z]?$/i.test(heading)) return;

    const title = normalizeWhitespace(article.children(".eli-title").first().text()) || heading;
    const paragraphs = article
      .find("p")
      .filter((_paragraphIndex, paragraph) => {
        const node = $(paragraph);
        return !node.hasClass("oj-ti-art") && !node.hasClass("oj-sti-art");
      })
      .map((_paragraphIndex, paragraph) => normalizeWhitespace($(paragraph).text()))
      .get()
      .filter(Boolean);
    const text = paragraphs.join("\n");
    if (!text) return;

    const fragment = article.attr("id");
    const clauseSourceUrl = fragment ? `${sourceUrl}#${fragment}` : sourceUrl;
    clauses.push({
      standard,
      clauseId: heading,
      title,
      text,
      sourceUrl: clauseSourceUrl,
      contentHash: contentHash(title, text),
      sourceRetrievedAt: retrievedAt,
    });
  });

  return clauses;
};
