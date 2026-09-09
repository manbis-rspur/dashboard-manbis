-- ============================================================
-- 24. PENANDA NOTIFIKASI SUDAH DIBACA
--
-- Isi notifikasinya sendiri tidak disimpan di mana pun. Kabar
-- yang muncul di lonceng dirangkai saat itu juga dari tabel yang
-- sudah ada — nomor, komplain, publikasi, revisi, penawaran MCU,
-- dan obrolan. Menyalinnya ke tabel notifikasi tersendiri hanya
-- akan membuat dua sumber kebenaran yang bisa berbeda isi.
--
-- Yang benar-benar perlu disimpan cuma satu: kapan seseorang
-- terakhir membuka loncengnya. Dari situ jumlah "belum dibaca"
-- bisa dihitung.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

alter table pengguna
    add column if not exists notifikasi_dilihat_pada timestamptz;


-- ------------------------------------------------------------
-- Menandai lonceng sudah dibuka.
--
-- Lewat fungsi security definer, bukan update biasa, karena
-- kebijakan RLS di tabel pengguna hanya mengizinkan Admin yang
-- mengubah baris. Menu itu memang untuk mengatur orang lain —
-- tidak seharusnya dilonggarkan cuma demi satu kolom penanda.
-- Fungsi ini hanya bisa menyentuh baris miliknya sendiri.
-- ------------------------------------------------------------
create or replace function tandai_notifikasi_dibaca()
returns timestamptz
language sql
volatile
security definer
set search_path = public
as $tandai$
    update pengguna
       set notifikasi_dilihat_pada = now()
     where auth_user_id = auth.uid()
    returning notifikasi_dilihat_pada;
$tandai$;

grant execute on function tandai_notifikasi_dibaca() to authenticated;


-- ============================================================
-- CEK
-- ============================================================
select nama, jabatan,
       coalesce(to_char(notifikasi_dilihat_pada, 'DD Mon YYYY HH24:MI'),
                'belum pernah membuka lonceng') as notifikasi_terakhir_dibuka
  from pengguna
 order by id;
