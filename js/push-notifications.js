/* =========================================================
   ECHODOME — js/push-notifications.js
   #17 — Web Push para novos lançamentos.
   Expõe PushNotifs.init() e PushNotifs.requestPermission().
   ========================================================= */

const PushNotifs = (() => {

  /* ⚠️  ATENÇÃO: esta é uma VAPID key de EXEMPLO (web-push-codelab).
     Notificações push NÃO funcionarão em produção com ela.
     Gere sua própria key para o domínio real da banda:
       npx web-push generate-vapid-keys
     e substitua o valor abaixo (atualize também a chave privada no servidor). */
  const VAPID_PUBLIC_KEY = 'SUBSTITUA_PELA_SUA_VAPID_PUBLIC_KEY';

  function _urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw     = atob(base64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  let _swReg = null;

  /* Registra o service worker (se ainda não estiver registrado) e guarda referência */
  async function _getSW() {
    if (_swReg) return _swReg;
    if ('serviceWorker' in navigator) {
      _swReg = await navigator.serviceWorker.ready;
      return _swReg;
    }
    return null;
  }

  /* Verifica se o usuário já está inscrito */
  async function isSubscribed() {
    const sw = await _getSW();
    if (!sw) return false;
    const sub = await sw.pushManager.getSubscription();
    return !!sub;
  }

  /* Pede permissão + inscreve no push */
  async function requestPermission() {
    if (!('Notification' in window) || !('PushManager' in window)) {
      _showToast('Notificações não suportadas neste dispositivo.');
      return false;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      _showToast('Permissão negada — você não receberá notificações.');
      return false;
    }

    try {
      const sw  = await _getSW();
      const sub = await sw.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: _urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      /* Aqui você enviaria `sub` para o seu backend (fetch POST) */
      console.log('[Push] Subscribed:', JSON.stringify(sub));
      _showToast('✔ Ativado! Você receberá notificações de novos lançamentos.');
      _updateBtnState(true);
      return true;
    } catch (err) {
      console.warn('[Push] Subscribe failed:', err);
      _showToast('Erro ao ativar notificações. Tente novamente.');
      return false;
    }
  }

  /* Cancela a inscrição */
  async function unsubscribe() {
    const sw  = await _getSW();
    const sub = await sw.pushManager.getSubscription();
    if (sub) { await sub.unsubscribe(); _showToast('Notificações desativadas.'); }
    _updateBtnState(false);
  }

  /* Pequeno toast de feedback */
  function _showToast(msg) {
    let toast = document.getElementById('pushToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id        = 'pushToast';
      toast.className = 'push-toast';
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('visible'), 3500);
  }

  function _updateBtnState(subscribed) {
    const btn = document.getElementById('pushNotifBtn');
    if (!btn) return;
    btn.classList.toggle('is-subscribed', subscribed);
    btn.setAttribute('aria-pressed', subscribed ? 'true' : 'false');
    btn.title = subscribed ? 'Desativar notificações de lançamentos' : 'Receber notificações de novos lançamentos';
    btn.querySelector('.push-btn-label').textContent = subscribed ? 'NOTIFICAÇÕES ON' : 'NOTIFICAR LANÇAMENTOS';
  }

  /* Monta o botão na seção Band */
  function _buildButton() {
    if (document.getElementById('pushNotifBtn')) return;
    const wrap = document.getElementById('bandSocials');
    if (!wrap) return;

    const btn = document.createElement('button');
    btn.id        = 'pushNotifBtn';
    btn.className = 'push-notif-btn';
    btn.setAttribute('aria-pressed', 'false');
    btn.title     = 'Receber notificações de novos lançamentos';
    btn.innerHTML = `
      <span class="push-btn-icon">🔔</span>
      <span class="push-btn-label">NOTIFICAR LANÇAMENTOS</span>
    `;
    btn.addEventListener('click', async () => {
      const subscribed = await isSubscribed();
      if (subscribed) await unsubscribe();
      else await requestPermission();
    });
    wrap.appendChild(btn);
  }

  async function init() {
    if (!('PushManager' in window)) return; /* browser não suporta */
    _buildButton();
    const subscribed = await isSubscribed();
    _updateBtnState(subscribed);
  }

  return { init, requestPermission, unsubscribe, isSubscribed };
})();
