document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('#project-form');
  if (!form) return;
  const result = document.querySelector('#form-result');
  const submit = form.querySelector('button[type="submit"]');
  const label = submit.innerHTML;
  let pending = false;
  const showResult = (message, failed = false) => {
    result.textContent = message;
    result.dataset.state = failed ? 'error' : 'success';
    result.hidden = false;
    result.focus();
  };
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (pending) return;
    const name = form.elements.namedItem('name');
    const message = form.elements.namedItem('message');
    name.setCustomValidity(name.value.trim().length >= 2 ? '' : 'Please enter at least two characters.');
    message.setCustomValidity(message.value.trim().length >= 10 ? '' : 'Please add at least 10 meaningful characters.');
    if (!form.reportValidity()) return;
    if (!window.LumaDemo?.enabled) {
      showResult('The local preview is not enabled. Start the supplied demo runtime.', true);
      return;
    }
    pending = true;
    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    submit.textContent = 'Checking your enquiry…';
    result.hidden = true;
    try {
      const response = await fetch(window.LumaDemo.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.LumaDemo.nonce },
        credentials: 'same-origin',
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const payload = await response.json();
      if (!response.ok) {
        const errors = payload.data?.fields || {};
        for (const [key, error] of Object.entries(errors)) {
          const control = form.elements.namedItem(key);
          if (control && 'setCustomValidity' in control) control.setCustomValidity(error);
        }
        showResult(payload.message || 'The preview could not be checked. Please try again.', true);
        return;
      }
      showResult(`Checked by WordPress, ${payload.enquiry.name}. Your enquiry is valid. Demo only: no email was sent and nothing was saved.`);
    } catch {
      showResult('The local server could not be reached. Your text is still here; try again when it is available.', true);
    } finally {
      pending = false;
      submit.disabled = false;
      submit.innerHTML = label;
      form.removeAttribute('aria-busy');
    }
  });
  form.addEventListener('input', event => {
    if ('setCustomValidity' in event.target) event.target.setCustomValidity('');
    result.hidden = true;
  });
});
