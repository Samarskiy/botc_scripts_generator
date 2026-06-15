/** Shown when the backend has no Anthropic API key configured. */
export function SetupBanner() {
  return (
    <div className="setup-banner">
      <h2>🔑 Потрібно налаштувати API-ключ</h2>
      <p>
        Бекенд не бачить ключа Anthropic, тож генерація не працюватиме. Ключ не входить до
        репозиторію — кожен користувач додає свій власний.
      </p>
      <ol>
        <li>
          Отримайте ключ на{' '}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
            console.anthropic.com/settings/keys
          </a>{' '}
          (потрібен платіжний кредит).
        </li>
        <li>
          У корені проєкту (поруч із <code>package.json</code>) скопіюйте <code>.env.example</code>{' '}
          у <code>.env</code>.
        </li>
        <li>
          Впишіть рядок <code>ANTHROPIC_API_KEY=sk-ant-…</code> у <code>.env</code> та збережіть.
        </li>
        <li>
          Перезапустіть сервер: <code>npm run dev</code>, потім оновіть цю сторінку.
        </li>
      </ol>
      <p className="muted">
        Файл має називатися саме <code>.env</code> (не <code>.env.txt</code>) і лежати в корені, а не
        в <code>server/</code>.
      </p>
    </div>
  );
}
