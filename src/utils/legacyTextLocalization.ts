import { trSetting } from "@/utils/i18nSettings";

const excludedTags = new Set(["SCRIPT", "STYLE", "CODE", "PRE", "SVG"]);
const translatableAttributes = ["placeholder", "title", "aria-label"];

type LocalizedText = { source: string; rendered: string };

const textOriginals = new WeakMap<Text, LocalizedText>();
const attributeOriginals = new WeakMap<Element, Map<string, LocalizedText>>();

const splitWhitespace = (value: string) => {
  const leading = value.match(/^\s*/)?.[0] || "";
  const trailing = value.match(/\s*$/)?.[0] || "";
  return { leading, content: value.trim(), trailing };
};

const shouldTranslate = (element: Element | null) => {
  if (!element || excludedTags.has(element.tagName)) return false;
  return !element.closest("[data-no-i18n], .lyric, .amll-lyric");
};

const translateTextNode = (node: Text) => {
  if (!shouldTranslate(node.parentElement)) return;
  const current = node.nodeValue ?? "";
  const cached = textOriginals.get(node);
  const source = !cached || current !== cached.rendered ? current : cached.source;

  const { leading, content, trailing } = splitWhitespace(source);
  if (!content) return;

  const translated = `${leading}${trSetting(content)}${trailing}`;
  textOriginals.set(node, { source, rendered: translated });
  if (node.nodeValue !== translated) node.nodeValue = translated;
};

const translateAttributes = (element: Element) => {
  if (!shouldTranslate(element)) return;
  const originals = attributeOriginals.get(element) ?? new Map<string, LocalizedText>();
  attributeOriginals.set(element, originals);

  translatableAttributes.forEach((attribute) => {
    if (!element.hasAttribute(attribute)) return;
    const current = element.getAttribute(attribute) ?? "";
    const cached = originals.get(attribute);
    const source = !cached || current !== cached.rendered ? current : cached.source;
    const translated = trSetting(source);
    originals.set(attribute, { source, rendered: translated });
    if (element.getAttribute(attribute) !== translated) element.setAttribute(attribute, translated);
  });
};

const translateTree = (root: Node) => {
  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text);
    return;
  }

  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return;

  const element = root.nodeType === Node.ELEMENT_NODE ? (root as Element) : null;
  if (element) translateAttributes(element);

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) translateTextNode(current as Text);
    else translateAttributes(current as Element);
    current = walker.nextNode();
  }
};

export const setupLegacyTextLocalization = () => {
  const observer = new MutationObserver((records) => {
    records.forEach((record) => {
      if (record.type === "characterData") {
        translateTextNode(record.target as Text);
        return;
      }
      record.addedNodes.forEach(translateTree);
    });
  });

  const refresh = () => translateTree(document.body);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  refresh();

  return { refresh, stop: () => observer.disconnect() };
};
