"use client";

import Placeholder from "@tiptap/extension-placeholder";
import { EditorContent,useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo,
  Sigma,
  Undo} from "lucide-react";
import React from "react";

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder = "Write card content here...",
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  // Keep content synchronized
  React.useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return (
      <div className="h-40 w-full animate-pulse rounded-xl bg-muted" />
    );
  }

  const insertInlineMath = () => {
    editor.commands.insertContent(" $x^2$ ");
    editor.commands.focus();
  };

  const insertBlockMath = () => {
    editor.commands.insertContent("\n$$\n\\frac{a}{b}\n$$\n");
    editor.commands.focus();
  };

  const toolbarBtn = (active: boolean) =>
    `p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all ${
      active ? "bg-muted text-primary" : ""
    }`;

  return (
    <div className="flex min-h-[180px] flex-col overflow-hidden rounded-2xl border border-border bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/50 px-3 py-1.5">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={toolbarBtn(editor.isActive("bold"))}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={toolbarBtn(editor.isActive("italic"))}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <span className="mx-1 h-4 w-px bg-border" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={toolbarBtn(editor.isActive("heading", { level: 1 }))}
        >
          <Heading1 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={toolbarBtn(editor.isActive("heading", { level: 2 }))}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </button>
        <span className="mx-1 h-4 w-px bg-border" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={toolbarBtn(editor.isActive("bulletList"))}
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={toolbarBtn(editor.isActive("orderedList"))}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={toolbarBtn(editor.isActive("blockquote"))}
        >
          <Quote className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={toolbarBtn(editor.isActive("code"))}
        >
          <Code className="h-3.5 w-3.5" />
        </button>

        <span className="mx-1 h-4 w-px bg-border" />

        {/* KaTeX math insertion buttons */}
        <button
          type="button"
          onClick={insertInlineMath}
          title="Insert Inline LaTeX Formula"
          className="flex items-center gap-0.5 rounded-lg p-1.5 text-primary transition-all hover:bg-muted"
        >
          <Sigma className="h-3.5 w-3.5" />
          <span className="text-[9px] font-bold">Inline</span>
        </button>
        <button
          type="button"
          onClick={insertBlockMath}
          title="Insert Block LaTeX Formula"
          className="flex items-center gap-0.5 rounded-lg p-1.5 text-primary transition-all hover:bg-muted"
        >
          <Sigma className="h-3.5 w-3.5 font-extrabold" />
          <span className="text-[9px] font-bold">Block</span>
        </button>

        <div className="ml-auto flex gap-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            <Undo className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            <Redo className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="prose max-w-none flex-1 select-text p-3 text-xs text-foreground focus:outline-none dark:prose-invert">
        <EditorContent editor={editor} className="min-h-[140px] focus:outline-none focus-visible:outline-none [&_.tiptap]:focus:outline-none" />
      </div>
    </div>
  );
}
