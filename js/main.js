// Header scroll shadow
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  header.classList.toggle('is-scrolled', window.scrollY > 20);
}, { passive: true });

// Mobile nav toggle
const navToggle = document.getElementById('nav-toggle');
const mainNav = document.getElementById('main-nav');

navToggle.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('is-open');
  navToggle.classList.toggle('is-open', isOpen);
  navToggle.setAttribute('aria-expanded', String(isOpen));
});

mainNav.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('is-open');
    navToggle.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// FAQ accordion
document.querySelectorAll('.faq-item').forEach((item) => {
  const question = item.querySelector('.faq-question');
  question.addEventListener('click', () => {
    const isOpen = item.classList.toggle('is-open');
    question.setAttribute('aria-expanded', String(isOpen));
  });
});

// Mobile fixed CTA bar: show after 50% viewport scroll, hide while contact section is in view
const mobileCtaBar = document.getElementById('mobile-cta-bar');
if (mobileCtaBar) {
  let contactInView = false;

  const updateBarVisibility = () => {
    const pastThreshold = window.scrollY > window.innerHeight * 0.5;
    mobileCtaBar.classList.toggle('is-visible', pastThreshold && !contactInView);
    mobileCtaBar.setAttribute('aria-hidden', String(!(pastThreshold && !contactInView)));
  };

  window.addEventListener('scroll', updateBarVisibility, { passive: true });

  const contactSection = document.getElementById('contact');
  if (contactSection && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      contactInView = entries[0].isIntersecting;
      updateBarVisibility();
    }, { threshold: 0.15 });
    observer.observe(contactSection);
  }

  updateBarVisibility();
}

// Contact form: realtime validation + loading state + submit
const form = document.getElementById('contact-form');
const formNote = document.getElementById('form-note');
const submitBtn = document.getElementById('contact-submit');

const errorMessages = {
  name: 'お名前をご入力ください。',
  email: 'メールアドレスを正しい形式でご入力ください。',
  message: 'ご相談内容をご入力ください。',
};

function validateField(field) {
  const errorEl = form.querySelector(`[data-error-for="${field.name}"]`);
  const isValid = field.checkValidity();
  field.classList.toggle('is-invalid', !isValid);
  if (errorEl) {
    errorEl.textContent = isValid ? '' : (errorMessages[field.name] || '入力内容をご確認ください。');
  }
  return isValid;
}

['name', 'email', 'message'].forEach((fieldName) => {
  const field = form.elements[fieldName];
  if (!field) return;
  field.addEventListener('blur', () => validateField(field));
  field.addEventListener('input', () => {
    if (field.classList.contains('is-invalid')) validateField(field);
  });
});

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const requiredFields = ['name', 'email', 'message'].map((n) => form.elements[n]);
  const allValid = requiredFields.map(validateField).every(Boolean);

  if (!allValid) {
    formNote.textContent = '未入力・入力エラーの項目をご確認ください。';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.classList.add('is-loading');
  formNote.textContent = '送信中です…';

  // Front-end only demo — no backend wired up yet
  setTimeout(() => {
    submitBtn.disabled = false;
    submitBtn.classList.remove('is-loading');
    formNote.textContent = 'お問い合わせありがとうございます。1営業日以内に担当者よりご連絡いたします。';
    form.reset();
  }, 700);
});

// Sub-CTA mini forms (non-pushy email capture)
document.querySelectorAll('[data-subcta]').forEach((subForm) => {
  subForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const emailInput = subForm.querySelector('input[type="email"]');
    const note = subForm.querySelector('[data-subcta-note]');
    if (!emailInput.checkValidity()) {
      note.textContent = 'メールアドレスをご確認ください。';
      return;
    }
    note.textContent = 'ありがとうございます。非公開物件リストをお送りします。';
    subForm.reset();
  });
});
