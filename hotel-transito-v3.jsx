import { useState } from "react";

// ─── BANCO SIMULADO ─────────────────────────────────────────────────
const SOCIOS_DB = [
  { matricula: "12345", nome: "Carlos Oliveira", cpf: "123.456.789-00", status: "ativo", categoria: "Titular" },
  { matricula: "67890", nome: "Ana Paula Silva", cpf: "987.654.321-00", status: "ativo", categoria: "Titular" },
  { matricula: "11111", nome: "Roberto Mendes", cpf: "111.222.333-44", status: "suspenso", categoria: "Titular" },
];
const ADMIN_DB = [{ login: "admin", senha: "sindipol2025", nome: "Recepção SINDIPOL", email: "recepcao@sindipol.com.br" }];
const RESERVAS_MOCK = [
  { id:"HTT-001", matricula:"12345", hospede:"Carlos Oliveira", email:"carlos@email.com", telefone:"(27) 99999-0001", entrada:"2026-05-15", saida:"2026-05-17", suite:"101", adultos:2, criancas:0, finalidade:"Saúde", status:"confirmada", total:140, sinal:70, checkin:null, checkout:null },
  { id:"HTT-002", matricula:"67890", hospede:"Ana Paula Silva", email:"ana@email.com", telefone:"(27) 99999-0002", entrada:"2026-05-11", saida:"2026-05-12", suite:"102", adultos:1, criancas:1, finalidade:"Trânsito", status:"checkin_feito", total:70, sinal:70, checkin:"14:23", checkout:null },
  { id:"HTT-003", matricula:"12345", hospede:"Carlos Oliveira", email:"carlos@email.com", telefone:"(27) 99999-0001", entrada:"2026-04-10", saida:"2026-04-12", suite:"101", adultos:2, criancas:0, finalidade:"Administrativo", status:"concluida", total:140, sinal:70, checkin:"14:05", checkout:"11:40" },
  { id:"HTT-005", matricula:"44444", hospede:"Marcos Lima", email:"marcos@email.com", telefone:"(27) 99999-0005", entrada:"2026-05-18", saida:"2026-05-19", suite:null, adultos:2, criancas:0, finalidade:"Qualificação", status:"pendente", total:70, sinal:0, checkin:null, checkout:null },
];
const SUITES_MOCK = [
  { id:"101", status:"ocupada", hospede:"Ana Paula Silva", saida:"2026-05-12" },
  { id:"102", status:"livre", hospede:null, saida:null },
  { id:"103", status:"manutencao", hospede:null, saida:null },
];
const PRIORIDADES = [
  { value:"nao_residente", label:"Não residente na cidade-sede" },
  { value:"saude", label:"Compromisso de saúde (consulta/exame)" },
  { value:"administrativo", label:"Assuntos administrativos do Clube" },
  { value:"qualificacao", label:"Qualificação profissional (ACADEPOL/Estande)" },
  { value:"demais", label:"Demais associados/dependentes" },
  { value:"convenio", label:"Convênio/reciprocidade" },
  { value:"convidado", label:"Convidado(a) autorizado(a)" },
];

