import { useCallback, useState } from "react";
import { Upload, X, Image as ImageIcon, Video, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video";
  uploading: boolean;
  progress: number;
  uploaded: boolean;
}

interface FileUploadZoneProps {
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  maxFiles?: number;
}

export const FileUploadZone = ({ files, setFiles, maxFiles = 20 }: FileUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = useCallback((newFiles: File[]) => {
    const validFiles = newFiles
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .slice(0, maxFiles - files.length);

    const uploadedFiles: UploadedFile[] = validFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      type: file.type.startsWith("video") ? "video" : "image",
      uploading: true,
      progress: 0,
      uploaded: false,
    }));

    setFiles((prev) => [...prev, ...uploadedFiles]);

    // Simulate upload progress for each file
    uploadedFiles.forEach((uploadedFile) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === uploadedFile.id ? { ...f, progress: 100, uploading: false, uploaded: true } : f
            )
          );
        } else {
          setFiles((prev) =>
            prev.map((f) => (f.id === uploadedFile.id ? { ...f, progress } : f))
          );
        }
      }, 200);
    });
  }, [files.length, maxFiles, setFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    addFiles(selectedFiles);
    e.target.value = "";
  }, [addFiles]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = (id: string) => {
    const file = files.find((f) => f.id === id);
    if (file) URL.revokeObjectURL(file.preview);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50"
        }`}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple
          accept="image/*,video/*"
          onChange={handleFileSelect}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className={`w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 transition-transform ${isDragging ? "scale-110" : ""}`}>
            <Upload className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2 text-foreground">
            {isDragging ? "Drop files here" : "Drag & drop files here"}
          </h3>
          <p className="text-muted-foreground mb-4">or click to browse</p>
          <p className="text-sm text-muted-foreground">
            Supports PNG, JPG, MP4, MOV (up to {maxFiles} files)
          </p>
        </label>
      </div>

      {/* File Preview Grid */}
      {files.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              Uploaded Files ({files.length})
            </h3>
            {files.some((f) => f.uploading) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {files.map((file) => (
              <div
                key={file.id}
                className="relative group rounded-xl overflow-hidden border border-border bg-card"
              >
                {file.type === "image" ? (
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="w-full aspect-video object-cover"
                  />
                ) : (
                  <video
                    src={file.preview}
                    className="w-full aspect-video object-cover"
                  />
                )}

                {/* Upload Progress Overlay */}
                {file.uploading && (
                  <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center p-4">
                    <Loader2 className="w-6 h-6 text-primary animate-spin mb-2" />
                    <Progress value={file.progress} className="w-full h-1" />
                    <span className="text-xs text-muted-foreground mt-1">
                      {Math.round(file.progress)}%
                    </span>
                  </div>
                )}

                {/* Hover Actions */}
                {!file.uploading && (
                  <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => removeFile(file.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {/* File Type Icon */}
                <div className="absolute bottom-2 left-2 flex items-center gap-1">
                  {file.type === "image" ? (
                    <ImageIcon className="w-4 h-4 text-foreground drop-shadow" />
                  ) : (
                    <Video className="w-4 h-4 text-foreground drop-shadow" />
                  )}
                  {file.uploaded && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
