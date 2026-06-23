"use client";

import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Undo,
  Redo,
  Percent,
  Sigma
} from "lucide-react";

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
      <div className="h-40 w-full animate-pulse bg-neutral-100 rounded-xl dark:bg-zinc-800" />
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

  return (
    <div className="border border-neutral-200 rounded-2xl overflow-hidden bg-white dark:border-zinc-800 dark:bg-zinc-950/20 flex flex-col min-h-[180px]">
      {/* Toolbar */}
      <div className="bg-neutral-50 px-3 py-1.5 border-b border-neutral-200 dark:bg-zinc-900/40 dark:border-zinc-850 flex flex-wrap gap-1 items-center">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-800 text-neutral-500 hover:text-neutral-900 transition-all ${
            editor.isActive("bold") ? "bg-neutral-250 dark:bg-zinc-800 text-violet-600 dark:text-violet-400" : ""
          }`}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-800 text-neutral-500 hover:text-neutral-900 transition-all ${
            editor.isActive("italic") ? "bg-neutral-250 dark:bg-zinc-800 text-violet-600 dark:text-violet-400" : ""
          }`}
        >
          <Italic className="h-3.5 w-3.5" />
        </button>
        <span className="w-px h-4 bg-neutral-200 dark:bg-zinc-800 mx-1" />
        
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-800 text-neutral-500 hover:text-neutral-900 transition-all ${
            editor.isActive("heading", { level: 1 }) ? "bg-neutral-250 dark:bg-zinc-800 text-violet-600 dark:text-violet-400" : ""
          }`}
        >
          <Heading1 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-800 text-neutral-500 hover:text-neutral-900 transition-all ${
            editor.isActive("heading", { level: 2 }) ? "bg-neutral-250 dark:bg-zinc-800 text-violet-600 dark:text-violet-400" : ""
          }`}
        >
          <Heading2 className="h-3.5 w-3.5" />
        </button>
        <span className="w-px h-4 bg-neutral-200 dark:bg-zinc-800 mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-800 text-neutral-500 hover:text-neutral-900 transition-all ${
            editor.isActive("bulletList") ? "bg-neutral-250 dark:bg-zinc-800 text-violet-600 dark:text-violet-400" : ""
          }`}
        >
          <List className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-800 text-neutral-500 hover:text-neutral-900 transition-all ${
            editor.isActive("orderedList") ? "bg-neutral-250 dark:bg-zinc-800 text-violet-600 dark:text-violet-400" : ""
          }`}
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-800 text-neutral-500 hover:text-neutral-900 transition-all ${
            editor.isActive("blockquote") ? "bg-neutral-250 dark:bg-zinc-800 text-violet-600 dark:text-violet-400" : ""
          }`}
        >
          <Quote className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={`p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-800 text-neutral-500 hover:text-neutral-900 transition-all ${
            editor.isActive("code") ? "bg-neutral-250 dark:bg-zinc-800 text-violet-600 dark:text-violet-400" : ""
          }`}
        >
          <Code className="h-3.5 w-3.5" />
        </button>

        <span className="w-px h-4 bg-neutral-200 dark:bg-zinc-800 mx-1" />

        {/* KaTeX math insertion buttons */}
        <button
          type="button"
          onClick={insertInlineMath}
          title="Insert Inline LaTeX Formula"
          className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-800 text-violet-600 dark:text-violet-400 transition-all flex items-center gap-0.5"
        >
          <Sigma className="h-3.5 w-3.5" />
          <span className="text-[9px] font-bold">Inline</span>
        </button>
        <button
          type="button"
          onClick={insertBlockMath}
          title="Insert Block LaTeX Formula"
          className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-800 text-violet-600 dark:text-violet-400 transition-all flex items-center gap-0.5"
        >
          <Sigma className="h-3.5 w-3.5 font-extrabold" />
          <span className="text-[9px] font-bold">Block</span>
        </button>

        <div className="ml-auto flex gap-0.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-800 text-neutral-400 disabled:opacity-30"
          >
            <Undo className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-zinc-800 text-neutral-400 disabled:opacity-30"
          >
            <Redo className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Editor Content Area */}
      <div className="flex-1 p-3 text-xs text-neutral-800 focus:outline-none dark:text-neutral-200 select-text prose dark:prose-invert max-w-none">
        <EditorContent editor={editor} className="min-h-[140px] focus:outline-none focus-visible:outline-none [&_.tiptap]:focus:outline-none" />
      </div>
    </div>
  );
}
