"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Image as ImageIcon, Trash2 } from "lucide-react";
import { uploadJobPhoto, deleteJobPhoto } from "@/app/dashboard/jobs/actions";
import {
  MAX_JOB_PHOTO_SIZE_BYTES,
  isAllowedJobPhotoMimeType,
} from "@/lib/job-photos";

const isDev = process.env.NODE_ENV !== "production";
const debugLog = (...args: unknown[]) => {
  if (isDev) {
    console.log(...args);
  }
};

interface JobPhotosProps {
  jobId: string;
  userId: string;
  initialPhotos?: JobPhoto[];
}

interface JobPhoto {
  name: string;
  url: string;
  path: string;
}

export function JobPhotos({ jobId, userId, initialPhotos = [] }: JobPhotosProps) {
  const [photos, setPhotos] = useState<JobPhoto[]>(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const [uploadTotal, setUploadTotal] = useState(0);
  const [uploadCompleted, setUploadCompleted] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setError(null);
      setUploading(true);
      setUploadTotal(acceptedFiles.length);
      setUploadCompleted(0);

      try {
        let completed = 0;
        for (const file of acceptedFiles) {
          if (!isAllowedJobPhotoMimeType(file.type)) {
            setError(`${file.name} is not an image file`);
            continue;
          }

          if (file.size > MAX_JOB_PHOTO_SIZE_BYTES) {
            setError(`${file.name} is too large (max 5MB)`);
            continue;
          }

          const formData = new FormData();
          formData.append("file", file);
          formData.append("jobId", jobId);
          // userId is derived server-side from the authenticated session.

          debugLog("Uploading photo:", { jobId, userId, fileName: file.name });
          
          let result;
          try {
            result = await uploadJobPhoto(formData);
            debugLog("Upload result:", result);
          } catch (fetchError) {
            console.error("Fetch error calling uploadJobPhoto:", fetchError);
            setError(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Failed to fetch'}`);
            continue;
          }

          if (result.success && result.photo) {
            debugLog("Adding photo to state:", result.photo);
            setPhotos((prev) => [...prev, result.photo!]);
            setError(null); // Clear any previous errors on success
          } else {
            setError(result.error || "Failed to upload photo");
          }

          completed += 1;
          setUploadCompleted(completed);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An error occurred while uploading";
        setError(errorMessage);
        console.error("Upload error:", err);
      } finally {
        setUploading(false);
      }
    },
    [jobId, userId]
  );

  const uploadPercent =
    uploadTotal > 0 ? Math.round((uploadCompleted / uploadTotal) * 100) : 0;

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/gif": [".gif"],
    },
    multiple: true,
    disabled: uploading,
  });

  const handleDelete = async (photo: JobPhoto) => {
    if (!confirm("Are you sure you want to delete this photo?")) {
      return;
    }

    const result = await deleteJobPhoto(photo.path);

    if (result.success) {
      setPhotos((prev) => prev.filter((p) => p.path !== photo.path));
    } else {
      setError(result.error || "Failed to delete photo");
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card className="border-2 border-dashed border-border/70 bg-card/40 hover:border-border transition-colors">
        <div
          {...getRootProps()}
          className={`p-8 text-center cursor-pointer ${
            isDragActive ? "bg-accent/60" : "bg-transparent"
          } ${uploading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-500/15 flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-300" />
            </div>
            {isDragActive ? (
              <p className="text-foreground font-medium">Drop the images here...</p>
            ) : (
              <>
                <div>
                  <p className="text-foreground font-medium">
                    Drag & drop images here, or click to select
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    PNG, JPG, GIF, WEBP up to 5MB
                  </p>
                </div>
                <Button type="button" variant="outline" disabled={uploading}>
                  {uploading ? "Uploading..." : "Select Files"}
                </Button>
              </>
            )}
          </div>

          {uploading ? (
            <div className="mt-5 mx-auto max-w-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Uploading...</span>
                <span>
                  {Math.min(uploadCompleted + 1, uploadTotal)}/{uploadTotal}
                </span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      {/* Error Message */}
      {error && (
        <div className="rounded-lg p-4 border border-rose-500/20 bg-rose-500/10">
          <p className="text-sm text-rose-700 dark:text-rose-200">{error}</p>
        </div>
      )}

      {/* Photo Grid */}
      {photos.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card key={photo.path} className="overflow-hidden group relative">
              <div className="aspect-square relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                  <Button
                    variant="default"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => handleDelete(photo)}
                    aria-label="Delete photo"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="p-2 bg-card">
                <p className="text-xs text-muted-foreground truncate">{photo.name}</p>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-lg border border-border/60 bg-card/40">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No photos uploaded yet</p>
          <p className="text-sm text-muted-foreground/80 mt-1">
            Upload before & after photos to showcase your work
          </p>
        </div>
      )}
    </div>
  );
}
