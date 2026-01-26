import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Palette,
  Image as ImageIcon,
  Upload,
  Trash2,
  Loader2,
  Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BrandingSettings {
  logo_url: string | null;
  brand_color: string;
  brand_color_secondary: string;
  logo_position: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";
  logo_size: "small" | "medium" | "large";
  show_logo_on_all_scenes: boolean;
}

interface BrandingPanelProps {
  projectId: string;
  settings: BrandingSettings;
  onUpdate: (settings: Partial<BrandingSettings>) => void;
  disabled?: boolean;
}

const POSITION_OPTIONS = [
  { value: "top-left", label: "Top Left" },
  { value: "top-right", label: "Top Right" },
  { value: "bottom-left", label: "Bottom Left" },
  { value: "bottom-right", label: "Bottom Right" },
  { value: "center", label: "Center" },
];

const SIZE_OPTIONS = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

// Preset brand colors (Netflix-inspired palette)
const PRESET_COLORS = [
  { name: "Netflix Red", primary: "#E50914", secondary: "#141414" },
  { name: "Electric Blue", primary: "#0066FF", secondary: "#0A1628" },
  { name: "Emerald", primary: "#10B981", secondary: "#0F172A" },
  { name: "Purple Haze", primary: "#8B5CF6", secondary: "#1E1B4B" },
  { name: "Sunset Orange", primary: "#F97316", secondary: "#1C1917" },
  { name: "Rose Gold", primary: "#F43F5E", secondary: "#1F1F1F" },
  { name: "Cyan Tech", primary: "#06B6D4", secondary: "#083344" },
  { name: "Gold Premium", primary: "#EAB308", secondary: "#1C1917" },
];

