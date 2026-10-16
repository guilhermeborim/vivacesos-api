export interface InviteTemplateData {
  clinicName: string;
  inviterName: string;
  roleLabel: string;
  link: string;
  expiresAt: Date;
}

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatExpiry = (date: Date) =>
  date.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  });

export const inviteSubject = (clinicName: string) =>
  `Você foi convidado para ${clinicName} no Vivace SOS`;

/** E-mail de convite (HTML em tabelas, compatível com os clientes de e-mail). */
export function inviteHtml(data: InviteTemplateData) {
  const clinic = escapeHtml(data.clinicName);
  const inviter = escapeHtml(data.inviterName);
  const role = escapeHtml(data.roleLabel);
  const link = escapeHtml(data.link);
  const expiry = formatExpiry(data.expiresAt);

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f3f3f9;font-family:Arial,Helvetica,sans-serif;color:#495057;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f9;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="background:#6559cc;padding:24px 32px;color:#ffffff;font-size:20px;font-weight:bold;">
                Vivace SOS
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 16px;font-size:20px;color:#212529;">Você recebeu um convite</h1>
                <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
                  <strong>${inviter}</strong> convidou você para participar da clínica
                  <strong>${clinic}</strong> como <strong>${role}</strong>.
                </p>
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;">
                  Clique no botão abaixo para criar seu acesso. Use este mesmo e-mail no cadastro.
                </p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="background:#6559cc;border-radius:6px;">
                      <a href="${link}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;">
                        Aceitar convite
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#878a99;">
                  Este convite é válido por 24 horas (até ${expiry}). Depois disso, peça um novo convite
                  ao administrador da clínica.
                </p>
                <p style="margin:0;font-size:13px;line-height:1.6;color:#878a99;">
                  Se o botão não funcionar, copie e cole este endereço no navegador:<br />
                  <a href="${link}" style="color:#6559cc;word-break:break-all;">${link}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;background:#f8f9fa;font-size:12px;color:#878a99;">
                Se você não esperava este convite, pode ignorar este e-mail com segurança.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function inviteText(data: InviteTemplateData) {
  return [
    `${data.inviterName} convidou você para participar da clínica ${data.clinicName} como ${data.roleLabel}.`,
    '',
    `Aceite o convite (use este mesmo e-mail no cadastro): ${data.link}`,
    '',
    `Este convite é válido por 24 horas (até ${formatExpiry(data.expiresAt)}). Depois disso, peça um novo convite ao administrador da clínica.`,
    '',
    'Se você não esperava este convite, ignore este e-mail.',
  ].join('\n');
}
