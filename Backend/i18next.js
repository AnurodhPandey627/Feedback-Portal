// i18n.js
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'locales');
const supported = ['en', 'hi'];
const cache = {};

function loadLocaleFile(lang) {
  if (cache[lang]) return cache[lang];
  const file = path.join(localesDir, `${lang}.json`);
  try {
    const txt = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(txt);
    cache[lang] = parsed;
    return parsed;
  } catch (e) {
    cache[lang] = {};
    return {};
  }
}

function dotGet(obj, key) {
  if (!obj) return undefined;
  return key.split('.').reduce((o, k) => (o && Object.prototype.hasOwnProperty.call(o, k) ? o[k] : undefined), obj);
}

function pickLang(req) {
  // precedence: session.lang -> cookie -> Accept-Language header -> default 'en'
  if (req.session && req.session.lang && supported.includes(req.session.lang)) return req.session.lang;
  if (req.cookies && req.cookies.lang && supported.includes(req.cookies.lang)) return req.cookies.lang;
  // Accept-Language might be like 'hi,en;q=0.8'
  const al = req.headers['accept-language'];
  if (al) {
    if (al.includes('hi')) return 'hi';
    if (al.includes('en')) return 'en';
  }
  return 'en';
}

function i18nMiddleware(req, res, next) {
  const lang = pickLang(req);
  const translations = loadLocaleFile(lang);

  // expose language and t() to templates
  res.locals.lang = lang;
  res.locals.t = function (key, fallbackOrOpts) {
    const v = dotGet(translations, key);
    if (v !== undefined && v !== null) {
      // simple interpolation support for {{name}} tokens if an object passed as second arg
      if (typeof fallbackOrOpts === 'object' && fallbackOrOpts !== null) {
        return v.replace(/{{\s*([^}]+)\s*}}/g, (_, token) => {
          const val = fallbackOrOpts[token];
          return val !== undefined ? String(val) : `{{${token}}}`;
        });
      }
      return v;
    }
    // fallback behavior: use fallback string if provided, else return the key (helps debug)
    if (typeof fallbackOrOpts === 'string') return fallbackOrOpts;
    return key;
  };

  // helpful for client-side initial state if you want to send translations (optional)
  // res.locals.__translations = translations;

  // ensure html lang attribute can be set
  res.locals.htmlLang = lang === 'hi' ? 'hi' : 'en';
  res.locals.req = req;

  next();
}

module.exports = { i18nMiddleware, supported };
