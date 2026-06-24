import { useCallback, useEffect, useRef } from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
  Underline,
} from "lucide-react";
import "./rich-text-editor.css";

const ToolbarButton = ({ title, onAction, active, children }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    className={`rich-text-toolbar-btn${active ? " is-active" : ""}`}
    onMouseDown={(e) => {
      e.preventDefault();
      onAction();
    }}
  >
    {children}
  </button>
);

/**
 * Rich text editor for ministry profile fields. Persists HTML.
 */
const RichTextEditor = ({
  id,
  value,
  onChange,
  placeholder,
  minHeight = 200,
  ariaLabel,
}) => {
  const editorRef = useRef(null);
  const syncingRef = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || syncingRef.current) return;
    const html = value || "";
    if (el.innerHTML !== html) {
      el.innerHTML = html;
    }
  }, [value]);

  const emitChange = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    syncingRef.current = true;
    onChange(el.innerHTML);
    window.requestAnimationFrame(() => {
      syncingRef.current = false;
    });
  }, [onChange]);

  const exec = useCallback(
    (command, arg = null) => {
      editorRef.current?.focus();
      document.execCommand(command, false, arg);
      emitChange();
    },
    [emitChange]
  );

  const applyHeading = (tag) => {
    exec("formatBlock", tag);
  };

  const applyFontSize = (size) => {
    exec("fontSize", size);
  };

  return (
    <div
      className="rich-text-editor"
      style={{ "--editor-min-height": `${minHeight}px` }}
    >
      <div className="rich-text-toolbar" role="toolbar" aria-label={ariaLabel}>
        <select
          className="rich-text-select"
          defaultValue=""
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return;
            if (v.startsWith("h")) applyHeading(v);
            else applyFontSize(v);
            e.target.value = "";
          }}
          aria-label="Text style"
        >
          <option value="">Style</option>
          <option value="h1">Heading 1</option>
          <option value="h2">Heading 2</option>
          <option value="h3">Heading 3</option>
          <option value="p">Normal</option>
          <option value="1">Small</option>
          <option value="3">Normal size</option>
          <option value="5">Large</option>
          <option value="7">Huge</option>
        </select>

        <span className="rich-text-toolbar-divider" />

        <ToolbarButton title="Bold" onAction={() => exec("bold")}>
          <Bold size={16} />
        </ToolbarButton>
        <ToolbarButton title="Italic" onAction={() => exec("italic")}>
          <Italic size={16} />
        </ToolbarButton>
        <ToolbarButton title="Underline" onAction={() => exec("underline")}>
          <Underline size={16} />
        </ToolbarButton>
        <ToolbarButton title="Strikethrough" onAction={() => exec("strikeThrough")}>
          <Strikethrough size={16} />
        </ToolbarButton>

        <span className="rich-text-toolbar-divider" />

        <ToolbarButton title="Align left" onAction={() => exec("justifyLeft")}>
          <AlignLeft size={16} />
        </ToolbarButton>
        <ToolbarButton title="Align center" onAction={() => exec("justifyCenter")}>
          <AlignCenter size={16} />
        </ToolbarButton>
        <ToolbarButton title="Align right" onAction={() => exec("justifyRight")}>
          <AlignRight size={16} />
        </ToolbarButton>
        <ToolbarButton title="Justify" onAction={() => exec("justifyFull")}>
          <AlignJustify size={16} />
        </ToolbarButton>

        <span className="rich-text-toolbar-divider" />

        <ToolbarButton
          title="Bullet list"
          onAction={() => exec("insertUnorderedList")}
        >
          <List size={16} />
        </ToolbarButton>
        <ToolbarButton
          title="Numbered list"
          onAction={() => exec("insertOrderedList")}
        >
          <ListOrdered size={16} />
        </ToolbarButton>

        <span className="rich-text-toolbar-divider" />

        <ToolbarButton title="Clear formatting" onAction={() => exec("removeFormat")}>
          <Eraser size={16} />
        </ToolbarButton>
      </div>

      <div
        id={id}
        ref={editorRef}
        className="rich-text-content"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel}
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
      />
    </div>
  );
};

export const isRichTextEmpty = (html) => {
  const raw = (html ?? "").trim();
  if (!raw) return true;
  const stripped = raw
    .replace(/<p><br><\/p>/gi, "")
    .replace(/<p>\s*<\/p>/gi, "")
    .replace(/<div><br><\/div>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();
  return stripped.length === 0;
};

export const looksLikeHtml = (value) => /<[^>]+>/.test((value ?? "").trim());

export default RichTextEditor;
