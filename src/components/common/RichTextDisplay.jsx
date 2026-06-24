import { isRichTextEmpty, looksLikeHtml } from "./RichTextEditor";
import "./rich-text-editor.css";

const RichTextDisplay = ({ value, emptyLabel = "—", className = "" }) => {
  const raw = (value ?? "").trim();

  if (isRichTextEmpty(raw)) {
    return (
      <p className={`text-sm font-medium text-gray-100 ${className}`.trim()}>
        {emptyLabel}
      </p>
    );
  }

  if (looksLikeHtml(raw)) {
    return (
      <div
        className={`rich-text-display ${className}`.trim()}
        dangerouslySetInnerHTML={{ __html: raw }}
      />
    );
  }

  return (
    <p
      className={`text-sm font-medium text-gray-100 break-words whitespace-pre-wrap ${className}`.trim()}
    >
      {raw}
    </p>
  );
};

export default RichTextDisplay;
