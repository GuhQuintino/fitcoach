const puppeteer = require('c:/Users/Gustavo/Desktop/Fitcoach/node_modules/puppeteer');
const fs = require('fs');
const path = require('path');

async function gerarRelatorio() {
  console.log('Gerando Relatório de Auditoria de Segurança em PDF...');
  const htmlPath = path.resolve(__dirname, 'relatorio.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });

  const pdfPath = path.resolve(__dirname, 'relatorio-auditoria-seguranca.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: {
      top: '16mm',
      bottom: '18mm',
      left: '15mm',
      right: '15mm'
    },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div></div>',
    footerTemplate: `
      <div style="font-size: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #94a3b8; width: 100%; display: flex; justify-content: space-between; padding: 0 15mm; border-top: 1px solid #e2e8f0; padding-top: 4px;">
        <span>Relatório de Auditoria de Segurança — Ecossistema GQFit & Fitcoach</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>
    `
  });

  await browser.close();
  console.log('PDF gerado com sucesso em:', pdfPath);

  // Copiar para as outras pastas de docs/security-audit
  const fitcoachPdf = 'c:/Users/Gustavo/Desktop/Fitcoach/docs/security-audit/relatorio-auditoria-seguranca.pdf';
  const questionariosPdf = 'c:/Users/Gustavo/Desktop/Questionários/docs/security-audit/relatorio-auditoria-seguranca.pdf';
  const fitcoachScript = 'c:/Users/Gustavo/Desktop/Fitcoach/docs/security-audit/gerar_relatorio_pdf.js';
  const questionariosScript = 'c:/Users/Gustavo/Desktop/Questionários/docs/security-audit/gerar_relatorio_pdf.js';
  const fitcoachHtml = 'c:/Users/Gustavo/Desktop/Fitcoach/docs/security-audit/relatorio.html';
  const questionariosHtml = 'c:/Users/Gustavo/Desktop/Questionários/docs/security-audit/relatorio.html';

  fs.copyFileSync(pdfPath, fitcoachPdf);
  fs.copyFileSync(pdfPath, questionariosPdf);
  fs.copyFileSync(__filename, fitcoachScript);
  fs.copyFileSync(__filename, questionariosScript);
  fs.copyFileSync(htmlPath, fitcoachHtml);
  fs.copyFileSync(htmlPath, questionariosHtml);
  console.log('Relatórios e scripts sincronizados em todos os 3 repositórios!');
}

gerarRelatorio().catch(console.error);
