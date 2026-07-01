"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import type { CodePlaygroundConfig } from "../../assessments/widgetConfigSchemas";

// Lazy-load Monaco Editor for Next.js SSR compatibility
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-60 w-full items-center justify-center bg-background text-xs text-foreground0 font-mono rounded-xl border border-border">
      Loading Monaco Editor...
    </div>
  ),
});

interface CodePlaygroundWidgetProps {
  config: CodePlaygroundConfig;
  value: { code: string; lastRunPassed?: boolean } | null;
  onChange: (newValue: { code: string; lastRunPassed?: boolean }) => void;
  locked: boolean;
  isCorrect?: boolean | null;
}

interface ConsoleMsg {
  type: "log" | "error";
  text: string;
}

interface TestResult {
  input: string;
  expected: string;
  actual: any;
  passed: boolean;
}

export function CodePlaygroundWidget({
  config,
  value,
  onChange,
  locked,
  isCorrect,
}: CodePlaygroundWidgetProps) {
  const language = config.language ?? "javascript";
  const starterCode = config.starterCode ?? "";
  const tests = config.tests ?? [];

  const code = value?.code ?? starterCode;

  const [consoleMsgs, setConsoleMsgs] = useState<ConsoleMsg[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [iframeSrcDoc, setIframeSrcDoc] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync value changes if value.code is updated from parent
  useEffect(() => {
    if (value === null) {
      onChange({ code: starterCode });
    }
  }, [value, starterCode, onChange]);

  // Set up communication with the sandboxed iframe
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      // Make sure message is from our sandbox execution
      if (e.data && typeof e.data === "object") {
        if (e.data.type === "CONSOLE_LOG") {
          setConsoleMsgs((prev) => [...prev, { type: "log", text: e.data.text }]);
        } else if (e.data.type === "CONSOLE_ERROR") {
          setConsoleMsgs((prev) => [...prev, { type: "error", text: e.data.text }]);
        } else if (e.data.type === "TEST_RESULTS") {
          setTestResults(e.data.results);
          setIsRunning(false);
          const allPassed = e.data.passedCount === e.data.total;
          onChange({ code, lastRunPassed: allPassed });
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [code, onChange]);

  const handleRunCode = () => {
    if (isRunning) return;
    setIsRunning(true);
    setConsoleMsgs([]);
    setTestResults([]);

    // HTML source for sandboxed execution
    const runScript = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
        </head>
        <body>
          <script>
            // Override console methods to capture logs
            const originalLog = console.log;
            const originalError = console.error;

            console.log = (...args) => {
              const text = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
              window.parent.postMessage({ type: 'CONSOLE_LOG', text }, '*');
              originalLog.apply(console, args);
            };

            console.error = (...args) => {
              const text = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
              window.parent.postMessage({ type: 'CONSOLE_ERROR', text }, '*');
              originalError.apply(console, args);
            };

            window.addEventListener('error', (e) => {
              window.parent.postMessage({ type: 'CONSOLE_ERROR', text: e.message }, '*');
            });

            // Execute student code inside anonymous function wrapper
            try {
              ${code}
              
              // Run tests
              const tests = ${JSON.stringify(tests)};
              let passedCount = 0;
              const results = [];
              
              for (let i = 0; i < tests.length; i++) {
                const test = tests[i];
                try {
                  const result = eval(test.input);
                  const expected = eval(test.expected);
                  const passed = JSON.stringify(result) === JSON.stringify(expected);
                  if (passed) passedCount++;
                  results.push({ input: test.input, expected: test.expected, actual: result, passed });
                } catch (err) {
                  results.push({ input: test.input, expected: test.expected, actual: err.message, passed: false });
                }
              }
              
              window.parent.postMessage({ type: 'TEST_RESULTS', results, passedCount, total: tests.length }, '*');
            } catch (err) {
              window.parent.postMessage({ type: 'CONSOLE_ERROR', text: err.message }, '*');
              window.parent.postMessage({ type: 'TEST_RESULTS', results: [], passedCount: 0, total: 1 }, '*');
              console.error(err);
            }
          </script>
        </body>
      </html>
    `;

    // Trigger iframe reload by setting its srcDoc
    setIframeSrcDoc(runScript);
  };

  return (
    <div className="border-border bg-card flex flex-col gap-4 rounded-3xl border p-5 transition-all duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground font-mono capitalize">
            {language}
          </span>
          {locked && isCorrect !== undefined && (
            <span className={isCorrect ? "text-xs font-bold text-success" : "text-xs font-bold text-destructive"}>
              {isCorrect ? "● Marked Correct" : "● Marked Incorrect"}
            </span>
          )}
        </div>

        {!locked && (
          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="h-8 cursor-pointer rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-md hover:bg-primary disabled:opacity-50"
          >
            {isRunning ? "Running..." : "Run Code"}
          </button>
        )}
      </div>

      {/* Monaco Editor Container */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-background p-2 shadow-inner">
        <Editor
          height="240px"
          language={language === "typescript" ? "typescript" : "javascript"}
          theme="vs-dark"
          value={code}
          onChange={(newCode) => {
            if (!locked) {
              onChange({ code: newCode ?? "" });
            }
          }}
          options={{
            readOnly: locked,
            minimap: { enabled: false },
            fontSize: 12,
            fontFamily: "Fira Code, Menlo, Monaco, Consolas, monospace",
            lineNumbers: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
          }}
        />
      </div>

      {/* Hidden iframe execution environment */}
      {iframeSrcDoc && (
        <iframe
          ref={iframeRef}
          srcDoc={iframeSrcDoc}
          sandbox="allow-scripts"
          className="hidden"
          title="execution-sandbox"
        />
      )}

      {/* Results / Console logs tab panel */}
      {(consoleMsgs.length > 0 || testResults.length > 0) && (
        <div className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4 border border-border">
          {/* Console logs */}
          {consoleMsgs.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-foreground0">
                Console Output
              </span>
              <div className="max-h-24 overflow-y-auto rounded-lg bg-black/40 p-2.5 font-mono text-[11px] leading-relaxed">
                {consoleMsgs.map((msg, idx) => (
                  <div
                    key={idx}
                    className={msg.type === "error" ? "text-destructive" : "text-muted-foreground"}
                  >
                    {msg.type === "error" ? "✖ " : "> "}
                    {msg.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Test cases results */}
          {testResults.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-foreground0">
                Test Results
              </span>
              <div className="space-y-1.5">
                {testResults.map((res, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2 text-xs border border-border/40"
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="font-mono text-muted-foreground text-[10px]">
                        Expr: <code className="text-foreground">{res.input}</code>
                      </span>
                      <span className="text-[10px] text-foreground0">
                        Expected: <code className="text-muted-foreground">{JSON.stringify(res.expected)}</code>
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[10px] text-muted-foreground">
                        Got: <code className={res.passed ? "text-success" : "text-destructive"}>{JSON.stringify(res.actual)}</code>
                      </span>
                      <span
                        className={[
                          "inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                          res.passed ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive",
                        ].join(" ")}
                      >
                        {res.passed ? "✓" : "✗"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
