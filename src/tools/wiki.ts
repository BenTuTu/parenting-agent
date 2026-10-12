import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { tool } from "@openai/agents";
import { z } from "zod";

import { logStep } from "../logger.js";

const WIKI_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/wiki",
);

export interface WikiPage {
  slug: string;
  title: string;
  summary: string;
  topics: string[];
  minMonth: number;
  maxMonth: number;
  headings: string[];
  body: string;
}

// frontmatter 格式约定：文件以 --- 开头，简单 key: value 行，topics 为逗号分隔字符串
function parseWikiFile(raw: string): WikiPage | null {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) {
    return null;
  }
  const [, front, body] = match;

  const meta: Record<string, string> = {};
  for (const line of front.split("\n")) {
    const idx = line.indexOf(":");
    if (idx > 0) {
      meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }

  const { slug, title, summary, topics, minMonth, maxMonth } = meta;
  if (!slug || !title || !summary || !topics || !minMonth || !maxMonth) {
    return null;
  }
  const min = Number(minMonth);
  const max = Number(maxMonth);
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return null;
  }

  return {
    slug,
    title,
    summary,
    topics: topics.split(/[,，]/).map((t) => t.trim()).filter(Boolean),
    minMonth: min,
    maxMonth: max,
    headings: [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1].trim()),
    body: body.trim(),
  };
}

function loadWiki(): WikiPage[] {
  if (!fs.existsSync(WIKI_DIR)) {
    logStep("wiki_load: directory not found", WIKI_DIR);
    return [];
  }
  const pages: WikiPage[] = [];
  for (const file of fs.readdirSync(WIKI_DIR).filter((f) => f.endsWith(".md"))) {
    const page = parseWikiFile(fs.readFileSync(path.join(WIKI_DIR, file), "utf8"));
    if (page) {
      pages.push(page);
    } else {
      logStep(`wiki_load: skipped invalid file ${file}`);
    }
  }
  logStep(`wiki_load: loaded ${pages.length} pages`);
  return pages;
}

const wikiPages = loadWiki();

export function searchWiki(
  keywords: string[],
  ageMonths?: number | null,
): { slug: string; title: string; summary: string; score: number }[] {
  const terms = keywords.map((k) => k.trim().toLowerCase()).filter(Boolean);
  return wikiPages
    .filter(
      (p) =>
        ageMonths == null ||
        (ageMonths >= p.minMonth && ageMonths <= p.maxMonth),
    )
    .map((p) => {
      const haystack = [p.title, p.summary, p.topics.join(" "), ...p.headings]
        .join("\n")
        .toLowerCase();
      const score = terms.filter((t) => haystack.includes(t)).length;
      return { slug: p.slug, title: p.title, summary: p.summary, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);
}

export function readWikiPage(slug: string): WikiPage | undefined {
  return wikiPages.find((p) => p.slug === slug);
}

export const searchWikiTool = tool({
  name: "search_wiki",

  description:
    "在本地育儿知识 wiki 中按关键词检索文档（可选按月龄过滤），返回 slug、标题、摘要列表。结构化工具（get_milestones/get_care_guide）未覆盖的育儿问题应先调用此工具；命中后用 read_wiki_page 读取全文。",

  parameters: z.object({
    keywords: z
      .array(z.string())
      .describe("检索关键词，1-5 个，例如 ['安抚奶嘴', '戒断']"),
    ageMonths: z
      .number()
      .int()
      .nullable()
      .describe("孩子月龄（整数月），未知时传 null 不过滤"),
  }),

  async execute({ keywords, ageMonths }) {
    const results = searchWiki(keywords, ageMonths);
    if (results.length === 0) {
      return {
        success: false,
        error: `未检索到与 ${keywords.join("/")} 匹配的 wiki 文档`,
      };
    }
    return { success: true, results };
  },
});

export const readWikiPageTool = tool({
  name: "read_wiki_page",

  description:
    "按 slug 读取 wiki 文档全文（含元信息）。slug 来自 search_wiki 的检索结果。",

  parameters: z.object({
    slug: z.string().describe("文档 slug，例如 pacifier-use"),
  }),

  async execute({ slug }) {
    const page = readWikiPage(slug);
    if (!page) {
      return { success: false, error: `未找到 slug 为 ${slug} 的 wiki 文档` };
    }
    const { body, headings, ...meta } = page;
    return { success: true, ...meta, content: body };
  },
});