export const BrandingPanel = ({
  projectId,
  settings,
  onUpdate,
  disabled = false,
}: BrandingPanelProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, SVG)",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Logo must be under 5MB",
      });
      return;
    }

    setIsUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}/${projectId}-logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("brand-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("brand-logos")
        .getPublicUrl(fileName);

      onUpdate({ logo_url: publicUrl });

      toast({
        title: "Logo uploaded!",
        description: "Your brand logo has been added to the project",
      });
    } catch (error) {
      console.error("Logo upload error:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload logo",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Try to delete from storage
      const fileName = settings.logo_url?.split("/").pop();
      if (fileName) {
        await supabase.storage
          .from("brand-logos")
          .remove([`${user.id}/${fileName}`]);
      }

      onUpdate({ logo_url: null });

      toast({
        title: "Logo removed",
        description: "Brand logo has been removed from the project",
      });
    } catch (error) {
      console.error("Logo removal error:", error);
      // Still clear the URL even if deletion fails
      onUpdate({ logo_url: null });
    }
  };

  const handleColorPreset = (preset: typeof PRESET_COLORS[0]) => {
    onUpdate({
      brand_color: preset.primary,
      brand_color_secondary: preset.secondary,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Palette className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Branding
        </h3>
      </div>

      {/* Logo Upload */}
      <div className="space-y-3">
        <Label className="text-xs text-muted-foreground">Brand Logo</Label>
        
        {settings.logo_url ? (
          <div className="relative group rounded-lg border border-border bg-muted/30 p-4">
            <img
              src={settings.logo_url}
              alt="Brand logo"
              className="max-h-20 max-w-full mx-auto object-contain"
            />
            <button
              onClick={handleRemoveLogo}
              disabled={disabled}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="w-full p-6 rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 hover:bg-muted/30 transition-colors flex flex-col items-center gap-2"
          >
            {isUploading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground" />
            )}
            <span className="text-sm text-muted-foreground">
              {isUploading ? "Uploading..." : "Upload logo (PNG, JPG, SVG)"}
            </span>
          </button>
        )}
        
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          className="hidden"
        />
      </div>

      {/* Logo Position & Size (only shown if logo exists) */}
      {settings.logo_url && (
        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Position</Label>
              <Select
                value={settings.logo_position}
                onValueChange={(value) => onUpdate({ logo_position: value as any })}
                disabled={disabled}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POSITION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Size</Label>
              <Select
                value={settings.logo_size}
                onValueChange={(value) => onUpdate({ logo_size: value as any })}
                disabled={disabled}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SIZE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-xs text-muted-foreground">
              Show on all scenes
            </Label>
            <Switch
              checked={settings.show_logo_on_all_scenes}
              onCheckedChange={(checked) =>
                onUpdate({ show_logo_on_all_scenes: checked })
              }
              disabled={disabled}
            />
          </div>
        </div>
      )}

      {/* Brand Colors */}
      <div className="space-y-3 pt-2">
        <Label className="text-xs text-muted-foreground">Brand Colors</Label>
        
        {/* Color Presets */}
        <div className="grid grid-cols-4 gap-2">
          {PRESET_COLORS.map((preset) => {
            const isActive =
              settings.brand_color === preset.primary &&
              settings.brand_color_secondary === preset.secondary;
            return (
              <button
                key={preset.name}
                onClick={() => handleColorPreset(preset)}
                disabled={disabled}
                className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                  isActive
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-transparent hover:border-border"
                }`}
                title={preset.name}
              >
                <div
                  className="absolute inset-0"
                  style={{ backgroundColor: preset.secondary }}
                />
                <div
                  className="absolute inset-2 rounded"
                  style={{ backgroundColor: preset.primary }}
                />
                {isActive && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Custom Colors */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Primary</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.brand_color}
                onChange={(e) => onUpdate({ brand_color: e.target.value })}
                disabled={disabled}
                className="w-10 h-9 rounded border border-border cursor-pointer"
              />
              <Input
                value={settings.brand_color}
                onChange={(e) => onUpdate({ brand_color: e.target.value })}
                disabled={disabled}
                className="flex-1 h-9 font-mono text-xs uppercase"
                maxLength={7}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Secondary</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={settings.brand_color_secondary}
                onChange={(e) =>
                  onUpdate({ brand_color_secondary: e.target.value })
                }
                disabled={disabled}
                className="w-10 h-9 rounded border border-border cursor-pointer"
              />
              <Input
                value={settings.brand_color_secondary}
                onChange={(e) =>
                  onUpdate({ brand_color_secondary: e.target.value })
                }
                disabled={disabled}
                className="flex-1 h-9 font-mono text-xs uppercase"
                maxLength={7}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="pt-2">
        <Label className="text-xs text-muted-foreground mb-2 block">Preview</Label>
        <div
          className="relative aspect-video rounded-lg overflow-hidden border border-border"
          style={{ backgroundColor: settings.brand_color_secondary }}
        >
          {/* Simulated content */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="text-2xl font-bold"
              style={{ color: settings.brand_color }}
            >
              Your Trailer
            </div>
          </div>

          {/* Logo overlay preview */}
          {settings.logo_url && (
            <div
              className={`absolute p-3 ${
                settings.logo_position === "top-left"
                  ? "top-0 left-0"
                  : settings.logo_position === "top-right"
                  ? "top-0 right-0"
                  : settings.logo_position === "bottom-left"
                  ? "bottom-0 left-0"
                  : settings.logo_position === "bottom-right"
                  ? "bottom-0 right-0"
                  : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              }`}
            >
              <img
                src={settings.logo_url}
                alt="Logo preview"
                className={`object-contain ${
                  settings.logo_size === "small"
                    ? "h-6"
                    : settings.logo_size === "medium"
                    ? "h-10"
                    : "h-14"
                }`}
              />
            </div>
          )}

          {/* Brand color accent bar */}
          <div
            className="absolute bottom-0 left-0 right-0 h-1"
            style={{ backgroundColor: settings.brand_color }}
          />
        </div>
      </div>
    </div>
  );
};
