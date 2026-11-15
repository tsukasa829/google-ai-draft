(() => {
  const id = 'google-ai-draft';
  const isAiMode = () => location.pathname === '/ai' ||
    (location.pathname === '/search' && new URLSearchParams(location.search).get('udm') === '50');
  if (!isAiMode() || document.getElementById(id)) return;

  const host = document.createElement('div');
  host.id = id;
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `
    <style>
      :host { position: fixed; right: 16px; bottom: 16px; z-index: 2147483647; color-scheme: light dark; font: 14px system-ui; }
      section { width: min(460px, calc(100vw - 56px)); padding: 12px; border: 1px solid GrayText; border-radius: 12px; background: Canvas; color: CanvasText; box-shadow: 0 4px 24px #0003; }
      textarea { display: block; box-sizing: border-box; width: 100%; margin: 8px 0; padding: 8px; resize: vertical; font: inherit; }
      button { font: inherit; padding: 6px 12px; cursor: pointer; }
      p { margin: 8px 0 0; }
    </style>
    <button type="button" id="open">下書き</button>
    <section hidden aria-label="Google AI モードの下書き">
      <label for="draft">Google AI モードの下書き</label>
      <textarea id="draft" rows="5"></textarea>
      <button type="button" id="send">AI モードに送信</button>
      <button type="button" id="close">閉じる</button>
      <p role="status"></p>
    </section>`;
  document.body.append(host);

  const open = root.querySelector('#open');
  const panel = root.querySelector('section');
  const draft = root.querySelector('#draft');
  const send = root.querySelector('#send');
  const status = root.querySelector('[role="status"]');
  const showPanel = (visible) => {
    panel.hidden = !visible;
    open.hidden = visible;
    (visible ? draft : open).focus();
  };
  open.addEventListener('click', () => showPanel(true));
  root.querySelector('#close').addEventListener('click', () => showPanel(false));
  for (const type of ['keydown', 'keypress', 'keyup']) {
    draft.addEventListener(type, (event) => event.stopPropagation());
  }

  send.addEventListener('click', async () => {
    const text = draft.value;
    if (!text.trim()) return;
    status.textContent = '';
    send.disabled = true;
    try {
      const fields = [...document.querySelectorAll('textarea')].filter((field) =>
        ['質問する', '何でも聞いてください', 'Ask anything', 'Ask a follow-up'].includes(field.getAttribute('aria-label')) &&
        field.getClientRects().length && !field.readOnly && !field.disabled);
      if (!isAiMode() || fields.length !== 1) throw new Error('Google の質問欄を特定できません。');
      const [field] = fields;
      if (field.value && field.value !== text) throw new Error('Google の質問欄に別の文章があります。');
      if (field.maxLength >= 0 && text.length > field.maxLength) throw new Error('Google の質問欄の文字数上限を超えています。');

      field.focus({ preventScroll: true });
      field.select();
      document.execCommand('insertText', false, text);
      if (field.value !== text) throw new Error('質問欄に全文を反映できません。');

      const buttons = () => [...document.querySelectorAll('button[data-xid="input-plate-send-button"]')].filter((button) =>
        ['送信', 'Send', 'Submit'].includes(button.getAttribute('aria-label')) &&
        button.getClientRects().length && !button.disabled && button.getAttribute('aria-disabled') !== 'true');
      let candidates = buttons();
      for (let attempt = 0; candidates.length === 0 && attempt < 10; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        candidates = buttons();
      }
      if (!isAiMode() || !field.isConnected || field.value !== text || candidates.length !== 1) {
        throw new Error('送信ボタンを特定できないか、質問欄が変わりました。');
      }
      candidates[0].click();
      showPanel(false);
      status.textContent = '送信ボタンを押しました。下書きはこのタブに保持しています。';
    } catch (error) {
      status.textContent = `${error.message} 下書きは残っています。`;
    } finally {
      send.disabled = false;
    }
  });
})();
