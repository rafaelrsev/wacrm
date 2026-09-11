const webpush = require('web-push');

function main() {
  const vapidKeys = webpush.generateVAPIDKeys();

  console.log('\n============================================================');
  console.log('🔑 NOVAS CHAVES VAPID GERADAS PARA WEB PUSH (PWA)');
  console.log('============================================================\n');
  console.log('Copie e adicione/substitua as seguintes linhas no seu arquivo .env (na Hostinger / Servidor):\n');
  console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
  console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
  console.log(`VAPID_SUBJECT=mailto:suporte@rsev.cloud\n`);
  console.log('============================================================\n');
}

main();
