const { pool } = require('../config/db');

const motorlar = [
  { plaka: '', marka: 'ORNEK KISI 34', model: '50 LIK SCOOTER', yil: null, km: 0, alis_fiyati: 0, noter_alis: 0, satici_adi: '', satici_tc: '', tarih: null, durum: 'devir_bekliyor', alici_adi: '' },
  { plaka: '34AA0092', marka: 'WOLKSWAGEN', model: 'PASSAT', yil: 1998, km: 0, alis_fiyati: 0, noter_alis: 510000, satici_adi: 'ORNEK KISI 30', satici_tc: '10000000017', tarih: '2025-09-19', durum: 'devir_bekliyor', alici_adi: 'ORNEK KISI 20' },
  { plaka: '34AA0064', marka: 'ARORA', model: 'KASIRGA', yil: 2023, km: 6900, alis_fiyati: 0, noter_alis: 40000, satici_adi: 'ORNEK KISI 12', satici_tc: '10000000010', tarih: '2026-02-27', durum: 'devir_bekliyor', alici_adi: 'ORNEK KISI 3', aciklama: 'DEVİR VERİLMEDİ' },
  { plaka: '34AA0047', marka: 'FALCON', model: 'MASTER5', yil: 2023, km: 6000, alis_fiyati: 0, noter_alis: 40000, satici_adi: 'ORNEK KISI 31', satici_tc: '10000000015', tarih: '2025-10-08', durum: 'devir_bekliyor', alici_adi: 'ORNEK KISI 26', aciklama: 'ANTEP SATILDI 28 BIN TL' },
  { plaka: '34AA0019', marka: 'ARORA', model: 'KASIRGA', yil: 2022, km: 6000, alis_fiyati: 0, noter_alis: 40000, satici_adi: 'ORNEK KISI 31', satici_tc: '10000000015', tarih: '2025-10-08', durum: 'devir_bekliyor', alici_adi: 'ORNEK KISI 26', aciklama: 'ORNEK KISI 3 SATILDI 28 BIN TL ORNEK KISI 8' },
  { plaka: '', marka: 'ORNEK KISI 28', model: 'CG', yil: null, km: 0, alis_fiyati: 0, noter_alis: 0, satici_adi: '', satici_tc: '', tarih: null, durum: 'devir_bekliyor', alici_adi: '' },
  { plaka: '34AA0139', marka: 'RAMZEY', model: 'QM125', yil: 2007, km: 0, alis_fiyati: 0, noter_alis: 50000, satici_adi: 'ORNEK KISI 11', satici_tc: '10000000020', tarih: '2026-03-18', durum: 'devir_bekliyor', alici_adi: 'ORNEK KISI 8' },
  { plaka: '34AA0078', marka: 'KUBA', model: '50R GOLD', yil: 2024, km: 6100, alis_fiyati: 0, noter_alis: 50000, satici_adi: 'ORNEK KISI 6', satici_tc: '10000000002', tarih: '2026-04-02', durum: 'devir_bekliyor', alici_adi: 'ORNEK KISI 8' },
  { plaka: '34AA0144', marka: 'KÜBA', model: 'ÇİTA 125', yil: 2012, km: 7800, alis_fiyati: 0, noter_alis: 25000, satici_adi: 'ORNEK KISI 24', satici_tc: '10000000007', tarih: '2026-02-25', durum: 'devir_bekliyor', alici_adi: 'ORNEK KISI 8' },
  { plaka: '34AA0043', marka: 'KUBA', model: 'CG', yil: 2022, km: 2000, alis_fiyati: 0, noter_alis: 40000, satici_adi: 'ORNEK KISI 21', satici_tc: '10000000011', tarih: '2025-12-29', durum: 'devir_bekliyor', alici_adi: 'ORNEK KISI 8' },
  { plaka: '34AA0049', marka: 'KUBA', model: 'SJ50 PRO', yil: 2023, km: 10000, alis_fiyati: 0, noter_alis: 30000, satici_adi: 'ORNEK KISI 32', satici_tc: '10000000001', tarih: '2025-08-08', durum: 'devir_bekliyor', alici_adi: 'ORNEK KISI 8' },
  { plaka: '34AA0101', marka: 'REVOLT', model: 'RT03', yil: 2024, km: 6005, alis_fiyati: 0, noter_alis: 60000, satici_adi: 'ORNEK KISI 10', satici_tc: '10000000013', tarih: '2025-06-16', durum: 'devir_bekliyor', alici_adi: 'ORNEK KISI 2' },
  { plaka: '34AA0113', marka: 'MUSATTİ', model: 'GLAMARC', yil: 2024, km: 25000, alis_fiyati: 0, noter_alis: 80000, satici_adi: 'ORNEK KISI 22', satici_tc: '10000000014', tarih: '2026-02-05', durum: 'devir_bekliyor', alici_adi: 'ORNEK KISI 5', aciklama: '%20 kdv kesildi bekir urun veri 45000 tl alınacak' },
  { plaka: '34AA0090', marka: 'KUBA', model: 'RACE125', yil: 2024, km: 6300, alis_fiyati: 0, noter_alis: 55000, satici_adi: 'ORNEK KISI 18', satici_tc: '10000000006', tarih: '2025-06-12', durum: 'devir_bekliyor', alici_adi: 'ORNEK KISI 16' },
  { plaka: '34AA0011', marka: 'YAMAHA', model: 'R25', yil: 2014, km: 53000, alis_fiyati: 0, noter_alis: 170000, satici_adi: 'ORNEK KISI 25', satici_tc: '10000000003', tarih: '2026-01-12', durum: 'devir_bekliyor', alici_adi: 'ORNEK KISI 15' },
  { plaka: '34AA0026', marka: 'BAJAJ', model: 'NS200', yil: 2015, km: 14000, alis_fiyati: 0, noter_alis: 80000, satici_adi: 'ORNEK KISI 19', satici_tc: '10000000004', tarih: '2025-11-05', durum: 'devir_bekliyor', alici_adi: 'ORNEK KISI 7' },
  { plaka: '34AA0079', marka: 'KANUNİ', model: 'REHA250', yil: 2023, km: 4000, alis_fiyati: 0, noter_alis: 155000, satici_adi: 'ORNEK KISI 14', satici_tc: '10000000016', tarih: '2025-03-04', durum: 'devir_bekliyor', alici_adi: 'ORNEK KISI 23' },
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
