-- ============================================================
-- 34. PENGINGAT TUGAS LEWAT TELEGRAM
--
-- Dashboard hanya mengingatkan orang yang membukanya. Yang lupa
-- justru tidak membuka — itu bentuk lupanya. Jadi pengingatnya harus
-- datang sendiri ke tempat yang memang dilihat tiap pagi.
--
-- Yang disimpan di sini cuma nomor percakapan Telegram tiap orang.
-- Token botnya tidak pernah masuk database: ia rahasia milik
-- aplikasi, bukan data unit, dan tempatnya di pengaturan Vercel.
--
-- Jalankan di Supabase -> SQL Editor -> Run
-- Aman dijalankan berulang kali.
-- ============================================================

alter table pengguna
    add column if not exists telegram_chat_id text;


-- ------------------------------------------------------------
-- Menyambungkan Telegram sendiri.
--
-- Lewat fungsi security definer, bukan update biasa: kebijakan RLS
-- tabel pengguna hanya mengizinkan Admin mengubah baris, dan itu
-- memang tidak layak dilonggarkan cuma demi satu kolom. Fungsi ini
-- hanya bisa menyentuh baris miliknya sendiri — persis seperti
-- simpan_foto_profil.
--
-- Nomor percakapan Telegram berupa angka, boleh diawali tanda minus
-- untuk grup. Yang bukan itu ditolak di sini, supaya salah tempel
-- ketahuan saat disimpan, bukan besok pagi saat pengingatnya tidak
-- kunjung datang.
-- ------------------------------------------------------------
create or replace function simpan_telegram(p_chat_id text)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $simpan$
declare
    v_bersih text := nullif(btrim(coalesce(p_chat_id, '')), '');
begin
    if v_bersih is not null and v_bersih !~ '^-?[0-9]{1,20}$' then
        raise exception 'Nomor percakapan Telegram harus berupa angka';
    end if;

    update pengguna
       set telegram_chat_id = v_bersih
     where auth_user_id = auth.uid();

    return v_bersih;
end
$simpan$;

grant execute on function simpan_telegram(text) to authenticated;


-- ============================================================
-- CEK
-- ============================================================
select nama, jabatan,
       coalesce(telegram_chat_id, 'belum tersambung') as telegram
  from pengguna order by id;
