import { describe, expect, it } from "vitest";
import { structureLegalExcerpt } from "./components/RetrievalResults";

describe("legal evidence formatting", () => {
  it("separates and indents numbered, lettered, and nested legal provisions", () => {
    expect(structureLegalExcerpt(
      "1. The controller shall provide the following information: (a) the identity and contact details; (b) the purposes of processing; (i) the specific safeguard.",
    )).toEqual([
      { text: "1. The controller shall provide the following information:", level: 0 },
      { text: "(a) the identity and contact details;", level: 1 },
      { text: "(b) the purposes of processing;", level: 1 },
      { text: "(i) the specific safeguard.", level: 2 },
    ]);
  });

  it("does not split inline legal references", () => {
    expect(structureLegalExcerpt("The measures referred to in points (b), (c) and Article 33(3)."))
      .toEqual([{ text: "The measures referred to in points (b), (c) and Article 33(3).", level: 0 }]);
  });
});
