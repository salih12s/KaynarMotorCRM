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
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(
        `INSERT INTO kullanicilar (kullanici_adi, sifre, plain_sifre, ad_soyad, rol, onay_durumu)
         VALUES ('admin', $1, 'admin123', 'Admin', 'admin', 'onaylandi')`,
        [hashedPassword]
      );
      console.log('Varsayılan admin oluşturuldu (admin / admin123)');
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

    // Migration: aksesuar_stok tablosuna beden ve renk alanları ekle
    await client.query(`ALTER TABLE aksesuar_stok ADD COLUMN IF NOT EXISTS beden VARCHAR(10);`);
    await client.query(`ALTER TABLE aksesuar_stok ADD COLUMN IF NOT EXISTS renk VARCHAR(50);`);

    console.log('Tüm tablolar başarıyla oluşturuldu/kontrol edildi');
  } catch (error) {
    console.error('Veritabanı başlatma hatası:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

module.exports = { initializeDatabase };
