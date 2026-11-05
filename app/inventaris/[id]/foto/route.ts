import { assetPhotoBucket, assetPhotoTypes } from "@/lib/asset-fields";
import { inventoryAccess } from "@/lib/inventory-access";
import { inventoryAsset } from "@/lib/inventory-store";

const allowedTypes = new Set<string>(Object.values(assetPhotoTypes));

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await inventoryAccess();
  if (access.kind !== "admin") return new Response(null, { status: 404 });
  try {
    const asset = await inventoryAsset(access, (await params).id);
    if (!asset?.photo_path) return new Response(null, { status: 404 });
    const { data, error } = await access.client.storage.from(assetPhotoBucket).download(asset.photo_path);
    if (error || !data || !allowedTypes.has(data.type)) return new Response(null, { status: 404 });
    return new Response(data, {
      headers: {
        "Content-Type": data.type,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
