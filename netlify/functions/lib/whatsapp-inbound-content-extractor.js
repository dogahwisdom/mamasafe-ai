/**
 * Converts heterogeneous WhatsApp Cloud API message payloads into usable text input.
 * Buttons and lists are common for end-users; silently ignoring interactive types broke many conversations.
 */
export class WhatsAppInboundContentExtractor {
  /**
   * @param {Record<string, unknown>} message - messages[] entry from Meta webhook payload
   * @returns {{ kind: "text"; body: string; logSnippet: string } | { kind: "unsupported"; rawType: string; label: string }}
   */
  static fromCloudMessage(message) {
    const type = String(message?.type || "");

    if (type === "text") {
      const body = String(message?.text?.body ?? "");
      return { kind: "text", body, logSnippet: body };
    }

    if (type === "interactive") {
      const ix = message.interactive || {};
      if (ix.type === "button_reply") {
        const title = String(ix.button_reply?.title ?? "").trim();
        const id = String(ix.button_reply?.id ?? "").trim();
        const body = title || id;
        if (body)
          return { kind: "text", body, logSnippet: `[interactive:button:${body}]` };
      }
      if (ix.type === "list_reply") {
        const title = String(ix.list_reply?.title ?? "").trim();
        const id = String(ix.list_reply?.id ?? "").trim();
        const body = title || id;
        if (body) return { kind: "text", body, logSnippet: `[interactive:list:${body}]` };
      }
      return {
        kind: "unsupported",
        rawType: type,
        label: `[interactive:${ix?.type || "unknown"}]`,
      };
    }

    const unsupportedTypes = [
      "image",
      "audio",
      "video",
      "document",
      "sticker",
      "contacts",
      "location",
      "reaction",
      "order",
      "system",
    ];
    if (unsupportedTypes.includes(type)) {
      return { kind: "unsupported", rawType: type, label: `[${type}]` };
    }

    if (!type) {
      return { kind: "unsupported", rawType: "unknown", label: "[unknown]" };
    }

    return { kind: "unsupported", rawType: type, label: `[${type}]` };
  }
}
