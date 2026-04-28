const { Resend } = require('resend');

const FROM = process.env.MAGIC_LINK_FROM_EMAIL || 'onboarding@resend.dev';

let client = null;
function getClient() {
  if (client) return client;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY não configurada');
  client = new Resend(apiKey);
  return client;
}

function buildHtml(link) {
  return `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0F0D0A;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;">
    <table width="100%" cellspacing="0" cellpadding="0" style="padding:40px 20px;">
      <tr>
        <td align="center">
          <table width="480" cellspacing="0" cellpadding="0" style="background:#1a1612;border-radius:16px;padding:40px;border:1px solid #2a221c;">
            <tr>
              <td align="center" style="padding-bottom:24px;">
                <div style="width:48px;height:2px;background:#d4a259;border-radius:1px;margin-bottom:20px;"></div>
                <h1 style="margin:0;color:#f5f1ea;font-size:22px;font-weight:800;letter-spacing:0.3px;">A. Coraça &amp; T. Carvalho</h1>
                <p style="margin:8px 0 0;color:#a89a85;font-size:13px;">Pinturas e Reformas</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 0;border-top:1px solid #2a221c;">
                <h2 style="margin:0 0 12px;color:#f5f1ea;font-size:18px;font-weight:700;">Seu link de acesso</h2>
                <p style="margin:0 0 24px;color:#a89a85;font-size:14px;line-height:1.6;">
                  Toque no botão abaixo para entrar na sua conta. O link expira em 15 minutos e só pode ser usado uma vez.
                </p>
                <table cellspacing="0" cellpadding="0" width="100%">
                  <tr>
                    <td align="center">
                      <a href="${link}" style="display:inline-block;background:#d4a259;color:#0F0D0A;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:800;font-size:15px;letter-spacing:0.3px;">
                        Entrar agora
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0;color:#6b5e4d;font-size:12px;line-height:1.6;word-break:break-all;">
                  Se o botão não funcionar, copie este link no navegador:<br/>
                  <span style="color:#a89a85;">${link}</span>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding-top:24px;border-top:1px solid #2a221c;">
                <p style="margin:0;color:#6b5e4d;font-size:11px;line-height:1.6;">
                  Você está recebendo este e-mail porque alguém solicitou um link de acesso para esta conta. Se não foi você, ignore esta mensagem.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

exports.sendMagicLinkEmail = async ({ to, link }) => {
  const resend = getClient();
  await resend.emails.send({
    from: FROM,
    to,
    subject: 'Seu link de acesso · A. Coraça & T. Carvalho',
    html: buildHtml(link),
    text: `Seu link de acesso (válido por 15 minutos): ${link}`,
  });
};
