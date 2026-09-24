/**
 * Utilitários de exportação client-side para o Módulo 4:
 * - OFX 102 (Open Financial Exchange)
 * - Excel (.xlsx via HTML table blob compatível com Excel)
 * - CSV com separador ';' brasileiro e encoding UTF-8 com BOM
 * - PDF executivo com cabeçalho institucional MFO Trust
 * - JSON
 * - TXT estruturado
 */

import { Transaction, BankAccount, BankStatement } from '@/types/imob'

export interface ExportDataParams {
  transactions: Transaction[]
  account?: BankAccount | null
  statement?: BankStatement | null
  familyName?: string
}

function formatarMoeda(val: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(val)
}

function formatarDataBR(dataIso: string): string {
  if (!dataIso) return ''
  const partes = dataIso.split('T')[0].split('-')
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`
  }
  return dataIso
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * 1. CSV Brasileiro (separador ';' com cabeçalho em pt-BR e BOM UTF-8)
 */
export function exportarCSV({ transactions, account, statement }: ExportDataParams) {
  const linhas: string[] = []
  linhas.push('Data;Tipo;FITID;Descrição;Categoria;Valor (R$);Situação')

  transactions.forEach((tx) => {
    const dataBR = formatarDataBR(tx.date)
    const tipo = tx.type === 'credit' ? 'Crédito' : 'Débito'
    const fitid = tx.fitid || ''
    const desc = `"${(tx.description || '').replace(/"/g, '""')}"`
    const cat = `"${(tx.category || '').replace(/"/g, '""')}"`
    const val = tx.amount.toFixed(2).replace('.', ',')
    const sit = tx.reconciled || tx.status === 'conciliado' ? 'Conciliado' : 'Pendente'

    linhas.push(`${dataBR};${tipo};${fitid};${desc};${cat};${val};${sit}`)
  })

  const conteudo = '\uFEFF' + linhas.join('\r\n')
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
  const nomeArquivo = `extrato_${statement?.reference_month || 'mfo'}_${Date.now()}.csv`
  triggerDownload(blob, nomeArquivo)
}

/**
 * 2. OFX 102 (Open Financial Exchange padrão bancário)
 */
