import { NextResponse } from "next/server";

/**
 * Pemeriksa sementara: apakah kunci rahasia terbaca saat berjalan.
 *
 * Hanya melaporkan ada-tidaknya dan panjangnya, tidak pernah isinya.
 * Dihapus lagi begitu jawabannya didapat.
 */
export async function GET() {
  const kunci = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  return NextResponse.json({
    terbaca: kunci.length > 0,
    panjang: kunci.length,
    lingkungan: process.env.VERCEL_ENV ?? "tidak diketahui",
  });
}
