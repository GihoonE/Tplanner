import type { SessionEditorAnchor } from "@/types";

export function sessionEditorAnchorFromElement(
  element: Element,
): SessionEditorAnchor {
  const rect = element.getBoundingClientRect();

  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}
