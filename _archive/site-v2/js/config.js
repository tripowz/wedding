/* ============================================================
   НАСТРОЙКИ ПРИГЛАШЕНИЯ
   Всё, что нужно поменять перед свадьбой, находится здесь.
   Значения ниже — заглушки для теста.
   ============================================================ */

window.WEDDING = {
  // Имена (одинаковые для обоих языков; при желании впишите разные)
  groom: { uz: "Bekzod", ru: "Бекзод" },
  bride: { uz: "Ferangiz", ru: "Ферангиз" },
  initials: "B & F",

  // Дата и время начала (часовой пояс Ташкента +05:00)
  date: "2026-11-11T18:00:00+05:00",
  // До какого числа ждём ответ
  rsvpDeadline: "2026-11-08",

  // Подпись от семей
  hosts: {
    uz: "Hurmat bilan, Sharipovlar oilasi",
    ru: "С уважением, семья Шариповых",
  },

  // Место проведения
  venue: {
    name: { uz: "«Sofinur Hall» to'yxonasi", ru: "Банкетный зал «Sofinur Hall»" },
    address: {
      uz: "Buxoro sh., Olim Xo'jayev mahallasi",
      ru: "г. Бухара, махалля Олим Хужаев",
    },
    lat: 39.747671,
    lon: 64.440440,
    links: {
      yandex: "https://yandex.uz/maps/org/sofinur/140107761974/",
      google: "https://www.google.com/maps/place/Sofinur+restaurant/data=!4m2!3m1!1s0x0:0xa8ba088174483f02",
      twogis: "https://2gis.uz/bukhara/firm/70000001082694001",
    },
  },

  // Программа дня
  program: [
    { time: "17:30", uz: "Mehmonlarni kutib olish", ru: "Встреча гостей",
      note: { uz: "Welcome-zona va jonli musiqa", ru: "Welcome-зона и живая музыка" } },
    { time: "18:00", uz: "Kelin-kuyovning kirib kelishi", ru: "Выход молодых",
      note: { uz: "Yor-yor sadolari ostida", ru: "Под звуки «Ёр-ёр»" } },
    { time: "18:30", uz: "Tantanali qism", ru: "Торжественная часть",
      note: { uz: "Tabriklar va duolar", ru: "Поздравления и благословения" } },
    { time: "20:00", uz: "Bayram kechasi", ru: "Праздничный вечер",
      note: { uz: "Raqslar, lazgi va karnay-surnay", ru: "Танцы, лазги и карнай-сурнай" } },
    { time: "22:30", uz: "To'y yakuni", ru: "Завершение вечера",
      note: { uz: "Umumiy surat va xayrlashuv", ru: "Общее фото и прощание" } },
  ],

  // Правила свадьбы (icon: clock | rings | cake | note | phone | piyola)
  rules: [
    { icon: "clock",
      title: { uz: "Kechikmang", ru: "Не опаздывайте" },
      text: {
        uz: "Kelin-kuyovning kirib kelishi — kechaning eng chiroyli lahzasi. Kechikkanlar uni faqat qo'shnisining storisida ko'radi.",
        ru: "Выход молодых — самый красивый момент вечера. Опоздавшие увидят его только в сторис у соседа по столу.",
      } },
    { icon: "rings",
      title: { uz: "Birinchi raqs — faqat ikkimizniki", ru: "Первый танец — только наш" },
      text: {
        uz: "Vals paytida kichkintoylarni yoningizda ushlab turing. Keyin raqs maydoni butunlay ularniki — va'da beramiz!",
        ru: "Во время вальса, пожалуйста, придержите маленьких гостей рядом с собой. Потом танцпол полностью их — обещаем!",
      } },
    { icon: "note",
      title: { uz: "Raqs — majburiy", ru: "Танцевать — обязательно" },
      text: {
        uz: "Lazgi, «Yor-yor» va DJ qo'ygan hamma narsa. Uyalish mumkin emas: fotografimiz hammasini ko'rib turibdi.",
        ru: "Лазги, «Ёр-ёр» и всё, что включит диджей. Стесняться нельзя: фотограф всё видит.",
      } },
    { icon: "piyola",
      title: { uz: "Tabriklar — qisqa va samimiy", ru: "Тосты — короткие и от души" },
      text: {
        uz: "Sizni juda yaxshi ko'ramiz, lekin osh soviyapti. Ideal tabrik — ikki daqiqagacha.",
        ru: "Мы вас очень любим, но плов остывает. Идеальный тост — до двух минут.",
      } },
    { icon: "phone",
      title: { uz: "Telefon — cho'ntakda", ru: "Телефон — в кармане" },
      text: {
        uz: "Tantanali qismni fotografga ishonib, o'zingiz shunchaki biz bilan bo'ling. Eng yaxshi suratlarni keyin hammaga yuboramiz.",
        ru: "Доверьте съёмку фотографу, а сами просто будьте с нами. Лучшие кадры потом пришлём всем.",
      } },
    { icon: "cake",
      title: { uz: "Erta ketmang", ru: "Не уходите рано" },
      text: {
        uz: "Eng qiziqarlisi — oxirida: tort, umumiy raqs va umumiy surat. Erta ketsangiz, tarixga ham, suratga ham tushmay qolasiz.",
        ru: "Самое интересное — в конце: торт, общий танец и общее фото. Уйдёте раньше — не попадёте ни в историю, ни в кадр.",
      } },
  ],

  // Фото (пока стоковые с Unsplash; потом замените на свои, например "assets/photos/1.jpg")
  photos: {
    // Hero раскрывается на весь экран — лучше горизонтальный или широкий кадр
    hero: "https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=1600&q=80&auto=format&fit=crop",
    hands: "https://images.unsplash.com/photo-1520854221256-17451cc331bf?w=1400&q=80&auto=format&fit=crop",
    venue: "https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1400&q=80&auto=format&fit=crop",
    gallery: [
      "https://images.unsplash.com/photo-1494955870715-979ca4f13bf0?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1545232979-8bf68ee9b1af?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1532712938310-34cb3982ef74?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1525258946800-98cfd641d0de?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1460978812857-470ed1c77af0?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1529636798458-92182e662485?w=800&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?w=800&q=80&auto=format&fit=crop",
    ],
  },

  // Фоновая музыка: «Over and Over». Положите файл в assets/music.mp3
  music: "assets/music.mp3",
  // С какой секунды начинать. 8.5 — прямо перед словами «Over and over». 0 — с начала
  musicStart: 8.5,

  // URL веб-приложения Google Apps Script (см. README.md).
  // Пока пусто — форма работает в тестовом режиме и ничего не отправляет.
  rsvpEndpoint: "",
};

