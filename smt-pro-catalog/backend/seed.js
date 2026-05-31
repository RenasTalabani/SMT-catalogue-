// Seed script — run with: node seed.js
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb://127.0.0.1:27018/smt-catalog';

// Picsum gives real photos by seed (no API key needed)
const img = (seed, w = 800, h = 600) => ({
  url: `https://picsum.photos/seed/${seed}/${w}/${h}`,
  publicId: `seed_${seed}`,
  isPrimary: true,
});

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // ── Clear existing products ────────────────────────────────────────────
  await db.collection('products').deleteMany({});
  console.log('Cleared existing products');

  // ── Get category IDs ──────────────────────────────────────────────────
  const cats = await db.collection('categories').find({}).toArray();
  const catId = (name) => {
    const c = cats.find(c => c.name?.en?.toLowerCase().includes(name.toLowerCase()));
    return c ? c._id : cats[0]._id;
  };

  const beautyId = catId('beauty');
  const medicalId = catId('medical');
  const electronicsId = catId('electronics');
  const clothingId = catId('clothing');
  const homeId = catId('home');
  const sportsId = catId('sports');
  const slugify = (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now();

  const products = [
    // ── LASER HAIR REMOVAL ─────────────────────────────────────────────
    {
      name: { en: 'Professional IPL Laser Hair Removal Device', ar: 'جهاز إزالة الشعر بالليزر IPL الاحترافي', ku: 'ئامێری پیشەیی لێزەری لابردنی مو IPL' },
      description: { en: 'FDA-cleared IPL device with 9 energy levels. Suitable for face and body. Permanent hair reduction in 3–4 weeks. Skin tone sensor for safe use.', ar: 'جهاز IPL معتمد من FDA بـ 9 مستويات طاقة. مناسب للوجه والجسم.' },
      price: 189.99, comparePrice: 249.99,
      category: beautyId,
      images: [img('laser1'), img('laser2'), img('laser3')],
      tags: ['laser', 'ipl', 'hair removal', 'beauty'],
      isActive: true, isFeatured: true, stock: 25,
      slug: slugify('professional-ipl-laser-hair-removal'),
    },
    {
      name: { en: 'Diode Laser 808nm Hair Removal Machine', ar: 'جهاز إزالة الشعر بليزر الدايود 808nm', ku: 'ئامێری لابردنی موی لێزەری دایۆد 808nm' },
      description: { en: 'Salon-grade 808nm diode laser. 10 million flashes lifespan. Cooling system for pain-free treatment. Handles all skin types I–VI.', ar: 'ليزر ديود بدرجة صالون 808nm. عمر 10 مليون فلاش.' },
      price: 1299.00, comparePrice: 1599.00,
      category: beautyId,
      images: [img('laserdiode1'), img('laserdiode2')],
      tags: ['diode laser', '808nm', 'salon', 'hair removal'],
      isActive: true, isFeatured: true, stock: 8,
      slug: slugify('diode-laser-808nm'),
    },
    {
      name: { en: 'Portable IPL Hair Removal Handset', ar: 'جهاز IPL المحمول لإزالة الشعر', ku: 'ئامێری IPL بچووک بۆ لابردنی مو' },
      description: { en: 'Compact handheld IPL for home use. 300,000 flashes. 5 intensity levels. Gentle on sensitive skin.', ar: 'جهاز IPL محمول للاستخدام المنزلي. 300,000 ومضة.' },
      price: 79.99, comparePrice: 119.99,
      category: beautyId,
      images: [img('portableipl'), img('portableipl2')],
      tags: ['ipl', 'portable', 'home use', 'hair removal'],
      isActive: true, isFeatured: false, stock: 42,
      slug: slugify('portable-ipl-handset'),
    },
    {
      name: { en: 'Nd:YAG Laser Hair & Tattoo Removal System', ar: 'نظام إزالة الشعر والوشم بليزر Nd:YAG', ku: 'سیستەمی لابردنی مو و تاتوو بە لێزەری Nd:YAG' },
      description: { en: 'Dual-wavelength 1064/532nm Nd:YAG laser. Effective on dark hair and tattoo removal. Used in professional clinics worldwide.', ar: 'ليزر Nd:YAG ثنائي الطول الموجي 1064/532nm.' },
      price: 3500.00, comparePrice: 4200.00,
      category: beautyId,
      images: [img('ndyag1'), img('ndyag2'), img('ndyag3')],
      tags: ['nd:yag', 'tattoo removal', 'hair removal', 'clinic'],
      isActive: true, isFeatured: true, stock: 4,
      slug: slugify('ndyag-laser-system'),
    },
    {
      name: { en: 'Laser Cooling Gel — 500ml', ar: 'جل التبريد للليزر 500 مل', ku: 'جێلی ساردکردنەوەی لێزەر ٥٠٠ مل' },
      description: { en: 'Professional cooling gel for use before and after laser treatments. Soothes and protects skin. Aloe vera formula.', ar: 'جل تبريد احترافي للاستخدام قبل وبعد علاجات الليزر.' },
      price: 12.99, comparePrice: 18.00,
      category: beautyId,
      images: [img('coolinggel1')],
      tags: ['gel', 'cooling', 'laser', 'aftercare'],
      isActive: true, isFeatured: false, stock: 120,
      slug: slugify('laser-cooling-gel-500ml'),
    },

    // ── MEDICAL EQUIPMENT ─────────────────────────────────────────────
    {
      name: { en: 'Digital Stethoscope with Bluetooth', ar: 'سماعة طبية رقمية بالبلوتوث', ku: 'گوێگری پزیشکی دیجیتاڵ بە بلووتووس' },
      description: { en: 'Amplified digital stethoscope with 40x amplification. Bluetooth connectivity to record and share heart/lung sounds. Noise cancellation.', ar: 'سماعة طبية رقمية مكبرة بتكبير 40x. اتصال بلوتوث لتسجيل الأصوات.' },
      price: 249.99, comparePrice: 320.00,
      category: medicalId,
      images: [img('stethoscope1'), img('stethoscope2')],
      tags: ['stethoscope', 'bluetooth', 'cardiology', 'doctor'],
      isActive: true, isFeatured: true, stock: 30,
      slug: slugify('digital-stethoscope-bluetooth'),
    },
    {
      name: { en: 'Automatic Blood Pressure Monitor', ar: 'جهاز قياس ضغط الدم الأوتوماتيكي', ku: 'ئامێری خۆکاری پێوانی تانسیۆنی خوێن' },
      description: { en: 'Upper arm blood pressure monitor. WHO classification indicator. 60-reading memory with date/time. Detects irregular heartbeat.', ar: 'جهاز قياس ضغط الدم للذراع العلوي. مؤشر تصنيف WHO.' },
      price: 45.00, comparePrice: 65.00,
      category: medicalId,
      images: [img('bpmonitor1'), img('bpmonitor2')],
      tags: ['blood pressure', 'monitor', 'heart', 'medical'],
      isActive: true, isFeatured: false, stock: 55,
      slug: slugify('automatic-bp-monitor'),
    },
    {
      name: { en: 'Portable Ultrasound Scanner', ar: 'جهاز الموجات فوق الصوتية المحمول', ku: 'ئامێری ئۆلتراسەوندی پۆرتابل' },
      description: { en: 'Handheld wireless ultrasound scanner compatible with iOS and Android. 128-element linear transducer. Used in ER, clinic and point-of-care.', ar: 'ماسح موجات فوق صوتية لاسلكي محمول متوافق مع iOS وAndroid.' },
      price: 2799.00, comparePrice: 3500.00,
      category: medicalId,
      images: [img('ultrasound1'), img('ultrasound2'), img('ultrasound3')],
      tags: ['ultrasound', 'scanner', 'radiology', 'portable'],
      isActive: true, isFeatured: true, stock: 6,
      slug: slugify('portable-ultrasound-scanner'),
    },
    {
      name: { en: 'Surgical LED Examination Light', ar: 'مصباح الفحص الجراحي LED', ku: 'چراغی پشکنینی نەشتەرگەری LED' },
      description: { en: 'Mobile LED surgical light. 160,000 lux intensity. 5000K color temperature. Shadow-free illumination for operating tables and exam rooms.', ar: 'مصباح ليد جراحي متنقل. شدة 160,000 لوكس.' },
      price: 890.00, comparePrice: 1100.00,
      category: medicalId,
      images: [img('surgicallight1'), img('surgicallight2')],
      tags: ['surgical light', 'LED', 'operating room', 'medical'],
      isActive: true, isFeatured: false, stock: 10,
      slug: slugify('surgical-led-exam-light'),
    },
    {
      name: { en: 'Digital Thermometer Infrared', ar: 'مقياس حرارة رقمي بالأشعة تحت الحمراء', ku: 'گەرمپێوی دیجیتاڵی ئینفرارید' },
      description: { en: 'Non-contact forehead thermometer. 1-second reading. Memory for last 32 readings. Fever alarm. Suitable for all ages.', ar: 'مقياس حرارة للجبهة غير تلامسي. قراءة في ثانية واحدة.' },
      price: 18.99, comparePrice: 29.99,
      category: medicalId,
      images: [img('thermometer1')],
      tags: ['thermometer', 'infrared', 'fever', 'contactless'],
      isActive: true, isFeatured: false, stock: 200,
      slug: slugify('digital-infrared-thermometer'),
    },
    {
      name: { en: 'Pulse Oximeter Fingertip', ar: 'جهاز قياس الأكسجين بالأصبع', ku: 'ئامێری پێوانی ئۆکسیجین بە پەنجە' },
      description: { en: 'Accurate SpO2 and pulse rate monitor. OLED display. Auto power-off. Low battery indicator. Medical grade accuracy ±2%.', ar: 'جهاز دقيق لقياس SpO2 ومعدل النبض.' },
      price: 22.50, comparePrice: 35.00,
      category: medicalId,
      images: [img('oximeter1'), img('oximeter2')],
      tags: ['oximeter', 'spo2', 'pulse', 'medical'],
      isActive: true, isFeatured: false, stock: 85,
      slug: slugify('fingertip-pulse-oximeter'),
    },
    {
      name: { en: 'Medical Latex Gloves — Box of 100', ar: 'قفازات طبية لاتكس — علبة 100 قطعة', ku: 'دەستکێشی پزیشکی لاتێکس — قوتوویەکی ١٠٠' },
      description: { en: 'Powder-free latex examination gloves. Size M. FDA and CE certified. Excellent tactile sensitivity for medical procedures.', ar: 'قفازات فحص لاتكس خالية من البودرة. مقاس M.' },
      price: 14.99,
      category: medicalId,
      images: [img('gloves1')],
      tags: ['gloves', 'latex', 'disposable', 'medical'],
      isActive: true, isFeatured: false, stock: 500,
      slug: slugify('latex-gloves-box-100'),
    },

    // ── ELECTRONICS ───────────────────────────────────────────────────
    {
      name: { en: 'Wireless Noise-Cancelling Headphones', ar: 'سماعات لاسلكية بإلغاء الضوضاء', ku: 'گوێگری بێتەل بە دەنگکوژینەوە' },
      description: { en: 'Over-ear wireless headphones. 30-hour battery life. Active noise cancellation. Hi-Res Audio certified. Foldable design.', ar: 'سماعات لاسلكية فوق الأذن. عمر بطارية 30 ساعة.' },
      price: 149.99, comparePrice: 199.99,
      category: electronicsId,
      images: [img('headphones1'), img('headphones2')],
      tags: ['headphones', 'wireless', 'noise cancelling', 'audio'],
      isActive: true, isFeatured: true, stock: 40,
      slug: slugify('wireless-noise-cancelling-headphones'),
    },
    {
      name: { en: '4K Action Camera Waterproof', ar: 'كاميرا أكشن 4K مقاومة للماء', ku: 'کامێرای ئەکشن 4K ئاوپێچ' },
      description: { en: '4K 60fps action camera. Waterproof to 40m. 6-axis stabilization. 170° wide angle. Remote control included.', ar: 'كاميرا أكشن 4K بـ 60 إطار/ثانية. مقاومة للماء حتى 40 متر.' },
      price: 89.99, comparePrice: 120.00,
      category: electronicsId,
      images: [img('actioncam1'), img('actioncam2')],
      tags: ['camera', '4k', 'waterproof', 'action'],
      isActive: true, isFeatured: false, stock: 22,
      slug: slugify('4k-action-camera-waterproof'),
    },
    {
      name: { en: 'Smart Watch Fitness Tracker', ar: 'ساعة ذكية لتتبع اللياقة', ku: 'ساتەی زیرەک بۆ شوێنکەوتنی تەندروستی' },
      description: { en: 'AMOLED display smartwatch. Heart rate, SpO2, sleep tracking. 7-day battery. IP68 waterproof. 100+ sport modes.', ar: 'ساعة ذكية بشاشة AMOLED. تتبع معدل ضربات القلب والنوم.' },
      price: 59.99, comparePrice: 89.99,
      category: electronicsId,
      images: [img('smartwatch1'), img('smartwatch2'), img('smartwatch3')],
      tags: ['smartwatch', 'fitness', 'heart rate', 'wearable'],
      isActive: true, isFeatured: true, stock: 60,
      slug: slugify('smart-watch-fitness-tracker'),
    },

    // ── CLOTHING ─────────────────────────────────────────────────────
    {
      name: { en: 'Medical Scrub Set — Unisex', ar: 'طقم سكراب طبي للجنسين', ku: 'جلی پزیشکی سکراب — هەر دوو ڕەگەز' },
      description: { en: 'Comfortable V-neck scrub top and pants. 65% polyester, 35% cotton. Anti-wrinkle, easy care. Available in blue, green, and white.', ar: 'قميص سكراب برقبة V وبنطلون مريح. 65% بوليستر، 35% قطن.' },
      price: 34.99, comparePrice: 49.99,
      category: clothingId,
      images: [img('scrubs1'), img('scrubs2')],
      tags: ['scrubs', 'medical', 'uniform', 'doctor', 'nurse'],
      isActive: true, isFeatured: true, stock: 75,
      slug: slugify('medical-scrub-set-unisex'),
    },
    {
      name: { en: 'Lab Coat White — Doctor', ar: 'معطف مختبر أبيض للأطباء', ku: 'کۆتی سپی لابراتواری بۆ پزیشکان' },
      description: { en: 'Classic white lab coat for doctors. 100% cotton. Knee-length. Three front pockets with ID badge holder. Machine washable.', ar: 'معطف مختبر أبيض كلاسيكي للأطباء. 100% قطن. طول الركبة.' },
      price: 42.00, comparePrice: 60.00,
      category: clothingId,
      images: [img('labcoat1'), img('labcoat2')],
      tags: ['lab coat', 'doctor', 'white coat', 'medical uniform'],
      isActive: true, isFeatured: false, stock: 50,
      slug: slugify('white-lab-coat-doctor'),
    },

    // ── HOME & LIVING ─────────────────────────────────────────────────
    {
      name: { en: 'Air Purifier HEPA H13 Filter', ar: 'منقي هواء بفلتر HEPA H13', ku: 'پاککەرەوەی هەوا فیلتەری HEPA H13' },
      description: { en: 'True HEPA H13 air purifier. Removes 99.97% of particles. Covers 500 sq ft. 3 fan speeds. Quiet night mode. Air quality sensor.', ar: 'منقي هواء HEPA H13 حقيقي. يزيل 99.97% من الجسيمات.' },
      price: 119.99, comparePrice: 159.99,
      category: homeId,
      images: [img('airpurifier1'), img('airpurifier2')],
      tags: ['air purifier', 'hepa', 'clean air', 'health'],
      isActive: true, isFeatured: false, stock: 18,
      slug: slugify('air-purifier-hepa-h13'),
    },

    // ── SPORTS ───────────────────────────────────────────────────────
    {
      name: { en: 'Adjustable Dumbbell Set 5–52.5 lbs', ar: 'طقم دمبل قابل للضبط 5–52.5 رطل', ku: 'سێتی دومبێلی میزانکراو ٥–٥٢.٥ پاوند' },
      description: { en: 'SelectTech adjustable dumbbells replace 15 sets of weights. Weight range 5–52.5 lbs each. Turn dial to adjust. Storage tray included.', ar: 'دمبل SelectTech يحل محل 15 مجموعة أثقال. نطاق 5–52.5 رطل.' },
      price: 299.00, comparePrice: 399.00,
      category: sportsId,
      images: [img('dumbbells1'), img('dumbbells2')],
      tags: ['dumbbell', 'fitness', 'gym', 'weights'],
      isActive: true, isFeatured: false, stock: 15,
      slug: slugify('adjustable-dumbbell-set'),
    },
  ];

  // Insert all products
  const result = await db.collection('products').insertMany(products);
  console.log(`✅ Inserted ${result.insertedCount} products successfully!`);

  await mongoose.disconnect();
  console.log('Done!');
}

seed().catch(e => { console.error(e); process.exit(1); });
