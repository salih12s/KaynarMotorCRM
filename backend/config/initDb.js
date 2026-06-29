const { pool } = require('./db');
const bcrypt = require('bcryptjs');

const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    // 1. Kullanıcılar
    await client.query(`
      CREATE TABLE IF NOT EXISTS kullanicilar (
        id SERIAL PRIMARY KEY,
        kullanici_adi VARCHAR(50) UNIQUE NOT NULL,
        sifre VARCHAR(255) NOT NULL,
        plain_sifre VARCHAR(255),
        ad_soyad VARCHAR(100) NOT NULL,
        rol VARCHAR(20) DEFAULT 'personel',
        onay_durumu VARCHAR(20) DEFAULT 'beklemede',
        aksesuar_yetkisi BOOLEAN DEFAULT FALSE,
        motor_satis_yetkisi BOOLEAN DEFAULT FALSE,
        eticaret_yetkisi BOOLEAN DEFAULT FALSE,
        servis_yetkisi BOOLEAN DEFAULT FALSE,
        aksesuar_stok_yetkisi BOOLEAN DEFAULT FALSE,
        yedek_parca_yetkisi BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Müşteriler
    await client.query(`
      CREATE TABLE IF NOT EXISTS musteriler (
        id SERIAL PRIMARY KEY,
        ad_soyad VARCHAR(100),
        adres TEXT,
        telefon VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. İş Emirleri
    await client.query(`
      CREATE TABLE IF NOT EXISTS is_emirleri (
        id SERIAL PRIMARY KEY,
        fis_no INTEGER UNIQUE,
        musteri_id INTEGER REFERENCES musteriler(id),
        musteri_ad_soyad VARCHAR(100),
        adres TEXT,
        telefon VARCHAR(20),
        km INTEGER,
        model_tip VARCHAR(100),
        marka VARCHAR(100),
        aciklama TEXT,
        ariza_sikayetler TEXT,
        tahmini_teslim_tarihi DATE,
        tahmini_toplam_ucret DECIMAL(10,2) DEFAULT 0,
        gercek_toplam_ucret DECIMAL(10,2) DEFAULT 0,
        toplam_maliyet DECIMAL(10,2) DEFAULT 0,
        kar DECIMAL(10,2) DEFAULT 0,
        durum VARCHAR(20) DEFAULT 'beklemede',
        musteri_imza BOOLEAN DEFAULT FALSE,
        teslim_alan_ad_soyad VARCHAR(100),
        teslim_eden_teknisyen VARCHAR(100),
        teslim_tarihi DATE,
        olusturan_kullanici_id INTEGER REFERENCES kullanicilar(id),
        olusturan_kisi VARCHAR(100),
        odeme_detaylari TEXT,
        tamamlama_tarihi TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Parçalar
    await client.query(`
      CREATE TABLE IF NOT EXISTS parcalar (
        id SERIAL PRIMARY KEY,
        is_emri_id INTEGER REFERENCES is_emirleri(id) ON DELETE CASCADE,
        parca_kodu VARCHAR(50),
        takilan_parca VARCHAR(200),
        adet INTEGER DEFAULT 1,
        birim_fiyat DECIMAL(10,2) DEFAULT 0,
        maliyet DECIMAL(10,2) DEFAULT 0,
        toplam_fiyat DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. Aksesuar Stok
    await client.query(`
      CREATE TABLE IF NOT EXISTS aksesuar_stok (
        id SERIAL PRIMARY KEY,
        stok_kodu VARCHAR(20) UNIQUE NOT NULL,
        stok_adi VARCHAR(255) NOT NULL,
        marka VARCHAR(100),
        giren_miktar INTEGER DEFAULT 0,
        cikan_miktar INTEGER DEFAULT 0,
        mevcut INTEGER DEFAULT 0,
        birimi VARCHAR(20) DEFAULT 'Adet',
        alis_fiyati DECIMAL(10,2) DEFAULT 0,
        satis_fiyati DECIMAL(10,2) DEFAULT 0,
        envanter_degeri DECIMAL(12,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. Aksesuarlar (Satışlar)
    await client.query(`
      CREATE TABLE IF NOT EXISTS aksesuarlar (
        id SERIAL PRIMARY KEY,
        ad_soyad VARCHAR(100),
        telefon VARCHAR(20),
        urun_adi VARCHAR(255),
        odeme_tutari DECIMAL(10,2) DEFAULT 0,
        odeme_sekli VARCHAR(50),
        aciklama TEXT,
        durum VARCHAR(50) DEFAULT 'beklemede',
        toplam_maliyet DECIMAL(10,2) DEFAULT 0,
        toplam_satis DECIMAL(10,2) DEFAULT 0,
        kar DECIMAL(10,2) DEFAULT 0,
        odeme_detaylari TEXT,
        satis_tarihi DATE DEFAULT CURRENT_DATE,
        tamamlama_tarihi TIMESTAMP,
        olusturan_kisi VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Aksesuar Parçalar
    await client.query(`
      CREATE TABLE IF NOT EXISTS aksesuar_parcalar (
        id SERIAL PRIMARY KEY,
        aksesuar_id INTEGER REFERENCES aksesuarlar(id) ON DELETE CASCADE,
        urun_adi VARCHAR(255),
        adet INTEGER DEFAULT 1,
        maliyet DECIMAL(10,2) DEFAULT 0,
        satis_fiyati DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 8. 2. El Motorlar
    await client.query(`
      CREATE TABLE IF NOT EXISTS ikinci_el_motorlar (
        id SERIAL PRIMARY KEY,
        tarih DATE DEFAULT CURRENT_DATE,
        plaka VARCHAR(20),
        marka VARCHAR(100),
        model VARCHAR(100),
        km INTEGER,
        alis_fiyati DECIMAL(12,2) DEFAULT 0,
        satis_fiyati DECIMAL(12,2) DEFAULT 0,
        noter_alis DECIMAL(12,2) DEFAULT 0,
        noter_satis DECIMAL(12,2) DEFAULT 0,
        masraflar DECIMAL(12,2) DEFAULT 0,
        kar DECIMAL(12,2) DEFAULT 0,
        alici_adi VARCHAR(255),
        alici_tc VARCHAR(100),
        alici_telefon VARCHAR(50),
        alici_adres TEXT,
        odeme_sekli VARCHAR(50) DEFAULT 'nakit',
        aciklama TEXT,
        durum VARCHAR(50) DEFAULT 'beklemede',
        tamamlama_tarihi TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 9. E-Ticaret Platformlar
    await client.query(`
      CREATE TABLE IF NOT EXISTS eticaret_platformlar (
        id SERIAL PRIMARY KEY,
        platform_adi VARCHAR(100) NOT NULL,
        komisyon_orani DECIMAL(5,2) DEFAULT 0,
        kdv_orani DECIMAL(5,2) DEFAULT 20,
        kargo_ucreti DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 10. E-Ticaret Satışlar
    await client.query(`
      CREATE TABLE IF NOT EXISTS eticaret_satislar (
        id SERIAL PRIMARY KEY,
        stok_id INTEGER REFERENCES aksesuar_stok(id) ON DELETE SET NULL,
        platform_id INTEGER REFERENCES eticaret_platformlar(id) ON DELETE SET NULL,
        urun_adi VARCHAR(255),
        alis_fiyati DECIMAL(10,2) DEFAULT 0,
        satis_fiyati DECIMAL(10,2) DEFAULT 0,
        komisyon_orani DECIMAL(5,2) DEFAULT 0,
        komisyon_tutari DECIMAL(10,2) DEFAULT 0,
        kdv_orani DECIMAL(5,2) DEFAULT 20,
        kargo_ucreti DECIMAL(10,2) DEFAULT 0,
        kar DECIMAL(10,2) DEFAULT 0,
        adet INTEGER DEFAULT 1,
        tarih DATE DEFAULT CURRENT_DATE,
        durum VARCHAR(50) DEFAULT 'tamamlandi',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 11. Yedek Parçalar (Fiyat Listesi)
    await client.query(`
      CREATE TABLE IF NOT EXISTS yedek_parcalar (
        id SERIAL PRIMARY KEY,
        urun_adi VARCHAR(255) NOT NULL,
        alis_fiyati DECIMAL(10,2) DEFAULT 0,
        satis_fiyati DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 12. Aktivite Log
    await client.query(`
      CREATE TABLE IF NOT EXISTS aktivite_log (
        id SERIAL PRIMARY KEY,
        kullanici_id INTEGER REFERENCES kullanicilar(id) ON DELETE SET NULL,
        kullanici_adi VARCHAR(50),
        islem_tipi VARCHAR(50) NOT NULL,
        islem_detay TEXT,
        hedef_tablo VARCHAR(50),
        hedef_id INTEGER,
        ip_adresi VARCHAR(45),
        tarayici_bilgisi TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Varsayılan admin kullanıcı oluştur
    const adminCheck = await client.query(
      "SELECT id FROM kullanicilar WHERE kullanici_adi = 'admin'"
    );
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('***REMOVED***', 10);
      await client.query(
        `INSERT INTO kullanicilar (kullanici_adi, sifre, plain_sifre, ad_soyad, rol, onay_durumu)
         VALUES ('admin', $1, '***REMOVED***', 'Admin', 'admin', 'onaylandi')`,
        [hashedPassword]
      );
      console.log('Varsayılan admin oluşturuldu (admin / ***REMOVED***)');
    }

    // Varsayılan e-ticaret platformları
    const platformCheck = await client.query("SELECT id FROM eticaret_platformlar LIMIT 1");
    if (platformCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO eticaret_platformlar (platform_adi, komisyon_orani) VALUES
        ('Trendyol', 23.99),
        ('Hepsiburada', 19.99)
      `);
      console.log('Varsayılan e-ticaret platformları oluşturuldu');
    }

    // Migration: masraflar kolonu ekle (yoksa)
    await client.query(`
      ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS masraflar DECIMAL(12,2) DEFAULT 0;
    `);

    // Migration: marka kolonu ekle (yoksa)
    await client.query(`
      ALTER TABLE aksesuar_stok ADD COLUMN IF NOT EXISTS marka VARCHAR(100);
    `);

    // Migration: olusturan_kisi kolonu aksesuarlar tablosuna ekle (yoksa)
    await client.query(`
      ALTER TABLE aksesuarlar ADD COLUMN IF NOT EXISTS olusturan_kisi VARCHAR(100);
    `);

    // Migration: e-ticaret platformlara kdv ve kargo ekle
    await client.query(`
      ALTER TABLE eticaret_platformlar ADD COLUMN IF NOT EXISTS kdv_orani DECIMAL(5,2) DEFAULT 20;
    `);
    await client.query(`
      ALTER TABLE eticaret_platformlar ADD COLUMN IF NOT EXISTS kargo_ucreti DECIMAL(10,2) DEFAULT 0;
    `);

    // Migration: e-ticaret satışlara kdv ve kargo ekle
    await client.query(`
      ALTER TABLE eticaret_satislar ADD COLUMN IF NOT EXISTS kdv_orani DECIMAL(5,2) DEFAULT 20;
    `);
    await client.query(`
      ALTER TABLE eticaret_satislar ADD COLUMN IF NOT EXISTS kargo_ucreti DECIMAL(10,2) DEFAULT 0;
    `);

    // Migration: aksesuar_stok tablosuna platform alanı ekle
    await client.query(`
      ALTER TABLE aksesuar_stok ADD COLUMN IF NOT EXISTS platform VARCHAR(100);
    `);

    // Migration: ikinci_el_motorlar tablosuna stok_tipi alanı ekle
    await client.query(`
      ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS stok_tipi VARCHAR(20) DEFAULT 'sahip';
    `);

    // Migration: ikinci_el_motorlar tablosuna yeni alanlar ekle
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS yil INTEGER;`);
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS satici_adi VARCHAR(255);`);
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS satici_tc VARCHAR(20);`);
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS kalan_odeme DECIMAL(12,2) DEFAULT 0;`);
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS fatura_kesildi BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS yevmiye_no VARCHAR(50);`);
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS eski_kayit BOOLEAN DEFAULT FALSE;`);

    // Migration: durum 'beklemede' → 'stokta'
    await client.query(`UPDATE ikinci_el_motorlar SET durum = 'stokta' WHERE durum = 'beklemede';`);

    // Migration: alici_tc column width
    await client.query(`ALTER TABLE ikinci_el_motorlar ALTER COLUMN alici_tc TYPE VARCHAR(100);`);

    // Migration: kullanicilar tablosuna yeni yetki alanları ekle
    await client.query(`ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS eticaret_yetkisi BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS servis_yetkisi BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS aksesuar_stok_yetkisi BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS yedek_parca_yetkisi BOOLEAN DEFAULT FALSE;`);
    // Vitrin (site) yönetimi yetkileri — motor ve aksesuar vitrini ayrı ayrı verilebilir
    await client.query(`ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS motor_vitrin_yetkisi BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS aksesuar_vitrin_yetkisi BOOLEAN DEFAULT FALSE;`);

    // Migration: aksesuar_stok tablosuna beden, renk ve kategori alanları ekle
    await client.query(`ALTER TABLE aksesuar_stok ADD COLUMN IF NOT EXISTS beden VARCHAR(10);`);
    await client.query(`ALTER TABLE aksesuar_stok ADD COLUMN IF NOT EXISTS renk VARCHAR(50);`);
    await client.query(`ALTER TABLE aksesuar_stok ADD COLUMN IF NOT EXISTS kategori VARCHAR(50);`);

    // Migration: ikinci_el_motorlar tablosuna satis_tarihi ekle
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS satis_tarihi DATE;`);

    // Migration: ikinci_el_motorlar tablosuna komisyoncu alanları ekle
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS komisyoncu_adi VARCHAR(255);`);
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS komisyoncu_telefon VARCHAR(50);`);
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS komisyoncu_tutari DECIMAL(12,2) DEFAULT 0;`);

    // Migration: yedek_parcalar tablosuna müşteri bilgileri ekle
    await client.query(`ALTER TABLE yedek_parcalar ADD COLUMN IF NOT EXISTS musteri_adi VARCHAR(255);`);
    await client.query(`ALTER TABLE yedek_parcalar ADD COLUMN IF NOT EXISTS musteri_telefon VARCHAR(50);`);
    // Migration: kalan_odeme alanlarÄ± (veresiye/borÃ§ takibi)
    await client.query(`ALTER TABLE is_emirleri ADD COLUMN IF NOT EXISTS kalan_odeme DECIMAL(12,2) DEFAULT 0;`);
    await client.query(`ALTER TABLE aksesuarlar ADD COLUMN IF NOT EXISTS kalan_odeme DECIMAL(12,2) DEFAULT 0;`);
    await client.query(`ALTER TABLE yedek_parcalar ADD COLUMN IF NOT EXISTS kalan_odeme DECIMAL(12,2) DEFAULT 0;`);
    // Migration: aksesuar satışında indirim (toplam ve kârdan düşülür)
    await client.query(`ALTER TABLE aksesuarlar ADD COLUMN IF NOT EXISTS indirim DECIMAL(12,2) DEFAULT 0;`);
    // Migration: iş emrine plaka alanı
    await client.query(`ALTER TABLE is_emirleri ADD COLUMN IF NOT EXISTS plaka VARCHAR(20);`);

    // Migration: ikinci_el_motorlar tablosuna yatırımcı ve liste fiyatı alanları ekle
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS yatirimci_id INTEGER REFERENCES kullanicilar(id) ON DELETE SET NULL;`);
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS yatirimci_kar_orani DECIMAL(5,2) DEFAULT 0;`);
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS yatirimci_kar DECIMAL(12,2) DEFAULT 0;`);
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS liste_fiyati DECIMAL(12,2) DEFAULT 0;`);

    // Migration: kullanicilar tablosuna alan bazlı görüntüleme yetkileri ekle
    await client.query(`ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS liste_fiyati_gor BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS alis_fiyati_gor BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS satis_fiyati_gor BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS kar_gor BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS musteri_gor BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE kullanicilar ADD COLUMN IF NOT EXISTS satis_gecmisi_gor BOOLEAN DEFAULT FALSE;`);

    // 13. Vitrin Ürünleri (genel kullanıma açık mağaza ilanları)
    //  - Görseller AYRI tabloda tutulur (vitrin_gorseller); bu tablo hafif kalır,
    //    liste sorguları base64 yüklemez. (DB yükünü önleme stratejisi)
    await client.query(`
      CREATE TABLE IF NOT EXISTS vitrin_urunleri (
        id SERIAL PRIMARY KEY,
        kategori VARCHAR(30) NOT NULL,
        baslik VARCHAR(255) NOT NULL,
        aciklama TEXT,
        fiyat DECIMAL(12,2) DEFAULT 0,
        video_url TEXT,
        kapak_gorsel_id INTEGER,
        marka VARCHAR(100),
        model VARCHAR(100),
        yil INTEGER,
        segment VARCHAR(30),
        motor_cc INTEGER,
        km INTEGER,
        yayinda BOOLEAN DEFAULT TRUE,
        siralama INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 14. Vitrin Görselleri (base64; ürün başına çoklu)
    await client.query(`
      CREATE TABLE IF NOT EXISTS vitrin_gorseller (
        id SERIAL PRIMARY KEY,
        urun_id INTEGER REFERENCES vitrin_urunleri(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        sira INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 15. Vitrin Kategori İletişim (kategoriye özel personel + telefon)
    await client.query(`
      CREATE TABLE IF NOT EXISTS vitrin_kategori_iletisim (
        kategori VARCHAR(30) PRIMARY KEY,
        personel_adi VARCHAR(100),
        telefon VARCHAR(50),
        aciklama TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Vitrin liste sorguları için index
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vitrin_kategori_yayinda ON vitrin_urunleri(kategori, yayinda);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vitrin_gorsel_urun ON vitrin_gorseller(urun_id);`);

    // 16. Vitrin Segmentleri (dinamik segment yapısı)
    await client.query(`
      CREATE TABLE IF NOT EXISTS vitrin_segmentler (
        id SERIAL PRIMARY KEY,
        ad VARCHAR(50) UNIQUE NOT NULL,
        sira INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    const segCheck = await client.query('SELECT id FROM vitrin_segmentler LIMIT 1');
    if (segCheck.rows.length === 0) {
      await client.query(`
        INSERT INTO vitrin_segmentler (ad, sira) VALUES
        ('Chopper',1),('Scooter',2),('Racing',3),('Naked',4),
        ('Touring',5),('Cross/Enduro',6),('Cub',7),('Maxi Scooter',8)
        ON CONFLICT (ad) DO NOTHING
      `);
      console.log('Varsayılan vitrin segmentleri oluşturuldu');
    }

    // Migration: vitrin_urunleri tablosuna benzersiz ilan_no (sıra no) ekle
    await client.query(`CREATE SEQUENCE IF NOT EXISTS vitrin_ilan_no_seq START 1;`);
    await client.query(`ALTER TABLE vitrin_urunleri ADD COLUMN IF NOT EXISTS ilan_no INTEGER;`);
    await client.query(`UPDATE vitrin_urunleri SET ilan_no = nextval('vitrin_ilan_no_seq') WHERE ilan_no IS NULL;`);
    await client.query(`ALTER TABLE vitrin_urunleri ALTER COLUMN ilan_no SET DEFAULT nextval('vitrin_ilan_no_seq');`);

    // Migration: vitrin ürünleri için yüklenebilir video desteği (YouTube yerine kendi videon)
    //  - Video ayrı tabloda (vitrin_videolar) base64 olarak tutulur; ürün/list sorguları videoyu yüklemez.
    //  - Oynatma sırasında HTTP Range (kısmi içerik) ile parça parça gönderilir → kasmaz, ileri/geri sarılabilir.
    await client.query(`
      CREATE TABLE IF NOT EXISTS vitrin_videolar (
        id SERIAL PRIMARY KEY,
        urun_id INTEGER REFERENCES vitrin_urunleri(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        mime VARCHAR(60),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_vitrin_video_urun ON vitrin_videolar(urun_id);`);
    await client.query(`ALTER TABLE vitrin_urunleri ADD COLUMN IF NOT EXISTS video_dosya_id INTEGER;`);

    // Migration: vitrin ilanını stok motoruna bağla + öne çıkarma + manuel Rubik ödeme linki
    await client.query(`ALTER TABLE vitrin_urunleri ADD COLUMN IF NOT EXISTS stok_motor_id INTEGER;`);
    await client.query(`ALTER TABLE vitrin_urunleri ADD COLUMN IF NOT EXISTS one_cikan BOOLEAN DEFAULT FALSE;`);
    await client.query(`ALTER TABLE vitrin_urunleri ADD COLUMN IF NOT EXISTS rubik_link TEXT;`);

    // Migration: hizmet kategorileri (bakım/servis, nakliye, sigorta) için hizmet sayfası — resim + başlık
    await client.query(`ALTER TABLE vitrin_kategori_iletisim ADD COLUMN IF NOT EXISTS gorsel TEXT;`);
    await client.query(`ALTER TABLE vitrin_kategori_iletisim ADD COLUMN IF NOT EXISTS baslik VARCHAR(255);`);

    // Migration: ikinci_el_motorlar tablosuna parçalı ödeme dağılımı (JSON) ekle
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS odeme_detaylari TEXT;`);

    // Migration: motor eklerken opsiyonel vitrin/site bilgileri (taslak) — vitrine alırken otomatik dolar
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS vitrin_baslik TEXT;`);
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS vitrin_aciklama TEXT;`);
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS vitrin_segment VARCHAR(50);`);
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS vitrin_cc INTEGER;`);
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS vitrin_fiyat DECIMAL(12,2);`);
    // Migration: hasar kaydı (ilan özelliği) — motor stok taslağı ve vitrin ilanı
    await client.query(`ALTER TABLE ikinci_el_motorlar ADD COLUMN IF NOT EXISTS vitrin_hasar TEXT;`);
    await client.query(`ALTER TABLE vitrin_urunleri ADD COLUMN IF NOT EXISTS hasar_kaydi TEXT;`);

    console.log('Tüm tablolar başarıyla oluşturuldu/kontrol edildi');
  } catch (error) {
    console.error('Veritabanı başlatma hatası:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { initializeDatabase };
