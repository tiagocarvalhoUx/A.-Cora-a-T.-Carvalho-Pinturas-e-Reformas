/**
 * Adiciona as fotos da Sala de Estar Moderna ao portfólio.
 *
 * Uso:
 *   node scripts/addSalaImages.js
 *
 * Variáveis de ambiente necessárias (ou edite os valores abaixo):
 *   ADMIN_EMAIL    – e-mail do usuário admin
 *   ADMIN_PASSWORD – senha do usuário admin
 *   API_URL        – URL base da API (padrão: Render)
 *   IMAGES_DIR     – pasta onde estão as imagens (padrão: ../frontend/src/image)
 */

require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const FormData = require('form-data');
const axios    = require('axios');

const API_URL   = process.env.API_URL   || 'https://a-cora-a-t-carvalho-pinturas-e-reformas.onrender.com/api';
const EMAIL     = process.env.ADMIN_EMAIL    || '';
const PASSWORD  = process.env.ADMIN_PASSWORD || '';
const IMAGES_DIR = process.env.IMAGES_DIR
  ? path.resolve(process.env.IMAGES_DIR)
  : path.resolve(__dirname, '../../frontend/src/image');

const EXTRA_IMAGES = [
  { file: 'sala_1_antes.png',  field: 'extraBefore' },
  { file: 'sala_1_depois.png', field: 'extraAfter'  },
  { file: 'sala_2_antes.png',  field: 'extraBefore' },
  { file: 'sala_2_depois.png', field: 'extraAfter'  },
  { file: 'sala_4_antes.png',  field: 'extraBefore' },
  { file: 'sala_4_depois.png', field: 'extraAfter'  },
];

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error('❌  Defina ADMIN_EMAIL e ADMIN_PASSWORD como variáveis de ambiente.');
    console.error('   Ex: ADMIN_EMAIL=seu@email.com ADMIN_PASSWORD=suasenha node scripts/addSalaImages.js');
    process.exit(1);
  }

  // 1. Login
  console.log('🔐  Autenticando...');
  const { data: authData } = await axios.post(`${API_URL}/auth/login`, { email: EMAIL, password: PASSWORD });
  const token = authData.token;
  console.log('✅  Autenticado.');

  // 2. Buscar portfólio
  console.log('🔍  Buscando "Sala de Estar Moderna"...');
  const { data: portfolioData } = await axios.get(`${API_URL}/portfolio`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const item = (portfolioData.portfolio || []).find((p) =>
    p.title.toLowerCase().includes('sala de estar moderna')
  );
  if (!item) {
    console.error('❌  Item "Sala de Estar Moderna" não encontrado no portfólio.');
    process.exit(1);
  }
  console.log(`✅  Encontrado: ${item._id} – "${item.title}"`);

  // 3. Montar FormData com as imagens
  const form = new FormData();
  for (const { file, field } of EXTRA_IMAGES) {
    const fullPath = path.join(IMAGES_DIR, file);
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️   Arquivo não encontrado, pulando: ${fullPath}`);
      continue;
    }
    form.append(field, fs.createReadStream(fullPath), file);
    console.log(`📎  ${field}: ${file}`);
  }

  // 4. PATCH no item
  console.log('⬆️   Enviando imagens...');
  const { data: updated } = await axios.patch(`${API_URL}/portfolio/${item._id}`, form, {
    headers: {
      Authorization: `Bearer ${token}`,
      ...form.getHeaders(),
    },
  });
  const extras = updated.item?.extraImages || [];
  console.log(`✅  Concluído! ${extras.length} imagem(ns) extra(s) no item.`);
}

main().catch((err) => {
  console.error('❌  Erro:', err.response?.data || err.message);
  process.exit(1);
});
