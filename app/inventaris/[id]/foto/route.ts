import { assetPhotoBucket, assetPhotoTypes } from "@/lib/asset-fields";
import { accountAccess, hasOperationalAccess } from "@/lib/account-access";
import { isId } from "@/lib/inventory";
import { inventoryAsset } from "@/lib/inventory-store";

const allowedTypes = new Set<string>(Object.values(assetPhotoTypes));

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await accountAccess();
  const { id } = await params;
  if (!isId(id) || access.kind !== "signed-in" || access.needsPassword) {
    return new Response(null, { status: 404 });
  }
  try {
    const path = hasOperationalAccess(access.role, "manage")
      ? (await inventoryAsset({ kind: "admin", client: access.client }, id))?.photo_path
      : (await access.client.rpc("inventory_staff_photo", { asset_id: id })).data;
    if (typeof path !== "string" || !path) return new Response(null, { status: 404 });
    const { data, error } = await access.client.storage.from(assetPhotoBucket).download(path);
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