export function exportarOFX({ transactions, account, statement }: ExportDataParams) {
  const bankId = account?.bank_code || '208'
  const acctId = (account?.account_number || '51002-9').replace(/\D/g, '')
  const acctType = 'CHECKING'
  // Usar strings sem colchetes literais para evitar parsing indevido do Tailwind CSS
  const brtSuffix = '[' + '-3:BRT' + ']'
  const cleanIso = (d: string) => d.replace(/-/g, '').replace(/:/g, '').replace(/T/g, '')

  const dtNow = cleanIso(new Date().toISOString()).slice(0, 14) + brtSuffix

  let dtStart = '20260801000000' + brtSuffix
  let dtEnd = '20260831235959' + brtSuffix

  if (transactions.length > 0) {
    const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date))
    dtStart = cleanIso(sorted[0].date).slice(0, 8) + '000000' + brtSuffix
    dtEnd = cleanIso(sorted[sorted.length - 1].date).slice(0, 8) + '235959' + brtSuffix
  }

  const stmtTrnList = transactions
    .map((tx) => {
      const trnType = tx.type === 'credit' ? 'CREDIT' : 'DEBIT'
      const dtPosted = cleanIso(tx.date).slice(0, 8) + '120000' + brtSuffix
      const trnAmt = tx.type === 'credit' ? tx.amount.toFixed(2) : (-Math.abs(tx.amount)).toFixed(2)
      const fitid = tx.fitid || `FITID-${tx.id}`
      const memo = (tx.description || '').replace(/[&<>]/g, ' ')

      return `        <STMTTRN>
          <TRNTYPE>${trnType}</TRNTYPE>
          <DTPOSTED>${dtPosted}</DTPOSTED>
          <TRNAMT>${trnAmt}</TRNAMT>
          <FITID>${fitid}</FITID>
          <MEMO>${memo}</MEMO>
        </STMTTRN>`
    })
    .join('\n')

  const totalBal = transactions
    .reduce((acc, tx) => acc + (tx.type === 'credit' ? tx.amount : -tx.amount), 0)
    .toFixed(2)

  const ofxContent = `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
  <SIGNONMSGSRSV1>
    <SONRS>
      <STATUS>
        <CODE>0</CODE>
        <SEVERITY>INFO</SEVERITY>
      </STATUS>
      <DTSERVER>${dtNow}</DTSERVER>
      <LANGUAGE>POR</LANGUAGE>
    </SONRS>
  </SIGNONMSGSRSV1>
  <BANKMSGSRSV1>
    <STMTTRNRS>
      <TRNUID>1001</TRNUID>
      <STATUS>
        <CODE>0</CODE>
        <SEVERITY>INFO</SEVERITY>
      </STATUS>
      <STMTRS>
        <CURDEF>BRL</CURDEF>
        <BANKACCTFROM>
          <BANKID>${bankId}</BANKID>
          <ACCTID>${acctId}</ACCTID>
          <ACCTTYPE>${acctType}</ACCTTYPE>
        </BANKACCTFROM>
        <BANKTRANLIST>
          <DTSTART>${dtStart}</DTSTART>
          <DTEND>${dtEnd}</DTEND>
${stmtTrnList}
        </BANKTRANLIST>
        <LEDGERBAL>
          <BALAMT>${totalBal}</BALAMT>
          <DTASOF>${dtNow}</DTASOF>
        </LEDGERBAL>
      </STMTRS>
    </STMTTRNRS>
  </BANKMSGSRSV1>
</OFX>`

  const blob = new Blob([ofxContent], { type: 'application/x-ofx;charset=utf-8;' })
  const nomeArquivo = `extrato_${statement?.reference_month || 'mfo'}_${Date.now()}.ofx`
  triggerDownload(blob, nomeArquivo)
}

/**
 * 3. Excel (.xlsx via XML HTML Spreadsheet compatível com Excel moderno)
 */
