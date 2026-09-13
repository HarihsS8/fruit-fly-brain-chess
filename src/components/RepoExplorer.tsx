import React, { useState } from "react";
import JSZip from "jszip";
import { REPOSITORY_FILES } from "../lib/repoFiles";
import { RepoFile } from "../types";
import { Folder, FileCode, Download, Copy, Check, Terminal, ExternalLink } from "lucide-react";

export const RepoExplorer: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<RepoFile>(
    REPOSITORY_FILES.find((f) => f.path === "flychess/agent.py") || REPOSITORY_FILES[0]
  );
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsZipping(true);
      const zip = new JSZip();

      // Populate files into zip structure
      for (const file of REPOSITORY_FILES) {
        zip.file(file.path, file.content);
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "flychess-master.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error generating zip:", err);
    } finally {
      setIsZipping(false);
    }
  };

  // Group files by directory
  const coreFiles = REPOSITORY_FILES.filter((f) => f.category === "core");
  const configFiles = REPOSITORY_FILES.filter((f) => f.category === "config");
  const exampleFiles = REPOSITORY_FILES.filter((f) => f.category === "example");
  const testFiles = REPOSITORY_FILES.filter((f) => f.category === "test");
  const rootFiles = REPOSITORY_FILES.filter((f) => f.category === "build" || f.category === "doc");

  return (
    <div className="flex flex-col bg-stone-900 border border-stone-800 rounded-lg overflow-hidden text-stone-200">
      {/* Header with Download Action */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-stone-950 border-b border-stone-800 gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-amber-400" />
          <span className="font-mono text-xs font-bold text-stone-200 uppercase tracking-wider">
            flychess-lab / flychess (GitHub Repository)
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-mono bg-stone-800 text-stone-400 rounded">
            v0.1.0
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="download-repo-zip-btn"
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold bg-amber-500 hover:bg-amber-400 text-stone-950 rounded transition-colors shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            {isZipping ? "Generating ZIP..." : "Download Full Repo (.ZIP)"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[500px]">
        {/* Left: File Tree Browser */}
        <div className="md:col-span-4 lg:col-span-3 bg-stone-950/80 border-r border-stone-800 p-3 text-xs font-mono select-none overflow-y-auto max-h-[600px]">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2 px-1">
            Repository Files
          </div>

          {/* flychess/ package */}
          <div className="mb-3">
            <div className="flex items-center gap-1.5 text-amber-400/90 font-semibold px-1 py-1">
              <Folder className="w-3.5 h-3.5" />
              <span>flychess/</span>
            </div>
            <div className="pl-4 space-y-0.5">
              {coreFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left transition-colors ${
                    selectedFile.path === file.path
                      ? "bg-amber-500/20 text-amber-300 font-semibold"
                      : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/60"
                  }`}
                >
                  <FileCode className="w-3 h-3 text-stone-500" />
                  <span className="truncate">{file.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* config/ */}
          <div className="mb-3">
            <div className="flex items-center gap-1.5 text-stone-300 font-semibold px-1 py-1">
              <Folder className="w-3.5 h-3.5" />
              <span>config/</span>
            </div>
            <div className="pl-4 space-y-0.5">
              {configFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left transition-colors ${
                    selectedFile.path === file.path
                      ? "bg-amber-500/20 text-amber-300 font-semibold"
                      : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/60"
                  }`}
                >
                  <FileCode className="w-3 h-3 text-stone-500" />
                  <span className="truncate">{file.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* examples/ */}
          <div className="mb-3">
            <div className="flex items-center gap-1.5 text-stone-300 font-semibold px-1 py-1">
              <Folder className="w-3.5 h-3.5" />
              <span>examples/</span>
            </div>
            <div className="pl-4 space-y-0.5">
              {exampleFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left transition-colors ${
                    selectedFile.path === file.path
                      ? "bg-amber-500/20 text-amber-300 font-semibold"
                      : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/60"
                  }`}
                >
                  <FileCode className="w-3 h-3 text-stone-500" />
                  <span className="truncate">{file.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* tests/ */}
          <div className="mb-3">
            <div className="flex items-center gap-1.5 text-stone-300 font-semibold px-1 py-1">
              <Folder className="w-3.5 h-3.5" />
              <span>tests/</span>
            </div>
            <div className="pl-4 space-y-0.5">
              {testFiles.map((file) => (
                <button
                  key={file.path}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left transition-colors ${
                    selectedFile.path === file.path
                      ? "bg-amber-500/20 text-amber-300 font-semibold"
                      : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/60"
                  }`}
                >
                  <FileCode className="w-3 h-3 text-stone-500" />
                  <span className="truncate">{file.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Root files */}
          <div className="space-y-0.5 pt-1 border-t border-stone-800">
            {rootFiles.map((file) => (
              <button
                key={file.path}
                onClick={() => setSelectedFile(file)}
                className={`w-full flex items-center gap-1.5 px-2 py-1 rounded text-left transition-colors ${
                  selectedFile.path === file.path
                    ? "bg-amber-500/20 text-amber-300 font-semibold"
                    : "text-stone-400 hover:text-stone-200 hover:bg-stone-800/60"
                }`}
              >
                <FileCode className="w-3 h-3 text-stone-500" />
                <span className="truncate">{file.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="md:col-span-8 lg:col-span-9 flex flex-col bg-stone-900">
          {/* File Header Bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-stone-900 border-b border-stone-800 text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-semibold">{selectedFile.path}</span>
              <span className="text-stone-500">
                ({selectedFile.content.split("\n").length} lines)
              </span>
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded transition-colors text-[11px]"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied!" : "Copy Code"}
            </button>
          </div>

          {/* Code Content */}
          <div className="p-4 overflow-x-auto max-h-[550px] font-mono text-xs text-stone-300 leading-relaxed bg-[#0d1117]">
            <pre className="select-text">
              <code>{selectedFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
