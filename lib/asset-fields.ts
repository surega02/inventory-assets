export const assetTextLimits = {
  code: 80,
  name: 160,
  serial_number: 120,
  brand_model: 160,
  notes: 2000,
} as const;

export const assetPhotoBucket = "asset-photos";
export const assetPhotoMaxMiB = 4;
export const assetPhotoMaxBytes = assetPhotoMaxMiB * 1024 * 1024;
export const assetPhotoMaxMegapixels = 25;
export const assetPhotoTypes = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
} as const;

type AssetField = keyof typeof assetTextLimits | "category_id" | "room_id" | "condition"
  | "purchase_date" | "acquisition_cost_idr" | "photo";

export type AssetFormFeedback = {
  message?: string;
  errors?: Partial<Record<AssetField, string>>;
};