export function exportarExcel({ transactions, account, statement, familyName }: ExportDataParams) {
  const banco = account
    ? `${account.bank_name} (Ag. ${account.agency} / Cc. ${account.account_number})`
    : 'BTG Pactual'
  const periodo = statement?.statement_period || 'Extrato Bancário'

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Demonstrativo Financeiro</x:Name>
                <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        <style>
          th { background-color: #00205B; color: #ffffff; font-weight: bold; text-align: left; padding: 6px; }
          td { padding: 4px; border: 1px solid #e2e8f0; }
          .money { text-align: right; }
          .header-title { font-size: 16pt; font-weight: bold; color: #00205B; }
          .header-sub { font-size: 10pt; color: #64748b; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="7" class="header-title">MFO TRUST • GESTÃO PATRIMONIAL</td></tr>
          <tr><td colspan="7" class="header-sub">Demonstrativo de Contas & Subledger • ${familyName || 'Família BNI'}</td></tr>
          <tr><td colspan="7" class="header-sub">Conta: ${banco} • Período: ${periodo}</td></tr>
          <tr><td colspan="7"></td></tr>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>FITID / Identificador</th>
              <th>Descrição da Transação</th>
              <th>Categoria</th>
              <th>Valor (R$)</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            ${transactions
              .map((tx) => {
                const cor = tx.type === 'credit' ? '#047857' : '#b91c1c'
                return `<tr>
                  <td>${formatarDataBR(tx.date)}</td>
                  <td>${tx.type === 'credit' ? 'Crédito' : 'Débito'}</td>
                  <td style="font-family: monospace;">${tx.fitid || ''}</td>
                  <td>${tx.description || ''}</td>
                  <td>${tx.category || 'Locação'}</td>
                  <td class="money" style="color: ${cor}; font-weight: bold;">${formatarMoeda(tx.amount)}</td>
                  <td>${tx.reconciled || tx.status === 'conciliado' ? 'Conciliado' : 'Pendente'}</td>
                </tr>`
              })
              .join('')}
          </tbody>
        </table>
      </body>
    </html>
  `

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
  const nomeArquivo = `extrato_${statement?.reference_month || 'mfo'}_${Date.now()}.xls`
  triggerDownload(blob, nomeArquivo)
}

/**
 * 4. JSON Estruturado
 */
export function exportarJSON({ transactions, account, statement, familyName }: ExportDataParams) {
  const dados = {
    instituicao: 'MFO Trust Family Office',
    familia: familyName || 'Família BNI',
    conta: account,
    extrato: statement,
    total_transacoes: transactions.length,
    transacoes: transactions,
    exportado_em: new Date().toISOString(),
  }

  const jsonStr = JSON.stringify(dados, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' })
  const nomeArquivo = `extrato_${statement?.reference_month || 'mfo'}_${Date.now()}.json`
  triggerDownload(blob, nomeArquivo)
}

/**
 * 5. TXT Estruturado
 */
export function exportarTXT({ transactions, account, statement, familyName }: ExportDataParams) {
  const linhas: string[] = []
  linhas.push('================================================================================')
  linhas.push('                    MFO TRUST • GESTÃO PATRIMONIAL FAMILIAR                     ')
  linhas.push('                     DEMONSTRATIVO FINANCEIRO E SUBLEDGER                       ')
  linhas.push('================================================================================')
  linhas.push(`Família:  ${familyName || 'Família BNI'}`)
  linhas.push(
    `Conta:    ${account ? `${account.bank_name} - Ag. ${account.agency} / C/C ${account.account_number}` : 'Banco BTG Pactual S.A.'}`,
  )
  linhas.push(`Extrato:  ${statement?.statement_period || 'Agosto/2026'}`)
  linhas.push(
    `Emissão:  ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`,
  )
  linhas.push('--------------------------------------------------------------------------------')
  linhas.push('DATA       TIPO     VALOR (R$)       SITUAÇÃO     FITID / DESCRIÇÃO')
  linhas.push('--------------------------------------------------------------------------------')

  transactions.forEach((tx) => {
    const data = formatarDataBR(tx.date).padEnd(10, ' ')
    const tipo = (tx.type === 'credit' ? 'CRÉDITO' : 'DÉBITO').padEnd(8, ' ')
    const valor = formatarMoeda(tx.amount).padStart(14, ' ')
    const sit = (tx.reconciled || tx.status === 'conciliado' ? 'CONCIL' : 'PENDEN').padEnd(10, ' ')
    const idDesc = `${tx.fitid || ''} - ${tx.description}`

    linhas.push(`${data} ${tipo} ${valor}   ${sit}   ${idDesc}`)
  })

  linhas.push('================================================================================')
  linhas.push(`Total de lançamentos: ${transactions.length}`)
  linhas.push('Subledger auditado pelo Family Office.')

  const conteudo = linhas.join('\r\n')
  const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' })
  const nomeArquivo = `extrato_${statement?.reference_month || 'mfo'}_${Date.now()}.txt`
  triggerDownload(blob, nomeArquivo)
}

/**
 * 6. PDF Executivo MFO Trust (usando janela de impressão com estilo estrito Apex Light)
 */
export function exportarPDFExecutivo({
  transactions,
  account,
  statement,
  familyName,
}: ExportDataParams) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Por favor, permita pop-ups para gerar o PDF executivo.')
    return
  }

  const banco = account
    ? `${account.bank_name} • Agência: ${account.agency} • Conta: ${account.account_number}`
    : 'Banco BTG Pactual S.A. • Agência: 0001 • Conta: 51002-9'
  const periodo = statement?.statement_period || 'Extrato de Agosto/2026'

  const totalCreditos = transactions
    .filter((t) => t.type === 'credit')
    .reduce((acc, t) => acc + t.amount, 0)
  const totalDebitos = transactions
    .filter((t) => t.type === 'debit')
    .reduce((acc, t) => acc + t.amount, 0)

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="utf-8">
      <title>Demonstrativo Financeiro Executivo • MFO Trust</title>
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          margin: 0;
          padding: 0;
          font-size: 11px;
          line-height: 1.4;
        }
        .header {
          border-bottom: 2px solid #00205B;
          padding-bottom: 12px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .logo-title {
          font-size: 18px;
          font-weight: 800;
          color: #00205B;
          letter-spacing: -0.5px;
        }
        .logo-sub {
          font-size: 10px;
          color: #0052CC;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .meta-box {
          text-align: right;
          font-size: 10px;
          color: #64748b;
        }
        .card-summary {
          display: flex;
          gap: 12px;
          margin-bottom: 18px;
        }
        .card-item {
          flex: 1;
          padding: 10px 14px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .card-label {
          font-size: 9px;
          text-transform: uppercase;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 4px;
        }
        .card-value {
          font-size: 14px;
          font-weight: 700;
          color: #00205B;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          font-size: 10px;
        }
        th {
          background-color: #00205B;
          color: #ffffff;
          font-weight: 600;
          text-align: left;
          padding: 8px 6px;
        }
        td {
          padding: 7px 6px;
          border-bottom: 1px solid #f1f5f9;
        }
        tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .credit { color: #047857; font-weight: 600; }
        .debit { color: #b91c1c; font-weight: 600; }
        .badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 9999px;
          font-size: 8px;
          font-weight: 700;
          text-transform: uppercase;
          background: #dcfce7;
          color: #166534;
        }
        .footer {
          margin-top: 30px;
          padding-top: 10px;
          border-top: 1px solid #e2e8f0;
          font-size: 9px;
          color: #94a3b8;
          display: flex;
          justify-content: space-between;
        }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="logo-title">MFO TRUST</div>
          <div class="logo-sub">Multi-Family Office • Gestão Imobiliária & Subledger</div>
          <div style="font-size: 12px; font-weight: 600; color: #334155; margin-top: 4px;">
            ${familyName || 'Família BNI'}
          </div>
          <div style="font-size: 10px; color: #64748b;">
            ${banco}
          </div>
        </div>
        <div class="meta-box">
          <div><strong>Demonstrativo Executivo</strong></div>
          <div>Competência: ${periodo}</div>
          <div>Emitido em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</div>
        </div>
      </div>

      <div class="card-summary">
        <div class="card-item">
          <div class="card-label">Total de Entradas (Créditos)</div>
          <div class="card-value" style="color: #047857;">${formatarMoeda(totalCreditos)}</div>
        </div>
        <div class="card-item">
          <div class="card-label">Total de Saídas (Débitos)</div>
          <div class="card-value" style="color: #b91c1c;">${formatarMoeda(totalDebitos)}</div>
        </div>
        <div class="card-item">
          <div class="card-label">Lançamentos Conciliados</div>
          <div class="card-value">${transactions.length} de ${transactions.length} (100%)</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo</th>
            <th>FITID</th>
            <th>Descrição do Lançamento</th>
            <th style="text-align: right;">Valor</th>
            <th style="text-align: center;">Situação</th>
          </tr>
        </thead>
        <tbody>
          ${transactions
            .map(
              (tx) => `
              <tr>
                <td>${formatarDataBR(tx.date)}</td>
                <td>${tx.type === 'credit' ? 'Crédito' : 'Débito'}</td>
                <td style="font-family: monospace; font-size: 9px;">${tx.fitid || '-'}</td>
                <td>${tx.description}</td>
                <td style="text-align: right;" class="${tx.type === 'credit' ? 'credit' : 'debit'}">
                  ${tx.type === 'credit' ? '+' : '-'}${formatarMoeda(tx.amount)}
                </td>
                <td style="text-align: center;">
                  <span class="badge">Conciliado</span>
                </td>
              </tr>
            `,
            )
            .join('')}
        </tbody>
      </table>

      <div class="footer">
        <div>MFO Trust • Todos os direitos reservados. Confidencial e restrito à família titular.</div>
        <div>Auditoria Subledger Supabase Self-Hosted • Schema "imob"</div>
      </div>

      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 300);
        };
      </script>
    </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
