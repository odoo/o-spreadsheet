import type { HtmlContent } from "../composer/composer/composer";

export function getHtmlContentFromPattern(
  pattern: string,
  value: string,
  highlightColor: string,
  className: string
): HtmlContent[] {
  const pendingHtmlContent: HtmlContent[] = [];
  pattern = pattern.toLowerCase();

  for (const patternChar of pattern) {
    const index = value.toLocaleLowerCase().indexOf(patternChar);
    if (index === -1) {
      continue;
    }
    pendingHtmlContent.push(
      { value: value.slice(0, index), color: "" },
      { value: value[index], color: highlightColor, class: className }
    );
    value = value.slice(index + 1);
  }

  pendingHtmlContent.push({ value });
  const htmlContent = pendingHtmlContent.filter((content) => content.value);

  return htmlContent;
}