// ─── UTILS ──────────────────────────────────────────────────────────
const fmt = d => { if(!d) return "—"; const [y,m,day]=d.split("-"); return `${day}/${m}/${y}`; };
const calcD = (e,s) => { if(!e||!s) return 0; return Math.max(0,Math.round((new Date(s)-new Date(e))/86400000)); };
const calcTotal = (d,a,ex) => { let t=d*70; if(a>2) t+=(a-2)*35*d; if(ex) t+=20*d; return t; };
const today = new Date().toISOString().split("T")[0];
const maxDate = new Date(Date.now()+90*86400000).toISOString().split("T")[0];
const fmtCPF = v => { let x=v.replace(/\D/g,"").slice(0,11); return x.replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2"); };
const fmtFone = v => { let x=v.replace(/\D/g,"").slice(0,11); if(x.length<=10) return x.replace(/(\d{2})(\d{4})(\d+)/,"($1) $2-$3"); return x.replace(/(\d{2})(\d{5})(\d+)/,"($1) $2-$3"); };
const isEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

const STATUS_CFG = {
  pendente:      { label:"Pendente",   color:"#ffc260", bg:"rgba(255,194,96,0.12)" },
  confirmada:    { label:"Confirmada", color:"#5bc8ff", bg:"rgba(91,200,255,0.12)" },
  checkin_feito: { label:"Hospedado",  color:"#00c896", bg:"rgba(0,200,150,0.12)" },
  concluida:     { label:"Concluída",  color:"rgba(255,255,255,0.4)", bg:"rgba(255,255,255,0.05)" },
  cancelada:     { label:"Cancelada",  color:"#ff6060", bg:"rgba(255,96,96,0.12)" },
};
const Badge = ({status}) => { const s=STATUS_CFG[status]||STATUS_CFG.pendente; return <span style={{fontSize:11,fontWeight:700,color:s.color,background:s.bg,border:`1px solid ${s.color}40`,borderRadius:20,padding:"3px 10px"}}>{s.label}</span>; };

// ─── EMAIL PREVIEW ───────────────────────────────────────────────────
function EmailPreview({ reserva, usuario, tipo, onClose }) {
  const isAdmin = tipo === "admin";
  const d = calcD(reserva.entrada, reserva.saida);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,overflow:"auto",padding:16,display:"flex",alignItems:"flex-start",justifyContent:"center"}}>
      <div style={{width:"100%",maxWidth:520,background:"#fff",borderRadius:16,overflow:"hidden",margin:"20px 0"}}>
        {/* Email header */}
        <div style={{background: isAdmin ? "#1a3a4a" : "#0d2233",padding:"20px 24px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <p style={{color:"rgba(255,255,255,0.5)",fontSize:11,letterSpacing:1,textTransform:"uppercase",marginBottom:4}}>
              {isAdmin ? "E-mail enviado para: Administração" : `E-mail enviado para: ${usuario.email}`}
            </p>
            <p style={{color:"#fff",fontWeight:700,fontSize:15}}>
              {isAdmin ? `⚡ Nova reserva recebida — ${reserva.id}` : `✅ Sua reserva foi recebida — ${reserva.id}`}
            </p>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:13}}>✕ Fechar</button>
        </div>

        {/* Email body */}
        <div style={{padding:"24px",fontFamily:"Georgia,serif",color:"#1a1a1a",fontSize:14,lineHeight:1.7}}>
          <div style={{textAlign:"center",marginBottom:20}}>
            <div style={{display:"inline-block",background:"#0d2233",color:"#00c896",fontSize:11,fontWeight:700,letterSpacing:2,padding:"4px 14px",borderRadius:20,marginBottom:10}}>SINDIPOL/ES</div>
            <h2 style={{fontFamily:"Georgia,serif",fontSize:22,color:"#0d2233",margin:0}}>Hotel de Trânsito</h2>
          </div>

          {isAdmin ? (
            <>
              <p>Prezada <strong>Administração</strong>,</p>
              <p style={{marginTop:8}}>Uma nova solicitação de reserva foi recebida e aguarda sua aprovação:</p>
            </>
          ) : (
            <>
              <p>Prezado(a) <strong>{usuario.nome}</strong>,</p>
              <p style={{marginTop:8}}>Sua solicitação de reserva foi recebida com sucesso! Aguarde a confirmação da Administração.</p>
            </>
          )}

          {/* Voucher box */}
          <div style={{background:"#f0faf6",border:"2px dashed #00c896",borderRadius:10,padding:"14px 18px",margin:"18px 0",textAlign:"center"}}>
            <p style={{fontSize:11,color:"#666",textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Código da reserva</p>
            <p style={{fontFamily:"monospace",fontSize:26,fontWeight:700,color:"#00a878",letterSpacing:3}}>{reserva.id}</p>
            <p style={{fontSize:11,color:"#888",marginTop:4}}>Apresente este código no check-in</p>
          </div>

          {/* Dados da reserva */}
          <table style={{width:"100%",borderCollapse:"collapse",marginBottom:16}}>
            <tbody>
              {[
                ["Hóspede", usuario.nome],
                ["Matrícula", usuario.matricula],
                ["CPF", usuario.cpf],
                ["E-mail", usuario.email],
                ["Telefone", usuario.telefone],
                ["Check-in", `${fmt(reserva.entrada)} a partir das 14h00`],
                ["Check-out", `${fmt(reserva.saida)} até 12h00`],
                ["Diárias", d],
                ["Adultos", reserva.adultos],
                ["Finalidade", reserva.finalidade],
                ["Prioridade", reserva.prioridade || "—"],
                ["Total estimado", `R$ ${reserva.total.toFixed(2)}`],
                ["Sinal/garantia", `R$ ${Math.min(70,reserva.total).toFixed(2)}`],
              ].map(([k,v]) => (
                <tr key={k} style={{borderBottom:"1px solid #eee"}}>
                  <td style={{padding:"7px 0",color:"#666",fontSize:13,width:"40%"}}>{k}</td>
                  <td style={{padding:"7px 0",fontWeight:600,fontSize:13}}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Dependentes */}
          {reserva.dependentes?.length > 0 && (
            <div style={{background:"#f8f8f8",borderRadius:8,padding:"12px 14px",marginBottom:16}}>
              <p style={{fontWeight:700,fontSize:13,marginBottom:8}}>Acompanhantes:</p>
              {reserva.dependentes.map((dep,i) => (
                <p key={i} style={{fontSize:13,color:"#444",marginBottom:4}}>• {dep.nome} — {dep.vinculo}, {dep.idade} anos</p>
              ))}
            </div>
          )}

          {/* Documentos */}
          {reserva.docs?.length > 0 && (
            <div style={{background:"#f8f8f8",borderRadius:8,padding:"12px 14px",marginBottom:16}}>
              <p style={{fontWeight:700,fontSize:13,marginBottom:6}}>Documentos anexados:</p>
              {reserva.docs.map((doc,i) => <p key={i} style={{fontSize:13,color:"#444"}}>📎 {doc}</p>)}
            </div>
          )}

          {reserva.observacoes && (
            <div style={{background:"#fffbf0",border:"1px solid #ffe0a0",borderRadius:8,padding:"12px 14px",marginBottom:16}}>
              <p style={{fontWeight:700,fontSize:13,marginBottom:4}}>Observações:</p>
              <p style={{fontSize:13,color:"#555"}}>{reserva.observacoes}</p>
            </div>
          )}

          {/* Política */}
          <div style={{background:"#fff8f0",border:"1px solid #ffd0a0",borderRadius:8,padding:"12px 14px",marginBottom:16,fontSize:12,color:"#666"}}>
            <p style={{fontWeight:700,color:"#c07000",marginBottom:4}}>⚠️ Política de cancelamento</p>
            <p>• Cancelamento com 48h: reembolso integral do sinal</p>
            <p>• No-show: retenção de 1 diária</p>
          </div>

          {isAdmin && (
            <div style={{background:"#f0f4ff",border:"1px solid #c0d0ff",borderRadius:8,padding:"12px 14px",marginBottom:16,fontSize:12}}>
              <p style={{fontWeight:700,color:"#3050b0",marginBottom:4}}>📋 Ação necessária</p>
              <p>Acesse o painel administrativo para <strong>aprovar ou recusar</strong> esta reserva.</p>
            </div>
          )}

          <div style={{borderTop:"1px solid #eee",paddingTop:14,fontSize:11,color:"#999",textAlign:"center"}}>
            <p>SINDIPOL/ES — Hotel de Trânsito</p>
            <p>Rodovia Gov. Mário Covas, s/nº — Km 272, Rosário de Fátima, Serra/ES</p>
            <p style={{marginTop:4}}>Tel: (27) 3223-1844 | www.sindipol.com.br</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ESTILOS ─────────────────────────────────────────────────────────
const G = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Playfair+Display:wght@600;700&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Sora',sans-serif;background:#0f1117;color:#f0f0f0;min-height:100vh;}
.screen{max-width:440px;margin:0 auto;padding-bottom:80px;}
.hero-banner{position:relative;height:190px;background:linear-gradient(135deg,#1a3a4a 0%,#0d2233 50%,#162030 100%);overflow:hidden;}
.hero-banner::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 30% 60%,rgba(0,180,140,0.18) 0%,transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(0,120,200,0.15) 0%,transparent 50%);}
.hero-banner::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:40px;background:linear-gradient(to bottom,transparent,#0f1117);}
.hero-content{position:relative;z-index:1;padding:24px 24px 20px;}
.logo-badge{display:inline-block;background:rgba(0,180,140,0.2);border:1px solid rgba(0,180,140,0.4);color:#00c896;font-size:11px;font-weight:600;letter-spacing:2px;padding:4px 12px;border-radius:20px;margin-bottom:10px;}
.hero-title{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:#fff;margin-bottom:4px;}
.hero-sub{color:rgba(255,255,255,0.5);font-size:13px;}
.card{background:#181d27;border:1px solid #252c3a;border-radius:16px;padding:20px;margin:10px 16px;}
.field-label{display:block;font-size:11px;font-weight:600;color:rgba(255,255,255,0.55);letter-spacing:0.5px;margin-bottom:6px;margin-top:14px;text-transform:uppercase;}
.field-label.required::after{content:" *";color:#ff6060;}
.input{width:100%;background:#1f2535;border:1px solid #2a3347;border-radius:10px;color:#f0f0f0;font-family:'Sora',sans-serif;font-size:15px;padding:11px 14px;outline:none;transition:border-color 0.2s;}
.input:focus{border-color:#00c896;}
.input.err{border-color:#ff6060;}
.input:disabled{opacity:0.4;}
select.input{cursor:pointer;} select.input option{background:#1f2535;}
input[type=date]::-webkit-calendar-picker-indicator{filter:invert(0.6);}
textarea.input{resize:vertical;min-height:72px;}
.input-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.input-row-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
.btn-primary{display:block;width:calc(100% - 32px);margin:10px 16px;background:linear-gradient(135deg,#00c896,#00a878);color:#000;font-family:'Sora',sans-serif;font-size:15px;font-weight:700;border:none;border-radius:12px;padding:15px;cursor:pointer;transition:all 0.2s;}
.btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 8px 24px rgba(0,200,150,0.3);}
.btn-primary:disabled{opacity:0.35;cursor:not-allowed;}
.btn-secondary{display:block;width:calc(100% - 32px);margin:10px 16px;background:transparent;color:#00c896;font-family:'Sora',sans-serif;font-size:15px;font-weight:600;border:1px solid #00c896;border-radius:12px;padding:13px;cursor:pointer;}
.btn-sm{font-family:'Sora',sans-serif;font-size:12px;font-weight:600;border-radius:8px;padding:7px 14px;cursor:pointer;border:none;}
.btn-sm.green{background:rgba(0,200,150,0.15);color:#00c896;border:1px solid rgba(0,200,150,0.3);}
.btn-sm.blue{background:rgba(91,200,255,0.12);color:#5bc8ff;border:1px solid rgba(91,200,255,0.25);}
.btn-sm.red{background:rgba(255,96,96,0.1);color:#ff6060;border:1px solid rgba(255,96,96,0.25);}
.btn-sm.gray{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.5);border:1px solid rgba(255,255,255,0.12);}
.back-btn{background:#1f2535;border:1px solid #2a3347;color:#f0f0f0;font-size:22px;width:40px;height:40px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.step-header{display:flex;align-items:center;gap:14px;padding:14px 16px 0;}
.step-num{font-size:11px;color:#00c896;font-weight:600;letter-spacing:1px;text-transform:uppercase;}
.step-name{font-size:17px;font-weight:700;}
.progress-bar{height:3px;background:#1f2535;margin:10px 16px 0;border-radius:2px;overflow:hidden;}
.progress-fill{height:100%;background:linear-gradient(90deg,#00c896,#00a878);border-radius:2px;transition:width 0.4s;}
.section-title{font-family:'Playfair Display',serif;font-size:21px;font-weight:700;margin-bottom:4px;}
.section-desc{font-size:13px;color:rgba(255,255,255,0.5);margin-bottom:2px;}
.subsection{font-size:14px;font-weight:600;margin-bottom:10px;}
.hint{font-size:11px;color:rgba(255,255,255,0.35);margin-top:5px;}
.field-err{font-size:11px;color:#ff6060;margin-top:4px;}
.alert-info{font-size:12px;color:#5bc8ff;background:rgba(91,200,255,0.08);border:1px solid rgba(91,200,255,0.2);border-radius:8px;padding:8px 12px;margin-top:10px;}
.alert-warn{font-size:12px;color:#ffc260;background:rgba(255,194,96,0.08);border:1px solid rgba(255,194,96,0.2);border-radius:8px;padding:8px 12px;margin-top:10px;}
.radio-item{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid #1f2535;cursor:pointer;font-size:14px;}
.radio-item:last-child{border-bottom:none;}
.radio-item input{accent-color:#00c896;width:16px;height:16px;}
.checkbox-item{display:flex;align-items:flex-start;gap:10px;padding:9px 0;border-bottom:1px solid #1f2535;cursor:pointer;font-size:13px;line-height:1.5;color:rgba(255,255,255,0.75);}
.checkbox-item:last-child{border-bottom:none;}
.checkbox-item input{accent-color:#00c896;width:16px;height:16px;flex-shrink:0;margin-top:2px;}
.counter-item{display:flex;justify-content:space-between;align-items:center;padding:11px 0;border-bottom:1px solid #1f2535;}
.counter-label{font-size:14px;font-weight:500;}
.counter-sub{font-size:11px;color:rgba(255,255,255,0.4);margin-top:2px;}
.counter-ctrl{display:flex;align-items:center;gap:14px;}
.counter-btn{width:30px;height:30px;background:#1f2535;border:1px solid #2a3347;color:#f0f0f0;font-size:17px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;}
.counter-val{font-size:16px;font-weight:600;min-width:18px;text-align:center;}
.dep-card{background:#1a2030;border:1px solid #252d3d;border-radius:12px;padding:14px;margin-bottom:10px;}
.section-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.add-btn{background:rgba(0,200,150,0.1);border:1px solid rgba(0,200,150,0.3);color:#00c896;font-family:'Sora',sans-serif;font-size:12px;font-weight:600;padding:5px 12px;border-radius:20px;cursor:pointer;}
.remove-btn{background:rgba(255,80,80,0.1);border:1px solid rgba(255,80,80,0.3);color:#ff6060;font-size:11px;padding:4px 10px;border-radius:20px;cursor:pointer;}
.valor-linha{display:flex;justify-content:space-between;font-size:13px;color:rgba(255,255,255,0.65);padding:7px 0;border-bottom:1px solid #1f2535;}
.valor-linha.total{font-size:16px;font-weight:700;color:#fff;border-bottom:none;margin-top:4px;}
.valor-linha.sinal{font-size:13px;color:#00c896;font-weight:600;border-bottom:none;}
.status-banner{display:flex;align-items:center;gap:14px;padding:16px 20px;margin:14px 16px;border-radius:14px;background:linear-gradient(135deg,#0d2a1f,#102218);border:1px solid #1a4a30;}
.status-icon{width:38px;height:38px;background:#00c896;color:#000;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;flex-shrink:0;}
.option-btn{display:flex;align-items:center;gap:14px;width:100%;background:#1f2535;border:1px solid #2a3347;border-radius:12px;padding:15px;cursor:pointer;text-align:left;color:#f0f0f0;margin-bottom:10px;transition:all 0.2s;}
.option-btn:hover{background:#252d40;border-color:#00c896;}
.option-arrow{margin-left:auto;font-size:22px;color:rgba(255,255,255,0.3);}
.info-card{background:rgba(0,120,80,0.08);border-color:rgba(0,200,150,0.15);}
.info-list{padding-left:16px;} .info-list li{font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:4px;}
.aviso-card{background:rgba(255,160,0,0.05);border-color:rgba(255,160,0,0.2);}
.aviso-title{font-size:13px;font-weight:600;color:#ffc260;margin-bottom:6px;}
.conf-linha{display:flex;justify-content:space-between;font-size:13px;padding:8px 0;border-bottom:1px solid #1f2535;}
.conf-linha:last-child{border-bottom:none;}
.conf-key{color:rgba(255,255,255,0.5);}
.conf-val{font-weight:600;text-align:right;max-width:60%;}
.voucher-code{font-family:monospace;font-size:26px;font-weight:700;color:#00c896;letter-spacing:3px;background:rgba(0,200,150,0.08);border:2px dashed rgba(0,200,150,0.3);border-radius:12px;padding:14px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:5px;}
.resumo-datas{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.data-label{font-size:10px;color:#00c896;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;}
.data-val{font-size:21px;font-weight:700;margin:3px 0 2px;}
.data-hora{font-size:12px;color:rgba(255,255,255,0.5);}
.upload-box{border:2px dashed #2a3347;border-radius:10px;padding:14px;text-align:center;cursor:pointer;transition:border-color 0.2s;margin-top:8px;}
.upload-box:hover{border-color:#00c896;}
.upload-box.has-file{border-color:rgba(0,200,150,0.5);background:rgba(0,200,150,0.06);}
.file-chip{display:inline-flex;align-items:center;gap:6px;background:rgba(0,200,150,0.1);border:1px solid rgba(0,200,150,0.3);border-radius:20px;padding:4px 12px;font-size:12px;color:#00c896;margin-top:6px;}
.admin-header{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:#111520;border-bottom:1px solid #1e2535;position:sticky;top:0;z-index:10;}
.admin-body{flex:1;overflow-y:auto;padding:18px 20px;}
.admin-tabs{display:flex;gap:4px;background:#111520;padding:4px;border-radius:12px;margin-bottom:18px;}
.tab{flex:1;padding:9px 4px;border:none;background:transparent;color:rgba(255,255,255,0.4);font-family:'Sora',sans-serif;font-size:12px;font-weight:600;border-radius:10px;cursor:pointer;transition:all 0.2s;}
.tab.active{background:#1e2840;color:#fff;}
.stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:18px;}
.stat-card{background:#111520;border:1px solid #1e2535;border-radius:14px;padding:14px;}
.stat-val{font-size:26px;font-weight:700;margin-bottom:2px;}
.stat-label{font-size:11px;color:rgba(255,255,255,0.4);}
.admin-reserva{background:#111520;border:1px solid #1e2535;border-radius:14px;padding:14px;margin-bottom:10px;}
.admin-reserva-nome{font-size:14px;font-weight:600;margin-bottom:2px;}
.admin-reserva-id{font-size:11px;color:rgba(255,255,255,0.35);letter-spacing:1px;}
.admin-info-item{font-size:11px;color:rgba(255,255,255,0.45);}
.admin-info-item span{display:block;font-size:13px;font-weight:600;color:#f0f0f0;margin-top:1px;}
.admin-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;}
.suite-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px;}
.suite-card{background:#111520;border:1px solid #1e2535;border-radius:12px;padding:12px;text-align:center;}
.log-item{display:flex;gap:12px;padding:9px 0;border-bottom:1px solid #1e2535;}
.log-item:last-child{border-bottom:none;}
.log-hora{font-size:11px;color:rgba(255,255,255,0.3);white-space:nowrap;margin-top:2px;}
.section-label{font-size:11px;font-weight:700;color:rgba(255,255,255,0.35);letter-spacing:1.5px;text-transform:uppercase;margin:14px 0 8px;}
.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:100;display:flex;align-items:flex-end;justify-content:center;}
.modal{background:#181d27;border:1px solid #252c3a;border-radius:20px 20px 0 0;padding:22px;width:100%;max-width:440px;max-height:80vh;overflow-y:auto;}
.modal-title{font-size:17px;font-weight:700;margin-bottom:14px;}
.empty-state{text-align:center;padding:32px 20px;color:rgba(255,255,255,0.3);}
.reserva-card{background:#181d27;border:1px solid #252c3a;border-radius:14px;padding:15px;margin:8px 16px;}
`;

// ─── FIELD com validação ─────────────────────────────────────────────
function Field({ label, required, error, children }) {
  return (
    <div>
      <label className={`field-label${required?" required":""}`}>{label}</label>
      {children}
      {error && <p className="field-err">⚠ {error}</p>}
    </div>
  );
}

// ─── UPLOAD ──────────────────────────────────────────────────────────
function UploadField({ label, required, value, onChange, accept="*" }) {
  return (
    <div>
      <label className={`field-label${required?" required":""}`}>{label}</label>
      <label className={`upload-box${value?" has-file":""}`}>
        <input type="file" accept={accept} style={{display:"none"}} onChange={e=>onChange(e.target.files[0]?.name||null)}/>
        {value
          ? <span className="file-chip">📎 {value}</span>
          : <p style={{fontSize:13,color:"rgba(255,255,255,0.4)"}}>Toque para anexar arquivo</p>
        }
      </label>
    </div>
  );
}

// ─── GUEST LOGIN ─────────────────────────────────────────────────────
function GuestLogin({ onLogin }) {
  const [f, setF] = useState({ mat:"", nome:"", cpf:"" });
  const [erros, setErros] = useState({});

  function handle() {
    const e = {};
    if (!f.mat) e.mat = "Informe sua matrícula";
    if (!f.nome) e.nome = "Informe seu nome";
    if (!f.cpf || f.cpf.replace(/\D/g,"").length < 11) e.cpf = "CPF inválido";
    setErros(e);
    if (Object.keys(e).length) return;
    const socio = SOCIOS_DB.find(s => s.matricula === f.mat);
    if (!socio) { setErros({mat:"Matrícula não encontrada."}); return; }
    if (socio.nome.toLowerCase().trim() !== f.nome.toLowerCase().trim()) { setErros({nome:"Nome não corresponde à matrícula."}); return; }
    if (socio.status === "suspenso") { setErros({mat:"Associado suspenso. Procure a Administração."}); return; }
    onLogin({ ...socio, nome: f.nome.trim() });
  }

  return (
    <div className="screen">
      <div className="hero-banner">
        <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 30% 60%,rgba(0,180,140,0.18) 0%,transparent 60%)"}}/>
        <div style={{position:"absolute",bottom:-1,left:0,right:0,height:40,background:"linear-gradient(to bottom,transparent,#0f1117)"}}/>
        <div className="hero-content">
          <div className="logo-badge">SINDIPOL/ES</div>
          <h1 className="hero-title">Hotel de Trânsito</h1>
          <p className="hero-sub">Reservas para associados e dependentes</p>
        </div>
      </div>
      <div className="card" style={{marginTop:-20}}>
        <h2 className="section-title">Identificação</h2>
        <p className="section-desc">Informe seus dados para verificar elegibilidade</p>
        <Field label="Nº de Matrícula" required error={erros.mat}>
          <input className={`input${erros.mat?" err":""}`} placeholder="Ex: 12345" value={f.mat} onChange={e=>setF({...f,mat:e.target.value})}/>
        </Field>
        <Field label="Nome completo" required error={erros.nome}>
          <input className={`input${erros.nome?" err":""}`} placeholder="Seu nome completo" value={f.nome} onChange={e=>setF({...f,nome:e.target.value})}/>
        </Field>
        <Field label="CPF" required error={erros.cpf}>
          <input className={`input${erros.cpf?" err":""}`} placeholder="000.000.000-00" value={f.cpf} onChange={e=>setF({...f,cpf:fmtCPF(e.target.value)})}/>
        </Field>
        <div style={{height:6}}/>
        <button className="btn-primary" onClick={handle}>Verificar elegibilidade →</button>
        <p className="hint" style={{textAlign:"center"}}>Teste: matrícula 12345, nome Carlos Oliveira</p>
      </div>
    </div>
  );
}

// ─── GUEST HOME ───────────────────────────────────────────────────────
function GuestHome({ usuario, onNova, onMinhas, onLogout }) {
  return (
    <div className="screen">
      <div className="status-banner">
        <div className="status-icon">✓</div>
        <div>
          <p style={{fontSize:11,color:"#00c896",fontWeight:600,letterSpacing:1,textTransform:"uppercase"}}>Elegibilidade confirmada</p>
          <p style={{fontSize:16,fontWeight:600,color:"#fff",margin:"2px 0"}}>{usuario.nome}</p>
          <p style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>Mat. {usuario.matricula} · {usuario.categoria} · Ativo</p>
        </div>
      </div>
      <div className="card">
        <h2 className="section-title" style={{marginBottom:14}}>O que deseja?</h2>
        <button className="option-btn" onClick={onNova}>
          <span style={{fontSize:22}}>🛎</span>
          <div><p style={{fontSize:15,fontWeight:600,marginBottom:2}}>Nova reserva</p><p style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>Agendar sua estadia</p></div>
          <span className="option-arrow">›</span>
        </button>
        <button className="option-btn" onClick={onMinhas}>
          <span style={{fontSize:22}}>📋</span>
          <div><p style={{fontSize:15,fontWeight:600,marginBottom:2}}>Minhas reservas</p><p style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>Ver, alterar ou cancelar</p></div>
          <span className="option-arrow">›</span>
        </button>
      </div>
      <div className="card info-card">
        <p style={{fontSize:13,fontWeight:600,color:"#00c896",marginBottom:8}}>📌 Lembrete</p>
        <ul className="info-list">
          <li>Check-in a partir das 14h / Check-out até 12h</li>
          <li>Máximo 3 diárias (prorrogável com justificativa)</li>
          <li>Cancele com 48h de antecedência para reembolso</li>
        </ul>
      </div>
      <button className="btn-secondary" onClick={onLogout}>Sair</button>
    </div>
  );
}

// ─── STEP 1: IDENTIFICAÇÃO COMPLETA ──────────────────────────────────
function Step1({ form, setForm, onNext, onBack }) {
  const [erros, setErros] = useState({});
  function validate() {
    const e = {};
    if (!form.email || !isEmail(form.email)) e.email = "E-mail inválido";
    if (!form.telefone || form.telefone.replace(/\D/g,"").length < 10) e.telefone = "Telefone inválido";
    if (!form.rg) e.rg = "Informe o RG";
    if (!form.orgaoRg) e.orgaoRg = "Informe o órgão expedidor";
    if (!form.cidade) e.cidade = "Informe a cidade";
    if (!form.uf) e.uf = "Informe o estado";
    if (!form.categoria) e.categoria = "Selecione a categoria";
    setErros(e);
    if (!Object.keys(e).length) onNext();
  }
  return (
    <div className="screen">
      <div className="step-header"><button className="back-btn" onClick={onBack}>‹</button><div><p className="step-num">Passo 1 de 4</p><p className="step-name">Seus dados</p></div></div>
      <div className="progress-bar"><div className="progress-fill" style={{width:"25%"}}/></div>
      <div className="card">
        <p style={{fontSize:12,color:"rgba(255,255,255,0.4)",marginBottom:8}}>Campos marcados com * são obrigatórios</p>
        <Field label="Categoria" required error={erros.categoria}>
          <div style={{display:"flex",gap:10,marginTop:4}}>
            {["Titular","Dependente"].map(c=>(
              <label key={c} style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:14,flex:1,background:form.categoria===c?"rgba(0,200,150,0.1)":"#1f2535",border:`1px solid ${form.categoria===c?"rgba(0,200,150,0.5)":"#2a3347"}`,borderRadius:10,padding:"10px 14px"}}>
                <input type="radio" name="cat" value={c} checked={form.categoria===c} onChange={e=>setForm({...form,categoria:e.target.value})} style={{accentColor:"#00c896"}}/>{c}
              </label>
            ))}
          </div>
        </Field>
        <Field label="E-mail" required error={erros.email}>
          <input className={`input${erros.email?" err":""}`} type="email" placeholder="seu@email.com" value={form.email||""} onChange={e=>setForm({...form,email:e.target.value})}/>
        </Field>
        <Field label="Telefone / WhatsApp" required error={erros.telefone}>
          <input className={`input${erros.telefone?" err":""}`} placeholder="(27) 99999-9999" value={form.telefone||""} onChange={e=>setForm({...form,telefone:fmtFone(e.target.value)})}/>
        </Field>
        <div className="input-row">
          <Field label="RG" required error={erros.rg}>
            <input className={`input${erros.rg?" err":""}`} placeholder="Número" value={form.rg||""} onChange={e=>setForm({...form,rg:e.target.value})}/>
          </Field>
          <Field label="Órgão expedidor" required error={erros.orgaoRg}>
            <input className={`input${erros.orgaoRg?" err":""}`} placeholder="Ex: SSP/ES" value={form.orgaoRg||""} onChange={e=>setForm({...form,orgaoRg:e.target.value})}/>
          </Field>
        </div>
        <div className="input-row">
          <Field label="Cidade" required error={erros.cidade}>
            <input className={`input${erros.cidade?" err":""}`} placeholder="Sua cidade" value={form.cidade||""} onChange={e=>setForm({...form,cidade:e.target.value})}/>
          </Field>
          <Field label="Estado" required error={erros.uf}>
            <select className={`input${erros.uf?" err":""}`} value={form.uf||""} onChange={e=>setForm({...form,uf:e.target.value})}>
              <option value="">UF</option>
              {["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"].map(s=><option key={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </div>
      <button className="btn-primary" onClick={validate}>Continuar →</button>
    </div>
  );
}

// ─── STEP 2: DATAS E FINALIDADE ───────────────────────────────────────
function Step2({ form, setForm, onNext, onBack }) {
  const [erros, setErros] = useState({});
  const d = calcD(form.entrada, form.saida);
  function validate() {
    const e = {};
    if (!form.entrada) e.entrada = "Selecione a data de entrada";
    if (!form.saida) e.saida = "Selecione a data de saída";
    if (d > 3) e.saida = "Máximo 3 diárias.";
    if (!form.finalidade) e.finalidade = "Selecione a finalidade";
    if (form.finalidade?.includes("Saúde") && !form.docSaude) e.docSaude = "Comprovante obrigatório para estadia de saúde";
    setErros(e);
    if (!Object.keys(e).length) onNext();
  }
  return (
    <div className="screen">
      <div className="step-header"><button className="back-btn" onClick={onBack}>‹</button><div><p className="step-num">Passo 2 de 4</p><p className="step-name">Datas e finalidade</p></div></div>
      <div className="progress-bar"><div className="progress-fill" style={{width:"50%"}}/></div>
      <div className="card">
        <div className="input-row">
          <Field label="Check-in" required error={erros.entrada}>
            <input type="date" className={`input${erros.entrada?" err":""}`} min={today} max={maxDate} value={form.entrada||""} onChange={e=>setForm({...form,entrada:e.target.value,saida:""})}/>
            <p className="hint">A partir das 14h</p>
          </Field>
          <Field label="Check-out" required error={erros.saida}>
            <input type="date" className={`input${erros.saida?" err":""}`}
              min={form.entrada?new Date(new Date(form.entrada).getTime()+86400000).toISOString().split("T")[0]:today}
              max={form.entrada?new Date(new Date(form.entrada).getTime()+3*86400000).toISOString().split("T")[0]:maxDate}
              value={form.saida||""} onChange={e=>setForm({...form,saida:e.target.value})} disabled={!form.entrada}/>
            <p className="hint">Até 12h</p>
          </Field>
        </div>
        {d > 0 && !erros.saida && (
          <div style={{background:"rgba(0,200,150,0.1)",border:"1px solid rgba(0,200,150,0.25)",borderRadius:10,padding:"10px 16px",marginTop:12,display:"flex",alignItems:"baseline",gap:6}}>
            <span style={{fontSize:26,fontWeight:700,color:"#00c896"}}>{d}</span>
            <span style={{fontSize:13,color:"rgba(255,255,255,0.6)"}}>{d===1?"diária":"diárias"}</span>
          </div>
        )}
      </div>
      <div className="card">
        <Field label="Finalidade da estadia" required error={erros.finalidade}>
          {["Trânsito","Saúde (consulta/exame/procedimento)","Assuntos administrativos do Clube","Qualificação profissional (ACADEPOL/Estande)","Outros"].map(fin=>(
            <label key={fin} className="radio-item"><input type="radio" name="fin" value={fin} checked={form.finalidade===fin} onChange={e=>setForm({...form,finalidade:e.target.value,docSaude:null})}/><span>{fin}</span></label>
          ))}
        </Field>
        {form.finalidade?.includes("Saúde") && (
          <div style={{marginTop:12}}>
            <UploadField label="Comprovante de saúde" required value={form.docSaude} onChange={v=>setForm({...form,docSaude:v})} accept=".pdf,.jpg,.png"/>
            {erros.docSaude && <p className="field-err">⚠ {erros.docSaude}</p>}
          </div>
        )}
      </div>
      <div className="card">
        <Field label="Prioridade declarada" required>
          <select className="input" value={form.prioridade||""} onChange={e=>setForm({...form,prioridade:e.target.value})}>
            <option value="">Selecione</option>
            {PRIORIDADES.map(p=><option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </Field>
        <Field label="Observações (opcional)">
          <textarea className="input" placeholder="Alguma informação adicional para a Administração..." value={form.observacoes||""} onChange={e=>setForm({...form,observacoes:e.target.value})}/>
        </Field>
      </div>
      <button className="btn-primary" onClick={validate}>Continuar →</button>
    </div>
  );
}

// ─── STEP 3: HÓSPEDES E DOCUMENTOS ───────────────────────────────────
function Step3({ form, setForm, onNext, onBack }) {
  const [erros, setErros] = useState({});
  const [deps, setDeps] = useState(form.dependentes||[]);
  const a = parseInt(form.adultos||1), c = parseInt(form.criancas||0);

  function updateDep(i,k,v) { const d=[...deps]; d[i][k]=v; setDeps(d); setForm({...form,dependentes:d}); }
  function addDep() { if(deps.length<3){const d=[...deps,{nome:"",vinculo:"",idade:"",rg:""}];setDeps(d);setForm({...form,dependentes:d});} }
  function removeDep(i) { const d=deps.filter((_,idx)=>idx!==i);setDeps(d);setForm({...form,dependentes:d}); }

  function validate() {
    const e = {};
    if (!form.prioridade) e.prioridade = "Selecione a prioridade";
    if (!form.docCarteira) e.docCarteira = "Anexe a carteira social";
    if (!form.docFoto) e.docFoto = "Anexe o documento com foto (RG/CNH)";
    deps.forEach((d,i)=>{ if(!d.nome)e[`dep_nome_${i}`]="Nome obrigatório"; if(!d.vinculo)e[`dep_vinculo_${i}`]="Vínculo obrigatório"; });
    setErros(e);
    if(!Object.keys(e).length) onNext();
  }

  return (
    <div className="screen">
      <div className="step-header"><button className="back-btn" onClick={onBack}>‹</button><div><p className="step-num">Passo 3 de 4</p><p className="step-name">Hóspedes e documentos</p></div></div>
      <div className="progress-bar"><div className="progress-fill" style={{width:"75%"}}/></div>
      <div className="card">
        <p className="subsection">Ocupação da suíte</p>
        {[["Adultos","13 anos ou mais","adultos",1,4,a],["Crianças","Até 12 anos (cortesia)","criancas",0,2,c]].map(([lbl,sub,key,min,max,val])=>(
          <div key={key} className="counter-item">
            <div><p className="counter-label">{lbl}</p><p className="counter-sub">{sub}</p></div>
            <div className="counter-ctrl">
              <button className="counter-btn" onClick={()=>setForm({...form,[key]:Math.max(min,val-1)})}>−</button>
              <span className="counter-val">{val}</span>
              <button className="counter-btn" onClick={()=>setForm({...form,[key]:Math.min(max,val+1)})}>+</button>
            </div>
          </div>
        ))}
        {a>2&&<p className="alert-warn" style={{marginTop:10}}>⚠️ Adulto excedente sujeito a R$ 35/diária e autorização.</p>}
        <label className="checkbox-item" style={{marginTop:10}}>
          <input type="checkbox" checked={form.camaExtra||false} onChange={e=>setForm({...form,camaExtra:e.target.checked})}/>
          <span>Solicitar cama extra/berço (+R$ 20/diária, sujeito à disponibilidade)</span>
        </label>
      </div>
      <div className="card">
        <div className="section-row">
          <p className="subsection" style={{margin:0}}>Acompanhantes</p>
          {deps.length<3&&<button className="add-btn" onClick={addDep}>+ Adicionar</button>}
        </div>
        {deps.length===0&&<p className="hint">Nenhum acompanhante. Apenas o titular.</p>}
        {deps.map((d,i)=>(
          <div key={i} className="dep-card">
            <div className="section-row" style={{marginBottom:8}}>
              <p style={{fontSize:12,color:"rgba(255,255,255,0.5)",fontWeight:600,textTransform:"uppercase"}}>Acompanhante {i+1}</p>
              <button className="remove-btn" onClick={()=>removeDep(i)}>✕ Remover</button>
            </div>
            <Field label="Nome completo" required error={erros[`dep_nome_${i}`]}>
              <input className={`input${erros[`dep_nome_${i}`]?" err":""}`} placeholder="Nome" value={d.nome} onChange={e=>updateDep(i,"nome",e.target.value)}/>
            </Field>
            <div className="input-row" style={{marginTop:8}}>
              <Field label="Vínculo" required error={erros[`dep_vinculo_${i}`]}>
                <select className={`input${erros[`dep_vinculo_${i}`]?" err":""}`} value={d.vinculo} onChange={e=>updateDep(i,"vinculo",e.target.value)}>
                  <option value="">Selecione</option>
                  <option>Dependente</option><option>Convidado(a)</option><option>Convênio</option>
                </select>
              </Field>
              <Field label="Idade">
                <input className="input" type="number" min="0" max="99" placeholder="Idade" value={d.idade} onChange={e=>updateDep(i,"idade",e.target.value)}/>
              </Field>
            </div>
            <Field label="RG / Documento">
              <input className="input" placeholder="Nº do documento" value={d.rg} onChange={e=>updateDep(i,"rg",e.target.value)}/>
            </Field>
          </div>
        ))}
      </div>
      <div className="card">
        <p className="subsection">Documentos do titular</p>
        <UploadField label="Carteira social" required value={form.docCarteira} onChange={v=>setForm({...form,docCarteira:v})}/>
        {erros.docCarteira && <p className="field-err">⚠ {erros.docCarteira}</p>}
        <div style={{marginTop:10}}>
          <UploadField label="Documento com foto (RG/CNH)" required value={form.docFoto} onChange={v=>setForm({...form,docFoto:v})}/>
          {erros.docFoto && <p className="field-err">⚠ {erros.docFoto}</p>}
        </div>
      </div>
      <button className="btn-primary" onClick={validate}>Continuar →</button>
    </div>
  );
}

// ─── STEP 4: RESUMO E CONFIRMAÇÕES ────────────────────────────────────
function Step4({ form, usuario, onConfirmar, onBack }) {
  const [ac1,setAc1]=useState(false),[ac2,setAc2]=useState(false),[ac3,setAc3]=useState(false);
  const d=calcD(form.entrada,form.saida), a=parseInt(form.adultos||1);
  const total=calcTotal(d,a,form.camaExtra);
  const sinal=Math.min(70,total);
  return (
    <div className="screen">
      <div className="step-header"><button className="back-btn" onClick={onBack}>‹</button><div><p className="step-num">Passo 4 de 4</p><p className="step-name">Resumo final</p></div></div>
      <div className="progress-bar"><div className="progress-fill" style={{width:"100%"}}/></div>
      <div className="card" style={{background:"linear-gradient(135deg,#0d2233,#0a1a28)"}}>
        <div className="resumo-datas">
          <div style={{textAlign:"center"}}><p className="data-label">CHECK-IN</p><p className="data-val">{fmt(form.entrada)}</p><p className="data-hora">14h00</p></div>
          <span style={{fontSize:24,color:"rgba(255,255,255,0.3)"}}>→</span>
          <div style={{textAlign:"center"}}><p className="data-label">CHECK-OUT</p><p className="data-val">{fmt(form.saida)}</p><p className="data-hora">12h00</p></div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"center",fontSize:13,color:"rgba(255,255,255,0.5)"}}>
          <span>{d} diária{d>1?"s":""}</span><span>·</span><span>{a} adulto{a>1?"s":""}</span><span>·</span><span>{form.finalidade?.split(" ")[0]}</span>
        </div>
      </div>
      <div className="card">
        <p className="subsection">Valores</p>
        <div className="valor-linha"><span>Diária base (R$ 70 × {d})</span><span>R$ {(70*d).toFixed(2)}</span></div>
        {a>2&&<div className="valor-linha"><span>Adulto exc. × R$ 35 × {d}</span><span>R$ {((a-2)*35*d).toFixed(2)}</span></div>}
        {form.camaExtra&&<div className="valor-linha"><span>Cama extra × R$ 20 × {d}</span><span>R$ {(20*d).toFixed(2)}</span></div>}
        <div className="valor-linha total"><span>Total estimado</span><span>R$ {total.toFixed(2)}</span></div>
        <div className="valor-linha sinal"><span>Sinal/garantia (até 1 diária)</span><span>R$ {sinal.toFixed(2)}</span></div>
        <p className="hint">Pagamento via PIX, cartão ou dinheiro na recepção.</p>
      </div>
      <div className="card">
        <p className="subsection">Dados informados</p>
        {[["E-mail",usuario.email],["Telefone",usuario.telefone],["RG",`${usuario.rg} / ${usuario.orgaoRg}`],["Cidade/UF",`${usuario.cidade}/${usuario.uf}`],["Categoria",form.categoria||usuario.categoria]].map(([k,v])=>(
          <div key={k} className="conf-linha"><span className="conf-key">{k}</span><span className="conf-val">{v||"—"}</span></div>
        ))}
        {form.observacoes&&<div className="conf-linha"><span className="conf-key">Observações</span><span className="conf-val" style={{fontSize:12}}>{form.observacoes}</span></div>}
      </div>
      <div className="card">
        <p className="subsection">Confirmações obrigatórias</p>
        <label className="checkbox-item"><input type="checkbox" checked={ac1} onChange={e=>setAc1(e.target.checked)}/><span>Ciente da política de cancelamento: reembolso com 48h de antecedência; no-show retém 1 diária (Art. 9º).</span></label>
        <label className="checkbox-item"><input type="checkbox" checked={ac2} onChange={e=>setAc2(e.target.checked)}/><span>Autorizo o tratamento dos meus dados pessoais para gestão da reserva (LGPD). Dados retidos por até 5 anos.</span></label>
        <label className="checkbox-item"><input type="checkbox" checked={ac3} onChange={e=>setAc3(e.target.checked)}/><span>Li e aceito integralmente o <strong>Regulamento de Uso das Suítes</strong> e a Tabela de Diárias (Anexo I).</span></label>
      </div>
      <button className="btn-primary" disabled={!ac1||!ac2||!ac3} onClick={onConfirmar}>Enviar reserva →</button>
    </div>
  );
}

// ─── CONFIRMAÇÃO + PRÉVIA DE E-MAIL ──────────────────────────────────
function Confirmacao({ reserva, usuario, onHome }) {
  const [copied,setCopied]=useState(false);
  const [emailVisto,setEmailVisto]=useState(null);
  function copy(){navigator.clipboard?.writeText(reserva.id).catch(()=>{});setCopied(true);setTimeout(()=>setCopied(false),2000);}
  return (
    <div className="screen">
      {emailVisto && <EmailPreview reserva={reserva} usuario={usuario} tipo={emailVisto} onClose={()=>setEmailVisto(null)}/>}
      <div style={{textAlign:"center",padding:"28px 20px 16px"}}>
        <div style={{width:68,height:68,background:"linear-gradient(135deg,#00c896,#00a878)",color:"#000",fontSize:30,fontWeight:700,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px",boxShadow:"0 8px 32px rgba(0,200,150,0.35)"}}>✓</div>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,marginBottom:6}}>Reserva enviada!</h2>
        <p style={{fontSize:13,color:"rgba(255,255,255,0.5)"}}>Aguarde a confirmação da Administração.</p>
      </div>
      <div className="card" style={{textAlign:"center"}}>
        <p style={{fontSize:11,color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>Código do voucher</p>
        <div className="voucher-code" onClick={copy}>
          {reserva.id}
          <span style={{fontFamily:"'Sora',sans-serif",fontSize:11,color:"rgba(255,255,255,0.4)"}}>{copied?"✓ Copiado!":"toque para copiar"}</span>
        </div>
        <p className="hint">Apresente no check-in junto com seus documentos</p>
      </div>

      {/* E-MAILS ENVIADOS */}
      <div className="card">
        <p className="subsection">📧 E-mails disparados</p>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:"#1f2535",border:"1px solid #2a3347",borderRadius:12,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <p style={{fontSize:13,fontWeight:600}}>Para você</p>
              <p style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>{usuario.email}</p>
            </div>
            <button className="btn-sm blue" onClick={()=>setEmailVisto("hospede")}>Ver prévia</button>
          </div>
          <div style={{background:"#1f2535",border:"1px solid #2a3347",borderRadius:12,padding:"12px 14px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <p style={{fontSize:13,fontWeight:600}}>Para a Administração</p>
              <p style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>recepcao@sindipol.com.br</p>
            </div>
            <button className="btn-sm blue" onClick={()=>setEmailVisto("admin")}>Ver prévia</button>
          </div>
        </div>
        <p className="alert-info" style={{marginTop:12}}>💡 Quando o Resend estiver configurado, esses e-mails serão enviados automaticamente ao confirmar a reserva.</p>
      </div>

      <div className="card aviso-card">
        <p className="aviso-title">⚠️ Próximos passos</p>
        <ul className="info-list">
          <li>A Administração validará sua elegibilidade e confirmará a reserva.</li>
          <li>Traga carteira social e documento com foto no check-in.</li>
          <li>Cancele com 48h de antecedência se necessário.</li>
        </ul>
      </div>
      <button className="btn-primary" onClick={onHome}>Ir para início</button>
    </div>
  );
}

// ─── MINHAS RESERVAS ──────────────────────────────────────────────────
function MinhasReservas({ usuario, reservas, setReservas, onBack }) {
  const [modal,setModal]=useState(null);
  const minhas=reservas.filter(r=>r.matricula===usuario.matricula);
  function cancelar(id){setReservas(p=>p.map(r=>r.id===id?{...r,status:"cancelada"}:r));setModal(null);}
  return (
    <div className="screen">
      <div className="step-header"><button className="back-btn" onClick={onBack}>‹</button><div><p className="step-num">Área do hóspede</p><p className="step-name">Minhas reservas</p></div></div>
      <div style={{height:12}}/>
      {minhas.length===0?<div className="empty-state"><div style={{fontSize:36,marginBottom:10}}>🗓</div><p>Nenhuma reserva encontrada.</p></div>
        :minhas.map(r=>{
          const ativa=r.status==="confirmada"||r.status==="pendente";
          return(
            <div key={r.id} className="reserva-card">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <p style={{fontSize:12,color:"rgba(255,255,255,0.4)",fontWeight:600,letterSpacing:1}}>{r.id}</p>
                <Badge status={r.status}/>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",fontSize:14,fontWeight:600,marginBottom:6}}>
                <span>{fmt(r.entrada)}</span><span style={{color:"rgba(255,255,255,0.3)"}}>→</span><span>{fmt(r.saida)}</span>
              </div>
              <div style={{display:"flex",gap:10,fontSize:12,color:"rgba(255,255,255,0.45)",flexWrap:"wrap"}}>
                <span>{calcD(r.entrada,r.saida)} diária{calcD(r.entrada,r.saida)>1?"s":""}</span>
                <span>·</span><span>{r.adultos} adulto{r.adultos>1?"s":""}</span>
                <span>·</span><span>{r.finalidade}</span>
                <span>·</span><span style={{color:"#00c896",fontWeight:600}}>R$ {r.total.toFixed(2)}</span>
              </div>
              {ativa&&<div style={{marginTop:10}}><button className="btn-sm red" onClick={()=>setModal(r)}>Cancelar reserva</button></div>}
            </div>
          );
        })
      }
      {modal&&(
        <div className="modal-overlay"><div className="modal">
          <p className="modal-title">Cancelar {modal.id}?</p>
          <div className="aviso-card" style={{padding:"12px 14px",borderRadius:10,marginBottom:4}}>
            <p style={{fontSize:12,color:"#ffc260"}}>• 48h antes: reembolso integral do sinal<br/>• Sem aviso: retenção de 1 diária</p>
          </div>
          <div style={{display:"flex",gap:10,marginTop:14}}>
            <button className="btn-sm red" style={{flex:1,padding:"11px"}} onClick={()=>cancelar(modal.id)}>Confirmar</button>
            <button className="btn-sm gray" style={{flex:1,padding:"11px"}} onClick={()=>setModal(null)}>Voltar</button>
          </div>
        </div></div>
      )}
    </div>
  );
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
  const [f,setF]=useState({login:"",senha:""});
  const [erro,setErro]=useState(""); const [show,setShow]=useState(false);
  function handle(){
    if(!f.login||!f.senha){setErro("Preencha login e senha.");return;}
    const adm=ADMIN_DB.find(a=>a.login===f.login&&a.senha===f.senha);
    if(!adm){setErro("Login ou senha incorretos.");return;}
    setErro(""); onLogin(adm);
  }
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{display:"inline-flex",alignItems:"center",gap:10,background:"#111520",border:"1px solid #1e2535",borderRadius:14,padding:"10px 20px",marginBottom:14}}>
            <span style={{fontSize:20}}>🏨</span><span style={{fontSize:13,fontWeight:700,color:"rgba(255,255,255,0.6)"}}>SINDIPOL/ES</span>
          </div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:24,fontWeight:700,marginBottom:4}}>Painel Administrativo</h1>
          <p style={{fontSize:13,color:"rgba(255,255,255,0.4)"}}>Hotel de Trânsito — Acesso restrito</p>
        </div>
        <div style={{background:"#181d27",border:"1px solid #252c3a",borderRadius:16,padding:22}}>
          <label className="field-label required">Login</label>
          <input className="input" placeholder="usuário" value={f.login} onChange={e=>setF({...f,login:e.target.value})}/>
          <label className="field-label required">Senha</label>
          <div style={{position:"relative"}}>
            <input className="input" type={show?"text":"password"} placeholder="••••••••" value={f.senha} onChange={e=>setF({...f,senha:e.target.value})} style={{paddingRight:44}}/>
            <button onClick={()=>setShow(!show)} style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:14}}>{show?"🙈":"👁"}</button>
          </div>
          {erro&&<p className="field-err" style={{marginTop:8}}>⚠ {erro}</p>}
          <button className="btn-primary" style={{width:"100%",margin:"14px 0 0"}} onClick={handle}>Entrar →</button>
          <p className="hint" style={{textAlign:"center",marginTop:8}}>Teste: admin / sindipol2025</p>
        </div>
      </div>
    </div>
  );
}

// ─── ADMIN PAINEL ─────────────────────────────────────────────────────
function AdminPainel({ admin, reservas, setReservas, onLogout }) {
  const [tab,setTab]=useState("dashboard");
  const [suites]=useState(SUITES_MOCK);
  const [modal,setModal]=useState(null);
  const [ocorrencia,setOcorrencia]=useState("");
  const [emailPrev,setEmailPrev]=useState(null);
  const [logs,setLogs]=useState([
    {hora:"14:23",msg:"Check-in realizado",sub:"Ana Paula Silva · HTT-002",tipo:"checkin"},
    {hora:"10:05",msg:"Nova reserva recebida",sub:"Marcos Lima · HTT-005",tipo:"nova"},
    {hora:"08:30",msg:"Reserva aprovada",sub:"Carlos Oliveira · HTT-001",tipo:"confirmada"},
  ]);
  function addLog(msg,sub,tipo){setLogs(p=>[{hora:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"}),msg,sub,tipo},...p.slice(0,9)]);}
  function aprovar(r){setReservas(p=>p.map(x=>x.id===r.id?{...x,status:"confirmada",suite:"102"}:x));addLog("Reserva aprovada",r.hospede+" · "+r.id,"confirmada");setModal(null);}
  function recusar(r){setReservas(p=>p.map(x=>x.id===r.id?{...x,status:"cancelada"}:x));addLog("Reserva recusada",r.hospede+" · "+r.id,"cancelada");setModal(null);}
  function checkin(r){setReservas(p=>p.map(x=>x.id===r.id?{...x,status:"checkin_feito",checkin:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}:x));addLog("Check-in",r.hospede+" · "+r.id,"checkin");setModal(null);}
  function checkout(r){setReservas(p=>p.map(x=>x.id===r.id?{...x,status:"concluida",checkout:new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}:x));if(ocorrencia)addLog("Ocorrência: "+ocorrencia,r.id,"ocorrencia");addLog("Check-out",r.hospede+" · "+r.id,"checkout");setOcorrencia("");setModal(null);}
  const pendentes=reservas.filter(r=>r.status==="pendente");
  const hospedados=reservas.filter(r=>r.status==="checkin_feito");
  const checkins_hoje=reservas.filter(r=>r.entrada===today&&r.status==="confirmada");
  const checkouts_hoje=reservas.filter(r=>r.saida===today&&r.status==="checkin_feito");
  const LOG_COR={checkin:"#00c896",checkout:"#5bc8ff",nova:"#ffc260",confirmada:"#5bc8ff",cancelada:"#ff6060",ocorrencia:"#ffc260"};

  const mockUsuario = r => ({ nome: r.hospede, matricula: r.matricula, email: r.email||"hospede@email.com", telefone: r.telefone||"—", cpf:"***.***.***-**", rg:"—", orgaoRg:"—", cidade:"—", uf:"ES" });

  return (
    <div style={{display:"flex",flexDirection:"column",minHeight:"100vh",background:"#0b0e15"}}>
      {emailPrev&&<EmailPreview reserva={emailPrev.reserva} usuario={mockUsuario(emailPrev.reserva)} tipo={emailPrev.tipo} onClose={()=>setEmailPrev(null)}/>}
      <div className="admin-header">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>🏨</span>
          <div><p style={{fontSize:15,fontWeight:700}}>Hotel de Trânsito</p><p style={{fontSize:11,color:"rgba(255,255,255,0.4)"}}>Olá, {admin.nome}</p></div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {pendentes.length>0&&<span style={{background:"#ff6060",color:"#fff",fontSize:11,fontWeight:700,padding:"2px 8px",borderRadius:20}}>{pendentes.length}</span>}
          <button className="btn-sm gray" onClick={onLogout}>Sair</button>
        </div>
      </div>
      <div className="admin-body">
        <div className="admin-tabs">
          {[["dashboard","📊 Painel"],["reservas","🛎 Reservas"],["suites","🚪 Suítes"],["logs","📝 Logs"]].map(([v,l])=>(
            <button key={v} className={`tab${tab===v?" active":""}`} onClick={()=>setTab(v)}>{l}</button>
          ))}
        </div>

        {tab==="dashboard"&&(<>
          <div className="stat-grid">
            <div className="stat-card"><p className="stat-val" style={{color:"#ffc260"}}>{pendentes.length}</p><p className="stat-label">Pendentes</p></div>
            <div className="stat-card"><p className="stat-val" style={{color:"#00c896"}}>{hospedados.length}</p><p className="stat-label">Hospedados</p></div>
            <div className="stat-card"><p className="stat-val" style={{color:"#5bc8ff"}}>{checkins_hoje.length}</p><p className="stat-label">Check-ins hoje</p></div>
            <div className="stat-card"><p className="stat-val" style={{color:"rgba(255,255,255,0.5)"}}>{checkouts_hoje.length}</p><p className="stat-label">Check-outs hoje</p></div>
          </div>
          <p className="section-label">Pendentes de aprovação</p>
          {pendentes.length===0?<div className="empty-state" style={{padding:"16px 0"}}><p style={{fontSize:13}}>Nenhuma pendência ✓</p></div>
            :pendentes.map(r=>(
              <div key={r.id} className="admin-reserva">
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                  <div><p className="admin-reserva-nome">{r.hospede}</p><p className="admin-reserva-id">{r.id} · Mat. {r.matricula}</p></div>
                  <Badge status={r.status}/>
                </div>
                <div style={{display:"flex",gap:14,marginBottom:10}}>
                  {[["Check-in",fmt(r.entrada)],["Check-out",fmt(r.saida)],["Total","R$ "+r.total.toFixed(2)]].map(([k,v])=>(
                    <div key={k} className="admin-info-item">{k}<span style={k==="Total"?{color:"#00c896"}:{}}>{v}</span></div>
                  ))}
                </div>
                <div className="admin-actions">
                  <button className="btn-sm green" onClick={()=>aprovar(r)}>✓ Aprovar</button>
                  <button className="btn-sm red" onClick={()=>recusar(r)}>✕ Recusar</button>
                  <button className="btn-sm blue" onClick={()=>setEmailPrev({reserva:r,tipo:"admin"})}>📧 Ver e-mail</button>
                  <button className="btn-sm gray" onClick={()=>setModal({tipo:"detalhes",reserva:r})}>Detalhes</button>
                </div>
              </div>
            ))
          }
          <p className="section-label">Check-ins previstos hoje</p>
          {checkins_hoje.length===0?<div className="empty-state" style={{padding:"16px 0"}}><p style={{fontSize:13}}>Nenhum check-in previsto</p></div>
            :checkins_hoje.map(r=>(
              <div key={r.id} className="admin-reserva">
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                  <div><p className="admin-reserva-nome">{r.hospede}</p><p className="admin-reserva-id">{r.id} · Suíte {r.suite||"—"}</p></div>
                  <Badge status={r.status}/>
                </div>
                <div className="admin-actions"><button className="btn-sm green" onClick={()=>checkin(r)}>✓ Registrar check-in</button></div>
              </div>
            ))
          }
        </>)}

        {tab==="reservas"&&(<>
          <p className="section-label">Todas as reservas ({reservas.length})</p>
          {reservas.map(r=>(
            <div key={r.id} className="admin-reserva">
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                <div><p className="admin-reserva-nome">{r.hospede}</p><p className="admin-reserva-id">{r.id}</p></div>
                <Badge status={r.status}/>
              </div>
              <div style={{display:"flex",gap:14,marginBottom:8}}>
                {[["Entrada",fmt(r.entrada)],["Saída",fmt(r.saida)],["Diárias",calcD(r.entrada,r.saida)]].map(([k,v])=>(
                  <div key={k} className="admin-info-item">{k}<span>{v}</span></div>
                ))}
              </div>
              <div className="admin-actions">
                {r.status==="pendente"&&<><button className="btn-sm green" onClick={()=>aprovar(r)}>Aprovar</button><button className="btn-sm red" onClick={()=>recusar(r)}>Recusar</button></>}
                {r.status==="confirmada"&&<button className="btn-sm green" onClick={()=>checkin(r)}>Check-in</button>}
                {r.status==="checkin_feito"&&<button className="btn-sm blue" onClick={()=>setModal({tipo:"checkout",reserva:r})}>Check-out</button>}
                <button className="btn-sm gray" onClick={()=>setModal({tipo:"detalhes",reserva:r})}>Detalhes</button>
                <button className="btn-sm blue" onClick={()=>setEmailPrev({reserva:r,tipo:"admin"})}>📧 E-mail</button>
              </div>
            </div>
          ))}
        </>)}

        {tab==="suites"&&(<>
          <div className="suite-grid">
            {suites.map(s=>{
              const cor=s.status==="ocupada"?"#ffc260":s.status==="manutencao"?"#ff6060":"#00c896";
              return(
                <div key={s.id} className="suite-card" style={{background:`${cor}08`,borderColor:`${cor}30`}}>
                  <p style={{fontSize:20,fontWeight:700,marginBottom:4}}>🚪 {s.id}</p>
                  <p style={{fontSize:11,fontWeight:700,color:cor}}>{s.status==="ocupada"?"Ocupada":s.status==="manutencao"?"Manutenção":"Livre"}</p>
                  {s.hospede&&<p style={{fontSize:11,color:"rgba(255,255,255,0.4)",marginTop:4}}>{s.hospede}</p>}
                  {s.saida&&<p style={{fontSize:11,color:"rgba(255,255,255,0.35)"}}>Saída: {fmt(s.saida)}</p>}
                </div>
              );
            })}
          </div>
        </>)}

        {tab==="logs"&&(<>
          <p className="section-label">Atividades recentes</p>
          <div style={{background:"#111520",border:"1px solid #1e2535",borderRadius:14,padding:"4px 16px"}}>
            {logs.map((l,i)=>(
              <div key={i} className="log-item">
                <p className="log-hora">{l.hora}</p>
                <div>
                  <p style={{fontSize:13,color:"rgba(255,255,255,0.75)"}}>{l.msg}<span style={{fontSize:10,fontWeight:700,padding:"2px 7px",borderRadius:20,marginLeft:6,background:`${LOG_COR[l.tipo]||"#fff"}15`,color:LOG_COR[l.tipo]||"#fff"}}>{l.tipo}</span></p>
                  <p style={{fontSize:11,color:"rgba(255,255,255,0.35)",marginTop:2}}>{l.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </>)}
      </div>

      {modal?.tipo==="checkout"&&(
        <div className="modal-overlay"><div className="modal">
          <p className="modal-title">Registrar check-out</p>
          <p style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginBottom:12}}>{modal.reserva.hospede} · Suíte {modal.reserva.suite}</p>
          <label className="field-label">Ocorrências / Danos (opcional)</label>
          <textarea className="input" rows={3} placeholder="Descreva danos ou ocorrências..." value={ocorrencia} onChange={e=>setOcorrencia(e.target.value)}/>
          <div style={{display:"flex",gap:10,marginTop:14}}>
            <button className="btn-sm green" style={{flex:1,padding:"11px"}} onClick={()=>checkout(modal.reserva)}>✓ Confirmar</button>
            <button className="btn-sm gray" style={{flex:1,padding:"11px"}} onClick={()=>setModal(null)}>Cancelar</button>
          </div>
        </div></div>
      )}
      {modal?.tipo==="detalhes"&&(
        <div className="modal-overlay"><div className="modal">
          <p className="modal-title">Detalhes · {modal.reserva.id}</p>
          {[["Hóspede",modal.reserva.hospede],["Matrícula",modal.reserva.matricula],["E-mail",modal.reserva.email||"—"],["Telefone",modal.reserva.telefone||"—"],["Check-in",fmt(modal.reserva.entrada)+" às 14h"],["Check-out",fmt(modal.reserva.saida)+" até 12h"],["Diárias",calcD(modal.reserva.entrada,modal.reserva.saida)],["Finalidade",modal.reserva.finalidade],["Suíte",modal.reserva.suite||"Não atribuída"],["Total","R$ "+modal.reserva.total.toFixed(2)],["Sinal","R$ "+modal.reserva.sinal.toFixed(2)]].map(([k,v])=>(
            <div key={k} className="conf-linha"><span className="conf-key">{k}</span><span className="conf-val">{v}</span></div>
          ))}
          <div style={{display:"flex",gap:10,marginTop:14}}>
            <button className="btn-sm blue" style={{flex:1,padding:"11px"}} onClick={()=>{setEmailPrev({reserva:modal.reserva,tipo:"admin"});setModal(null);}}>📧 Ver e-mail</button>
            <button className="btn-sm gray" style={{flex:1,padding:"11px"}} onClick={()=>setModal(null)}>Fechar</button>
          </div>
        </div></div>
      )}
    </div>
  );
}

// ─── APP ROOT ─────────────────────────────────────────────────────────
export default function App() {
  const [modo,setModo]=useState(null);
  const [gUser,setGUser]=useState(null);
  const [gTela,setGTela]=useState("login");
  const [gForm,setGForm]=useState({adultos:1,criancas:0,camaExtra:false,dependentes:[]});
  const [reservaFeita,setReservaFeita]=useState(null);
  const [adminUser,setAdminUser]=useState(null);
  const [reservas,setReservas]=useState(RESERVAS_MOCK);

  function confirmarReserva() {
    const d=calcD(gForm.entrada,gForm.saida), a=parseInt(gForm.adultos||1);
    const total=calcTotal(d,a,gForm.camaExtra);
    const id=`HTT-${String(Date.now()).slice(-5)}`;
    const nova={id,matricula:gUser.matricula,hospede:gUser.nome,email:gUser.email||gForm.email,telefone:gUser.telefone||gForm.telefone,entrada:gForm.entrada,saida:gForm.saida,suite:null,adultos:a,criancas:gForm.criancas,finalidade:gForm.finalidade,prioridade:gForm.prioridade,observacoes:gForm.observacoes,dependentes:gForm.dependentes||[],docs:[gForm.docCarteira,gForm.docFoto,gForm.docSaude].filter(Boolean),status:"pendente",total,sinal:Math.min(70,total),checkin:null,checkout:null};
    setReservas(p=>[nova,...p]);
    // Mescla dados do form no usuário para o e-mail
    setGUser(u=>({...u,email:gForm.email||u.email,telefone:gForm.telefone||u.telefone,rg:gForm.rg,orgaoRg:gForm.orgaoRg,cidade:gForm.cidade,uf:gForm.uf}));
    setReservaFeita(nova);
    setGTela("confirmacao");
  }

  function resetGuest(){setGForm({adultos:1,criancas:0,camaExtra:false,dependentes:[]});setGTela("home");}

  if(modo===null) return(
    <>
      <style>{G}</style>
      <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
        <div style={{width:"100%",maxWidth:380,textAlign:"center"}}>
          <div className="logo-badge" style={{marginBottom:14}}>SINDIPOL/ES</div>
          <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:700,marginBottom:6}}>Hotel de Trânsito</h1>
          <p style={{fontSize:13,color:"rgba(255,255,255,0.5)",marginBottom:28}}>Como deseja acessar?</p>
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <button className="option-btn" style={{justifyContent:"center",gap:16,padding:18}} onClick={()=>setModo("guest")}>
              <span style={{fontSize:26}}>🛎</span>
              <div style={{textAlign:"left"}}><p style={{fontSize:16,fontWeight:600,marginBottom:2}}>Área do Hóspede</p><p style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>Fazer reservas e acompanhar estadias</p></div>
            </button>
            <button className="option-btn" style={{justifyContent:"center",gap:16,padding:18}} onClick={()=>setModo("admin")}>
              <span style={{fontSize:26}}>🔐</span>
              <div style={{textAlign:"left"}}><p style={{fontSize:16,fontWeight:600,marginBottom:2}}>Painel Administrativo</p><p style={{fontSize:12,color:"rgba(255,255,255,0.5)"}}>Gestão de reservas e check-in/out</p></div>
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Combina dados do form com o usuário para os steps
  const usuarioCompleto = { ...gUser, ...gForm };

  return(
    <>
      <style>{G}</style>
      {modo==="guest"&&(<>
        {gTela==="login"&&<GuestLogin onLogin={u=>{setGUser(u);setGTela("home");}}/>}
        {gTela==="home"&&<GuestHome usuario={gUser} onNova={()=>setGTela("step1")} onMinhas={()=>setGTela("minhas")} onLogout={()=>{setGUser(null);setGTela("login");setModo(null);}}/>}
        {gTela==="step1"&&<Step1 form={gForm} setForm={f=>setGForm({...gForm,...f})} onNext={()=>setGTela("step2")} onBack={()=>setGTela("home")}/>}
        {gTela==="step2"&&<Step2 form={gForm} setForm={f=>setGForm({...gForm,...f})} onNext={()=>setGTela("step3")} onBack={()=>setGTela("step1")}/>}
        {gTela==="step3"&&<Step3 form={gForm} setForm={f=>setGForm({...gForm,...f})} onNext={()=>setGTela("step4")} onBack={()=>setGTela("step2")}/>}
        {gTela==="step4"&&<Step4 form={gForm} usuario={usuarioCompleto} onConfirmar={confirmarReserva} onBack={()=>setGTela("step3")}/>}
        {gTela==="confirmacao"&&<Confirmacao reserva={reservaFeita} usuario={usuarioCompleto} onHome={resetGuest}/>}
        {gTela==="minhas"&&<MinhasReservas usuario={gUser} reservas={reservas} setReservas={setReservas} onBack={()=>setGTela("home")}/>}
      </>)}
      {modo==="admin"&&(<>
        {!adminUser&&<AdminLogin onLogin={u=>setAdminUser(u)}/>}
        {adminUser&&<AdminPainel admin={adminUser} reservas={reservas} setReservas={setReservas} onLogout={()=>{setAdminUser(null);setModo(null);}}/>}
      </>)}
    </>
  );
}
