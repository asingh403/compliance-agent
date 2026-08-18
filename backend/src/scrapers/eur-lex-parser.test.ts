import { load } from "cheerio";
import { describe, expect, it } from "vitest";
import { parseEurLexArticles } from "./eur-lex-parser.js";

describe("parseEurLexArticles", () => {
  it("normalizes article identity, title, text, source fragment, and hash", () => {
    const page = load(`
      <div class="eli-subdivision" id="art_17">
        <p class="oj-ti-art">Article 17</p>
        <div class="eli-title"><p class="oj-sti-art">Right to erasure</p></div>
        <div><p class="oj-normal">1. The data subject has the right to erasure.</p></div>
        <div><p class="oj-normal">2. The controller shall erase without undue delay.</p></div>
      </div>
    `);
    const retrievedAt = new Date("2026-08-17T00:00:00.000Z");
    const clauses = parseEurLexArticles(
      page,
      "GDPR",
      "https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng",
      retrievedAt,
    );

    expect(clauses).toHaveLength(1);
    expect(clauses[0]).toMatchObject({
      standard: "GDPR",
      clauseId: "Article 17",
      title: "Right to erasure",
      text: "1. The data subject has the right to erasure.\n2. The controller shall erase without undue delay.",
      sourceUrl: "https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng#art_17",
      sourceRetrievedAt: retrievedAt,
    });
    expect(clauses[0]?.contentHash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("ignores recitals and empty article containers", () => {
    const page = load(`
      <div class="eli-subdivision" id="rct_1"><p class="oj-ti-art">Recital 1</p></div>
      <div class="eli-subdivision" id="art_1"><p class="oj-ti-art">Article 1</p></div>
    `);
    expect(parseEurLexArticles(page, "GDPR", "https://example.com")).toEqual([]);
  });
});
