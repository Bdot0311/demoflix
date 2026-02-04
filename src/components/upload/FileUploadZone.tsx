import { useCallback, useState } from "react";
import { Upload, X, Image as ImageIcon, Video, Loader2, Link, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UploadedFile {
  id: string;
  file: File;
  preview: string;
  type: "image" | "video";
  uploading: boolean;
  progress: number;
  uploaded: boolean;
  sourceUrl?: string; // Track if this came from a URL scrape
}

interface FileUploadZoneProps {
  files: UploadedFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
  maxFiles?: number;
}

export const FileUploadZone = ({ files, setFiles, maxFiles = 20 }: FileUploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [isScrapingUrl, setIsScrapingUrl] = useState(false);
  const { toast } = useToast();

  const addFiles = useCallback((newFiles: File[], sourceUrl?: string) => {
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
      sourceUrl,
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

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const url = urlInput.trim();
    if (!url) return;

    // Basic URL validation
    let formattedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      formattedUrl = `https://${url}`;
    }

    try {
      new URL(formattedUrl);
    } catch {
      toast({
        variant: "destructive",
        title: "Invalid URL",
        description: "Please enter a valid website URL",
      });
      return;
    }

    if (files.length >= maxFiles) {
      toast({
        variant: "destructive",
        title: "Maximum files reached",
        description: `You can only upload up to ${maxFiles} files`,
      });
      return;
    }

    setIsScrapingUrl(true);

    try {
      const { data, error } = await supabase.functions.invoke('scrape-website', {
        body: { url: formattedUrl },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to scrape website');
      }

      const hostname = new URL(formattedUrl).hostname.replace(/[^a-z0-9]/gi, '-');
      const filesToAdd: File[] = [];
      
      // Helper to download screenshot (URL or base64)
      const downloadScreenshot = async (screenshotData: string, filename: string): Promise<File | null> => {
        try {
          if (screenshotData.startsWith('http://') || screenshotData.startsWith('https://')) {
            const imageResponse = await fetch(screenshotData);
            if (!imageResponse.ok) return null;
            const blob = await imageResponse.blob();
            return new File([blob], filename, { type: blob.type || 'image/png' });
          } else {
            // Handle base64 data
            const byteString = atob(screenshotData);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: 'image/png' });
            return new File([blob], filename, { type: 'image/png' });
          }
        } catch {
          return null;
        }
      };

      // Process ALL pages from the scrape (not just the main screenshot)
      if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
        const pagePromises = data.pages.map(async (page: any, index: number) => {
          if (!page.screenshot) return null;
          const pageName = page.title?.toLowerCase().replace(/[^a-z0-9]/g, '-') || `page-${index}`;
          const filename = `${hostname}-${pageName}.png`;
          return downloadScreenshot(page.screenshot, filename);
        });
        
        const downloadedFiles = await Promise.all(pagePromises);
        filesToAdd.push(...downloadedFiles.filter((f): f is File => f !== null));
      } else if (data.screenshot) {
        // Fallback to single screenshot if no pages array
        const file = await downloadScreenshot(data.screenshot, `${hostname}-screenshot.png`);
        if (file) filesToAdd.push(file);
      }

      // Limit to available slots
      const availableSlots = maxFiles - files.length;
      const filesToUpload = filesToAdd.slice(0, availableSlots);
      
      if (filesToUpload.length > 0) {
        addFiles(filesToUpload, formattedUrl);
        setUrlInput("");

        toast({
          title: "Website captured!",
          description: `${filesToUpload.length} page screenshot${filesToUpload.length > 1 ? 's' : ''} from ${data.metadata?.title || formattedUrl} added`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "No screenshots captured",
          description: "Could not capture any page screenshots",
        });
      }
    } catch (error: any) {
      console.error('Error scraping URL:', error);
      toast({
        variant: "destructive",
        title: "Failed to capture website",
        description: error.message || "Could not take screenshot of the website",
      });
    } finally {
      setIsScrapingUrl(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <div className="space-y-2">
        <form onSubmit={handleUrlSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Paste a website URL to capture a screenshot..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              className="pl-10"
              disabled={isScrapingUrl}
            />
          </div>
          <Button type="submit" disabled={isScrapingUrl || !urlInput.trim()}>
            {isScrapingUrl ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Capturing...
              </>
            ) : (
              <>
                <Globe className="w-4 h-4 mr-2" />
                Capture
              </>
            )}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground">
          Enter any website URL to capture a screenshot for your video
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">Or upload files</span>
        </div>
      </div>

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
                  {file.sourceUrl ? (
                    <Globe className="w-4 h-4 text-foreground drop-shadow" />
                  ) : file.type === "image" ? (
                    <ImageIcon className="w-4 h-4 text-foreground drop-shadow" />
                  ) : (
                    <Video className="w-4 h-4 text-foreground drop-shadow" />
                  )}
                  {file.uploaded && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </div>

                {/* Source URL indicator */}
                {file.sourceUrl && (
                  <div className="absolute top-2 left-2 right-2">
                    <div className="bg-background/90 rounded px-2 py-1 text-xs truncate text-muted-foreground">
                      {new URL(file.sourceUrl).hostname}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
