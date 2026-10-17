/* Chapa 2 RESET · modo revisão de textos
   Liga com ?revisar no endereço (desliga com ?revisar=0). Fora disso, este arquivo não faz nada.
   Quem é da equipe entra com o login do painel, clica num trecho, reescreve e salva.
   As sugestões vão pra tabela "sugestoes" do banco e aparecem no painel (aba Revisão). */
(function () {
  var CHAVE_FLAG = "reset-revisao";
  var q = location.search;
  try {
    if (/[?&]revisar=0\b/.test(q)) { localStorage.removeItem(CHAVE_FLAG); return; }
    if (/[?&]revisar\b/.test(q)) localStorage.setItem(CHAVE_FLAG, "1");
    if (localStorage.getItem(CHAVE_FLAG) !== "1") return;
  } catch (e) { if (!/[?&]revisar\b/.test(q)) return; }

  var eu = document.currentScript && document.currentScript.src;
  var BASE = eu ? eu.replace(/js\/revisao\.js.*$/, "") : "";
  var basePath = BASE ? new URL(BASE).pathname : "/";
  var pagina = decodeURIComponent(location.pathname.indexOf(basePath) === 0 ? location.pathname.slice(basePath.length) : location.pathname);
  if (!pagina || /\/$/.test(pagina)) pagina += "index.html";

  var SEL = "h1,h2,h3,h4,h5,p,li,blockquote,figcaption,dt,dd,td,th,summary,label,.kicker,a.btn,button.btn";
  var FORA = ".topo,#rev-barra,#rev-gaveta,script,style,noscript";
  var db = null, usuario = null, editando = true, sugestoes = [], alvo = null;

  function carrega(src) { return new Promise(function (ok, erro) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { erro(new Error("não carregou " + src)); }; document.head.appendChild(s); }); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function texto(el) { return (el.innerText || el.textContent || "").replace(/ /g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim(); }
  function hash(s) { var h = 5381; for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function chave(el) { return el.tagName.toLowerCase() + ":" + hash(texto(el)); }
  function dt(s) { try { return new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch (e) { return ""; } }
  var TIPOS = { h1: "título", h2: "título", h3: "subtítulo", h4: "subtítulo", h5: "subtítulo", p: "parágrafo", li: "item de lista", blockquote: "citação", figcaption: "legenda", td: "tabela", th: "tabela", dt: "termo", dd: "descrição", summary: "título", label: "rótulo", a: "botão", button: "botão", span: "selo" };
  var PAGINAS = { "index.html": "Início", "propostas.html": "Propostas", "candidatos.html": "Candidatos", "artigos.html": "Artigos", "apoie.html": "Compartilhe", "ideias.html": "Envie sua ideia", "cadastro.html": "Quero apoiar", "privacidade.html": "Privacidade" };
  function nomePagina() { if (PAGINAS[pagina]) return PAGINAS[pagina]; var m = pagina.match(/artigos\/p0*(\d+)\.html/); return m ? "Artigo " + m[1] : pagina; }
  function blocoDe(t) { if (!t || !t.closest) return null; if (t.closest(FORA)) return null; var el = t.closest(SEL); if (!el || el.closest(FORA)) return null; return texto(el) ? el : null; }

  var css = document.createElement("style");
  css.textContent = [
    "body.rev-on :is(" + SEL + "){cursor:text}",
    "body.rev-on :is(" + SEL + "):hover{outline:2px dashed #f5c400;outline-offset:3px;border-radius:2px}",
    "body.rev-on .topo :is(" + SEL + "){cursor:auto;outline:none}",
    ".rev-tem{box-shadow:inset 4px 0 0 #f5c400;background-image:linear-gradient(90deg,rgba(245,196,0,.16),transparent 60%)}",
    ".rev-atual{outline:3px solid #f5c400!important;outline-offset:3px}",
    "#rev-barra{position:fixed;left:12px;bottom:12px;z-index:9998;display:flex;align-items:center;gap:8px;flex-wrap:wrap;max-width:calc(100% - 24px);background:#1d0f33;color:#fff;border-radius:14px;padding:8px 10px;font:600 13px/1.3 Montserrat,system-ui,sans-serif;box-shadow:0 8px 30px rgba(0,0,0,.3)}",
    "#rev-barra b{color:#f5c400}",
    "#rev-barra button{font:inherit;font-size:12.5px;border:0;border-radius:999px;padding:7px 12px;cursor:pointer;background:rgba(255,255,255,.12);color:#fff}",
    "#rev-barra button.on{background:#f5c400;color:#1d0f33}",
    "#rev-gaveta{position:fixed;top:0;right:0;bottom:0;z-index:9999;width:min(460px,100%);background:#fff;color:#1d0f33;box-shadow:-10px 0 40px rgba(0,0,0,.25);display:flex;flex-direction:column;font:500 14px/1.5 Montserrat,system-ui,sans-serif}",
    "#rev-gaveta[hidden]{display:none}",
    "#rev-gaveta header{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid #eee;background:#faf8fd}",
    "#rev-gaveta header strong{font-size:15px}",
    "#rev-gaveta header button{font:inherit;font-size:22px;line-height:1;border:0;background:none;cursor:pointer;color:#1d0f33;padding:4px 8px}",
    "#rev-gaveta .corpo{padding:16px 18px 24px;overflow:auto;flex:1}",
    "#rev-gaveta .rot{display:block;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#6b6280;margin:14px 0 6px}",
    "#rev-gaveta .atual{white-space:pre-wrap;background:#f6f4fa;border:1px solid #e6e0f0;border-radius:10px;padding:12px;max-height:34vh;overflow:auto}",
    "#rev-gaveta textarea,#rev-gaveta input{width:100%;box-sizing:border-box;font:inherit;font-size:16px;border:1px solid #cfc6e0;border-radius:10px;padding:10px 12px;color:#1d0f33}",
    "#rev-gaveta textarea{min-height:140px;resize:vertical}",
    "#rev-gaveta .acoes{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}",
    "#rev-gaveta .acoes button{font:inherit;font-weight:700;border:0;border-radius:999px;padding:11px 18px;cursor:pointer}",
    "#rev-gaveta .salvar{background:#f5c400;color:#1d0f33}",
    "#rev-gaveta .cancelar{background:#eee;color:#1d0f33}",
    "#rev-gaveta .msg{font-size:13px;margin-top:10px}",
    "#rev-gaveta .msg.erro{color:#b3261e}#rev-gaveta .msg.ok{color:#1b7a3d}",
    "#rev-gaveta .hist{border-top:1px solid #eee;margin-top:18px;padding-top:6px}",
    "#rev-gaveta .item{border:1px solid #eee;border-radius:10px;padding:10px 12px;margin-top:8px;font-size:13px}",
    "#rev-gaveta .item small{color:#6b6280}#rev-gaveta .item p{white-space:pre-wrap;margin:6px 0 0}",
    "#rev-gaveta .st{display:inline-block;font-size:11px;font-weight:700;border-radius:999px;padding:1px 8px;background:#f1edf8;margin-left:6px}",
    "#rev-gaveta .st.aprovado,#rev-gaveta .st.aplicado{background:#e6f8ee;color:#1b7a3d}#rev-gaveta .st.recusado{background:#fdecea;color:#b3261e}",
    "@media (max-width:600px){#rev-gaveta{top:auto;height:86vh;border-radius:16px 16px 0 0}}"
  ].join("\n");
  document.head.appendChild(css);

  var barra = document.createElement("div"); barra.id = "rev-barra";
  var gaveta = document.createElement("aside"); gaveta.id = "rev-gaveta"; gaveta.hidden = true;
  gaveta.innerHTML = '<header><strong id="rev-tit">Revisão</strong><button type="button" id="rev-fechar" aria-label="Fechar">×</button></header><div class="corpo" id="rev-corpo"></div>';
  document.body.appendChild(barra); document.body.appendChild(gaveta);
  document.getElementById("rev-fechar").onclick = fechar;

  function fechar() { gaveta.hidden = true; if (alvo) alvo.classList.remove("rev-atual"); alvo = null; }
  function abrir(titulo, html) { document.getElementById("rev-tit").textContent = titulo; document.getElementById("rev-corpo").innerHTML = html; gaveta.hidden = false; }

  function desenhaBarra() {
    if (!usuario) {
      barra.innerHTML = "<span><b>Modo revisão</b></span><button type=\"button\" class=\"on\" id=\"rev-entrar\">Entrar para revisar</button><button type=\"button\" id=\"rev-sair\">Sair do modo revisão</button>";
      document.getElementById("rev-entrar").onclick = telaLogin;
    } else {
      var n = sugestoes.length;
      barra.innerHTML = "<span><b>Revisão</b> · " + n + (n === 1 ? " sugestão" : " sugestões") + " nesta página</span>" +
        "<button type=\"button\" id=\"rev-modo\" class=\"" + (editando ? "on" : "") + "\">" + (editando ? "Clique num texto para editar" : "Navegar no site") + "</button>" +
        "<button type=\"button\" id=\"rev-sair\">Sair</button>";
      document.getElementById("rev-modo").onclick = function () { editando = !editando; document.body.classList.toggle("rev-on", editando); desenhaBarra(); };
    }
    document.getElementById("rev-sair").onclick = function () { try { localStorage.removeItem(CHAVE_FLAG); } catch (e) {} location.href = location.pathname; };
  }

  function telaLogin() {
    abrir("Entrar na revisão", '<p>Use o mesmo e-mail e senha do painel da chapa.</p>' +
      '<label class="rot" for="rev-le">E-mail</label><input id="rev-le" type="email" autocomplete="username">' +
      '<label class="rot" for="rev-ls">Senha</label><input id="rev-ls" type="password" autocomplete="current-password">' +
      '<div class="acoes"><button type="button" class="salvar" id="rev-ok">Entrar</button></div><p class="msg" id="rev-msg"></p>');
    document.getElementById("rev-ok").onclick = async function () {
      var m = document.getElementById("rev-msg"); m.className = "msg"; m.textContent = "Entrando...";
      var r = await db.auth.signInWithPassword({ email: document.getElementById("rev-le").value.trim(), password: document.getElementById("rev-ls").value });
      if (r.error) { m.className = "msg erro"; m.textContent = "E-mail ou senha não conferem."; return; }
      usuario = r.data.user; fechar(); await carregar();
    };
  }

  async function carregar() {
    var r = await db.from("sugestoes").select("*").eq("pagina", pagina).order("criado_em", { ascending: false }).limit(2000);
    sugestoes = r.error ? [] : (r.data || []);
    marca(); desenhaBarra(); document.body.classList.toggle("rev-on", editando);
  }

  function marca() {
    var porBloco = {}; sugestoes.forEach(function (s) { porBloco[s.bloco] = 1; });
    document.querySelectorAll(".rev-tem").forEach(function (e) { e.classList.remove("rev-tem"); });
    document.querySelectorAll(SEL).forEach(function (el) { if (!el.closest(FORA) && porBloco[chave(el)]) el.classList.add("rev-tem"); });
  }

  function editor(el) {
    if (alvo) alvo.classList.remove("rev-atual");
    alvo = el; el.classList.add("rev-atual");
    var orig = texto(el), k = chave(el), anteriores = sugestoes.filter(function (s) { return s.bloco === k; });
    var linhas = Math.min(18, Math.max(5, Math.ceil(orig.length / 48)));
    var h = '<span class="rot">Como está no site</span><div class="atual">' + esc(orig) + '</div>' +
      '<label class="rot" for="rev-txt">Sua versão (reescreva o que quiser)</label><textarea id="rev-txt" rows="' + linhas + '">' + esc(orig) + '</textarea>' +
      '<label class="rot" for="rev-com">Comentário ou motivo (opcional)</label><input id="rev-com" type="text" placeholder="Ex.: dado precisa de fonte, tom mais direto...">' +
      '<div class="acoes"><button type="button" class="salvar" id="rev-salvar">Salvar sugestão</button><button type="button" class="cancelar" id="rev-cancelar">Cancelar</button></div><p class="msg" id="rev-msg"></p>';
    if (anteriores.length) {
      h += '<div class="hist"><span class="rot">Sugestões já feitas neste trecho (' + anteriores.length + ')</span>';
      anteriores.forEach(function (s) { h += '<div class="item"><small>' + esc(s.autor_email) + " · " + dt(s.criado_em) + '</small><span class="st ' + esc(s.status) + '">' + esc(s.status) + '</span>' + (s.sugerido !== s.original ? "<p>" + esc(s.sugerido) + "</p>" : "") + (s.comentario ? "<p><em>" + esc(s.comentario) + "</em></p>" : "") + "</div>"; });
      h += "</div>";
    }
    abrir(nomePagina() + " · " + (TIPOS[el.tagName.toLowerCase()] || "trecho"), h);
    document.getElementById("rev-cancelar").onclick = fechar;
    /* rascunho: o que a pessoa digita fica guardado no navegador até salvar, pra não perder se fechar a página */
    var chaveRasc = "reset-rascunho:" + pagina + ":" + k, txtEl = document.getElementById("rev-txt"), comEl = document.getElementById("rev-com");
    try {
      var rasc = JSON.parse(localStorage.getItem(chaveRasc) || "null");
      if (rasc && (rasc.t !== orig || rasc.c)) {
        txtEl.value = rasc.t; comEl.value = rasc.c || "";
        var m0 = document.getElementById("rev-msg"); m0.className = "msg ok"; m0.textContent = "Rascunho recuperado: continue de onde parou e clique em Salvar.";
      }
    } catch (e) {}
    function guardaRasc() { try { localStorage.setItem(chaveRasc, JSON.stringify({ t: txtEl.value, c: comEl.value })); } catch (e) {} }
    txtEl.addEventListener("input", guardaRasc); comEl.addEventListener("input", guardaRasc);
    document.getElementById("rev-salvar").onclick = async function () {
      var m = document.getElementById("rev-msg"), novo = document.getElementById("rev-txt").value.trim(), com = document.getElementById("rev-com").value.trim();
      if (novo === orig && !com) { m.className = "msg erro"; m.textContent = "Você não mudou nada. Reescreva o texto ou deixe um comentário."; return; }
      if (!novo) { m.className = "msg erro"; m.textContent = "Se a ideia é tirar esse trecho, deixe o texto como está e escreva no comentário: \"tirar\"."; return; }
      this.disabled = true; m.className = "msg"; m.textContent = "Salvando...";
      var r = await db.from("sugestoes").insert({ pagina: pagina, bloco: k, tipo: el.tagName.toLowerCase(), original: orig, sugerido: novo, comentario: com || null });
      this.disabled = false;
      if (r.error) { m.className = "msg erro"; m.textContent = /row-level|permission/i.test(r.error.message) ? "Seu e-mail ainda não está liberado na equipe de revisão. Fale com o Mendes." : "Não deu pra salvar agora: " + r.error.message; return; }
      m.className = "msg ok"; m.textContent = "Sugestão salva. Obrigado!";
      try { localStorage.removeItem(chaveRasc); } catch (e) {}
      await carregar(); setTimeout(fechar, 900);
    };
    setTimeout(function () { var t = document.getElementById("rev-txt"); if (t) t.focus(); }, 50);
  }

  document.addEventListener("click", function (ev) {
    if (!usuario || !editando) return;
    if (ev.target.closest && ev.target.closest("#rev-barra,#rev-gaveta")) return;
    var el = blocoDe(ev.target); if (!el) return;
    ev.preventDefault(); ev.stopPropagation(); editor(el);
  }, true);
  document.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && !gaveta.hidden) fechar(); });

  (async function inicia() {
    try {
      if (!window.supabase || !window.supabase.createClient) await carrega("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.4/dist/umd/supabase.min.js");
      if (!window.ResetDb) await carrega(BASE + "js/reset-db.js");
      db = window.ResetDb.cliente();
      var s = await db.auth.getSession(); usuario = s.data.session ? s.data.session.user : null;
      if (usuario) await carregar(); else desenhaBarra();
    } catch (e) { barra.innerHTML = "<span>Modo revisão: não deu pra conectar ao banco. Recarregue a página.</span>"; console.error(e); }
  })();
})();
