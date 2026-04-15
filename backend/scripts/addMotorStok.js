const { pool } = require('../config/db');

const motorlar = [
  { plaka: '', marka: 'ŞEYDAN E', model: '50 LIK SCOOTER', yil: null, km: 0, alis_fiyati: 0, noter_alis: 0, satici_adi: '', satici_tc: '', tarih: null, durum: 'devir_bekliyor', alici_adi: '' },
  { plaka: '33AYY214', marka: 'WOLKSWAGEN', model: 'PASSAT', yil: 1998, km: 0, alis_fiyati: 0, noter_alis: 510000, satici_adi: 'UTKU ÇÖKŞEN', satici_tc: '38746951676', tarih: '2025-09-19', durum: 'devir_bekliyor', alici_adi: 'KUBİLAY' },
  { plaka: '33ASJ929', marka: 'ARORA', model: 'KASIRGA', yil: 2023, km: 6900, alis_fiyati: 0, noter_alis: 40000, satici_adi: 'FARUK TOPHAN', satici_tc: '26416105566', tarih: '2026-02-27', durum: 'devir_bekliyor', alici_adi: 'ANTEP BİLAL', aciklama: 'DEVİR VERİLMEDİ' },
  { plaka: '33AOF238', marka: 'FALCON', model: 'MASTER5', yil: 2023, km: 6000, alis_fiyati: 0, noter_alis: 40000, satici_adi: 'YAHYA ATİK', satici_tc: '35308455306', tarih: '2025-10-08', durum: 'devir_bekliyor', alici_adi: 'MUSTAFA PAT', aciklama: 'ANTEP SATILDI 28 BIN TL' },
  { plaka: '27ANJ029', marka: 'ARORA', model: 'KASIRGA', yil: 2022, km: 6000, alis_fiyati: 0, noter_alis: 40000, satici_adi: 'YAHYA ATİK', satici_tc: '35308455306', tarih: '2025-10-08', durum: 'devir_bekliyor', alici_adi: 'MUSTAFA PAT', aciklama: 'ANTEP BİLAL SATILDI 28 BIN TL ERGÜN' },
  { plaka: '', marka: 'SÜLEYMAN', model: 'CG', yil: null, km: 0, alis_fiyati: 0, noter_alis: 0, satici_adi: '', satici_tc: '', tarih: null, durum: 'devir_bekliyor', alici_adi: '' },
  { plaka: '33F1398', marka: 'RAMZEY', model: 'QM125', yil: 2007, km: 0, alis_fiyati: 0, noter_alis: 50000, satici_adi: 'ERTUĞRUL BAK', satici_tc: '49900184724', tarih: '2026-03-18', durum: 'devir_bekliyor', alici_adi: 'ERGÜN' },
  { plaka: '33AVJ357', marka: 'KUBA', model: '50R GOLD', yil: 2024, km: 6100, alis_fiyati: 0, noter_alis: 50000, satici_adi: 'EFEKAN UMUTLU', satici_tc: '11030895894', tarih: '2026-04-02', durum: 'devir_bekliyor', alici_adi: 'ERGÜN' },
  { plaka: '33VJF76', marka: 'KÜBA', model: 'ÇİTA 125', yil: 2012, km: 7800, alis_fiyati: 0, noter_alis: 25000, satici_adi: 'MUHAMMED CAN HAMZA', satici_tc: '19745839264', tarih: '2026-02-25', durum: 'devir_bekliyor', alici_adi: 'ERGÜN' },
  { plaka: '33ALL311', marka: 'KUBA', model: 'CG', yil: 2022, km: 2000, alis_fiyati: 0, noter_alis: 40000, satici_adi: 'LEYLA YILDIZ', satici_tc: '27068622968', tarih: '2025-12-29', durum: 'devir_bekliyor', alici_adi: 'ERGÜN' },
  { plaka: '33AOM090', marka: 'KUBA', model: 'SJ50 PRO', yil: 2023, km: 10000, alis_fiyati: 0, noter_alis: 30000, satici_adi: 'YUSUF YAY', satici_tc: '10142398682', tarih: '2025-08-08', durum: 'devir_bekliyor', alici_adi: 'ERGÜN' },
  { plaka: '33AZV725', marka: 'REVOLT', model: 'RT03', yil: 2024, km: 6005, alis_fiyati: 0, noter_alis: 60000, satici_adi: 'EROL ÇETİN', satici_tc: '30577205188', tarih: '2025-06-16', durum: 'devir_bekliyor', alici_adi: 'ABİDİN YİĞİT' },
  { plaka: '33BBH423', marka: 'MUSATTİ', model: 'GLAMARC', yil: 2024, km: 25000, alis_fiyati: 0, noter_alis: 80000, satici_adi: 'MAZLUM MERT DAM', satici_tc: '30649730440', tarih: '2026-02-05', durum: 'devir_bekliyor', alici_adi: 'BEKİR', aciklama: '%20 kdv kesildi bekir urun veri 45000 tl alınacak' },
  { plaka: '33AYK371', marka: 'KUBA', model: 'RACE125', yil: 2024, km: 6300, alis_fiyati: 0, noter_alis: 55000, satici_adi: 'HAŞİM KARAASLAN', satici_tc: '19028797014', tarih: '2025-06-12', durum: 'devir_bekliyor', alici_adi: 'HALİL ERTUĞRUL' },
  { plaka: '07ADM077', marka: 'YAMAHA', model: 'R25', yil: 2014, km: 53000, alis_fiyati: 0, noter_alis: 170000, satici_adi: 'MUHAMMET YİĞİT SI', satici_tc: '11639457882', tarih: '2026-01-12', durum: 'devir_bekliyor', alici_adi: 'HAKTAN' },
  { plaka: '31KDA57', marka: 'BAJAJ', model: 'NS200', yil: 2015, km: 14000, alis_fiyati: 0, noter_alis: 80000, satici_adi: 'KERİMCAN İNAN', satici_tc: '11774342166', tarih: '2025-11-05', durum: 'devir_bekliyor', alici_adi: 'EMRECAN KARATEKE' },
  { plaka: '33AVK634', marka: 'KANUNİ', model: 'REHA250', yil: 2023, km: 4000, alis_fiyati: 0, noter_alis: 155000, satici_adi: 'FATİH YENER', satici_tc: '36748315816', tarih: '2025-03-04', durum: 'devir_bekliyor', alici_adi: 'MERT ÖZFEN' },
];

(async () => {
  try {
    for (const m of motorlar) {
      await pool.query(
        `INSERT INTO ikinci_el_motorlar (plaka, marka, model, yil, km, alis_fiyati, noter_alis, satici_adi, satici_tc, tarih, durum, stok_tipi, alici_adi, aciklama)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'sahip',$12,$13)`,
        [m.plaka, m.marka, m.model, m.yil, m.km, m.alis_fiyati, m.noter_alis, m.satici_adi, m.satici_tc, m.tarih, m.durum, m.alici_adi || '', m.aciklama || '']
      );
      console.log('Eklendi:', m.plaka);
    }
    console.log('Toplam', motorlar.length, 'motor eklendi.');
    process.exit(0);
  } catch (err) {
    console.error('Hata:', err.message);
    process.exit(1);
  }
})();
