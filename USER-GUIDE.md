# Compliance Coverage Agent — User Guide

## Product purpose

The Compliance Coverage Agent helps internal teams maintain an indexed knowledge base of official GDPR and EU AI Act provisions, then retrieve legal evidence relevant to a product requirement. Results are AI-assisted and must be verified against the linked official source; they are not legal advice or compliance certification.

## Header controls

| Control | What it does |
| --- | --- |
| **Compliance Hub logo** | Returns to the main Compliance Workflow screen. |
| **Workspace** | Shows the active operational workspace. The current workspace is **Compliance Operations**. |
| **History/clock icon** | Opens the **Activity Log**. Hovering over the icon explains that it shows user activity from the last seven days. |
| **Help** | Opens **Trust & Usage**, including the product limitations, human-review requirement, logging notice, and guidance for handling sensitive data. |
| **Light/Dim** | Switches between light and dim themes. The preference is retained in the browser. |

## Quick Actions

Quick Actions start each workflow operation. The matching Quick Action and workflow card stay synchronized: light yellow means in progress, light green means completed, orange means completed with a warning, and red means failed.

| Action | What it does |
| --- | --- |
| **Run Health Check** | Confirms that the backend service is running. It does not test MongoDB or external AI providers. |
| **Check Readiness** | Confirms that MongoDB is connected and ready for search and ingestion. |
| **Start GDPR Scrape** | Retrieves the configured official GDPR source from EUR-Lex and creates a normalized staging snapshot. A confirmation appears before the operation starts. |
| **Start GDPR Ingestion** | Generates embeddings for staged GDPR clauses and creates or updates their MongoDB vector-search records. |
| **Start EU AI Act Scrape** | Retrieves the configured official EU AI Act source from EUR-Lex and creates a normalized staging snapshot. |
| **Start EU AI Act Ingestion** | Generates embeddings for staged EU AI Act clauses and creates or updates their MongoDB vector-search records. |
| **Open Retrieval** | Opens the Compliance Retrieval form used to search the indexed legal evidence. |

Use the workflow in order when setting up a new knowledge base: check Health and Readiness, scrape each required legal source, ingest it, and then run Compliance Retrieval.

## Compliance Retrieval

### Requirement

Enter the product behavior, feature, or obligation you want to investigate. Write a focused statement such as: “Users can request deletion of their personal data.” The maximum length is 10,000 characters.

The microphone icon inside the Requirement box supports voice input:

1. Click the microphone and allow browser access.
2. Speak while the blue waveform and recording timer are visible.
3. Select **Cancel** to discard the recording or **Stop** to transcribe it.
4. Review and edit the Sarvam-generated transcript in the Requirement box before retrieving evidence.

Recordings are limited to 30 seconds. The interface explains unsupported browsers, denied permission, missing or busy microphones, empty speech, and transcription failures. Audio is used for transcription and is not written to the Activity Log.

### Retrieval options

| Option | What it does |
| --- | --- |
| **GDPR** | Searches only indexed GDPR clauses. |
| **EU AI Act** | Searches only indexed EU AI Act clauses. |
| **Both** | Searches both legal standards. This is the default. |
| **Top K** | Sets the maximum number of vector-search candidates, from 1 to 50. A larger value searches more candidates but may take longer and include less-focused evidence. |
| **Similarity Threshold** | Sets the minimum vector similarity from 0 to 1. Raising it makes retrieval stricter; lowering it may return more broadly related clauses. |
| **Retrieve Evidence** | Validates the form and starts embedding, vector search, and reranking. Rapid duplicate submissions are ignored while a request is running. |

On the first retrieval, **Trust & Usage** requires acknowledgment before the request continues.

## Understanding retrieved evidence

Each result contains the legal standard, clause or article, official title, formatted legal excerpt, relevance explanation, official EUR-Lex link, and scoring details. Numbered paragraphs, lettered points such as `(a)`, and nested Roman points are displayed using legal-document indentation.

- **Vector score** measures semantic similarity between the requirement and indexed clause.
- **Reranking score** is the relevance score from GROQ or Cohere.
- **Final score** is calculated as `35% vector score + 65% reranking score`.
- **Indicative Retrieval Coverage** summarizes retrieved evidence strength. It is not a legal compliance determination.

The source badge identifies how results were produced:

- **Reranked via GROQ** means the primary reranker succeeded.
- **Reranked via Cohere** means Cohere produced the final reranking. If GROQ could not be used, the UI explains that Cohere was applied automatically.
- **Vector-search results** means neither reranker completed and the system safely returned vector-only evidence.

Select **View Official Source** to verify an excerpt. Expand **Retrieval diagnostics** to see models, provider, fallback path, settings, and request ID.

## Workflow cards and details

The seven workflow cards show **Not Started**, **In Progress**, **Completed**, **Completed with Warnings**, or **Failed**. Expand **Details** to review timestamps, request IDs, models, source links, fallback information, and other operation diagnostics. Failed operations provide a retry action when retrying is safe.

## Activity Log

Select the history/clock icon in the header to open `/activity`. The screen shows backend-recorded activity from the previous seven days, ordered newest first and grouped by date.

Available controls include:

- Summary totals for successful, warning, and failed actions.
- Search by displayed user or request ID.
- Filters for action and status.
- **Refresh** to load recent records.
- **Export CSV** to export the currently loaded filtered records.
- Pagination for additional results.
- A details drawer opened by selecting an activity row.
- **Back to Workflow** to return to the operational screen.

The audit record stores safe metadata such as action, timestamp, status, duration, provider, fallback, and request ID. It does not store credentials, audio, complete requirements, legal excerpts, or retrieved evidence. Until authentication is integrated, the user is displayed as **Local user**.

## Safe usage

- Verify AI-assisted results against the official legal source.
- Do not treat retrieval coverage as legal advice or certification.
- Do not enter credentials, secrets, or unnecessary personal data.
- Use the request ID when reporting a failure or investigating an Activity Log entry.
- Ask a qualified legal reviewer to interpret obligations and make compliance decisions.