/* ============================================================
   ТЕКСТЫ
   ============================================================ */
window.I18N = {
  uz: {
    "intro.kicker": "Taklifnoma",
    "intro.for": "Siz uchun maxsus",
    "intro.open": "Taklifnomani ochish",
    "intro.hold": "Muhrni bosib turing",
    "intro.holdMore": "Biroz uzoqroq bosib turing",
    "city": "Buxoro",
    "hero.overlayKicker": "Taklifnoma",
    "hero.overlay": "Hayotimizdagi eng baxtli kunda biz bilan bo'ling",
    "count.hint": "Halqalarni aylantirib ko'ring",
    "gallery.drag": "Aylantiring",
    "venue.scratch": "Barmog'ingiz bilan arting",
    "rsvp.hold": "Yuborish uchun muhrni bosib turing",
    "sochqi.title": "To'yning eng shirin odati",
    "sochqi.btn": "Sochqi sochish",
    "sochqi.again": "Yana!",
    "hero.kicker": "Nikoh to'yi",
    "hero.scroll": "Pastga suring",
    "invite.title": "Aziz mehmonimiz!",
    "invite.text":
      "Hayotimizdagi eng baxtli kun — nikoh to'yimizga sizni taklif etishdan mamnunmiz. Ushbu quvonchli onlarni siz bilan birga nishonlash biz uchun katta sharaf.",
    "count.title": "To'yimizgacha qoldi",
    "count.days": "kun",
    "count.hours": "soat",
    "count.minutes": "daqiqa",
    "count.seconds": "soniya",
    "count.done": "Bugun bizning to'yimiz!",
    "date.title": "Sana",
    "program.title": "To'y dasturi",
    "rules.kicker": "Bir nechta kichik iltimos",
    "rules.title": "To'yimiz qoidalari",
    "rules.agree": "Qoidalarga roziman",
    "rules.agreed": "Kelishdik! Ko'rishguncha",
    "gallery.title": "Bizning lahzalar",
    "gallery.hint": "Suring",
    "venue.title": "Manzil",
    "venue.route": "Yo'nalishni ko'rish",
    "rsvp.title": "Tashrifingizni tasdiqlang",
    "rsvp.sub": "Iltimos, {date}gacha javob bering",
    "rsvp.name": "Ismingiz va familiyangiz",
    "rsvp.attend": "To'yga kela olasizmi?",
    "rsvp.yes": "Albatta kelaman",
    "rsvp.no": "Afsuski, kela olmayman",
    "rsvp.guests": "Mehmonlar soni (siz bilan)",
    "rsvp.side": "Qaysi tomondan?",
    "rsvp.groomSide": "Kuyov tomondan",
    "rsvp.brideSide": "Kelin tomondan",
    "rsvp.message": "Yoshlarga tilaklaringiz",
    "rsvp.send": "Yuborish",
    "rsvp.sending": "Yuborilmoqda…",
    "rsvp.thanks": "Rahmat!",
    "rsvp.thanksText": "Javobingiz qabul qilindi. Sizni intizorlik bilan kutamiz!",
    "rsvp.thanksNo": "Javobingiz uchun rahmat. Duolaringiz biz bilan!",
    "rsvp.again": "Javobni o'zgartirish",
    "rsvp.error": "Yuborishda xatolik. Iltimos, qayta urinib ko'ring.",
    "rsvp.required": "Iltimos, ismingizni kiriting",
    "footer.wait": "Sizni intizorlik bilan kutamiz",
    "music.on": "Musiqa",
    weekdays: ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"],
    weekdaysLong: ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"],
    months: ["Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun", "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"],
    monthsGen: ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
  },
  ru: {
    "intro.kicker": "Приглашение",
    "intro.for": "Лично для вас",
    "intro.open": "Открыть приглашение",
    "intro.hold": "Зажмите печать",
    "intro.holdMore": "Подержите чуть дольше",
    "city": "Бухара",
    "hero.overlayKicker": "Приглашение",
    "hero.overlay": "Будьте с нами в самый счастливый день нашей жизни",
    "count.hint": "Покрутите кольца пальцем",
    "gallery.drag": "Крутите",
    "venue.scratch": "Потрите пальцем",
    "rsvp.hold": "Зажмите печать, чтобы отправить",
    "sochqi.title": "Самая сладкая традиция свадьбы",
    "sochqi.btn": "Осыпать сочки",
    "sochqi.again": "Ещё!",
    "hero.kicker": "Свадьба",
    "hero.scroll": "Листайте вниз",
    "invite.title": "Дорогие гости!",
    "invite.text":
      "С радостью приглашаем вас разделить с нами самый счастливый день нашей жизни — день нашей свадьбы. Для нас будет большой честью отпраздновать его вместе с вами.",
    "count.title": "До нашей свадьбы",
    "count.days": "дней",
    "count.hours": "часов",
    "count.minutes": "минут",
    "count.seconds": "секунд",
    "count.done": "Сегодня наша свадьба!",
    "date.title": "Дата",
    "program.title": "Программа дня",
    "rules.kicker": "Несколько маленьких просьб",
    "rules.title": "Правила нашей свадьбы",
    "rules.agree": "С правилами согласен(на)",
    "rules.agreed": "Договорились! До встречи",
    "gallery.title": "Наши моменты",
    "gallery.hint": "Листайте",
    "venue.title": "Место проведения",
    "venue.route": "Построить маршрут",
    "rsvp.title": "Подтвердите присутствие",
    "rsvp.sub": "Пожалуйста, ответьте до {date}",
    "rsvp.name": "Ваше имя и фамилия",
    "rsvp.attend": "Сможете ли вы прийти?",
    "rsvp.yes": "Обязательно приду",
    "rsvp.no": "К сожалению, не смогу",
    "rsvp.guests": "Количество гостей (включая вас)",
    "rsvp.side": "С чьей стороны?",
    "rsvp.groomSide": "Со стороны жениха",
    "rsvp.brideSide": "Со стороны невесты",
    "rsvp.message": "Пожелания молодым",
    "rsvp.send": "Отправить",
    "rsvp.sending": "Отправляем…",
    "rsvp.thanks": "Спасибо!",
    "rsvp.thanksText": "Ваш ответ получен. С нетерпением ждём вас!",
    "rsvp.thanksNo": "Спасибо за ответ. Будем рады вашим пожеланиям!",
    "rsvp.again": "Изменить ответ",
    "rsvp.error": "Не удалось отправить. Попробуйте ещё раз.",
    "rsvp.required": "Пожалуйста, укажите имя",
    "footer.wait": "С нетерпением ждём вас",
    "music.on": "Музыка",
    weekdays: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
    weekdaysLong: ["Воскресенье", "Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота"],
    months: ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
    monthsGen: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
  },
};
