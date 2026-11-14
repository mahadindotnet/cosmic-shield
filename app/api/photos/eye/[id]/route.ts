import { withApiUser } from "@/lib/auth/api";
import { eyePhotoRow } from "@/lib/eyes/data";
import { readStoredPhoto } from "@/lib/uploads/photos";

const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });

/**
 * A fundus photo. Only its owner and the flight surgeon may see it; anyone
 * else gets 404 (not 403), so the route doesn't reveal which entries have photos.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiUser(async (current) => {
    const { id } = await ctx.params;
    if (!/^\d+$/.test(id)) return notFound();
    const row = eyePhotoRow(Number(id));
    if (!row?.photoPath) return notFound();
    const allowed = current.user.role === "flight_surgeon" || row.userId === current.user.id;
    if (!allowed) return notFound();
    const photo = await readStoredPhoto(row.photoPath);
    if (!photo) return notFound();
    return new Response(new Uint8Array(photo.bytes), {
      headers: {
        "Content-Type": photo.mime,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  });
}
