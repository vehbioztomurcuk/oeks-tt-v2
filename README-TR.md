# OEKS Team Tracker

## Genel Bakış
OEKS Team Tracker, uzak çalışan ekiplerin verimlilik ve aktivitesini gerçek zamanlı olarak izlemek için tasarlanmış hafif, düşük kaynak tüketen bir monitörleme çözümüdür. Bu uygulama, personel bilgisayarlarından düzenli aralıklarla ekran görüntüleri alarak bunları merkezi bir yönetim panelinde görüntüler, böylece yöneticilere ekip aktivitesine dair anlık bir bakış sunar.

## Özellikler
- **Gerçek Zamanlı İzleme**: 3 saniyelik aralıklarla otomatik ekran görüntüsü yakalama
- **Merkezi Yönetim Paneli**: Tüm personelin aktivitesini tek bir panelden görüntüleme
- **Personel Filtreleme**: İsim veya departmana göre personeli filtreleme
- **Canlı Görüntüleme Modu**: Seçilen personel için tam ekran, gerçek zamanlı izleme
- **Otomatik Durum Göstergeleri**: Aktif/inaktif personel durumu takibi
- **Koyu Tema Arayüzü**: Göz yorgunluğunu azaltan modern tasarım
- **Yerel Depolama**: Ekran görüntüleri yerel olarak saklanır, bulut gerektirmez
- **Düşük Bant Genişliği Kullanımı**: Optimize edilmiş görüntü boyutları
- **Türkçe Arayüz**: Tamamen Türkçe kullanıcı arayüzü

## Mimari
OEKS Team Tracker, basit ve etkili iki ana bileşenden oluşur:

1. **Personel Uygulaması (`staff_app.py`)**: 
   - Personel bilgisayarlarında çalışır
   - Belirli aralıklarla ekran görüntüleri yakalar
   - WebSocket üzerinden görüntüleri şifreli olarak ana sunucuya iletir
   - Departman ve isim bilgilerini yapılandırma dosyasından alır

2. **Yönetim Sunucusu (`admin_server.py`)**: 
   - Personel uygulamalarından gelen verileri alır ve depolar
   - WebSocket ve HTTP sunucularını birleştirir
   - Web tabanlı bir yönetim paneli sunar
   - Ekran görüntülerini organize eder ve servis eder
   - Personel durumunu takip eder

## Kurulum

### Gereksinimler
- Python 3.8+
- Aşağıdaki Python paketleri:
  - websockets
  - pillow (PIL)
  - mss

### Kurulum Adımları
1. Bu repoyu bilgisayarınıza klonlayın:
   ```
   git clone https://github.com/your-username/oeks-team-tracker.git
   ```

2. Gerekli paketleri yükleyin:
   ```
   pip install websockets pillow mss
   ```

3. Konfigürasyon dosyalarını düzenleyin (detaylar aşağıda verilmiştir)

### Sunucu Kurulumu
1. `admin_config.json` dosyasını düzenleyin:
   ```json
   {
     "api_key": "oeks_secret_key_2024",
     "host": "0.0.0.0",
     "ws_port": 8765,
     "http_port": 8080,
     "screenshots_dir": "screenshots"
   }
   ```

2. Sunucuyu başlatın:
   ```
   python admin_server.py
   ```

### Personel Uygulaması Kurulumu
1. Her personel bilgisayarında `config.json` dosyasını düzenleyin:
   ```json
   {
     "admin_ws_url": "ws://SUNUCU_IP:8765",
     "api_key": "oeks_secret_key_2024",
     "staff_id": "staff_pc_UNIQUE_ID",
     "name": "Personel Adı",
     "division": "Departman",
     "screenshot_interval": 3,
     "jpeg_quality": 30
   }
   ```

2. Personel uygulamasını başlatın:
   ```
   python staff_app.py
   ```

## Kullanım
1. Tarayıcıdan yönetim arayüzüne erişin: `http://SUNUCU_IP:8080`
2. Tüm personelin listesini ve ekran görüntülerini görüntüleyin
3. Personeli ada veya departmana göre filtrelemek için üst kısımdaki filtreleri kullanın
4. Herhangi bir personel kartına tıklayarak canlı görüntüleme moduna geçin
5. Yenileme hızını değiştirmek için sağ üst köşedeki seçeneği kullanın

## Sorun Giderme
- **Bağlantı Sorunları**: Sunucu IP adresinin doğru yapılandırıldığından ve gerekli portların açık olduğundan emin olun
- **Görüntü Görünmüyor**: Ekran görüntülerinin kaydedildiği klasörün mevcut olduğunu ve tarayıcınızda tam yenileme (Ctrl+F5) yaptığınızı kontrol edin
- **WebSocket Hataları**: Güvenlik duvarınızın WebSocket bağlantılarına izin verdiğinden emin olun

## Güvenlik Önlemleri
- API anahtarı her iki konfigürasyon dosyasında da aynı olmalıdır
- Üretim ortamında daha güçlü bir API anahtarı kullanın
- Hassas bilgileri içeren ekran alanlarını izlemekten kaçının
- Mümkün olduğunca yerel ağ üzerinde çalıştırın

## Teknik Detaylar

### Ekran Görüntüsü Yakalama
Ekran görüntüleri, `mss` kütüphanesi kullanılarak yakalanır, boyutu küçültülür ve JPEG formatında sıkıştırılır. Ekran görüntüsü kalitesi ve yakalama aralığı yapılandırılabilir.

### Veri İletimi
İki ana iletişim kanalı kullanılır:
- **WebSocket**: Ekran görüntülerinin gerçek zamanlı iletimi için
- **HTTP**: Web arayüzü ve statik görüntü servisi için

### Veri Depolama
Ekran görüntüleri, timestamp ile adlandırılarak personel kimliğine göre düzenlenmiş klasörlerde saklanır. Her personel için en son ekran görüntüsüne `latest.jpg` üzerinden erişilebilir.

## Gelecek Geliştirmeler
- Otomatik temizleme ve eski ekran görüntülerini arşivleme
- Daha gelişmiş kullanıcı yetkilendirme sistemi
- Personel aktivite raporları ve istatistikler
- Mobil uygulama desteği
- Çoklu dil desteği
- Ekran görüntüsü karşılaştırma ve değişiklik tespiti

## Lisans
Bu yazılım, [lisans bilgisi] altında lisanslanmıştır.

## İletişim
Herhangi bir soru, öneri veya katkı için lütfen iletişime geçin:
- E-posta: [e-posta adresi]
- GitHub: [github profili]

